import 'package:flutter/material.dart';
import 'core/routes/app_router.dart';
import 'core/theme/app_colors.dart';

void main() {
  runApp(const BioTrackApp());
}

class BioTrackApp extends StatelessWidget {
  const BioTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      routerConfig: AppRouter.router,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Roboto',

        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryGreen,
          primary: AppColors.primaryGreen,
          secondary: AppColors.primaryGreenDark, 
        ),
        scaffoldBackgroundColor: AppColors.softBackground,

        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          iconTheme: IconThemeData(color: AppColors.darkText),
          titleTextStyle: TextStyle(
            fontFamily: 'Inter',
            color: AppColors.darkText,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),

        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            textStyle: const TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ),

        textTheme: const TextTheme(
          // Use Inter for big Display/Headlines
          displayLarge: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.bold,
          ),
          headlineMedium: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w700,
          ),
          titleLarge: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w600,
          ),

          bodyLarge: TextStyle(fontSize: 16, height: 1.5),
          bodyMedium: TextStyle(fontSize: 14, height: 1.4),
        ),
      ),
    );
  }
}
