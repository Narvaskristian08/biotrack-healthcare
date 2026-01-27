import 'package:flutter/material.dart';
import '../../features/auth/presentation/screens/onboarding/onboarding_page.dart';
import '../../features/auth/presentation/screens/onboarding/auth_choice_page.dart';
import '../../features/auth/presentation/screens/onboarding/login_page.dart';
import '../../features/auth/presentation/screens/onboarding/health_details_page.dart';

class AppRouter {
  static final routes = <String, WidgetBuilder>{
    '/': (_) => const OnboardingPage(),
    '/auth': (_) => const AuthChoicePage(),
    '/login': (_) => const LoginPage(),
    '/health-details': (_) => const HealthDetailsPage(),
  };
}
