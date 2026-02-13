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
            color: AppColors.darkText,
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
      ),
    );
  }
}
