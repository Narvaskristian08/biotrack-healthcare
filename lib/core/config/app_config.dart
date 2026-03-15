import 'package:flutter/foundation.dart';

class AppConfig {
  const AppConfig._();

  static const String _currentLanApiBaseUrl = 'http://192.168.254.123:3000';

  static const String _apiBaseUrlOverride = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '',
  );
  static const int _apiRequestTimeoutMsOverride = int.fromEnvironment(
    'API_REQUEST_TIMEOUT_MS',
    defaultValue: 10000,
  );

  // Override with:
  // flutter run --dart-define=API_BASE_URL=http://192.168.254.123:3000
  static String get apiBaseUrl {
    final configured = _apiBaseUrlOverride.trim();
    if (configured.isNotEmpty) {
      return configured;
    }

    if (kIsWeb) {
      return 'http://127.0.0.1:3000';
    }

    return switch (defaultTargetPlatform) {
      TargetPlatform.android => _currentLanApiBaseUrl,
      TargetPlatform.iOS => _currentLanApiBaseUrl,
      _ => 'http://127.0.0.1:3000',
    };
  }

  static Duration get apiRequestTimeout {
    final configured = _apiRequestTimeoutMsOverride;
    final boundedMs = configured < 3000
        ? 3000
        : (configured > 60000 ? 60000 : configured);
    return Duration(milliseconds: boundedMs);
  }
}
