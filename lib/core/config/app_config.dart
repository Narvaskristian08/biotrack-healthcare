class AppConfig {
  const AppConfig._();

  // Override with:
  // flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );
}
