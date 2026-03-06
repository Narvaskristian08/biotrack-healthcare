import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../../../../core/config/app_config.dart';
import '../models/auth_login_result.dart';
import '../models/health_center_option.dart';
import 'auth_session_store.dart';

class AuthApiException implements Exception {
  const AuthApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

class AuthMfaRequiredException extends AuthApiException {
  const AuthMfaRequiredException({
    required this.patientId,
    required this.challengeId,
    required this.method,
    this.recipientMasked = '',
    this.devPreviewCode = '',
  }) : super('MFA verification required');

  final String patientId;
  final String challengeId;
  final String method;
  final String recipientMasked;
  final String devPreviewCode;
}

class PatientRegistrationResult {
  const PatientRegistrationResult({
    required this.patientId,
    required this.email,
    required this.contactNumber,
    this.assignedHealthCenter,
  });

  final String patientId;
  final String email;
  final String contactNumber;
  final AssignedHealthCenterResult? assignedHealthCenter;
}

class PatientVerificationCodeSendResult {
  const PatientVerificationCodeSendResult({
    required this.message,
    required this.method,
    this.recipientMasked = '',
    this.devPreviewCode = '',
  });

  final String message;
  final String method;
  final String recipientMasked;
  final String devPreviewCode;
}

class PatientPasswordResetCodeSendResult {
  const PatientPasswordResetCodeSendResult({
    required this.message,
    this.devPreviewCode = '',
  });

  final String message;
  final String devPreviewCode;
}

class AssignedHealthCenterResult {
  const AssignedHealthCenterResult({
    required this.id,
    required this.name,
    required this.barangayName,
    required this.cityMunicipality,
    required this.healthCenterName,
    required this.address,
    required this.contactNumber,
    required this.officialContactInfo,
  });

  final String id;
  final String name;
  final String barangayName;
  final String cityMunicipality;
  final String healthCenterName;
  final String address;
  final String contactNumber;
  final String officialContactInfo;

  String get displayName {
    if (healthCenterName.trim().isNotEmpty) return healthCenterName.trim();
    if (name.trim().isNotEmpty) return name.trim();
    return 'Healthcare Provider';
  }

  String get locationLabel {
    final values = <String>[
      barangayName.trim(),
      cityMunicipality.trim(),
    ].where((item) => item.isNotEmpty).toList(growable: false);
    return values.join(', ');
  }
}

class PatientProfileResult {
  const PatientProfileResult({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.middleInitial,
    required this.email,
    required this.address,
    required this.contactNumber,
    required this.emergencyContactName,
    required this.emergencyContactPhone,
    required this.healthCenterId,
    required this.assignedHealthCenter,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String middleInitial;
  final String email;
  final String address;
  final String contactNumber;
  final String emergencyContactName;
  final String emergencyContactPhone;
  final String healthCenterId;
  final AssignedHealthCenterResult? assignedHealthCenter;

  String get fullName {
    final full = '$firstName $lastName'.trim();
    return full.isEmpty ? 'Patient' : full;
  }
}

class PatientLoginHistoryEntry {
  const PatientLoginHistoryEntry({
    required this.id,
    required this.loginAt,
    required this.expiresAt,
    required this.ip,
    required this.userAgent,
  });

  final String id;
  final DateTime? loginAt;
  final DateTime? expiresAt;
  final String ip;
  final String userAgent;
}

class AuthApiService {
  AuthApiService({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  Uri _buildUri(String path) {
    final base = AppConfig.apiBaseUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final normalizedPath = path.startsWith('/') ? path : '/$path';

    // Prevent accidental double "/api" when API_BASE_URL already ends with /api.
    final hasApiSuffix = base.toLowerCase().endsWith('/api');
    final resolvedPath =
        hasApiSuffix && normalizedPath.toLowerCase().startsWith('/api/')
        ? normalizedPath.substring(4)
        : normalizedPath;

    return Uri.parse('$base$resolvedPath');
  }

  Future<List<HealthCenterOption>> listHealthCenters() async {
    late final http.Response response;
    try {
      response = await _client.get(_buildUri('/api/healthcenters'));
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }
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

  Future<PatientRegistrationResult> registerPatient({
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
    String birthDate = '',
    String sex = 'unknown',
    String guardianName = '',
    String emergencyContactName = '',
    String emergencyContactPhone = '',
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
      if (birthDate.trim().isNotEmpty) 'birthDate': birthDate.trim(),
      if (sex.trim().isNotEmpty) 'sex': sex.trim().toLowerCase(),
      if (guardianName.trim().isNotEmpty) 'guardianName': guardianName.trim(),
      if (emergencyContactName.trim().isNotEmpty)
        'emergencyContactName': emergencyContactName.trim(),
      if (emergencyContactPhone.trim().isNotEmpty)
        'emergencyContactPhone': emergencyContactPhone.trim(),
    };

    late final http.Response response;
    try {
      response = await _client.post(
        _buildUri('/api/patients/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }
    final body = _safeDecodeJson(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    final patient = (body['patient'] as Map<String, dynamic>? ?? const {});
    final patientId = (patient['id'] ?? '').toString().trim();
    if (patientId.isEmpty) {
      throw const AuthApiException(
        'Registration completed but verification session is missing. Please try again.',
      );
    }

    AssignedHealthCenterResult? assignedHealthCenter;
    final rawCenter =
        patient['assignedHealthCenter'] as Map<String, dynamic>? ?? const {};
    if (rawCenter.isNotEmpty) {
      assignedHealthCenter = AssignedHealthCenterResult(
        id: (rawCenter['id'] ?? '').toString(),
        name: (rawCenter['name'] ?? '').toString(),
        barangayName: (rawCenter['barangayName'] ?? '').toString(),
        cityMunicipality: (rawCenter['cityMunicipality'] ?? '').toString(),
        healthCenterName: (rawCenter['healthCenterName'] ?? '').toString(),
        address: (rawCenter['address'] ?? '').toString(),
        contactNumber: (rawCenter['contactNumber'] ?? '').toString(),
        officialContactInfo: (rawCenter['officialContactInfo'] ?? '')
            .toString(),
      );
    }

    return PatientRegistrationResult(
      patientId: patientId,
      email: (patient['email'] ?? email).toString(),
      contactNumber: (patient['contactNumber'] ?? contactNumber).toString(),
      assignedHealthCenter: assignedHealthCenter,
    );
  }

  Future<PatientVerificationCodeSendResult> sendPatientVerificationCode({
    required String patientId,
    required String method,
  }) async {
    final normalizedMethod = method.trim().toLowerCase() == 'sms'
        ? 'sms'
        : 'email';

    late final http.Response response;
    try {
      response = await _client.post(
        _buildUri('/api/patients/verification/send-code'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'patientId': patientId.trim(),
          'method': normalizedMethod,
        }),
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }
    final body = _safeDecodeJson(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    return PatientVerificationCodeSendResult(
      message: (body['message'] ?? 'Verification code sent').toString(),
      method: (body['method'] ?? normalizedMethod).toString(),
      recipientMasked: (body['recipientMasked'] ?? '').toString(),
      devPreviewCode: (body['devPreviewCode'] ?? '').toString(),
    );
  }

  Future<String> verifyPatientRegistrationCode({
    required String patientId,
    required String method,
    required String code,
  }) async {
    final normalizedMethod = method.trim().toLowerCase() == 'sms'
        ? 'sms'
        : 'email';

    late final http.Response response;
    try {
      response = await _client.post(
        _buildUri('/api/patients/verification/verify-code'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'patientId': patientId.trim(),
          'method': normalizedMethod,
          'code': code.trim(),
        }),
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }
    final body = _safeDecodeJson(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    return (body['message'] ?? 'Account verified successfully').toString();
  }

  Future<PatientProfileResult> fetchMyPatientProfile() async {
    final token = await AuthSessionStore.accessToken();
    final patientId = await AuthSessionStore.patientId();
    if (token == null ||
        token.trim().isEmpty ||
        patientId == null ||
        patientId.trim().isEmpty) {
      throw const AuthApiException(
        'Patient session is missing. Please log in again.',
      );
    }

    late final http.Response response;
    try {
      response = await _client.get(
        _buildUri('/api/patients/${patientId.trim()}'),
        headers: <String, String>{
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${token.trim()}',
        },
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }
    final body = _safeDecodeJson(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    final patient = (body['patient'] as Map<String, dynamic>? ?? const {});
    final resolvedId = (patient['_id'] ?? patient['id'] ?? '')
        .toString()
        .trim();
    if (resolvedId.isEmpty) {
      throw const AuthApiException(
        'Profile response is missing patient information.',
      );
    }

    return _parsePatientProfile(patient, resolvedId: resolvedId);
  }

  Future<PatientProfileResult> updateMyPatientProfile({
    String? firstName,
    String? lastName,
    String? middleInitial,
    String? email,
    String? address,
    String? contactNumber,
    String? emergencyContactName,
    String? emergencyContactPhone,
  }) async {
    final token = await AuthSessionStore.accessToken();
    final patientId = await AuthSessionStore.patientId();
    if (token == null ||
        token.trim().isEmpty ||
        patientId == null ||
        patientId.trim().isEmpty) {
      throw const AuthApiException(
        'Patient session is missing. Please log in again.',
      );
    }

    final payload = <String, dynamic>{};
    if (firstName != null) payload['firstName'] = firstName.trim();
    if (lastName != null) payload['lastName'] = lastName.trim();
    if (middleInitial != null) {
      payload['middleInitial'] = middleInitial.trim();
    }
    if (email != null) payload['email'] = email.trim().toLowerCase();
    if (address != null) payload['address'] = address.trim();
    if (contactNumber != null) {
      payload['contactNumber'] = contactNumber.trim();
    }
    if (emergencyContactName != null) {
      payload['emergencyContactName'] = emergencyContactName.trim();
    }
    if (emergencyContactPhone != null) {
      payload['emergencyContactPhone'] = emergencyContactPhone.trim();
    }

    late final http.Response response;
    try {
      response = await _client.patch(
        _buildUri('/api/patients/${patientId.trim()}'),
        headers: <String, String>{
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${token.trim()}',
        },
        body: jsonEncode(payload),
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    final patient = (body['patient'] as Map<String, dynamic>? ?? const {});
    final resolvedId = (patient['_id'] ?? patient['id'] ?? '')
        .toString()
        .trim();
    if (resolvedId.isEmpty) {
      throw const AuthApiException(
        'Profile response is missing patient information.',
      );
    }

    return _parsePatientProfile(patient, resolvedId: resolvedId);
  }

  Future<List<PatientLoginHistoryEntry>> fetchMyLoginHistory({
    int limit = 20,
  }) async {
    final token = await AuthSessionStore.accessToken();
    final patientId = await AuthSessionStore.patientId();
    if (token == null ||
        token.trim().isEmpty ||
        patientId == null ||
        patientId.trim().isEmpty) {
      throw const AuthApiException(
        'Patient session is missing. Please log in again.',
      );
    }

    late final http.Response response;
    try {
      response = await _client.get(
        _buildUri(
          '/api/patients/${patientId.trim()}/login-history?limit=$limit',
        ),
        headers: <String, String>{
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${token.trim()}',
        },
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    final items = (body['history'] as List<dynamic>? ?? const <dynamic>[])
        .whereType<Map<String, dynamic>>()
        .map(
          (item) => PatientLoginHistoryEntry(
            id: (item['id'] ?? item['_id'] ?? '').toString(),
            loginAt: DateTime.tryParse((item['loginAt'] ?? '').toString()),
            expiresAt: DateTime.tryParse((item['expiresAt'] ?? '').toString()),
            ip: (item['ip'] ?? '').toString(),
            userAgent: (item['userAgent'] ?? '').toString(),
          ),
        )
        .toList(growable: false);

    return items;
  }

  Future<AuthLoginResult> loginPatient({
    required String email,
    required String password,
  }) async {
    late final http.Response response;
    try {
      response = await _client.post(
        _buildUri('/api/patients/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim(), 'password': password}),
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    if (body['mfaRequired'] == true) {
      final patientId = (body['patientId'] ?? '').toString().trim();
      final challengeId = (body['challengeId'] ?? '').toString().trim();
      if (patientId.isEmpty || challengeId.isEmpty) {
        throw const AuthApiException(
          'MFA challenge is invalid. Please try signing in again.',
        );
      }
      throw AuthMfaRequiredException(
        patientId: patientId,
        challengeId: challengeId,
        method: (body['method'] ?? 'email').toString().toLowerCase() == 'sms'
            ? 'sms'
            : 'email',
        recipientMasked: (body['recipientMasked'] ?? '').toString(),
        devPreviewCode: (body['devPreviewCode'] ?? '').toString(),
      );
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

  Future<AuthLoginResult> verifyPatientLoginMfa({
    required String patientId,
    required String challengeId,
    required String code,
  }) async {
    late final http.Response response;
    try {
      response = await _client.post(
        _buildUri('/api/patients/login/verify-mfa'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'patientId': patientId.trim(),
          'challengeId': challengeId.trim(),
          'code': code.trim(),
        }),
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    final patient = (body['patient'] as Map<String, dynamic>? ?? const {});
    final token = (body['accessToken'] ?? '').toString();
    final resolvedPatientId = (patient['id'] ?? '').toString();
    if (token.isEmpty || resolvedPatientId.isEmpty) {
      throw const AuthApiException(
        'MFA verification response is missing access token or patient profile.',
      );
    }

    return AuthLoginResult(
      accessToken: token,
      patientId: resolvedPatientId,
      firstName: (patient['firstName'] ?? '').toString(),
      lastName: (patient['lastName'] ?? '').toString(),
      email: (patient['email'] ?? '').toString(),
    );
  }

  Future<PatientPasswordResetCodeSendResult>
  requestPatientPasswordResetCode({
    required String email,
  }) async {
    late final http.Response response;
    try {
      response = await _client.post(
        _buildUri('/api/patients/password/forgot'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email.trim()}),
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    return PatientPasswordResetCodeSendResult(
      message: (body['message'] ?? 'If your account exists, a reset code has been sent.').toString(),
      devPreviewCode: (body['devPreviewCode'] ?? '').toString(),
    );
  }

  Future<String> resetPatientPasswordWithCode({
    required String email,
    required String code,
    required String newPassword,
  }) async {
    late final http.Response response;
    try {
      response = await _client.post(
        _buildUri('/api/patients/password/reset'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email.trim(),
          'code': code.trim(),
          'newPassword': newPassword,
        }),
      );
    } on SocketException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    } on http.ClientException catch (_) {
      throw AuthApiException(_networkErrorMessage());
    }

    final body = _safeDecodeJson(response.body);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthApiException(_extractErrorMessage(body, response));
    }

    return (body['message'] ?? 'Password updated successfully. You can now log in.').toString();
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

  String _networkErrorMessage() {
    return 'Cannot reach API at ${AppConfig.apiBaseUrl}. Check backend server and API_BASE_URL.';
  }

  PatientProfileResult _parsePatientProfile(
    Map<String, dynamic> patient, {
    required String resolvedId,
  }) {
    final assignedHealthCenter = _parseAssignedHealthCenter(
      patient['assignedHealthCenter'] as Map<String, dynamic>? ?? const {},
    );

    return PatientProfileResult(
      id: resolvedId,
      firstName: (patient['firstName'] ?? '').toString(),
      lastName: (patient['lastName'] ?? '').toString(),
      middleInitial: (patient['middleInitial'] ?? '').toString(),
      email: (patient['email'] ?? '').toString(),
      address: (patient['address'] ?? '').toString(),
      contactNumber: (patient['contactNumber'] ?? '').toString(),
      emergencyContactName:
          (patient['emergencyContactName'] ?? '').toString(),
      emergencyContactPhone:
          (patient['emergencyContactPhone'] ?? '').toString(),
      healthCenterId: (patient['healthCenterId'] ?? '').toString(),
      assignedHealthCenter: assignedHealthCenter,
    );
  }

  AssignedHealthCenterResult? _parseAssignedHealthCenter(
    Map<String, dynamic> rawCenter,
  ) {
    if (rawCenter.isEmpty) {
      return null;
    }

    return AssignedHealthCenterResult(
      id: (rawCenter['id'] ?? '').toString(),
      name: (rawCenter['name'] ?? '').toString(),
      barangayName: (rawCenter['barangayName'] ?? '').toString(),
      cityMunicipality: (rawCenter['cityMunicipality'] ?? '').toString(),
      healthCenterName: (rawCenter['healthCenterName'] ?? '').toString(),
      address: (rawCenter['address'] ?? '').toString(),
      contactNumber: (rawCenter['contactNumber'] ?? '').toString(),
      officialContactInfo: (rawCenter['officialContactInfo'] ?? '').toString(),
    );
  }
}
