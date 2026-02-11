import 'package:shared_preferences/shared_preferences.dart';

import '../models/auth_login_result.dart';

class AuthSessionStore {
  static const String _tokenKey = 'auth.access_token';
  static const String _patientIdKey = 'auth.patient_id';
  static const String _patientNameKey = 'auth.patient_name';
  static const String _emailKey = 'auth.email';

  static Future<void> save(AuthLoginResult result) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, result.accessToken);
    await prefs.setString(_patientIdKey, result.patientId);
    await prefs.setString(_patientNameKey, result.fullName);
    await prefs.setString(_emailKey, result.email);
  }

  static Future<String?> accessToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_patientIdKey);
    await prefs.remove(_patientNameKey);
    await prefs.remove(_emailKey);
  }
}
