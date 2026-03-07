import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../../core/config/app_config.dart';
import '../../../auth/data/services/auth_session_store.dart';
import '../models/scan_record.dart';

class ScanRecordStoreException implements Exception {
  const ScanRecordStoreException(this.message);

  final String message;

  @override
  String toString() => message;
}

class _PatientSessionContext {
  const _PatientSessionContext({
    required this.accessToken,
    required this.patientId,
  });

  final String accessToken;
  final String patientId;
}

class ScanRecordStore {
  ScanRecordStore._();

  static final http.Client _client = http.Client();

  static Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final normalizedPath = path.startsWith('/') ? path : '/$path';

    final hasApiSuffix = base.toLowerCase().endsWith('/api');
    final resolvedPath =
        hasApiSuffix && normalizedPath.toLowerCase().startsWith('/api/')
        ? normalizedPath.substring(4)
        : normalizedPath;

    return Uri.parse('$base$resolvedPath');
  }

  static Future<List<ScanRecord>> list() async {
    final session = await _requirePatientSession();

    late final http.Response response;
    try {
      response = await _client.get(
        _buildUri('/api/patients/${session.patientId}/records'),
        headers: _authHeaders(session.accessToken),
      );
    } on SocketException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (!_isSuccessful(response.statusCode)) {
      throw ScanRecordStoreException(_extractErrorMessage(body, response));
    }

    final records = (body['records'] as List<dynamic>? ?? const <dynamic>[])
        .map(_asMap)
        .where((item) => item.isNotEmpty)
        .map(_fromApiRecord)
        .toList(growable: false);

    records.sort((a, b) => b.scannedAt.compareTo(a.scannedAt));
    return records;
  }

  static Future<ScanRecord> add(ScanRecord record) async {
    final session = await _requirePatientSession();
    late final http.Response response;
    try {
      response = await _client.post(
        _buildUri('/api/patients/${session.patientId}/records'),
        headers: _authHeaders(session.accessToken),
        body: jsonEncode({
          'type': 'vitals',
          'capturedAt': record.scannedAt.toIso8601String(),
          'data': _toRecordPayload(record),
        }),
      );
    } on SocketException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (!_isSuccessful(response.statusCode)) {
      throw ScanRecordStoreException(_extractErrorMessage(body, response));
    }

    final createdRecord = _asMap(body['record']).isNotEmpty
        ? _fromApiRecord(_asMap(body['record']))
        : record;

    await _syncAiTelemetryBestEffort(
      accessToken: session.accessToken,
      record: createdRecord,
    );

    return createdRecord;
  }

  static Future<ScanRecord?> getById(String recordId) async {
    final normalizedRecordId = recordId.trim();
    if (normalizedRecordId.isEmpty) return null;

    final session = await _requirePatientSession();
    late final http.Response response;
    try {
      response = await _client.get(
        _buildUri(
          '/api/patients/${session.patientId}/records/$normalizedRecordId',
        ),
        headers: _authHeaders(session.accessToken),
      );
    } on SocketException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    }

    if (response.statusCode == 404) {
      return null;
    }

    final body = _safeDecodeJson(response.body);
    if (!_isSuccessful(response.statusCode)) {
      throw ScanRecordStoreException(_extractErrorMessage(body, response));
    }

    final rawRecord = _asMap(body['record']);
    if (rawRecord.isEmpty) {
      return null;
    }
    return _fromApiRecord(rawRecord);
  }

  static Future<ScanRecordVerificationResult> verifyById(
    String recordId,
  ) async {
    final normalizedRecordId = recordId.trim();
    if (normalizedRecordId.isEmpty) {
      throw const ScanRecordStoreException('Record ID is required.');
    }

    final session = await _requirePatientSession();
    late final http.Response response;
    try {
      response = await _client.get(
        _buildUri(
          '/api/patients/${session.patientId}/records/$normalizedRecordId/verify',
        ),
        headers: _authHeaders(session.accessToken),
      );
    } on SocketException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (!_isSuccessful(response.statusCode)) {
      throw ScanRecordStoreException(_extractErrorMessage(body, response));
    }

    final integrity = _asMap(body['dbIntegrity']);
    final blockchain = _asMap(body['blockchain']);

    return ScanRecordVerificationResult(
      status: _stringValue(body['status'], fallback: 'pending'),
      storedHash: _stringValue(integrity['storedHash']),
      recomputedHash: _stringValue(integrity['recomputedHash']),
      integrityMatch: _boolValue(integrity['match']) ?? false,
      blockchainAvailable: _boolValue(blockchain['available']) ?? false,
      blockchainVerified: _boolValue(blockchain['verified']),
      txId: _stringValue(blockchain['txId']),
      blockNumber: _intValue(blockchain['blockNumber']),
      reason: _stringValue(blockchain['reason']),
      verifiedAt: _dateValue(body['verifiedAt']),
    );
  }

  static Future<void> deleteById(String recordId) async {
    final normalizedRecordId = recordId.trim();
    if (normalizedRecordId.isEmpty) return;

    final session = await _requirePatientSession();
    late final http.Response response;
    try {
      response = await _client.delete(
        _buildUri(
          '/api/patients/${session.patientId}/records/$normalizedRecordId',
        ),
        headers: _authHeaders(session.accessToken),
      );
    } on SocketException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw ScanRecordStoreException(_networkErrorMessage());
    }

    if (response.statusCode == 404) {
      return;
    }

    final body = _safeDecodeJson(response.body);
    if (!_isSuccessful(response.statusCode)) {
      throw ScanRecordStoreException(_extractErrorMessage(body, response));
    }
  }

  static Future<void> clear() async {
    throw const ScanRecordStoreException(
      'Bulk record deletion is not supported.',
    );
  }

  static Future<_PatientSessionContext> _requirePatientSession() async {
    final token = (await AuthSessionStore.accessToken() ?? '').trim();
    final patientId = (await AuthSessionStore.patientId() ?? '').trim();

    if (token.isEmpty || patientId.isEmpty) {
      throw const ScanRecordStoreException(
        'Patient session is missing. Please log in again.',
      );
    }

    return _PatientSessionContext(accessToken: token, patientId: patientId);
  }

  static Map<String, String> _authHeaders(String accessToken) {
    return <String, String>{
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $accessToken',
    };
  }

  static Map<String, dynamic> _toRecordPayload(ScanRecord record) {
    return <String, dynamic>{
      'source': 'mobile_scan',
      'scannedAt': record.scannedAt.toIso8601String(),
      'heartRate': record.bpm,
      'bpm': record.bpm,
      'fallDetected': record.fallDetected,
      'signalQuality': record.signalQuality,
      'fingerDetected': record.fingerDetected,
      'fingerConfidence': record.fingerConfidence,
      'movementIntensity': record.movementIntensity,
      'gyroMagnitude': record.gyroMagnitude,
      'activityLevel': record.activityLabel.toUpperCase(),
      'metrics': <String, dynamic>{
        'heartRate': record.bpm,
        'bpm': record.bpm,
        'signalQuality': record.signalQuality,
        'fingerDetected': record.fingerDetected,
        'fingerConfidence': record.fingerConfidence,
        'movementIntensity': record.movementIntensity,
        'gyroMagnitude': record.gyroMagnitude,
        'fallDetected': record.fallDetected,
      },
    };
  }

  static ScanRecord _fromApiRecord(Map<String, dynamic> rawRecord) {
    final data = _asMap(rawRecord['data']);
    final metrics = _asMap(data['metrics']);
    final blockchain = _asMap(rawRecord['blockchain']);
    final id = _stringValue(
      rawRecord['_id'],
      fallback: _stringValue(rawRecord['id']),
    );

    final scannedAt =
        _dateValue(rawRecord['capturedAt']) ??
        _dateValue(data['scannedAt']) ??
        _dateValue(rawRecord['createdAt']) ??
        DateTime.now();

    final bpm =
        _intValue(data['heartRate']) ??
        _intValue(data['bpm']) ??
        _intValue(metrics['heartRate']) ??
        _intValue(metrics['bpm']);

    return ScanRecord(
      id: id.isEmpty ? DateTime.now().microsecondsSinceEpoch.toString() : id,
      scannedAt: scannedAt,
      bpm: bpm,
      fallDetected:
          _boolValue(data['fallDetected']) ??
          _boolValue(metrics['fallDetected']) ??
          false,
      signalQuality:
          _doubleValue(data['signalQuality']) ??
          _doubleValue(metrics['signalQuality']) ??
          0,
      fingerDetected:
          _boolValue(data['fingerDetected']) ??
          _boolValue(metrics['fingerDetected']) ??
          false,
      fingerConfidence:
          _doubleValue(data['fingerConfidence']) ??
          _doubleValue(metrics['fingerConfidence']) ??
          0,
      movementIntensity:
          _doubleValue(data['movementIntensity']) ??
          _doubleValue(metrics['movementIntensity']) ??
          0,
      gyroMagnitude:
          _doubleValue(data['gyroMagnitude']) ??
          _doubleValue(metrics['gyroMagnitude']) ??
          0,
      type: _stringValue(rawRecord['type'], fallback: 'vitals'),
      recordHash: _stringValue(rawRecord['recordHash']),
      createdAt: _dateValue(rawRecord['createdAt']),
      blockchain: ScanRecordBlockchainInfo(
        enabled: _boolValue(blockchain['enabled']) ?? false,
        verificationStatus: _stringValue(
          blockchain['verificationStatus'],
          fallback: 'pending',
        ),
        txId: _stringValue(blockchain['txId']),
        contractAddress: _stringValue(blockchain['contractAddress']),
        anchoredAt: _dateValue(blockchain['anchoredAt']),
        lastVerifiedAt: _dateValue(blockchain['lastVerifiedAt']),
      ),
    );
  }

  static Future<void> _syncAiTelemetryBestEffort({
    required String accessToken,
    required ScanRecord record,
  }) async {
    final heartRate = record.bpm;
    if (heartRate == null || heartRate <= 0) return;

    try {
      await _client.post(
        _buildUri('/api/ai/analyze'),
        headers: _authHeaders(accessToken),
        body: jsonEncode(<String, dynamic>{
          'heartRate': heartRate,
          'activity': record.activityLabel,
          'fallDetected': record.fallDetected,
        }),
      );
    } catch (_) {
      // Keep patient record storage successful even if AI analysis fails.
    }
  }

  static bool _isSuccessful(int statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }

  static Map<String, dynamic> _safeDecodeJson(String raw) {
    if (raw.trim().isEmpty) return <String, dynamic>{};
    try {
      final decoded = jsonDecode(raw);
      return _asMap(decoded);
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  static Map<String, dynamic> _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) {
      return value.map((key, item) => MapEntry(key.toString(), item));
    }
    return <String, dynamic>{};
  }

  static String _stringValue(Object? value, {String fallback = ''}) {
    final parsed = (value ?? '').toString().trim();
    if (parsed.isEmpty) return fallback;
    return parsed;
  }

  static int? _intValue(Object? value) {
    if (value is int) return value;
    if (value is num) return value.round();
    return int.tryParse((value ?? '').toString());
  }

  static double? _doubleValue(Object? value) {
    if (value is double) return value;
    if (value is num) return value.toDouble();
    return double.tryParse((value ?? '').toString());
  }

  static bool? _boolValue(Object? value) {
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) {
      final normalized = value.trim().toLowerCase();
      if (normalized == 'true' ||
          normalized == '1' ||
          normalized == 'yes' ||
          normalized == 'detected') {
        return true;
      }
      if (normalized == 'false' ||
          normalized == '0' ||
          normalized == 'no' ||
          normalized == 'none') {
        return false;
      }
    }
    return null;
  }

  static DateTime? _dateValue(Object? value) {
    final raw = (value ?? '').toString().trim();
    if (raw.isEmpty) return null;
    return DateTime.tryParse(raw);
  }

  static String _extractErrorMessage(
    Map<String, dynamic> body,
    http.Response response,
  ) {
    final fromErrorMap = _asMap(body['error'])['message'];
    final fromMessage = body['message'];
    final message = _stringValue(fromErrorMap ?? fromMessage);
    if (message.isNotEmpty) {
      return message;
    }

    return 'Request failed (${response.statusCode})';
  }

  static String _networkErrorMessage() {
    return 'Cannot reach API at ${AppConfig.apiBaseUrl}. Check backend server and API_BASE_URL.';
  }
}
