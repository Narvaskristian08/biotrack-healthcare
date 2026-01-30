import 'package:flutter/material.dart';
import 'home_page.dart';
import 'scan_page.dart';
import 'ai_insights_page.dart';
import 'records_page.dart';
import 'profile_page.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _index = 0;

  final pages = const [
    HomePage(),
    ScanPage(),
    AiInsightsPage(),
    RecordsPage(),
    ProfilePage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: pages[_index],

      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF2E3A44), // ✅ dark nav bg
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        type: BottomNavigationBarType.fixed,

        selectedItemColor: Colors.green,          // ✅ active = green
        unselectedItemColor: Colors.white70,      // ✅ inactive = white

        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w600,
          fontSize: 12,
        ),
        unselectedLabelStyle: const TextStyle(
          fontSize: 12,
        ),

        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.favorite),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.camera_alt),
            label: 'Scan',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.insights),
            label: 'AI Insights',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bar_chart),
            label: 'Records',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
