import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../../core/config/app_config.dart';
import '../models/auth_login_result.dart';
import '../models/health_center_option.dart';

class AuthApiException implements Exception {
  const AuthApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AuthApiService {
  AuthApiService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Uri _buildUri(String path) {
    return Uri.parse('${AppConfig.apiBaseUrl}$path');
  }

  Future<List<HealthCenterOption>> listHealthCenters() async {
    final response = await _client.get(_buildUri('/api/healthcenters'));
    final body = _safeDecodeJson(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    final items = (body['healthCenters'] as List<dynamic>? ?? const [])
        .whereType<Map<String, dynamic>>()
        .map(HealthCenterOption.fromJson)
        .where((item) => item.id.isNotEmpty && item.name.isNotEmpty)
        .toList(growable: false);

    return items;
  }

  Future<void> registerPatient({
    required String healthCenterId,
    required String firstName,
    required String lastName,
    required String middleInitial,
    required String email,
    required String password,
    required String address,
    required String contactNumber,
    String mrn = '',
    String nameExtension = '',
  }) async {
    final payload = <String, dynamic>{
      'healthCenterId': healthCenterId,
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'middleInitial': middleInitial.trim(),
      'email': email.trim(),
      'password': password,
      'address': address.trim(),
      'contactNumber': contactNumber.trim(),
      if (mrn.trim().isNotEmpty) 'mrn': mrn.trim(),
      if (nameExtension.trim().isNotEmpty)
        'nameExtension': nameExtension.trim(),
    };

    final response = await _client.post(
      _buildUri('/api/patients/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    final body = _safeDecodeJson(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }
  }

  Future<AuthLoginResult> loginPatient({
    required String email,
    required String password,
  }) async {
    final response = await _client.post(
      _buildUri('/api/patients/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email.trim(), 'password': password}),
    );

    final body = _safeDecodeJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    final patient = (body['patient'] as Map<String, dynamic>? ?? const {});
    final token = (body['accessToken'] ?? '').toString();
    final patientId = (patient['id'] ?? '').toString();

    if (token.isEmpty || patientId.isEmpty) {
      throw const AuthApiException(
        'Login response is missing access token or patient profile.',
      );
    }

    return AuthLoginResult(
      accessToken: token,
      patientId: patientId,
      firstName: (patient['firstName'] ?? '').toString(),
      lastName: (patient['lastName'] ?? '').toString(),
      email: (patient['email'] ?? '').toString(),
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

  String _extractErrorMessage(
    Map<String, dynamic> body,
    http.Response response,
  ) {
    final fromErrorMap = (body['error'] as Map<String, dynamic>?)?['message'];
    final fromMessage = body['message'];
    final message = (fromErrorMap ?? fromMessage ?? '').toString();
    if (message.isNotEmpty) {
      return message;
    }

    return 'Request failed (${response.statusCode})';
  }
}
