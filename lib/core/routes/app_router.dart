import 'package:go_router/go_router.dart';

import '../../features/auth/presentation/screens/onboarding/onboarding_page.dart';
import '../../features/auth/presentation/screens/onboarding/auth_choice_page.dart';
import '../../features/auth/presentation/screens/onboarding/login_page.dart';
import '../../features/auth/presentation/screens/onboarding/signup_page.dart';
import '../../features/auth/presentation/screens/onboarding/health_details_page.dart';

import '../../features/home/presentation/shells/main_shell.dart';
import '../../features/home/presentation/screens/home_page.dart';
import '../../features/home/presentation/screens/scan_page.dart';
import '../../features/home/presentation/screens/scan_vitals_page.dart';
import '../../features/home/presentation/screens/ai_insights_page.dart';
import '../../features/home/presentation/screens/records_page.dart';
import '../../features/home/presentation/screens/profile_page.dart';

class AppRouter {
  // TODO: Implement riverpod integration for state, and route management.
  // GoRouter instance used throughout the app.
  // This handles all navigation including onboarding/auth flow and the main app shell.
  static final GoRouter router = GoRouter(
    initialLocation: '/',

    // All routes in the app
    routes: [
      GoRoute(
        path: '/',
        name: 'onboarding',
        builder: (context, state) => const OnboardingPage(),
      ),
      GoRoute(
        path: '/auth',
        name: 'authChoice',
        builder: (context, state) => const AuthChoicePage(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: '/signup',
        name: 'signup',
        builder: (context, state) => const SignupPage(),
      ),
      GoRoute(
        path: '/health-details',
        name: 'healthDetails',
        builder: (context, state) => const HealthDetailsPage(),
      ),
      GoRoute(
        path: '/scan/live',
        name: 'scanLive',
        builder: (context, state) => const ScanVitalsPage(),
      ),

      // Main App Shell (persistent BottomNavigationBar)
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            name: 'home',
            builder: (context, state) => const HomePage(),
          ),
          GoRoute(
            path: '/scan',
            name: 'scan',
            builder: (context, state) => const ScanPage(),
          ),
          GoRoute(
            path: '/ai-insights',
            name: 'aiInsights',
            builder: (context, state) => const AiInsightsPage(),
          ),
          GoRoute(
            path: '/records',
            name: 'records',
            builder: (context, state) => const RecordsPage(),
          ),
          GoRoute(
            path: '/profile',
            name: 'profile',
            builder: (context, state) => const ProfilePage(),
          ),
        ],
      ),
    ],
  );
}
