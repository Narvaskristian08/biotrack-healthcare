import 'package:shared_preferences/shared_preferences.dart';

class AppPreferencesService {
  AppPreferencesService._();

  static const String _advisoryLanguageKey = 'app.advisory_language';
  static const String english = 'en';
  static const String filipino = 'fil';

  static Future<String> advisoryLanguageCode() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = (prefs.getString(_advisoryLanguageKey) ?? english).trim().toLowerCase();
    if (raw == filipino) return filipino;
    return english;
  }

  static Future<void> setAdvisoryLanguageCode(String languageCode) async {
    final prefs = await SharedPreferences.getInstance();
    final normalized = languageCode.trim().toLowerCase();
    if (normalized == filipino) {
      await prefs.setString(_advisoryLanguageKey, filipino);
      return;
    }
    await prefs.setString(_advisoryLanguageKey, english);
  }
}

