import 'package:flutter/material.dart';
import 'core/routes/app_router.dart';

void main() {
  runApp(const BioTrackApp());
}

class BioTrackApp extends StatelessWidget {
  const BioTrackApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      initialRoute: '/',
      routes: AppRouter.routes,
      theme: ThemeData(
        scaffoldBackgroundColor: Colors.white,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          elevation: 0,
          iconTheme: IconThemeData(color: Colors.black),
        ),
      ),
    );
  }
}
