import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../../core/config/app_config.dart';
import '../../../../core/services/app_preferences_service.dart';
import '../../../auth/data/services/auth_session_store.dart';

class AiInsightsApiException implements Exception {
  const AiInsightsApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AiAlertItem {
  const AiAlertItem({
    required this.id,
    required this.type,
    required this.severity,
    required this.message,
  });

  final String id;
  final String type;
  final String severity;
  final String message;
}

class AiInsightsBundle {
  const AiInsightsBundle({
    required this.summaryInsight,
    required this.summaryObservations,
    required this.overallRisk,
    required this.fallEvents,
    required this.trendStatus,
    required this.trendInsight,
    required this.recentHeartRates,
    required this.alerts,
    required this.errors,
  });

  final String summaryInsight;
  final List<String> summaryObservations;
  final String overallRisk;
  final int fallEvents;
  final String trendStatus;
  final String trendInsight;
  final List<int> recentHeartRates;
  final List<AiAlertItem> alerts;
  final List<String> errors;
}

class ClearMonitoringHistoryResult {
  const ClearMonitoringHistoryResult({
    required this.message,
    required this.deletedHealthRecords,
    required this.deletedAlerts,
  });

  final String message;
  final int deletedHealthRecords;
  final int deletedAlerts;
}

class AiInsightsApiService {
  AiInsightsApiService({http.Client? client})
    : _client = client ?? http.Client();

  final http.Client _client;

  Uri _buildUri(String path, [Map<String, String>? queryParameters]) {
    final base = AppConfig.apiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final normalizedPath = path.startsWith('/') ? path : '/$path';

    // Prevent accidental double "/api" when API_BASE_URL already ends with /api.
    final hasApiSuffix = base.toLowerCase().endsWith('/api');
    final resolvedPath =
        hasApiSuffix && normalizedPath.toLowerCase().startsWith('/api/')
        ? normalizedPath.substring(4)
        : normalizedPath;

    return Uri.parse(
      '$base$resolvedPath',
    ).replace(queryParameters: queryParameters);
  }

  Future<AiInsightsBundle> fetchInsights({
    int days = 7,
    int alertLimit = 10,
  }) async {
    final token = await AuthSessionStore.accessToken();
    if (token == null || token.trim().isEmpty) {
      throw const AiInsightsApiException(
        'Patient session is missing. Please log in again.',
      );
    }

    final language = await AppPreferencesService.advisoryLanguageCode();

    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${token.trim()}',
    };

    late final List<http.Response> responses;
    try {
      responses = await Future.wait<http.Response>([
        _client.get(
          _buildUri('/api/ai/summary', <String, String>{'days': '$days', 'language': language}),
          headers: headers,
        ),
        _client.get(_buildUri('/api/ai/trend-insight', <String, String>{'language': language}), headers: headers),
        _client.get(
          _buildUri('/api/ai/alerts', <String, String>{'limit': '$alertLimit'}),
          headers: headers,
        ),
      ]);
    } on SocketException catch (_) {
      throw AiInsightsApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AiInsightsApiException(_networkErrorMessage());
    }

    final summaryResponse = responses[0];
    final trendResponse = responses[1];
    final alertsResponse = responses[2];

    final summaryBody = _safeDecodeJson(summaryResponse.body);
    final trendBody = _safeDecodeJson(trendResponse.body);
    final alertsBody = _safeDecodeJson(alertsResponse.body);

    final errors = <String>[];

    String summaryInsight = '';
    List<String> summaryObservations = const <String>[];
    String overallRisk = 'LOW';
    int fallEvents = 0;

    if (_isSuccessful(summaryResponse.statusCode)) {
      final summaryData = _asMap(summaryBody['summaryData']);
      summaryInsight = _stringValue(summaryBody['insight']);
      summaryObservations = _stringList(summaryData['observations']);
      overallRisk = _stringValue(
        summaryData['overallRisk'],
        fallback: 'LOW',
      ).toUpperCase();
      fallEvents = _intValue(summaryData['fallEvents']);
    } else {
      errors.add(
        'Summary: ${_extractErrorMessage(summaryBody, summaryResponse)}',
      );
    }

    String trendStatus = 'INSUFFICIENT_DATA';
    String trendInsight = '';
    List<int> recentHeartRates = const <int>[];
    if (_isSuccessful(trendResponse.statusCode)) {
      final trendData = _asMap(trendBody['trendData']);
      trendStatus = _stringValue(
        trendData['trend'],
        fallback: 'INSUFFICIENT_DATA',
      ).toUpperCase();
      trendInsight = _stringValue(trendBody['insight']);
      recentHeartRates = _intList(trendData['recentHeartRates']);
    } else {
      errors.add('Trend: ${_extractErrorMessage(trendBody, trendResponse)}');
    }

    List<AiAlertItem> alerts = const <AiAlertItem>[];
    if (_isSuccessful(alertsResponse.statusCode)) {
      alerts = _alertsList(alertsBody['alerts']);
    } else {
      errors.add('Alerts: ${_extractErrorMessage(alertsBody, alertsResponse)}');
    }

    return AiInsightsBundle(
      summaryInsight: summaryInsight,
      summaryObservations: summaryObservations,
      overallRisk: overallRisk,
      fallEvents: fallEvents,
      trendStatus: trendStatus,
      trendInsight: trendInsight,
      recentHeartRates: recentHeartRates,
      alerts: alerts,
      errors: errors,
    );
  }

  Future<ClearMonitoringHistoryResult> clearMonitoringHistory() async {
    final token = await AuthSessionStore.accessToken();
    if (token == null || token.trim().isEmpty) {
      throw const AiInsightsApiException(
        'Patient session is missing. Please log in again.',
      );
    }

    late final http.Response response;
    try {
      response = await _client.delete(
        _buildUri('/api/ai/history'),
        headers: <String, String>{
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${token.trim()}',
        },
      );
    } on SocketException catch (_) {
      throw AiInsightsApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AiInsightsApiException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (!_isSuccessful(response.statusCode)) {
      throw AiInsightsApiException(_extractErrorMessage(body, response));
    }

    final deleted = _asMap(body['deleted']);
    return ClearMonitoringHistoryResult(
      message: _stringValue(
        body['message'],
        fallback: 'Monitoring history cleared.',
      ),
      deletedHealthRecords: _intValue(deleted['healthRecords']),
      deletedAlerts: _intValue(deleted['alerts']),
    );
  }

  Map<String, dynamic> _safeDecodeJson(String raw) {
    if (raw.trim().isEmpty) {
      return <String, dynamic>{};
    }
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return <String, dynamic>{};
    } catch (_) {
      return <String, dynamic>{};
    }
  }

  bool _isSuccessful(int statusCode) {
    return statusCode >= 200 && statusCode < 300;
  }

  Map<String, dynamic> _asMap(Object? value) {
    return value is Map<String, dynamic> ? value : <String, dynamic>{};
  }

  String _stringValue(Object? value, {String fallback = ''}) {
    final parsed = (value ?? '').toString().trim();
    return parsed.isNotEmpty ? parsed : fallback;
  }

  int _intValue(Object? value) {
    if (value is int) return value;
    final parsed = int.tryParse((value ?? '').toString());
    return parsed ?? 0;
  }

  List<String> _stringList(Object? value) {
    if (value is! List) return const <String>[];
    return value
        .map((entry) => _stringValue(entry))
        .where((entry) => entry.isNotEmpty)
        .toList(growable: false);
  }

  List<int> _intList(Object? value) {
    if (value is! List) return const <int>[];
    return value
        .map((entry) => int.tryParse((entry ?? '').toString()))
        .whereType<int>()
        .toList(growable: false);
  }

  List<AiAlertItem> _alertsList(Object? value) {
    if (value is! List) return const <AiAlertItem>[];

    final parsed = <AiAlertItem>[];
    for (final item in value) {
      if (item is! Map<String, dynamic>) {
        continue;
      }
      parsed.add(
        AiAlertItem(
          id: _stringValue(item['_id']),
          type: _stringValue(item['type'], fallback: 'ALERT'),
          severity: _stringValue(
            item['severity'],
            fallback: 'LOW',
          ).toUpperCase(),
          message: _stringValue(
            item['message'],
            fallback: 'No message provided.',
          ),
        ),
      );
    }
    return parsed;
  }

  String _extractErrorMessage(
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

  String _networkErrorMessage() {
    return 'Cannot reach API at ${AppConfig.apiBaseUrl}. Check backend server and API_BASE_URL.';
  }
}
