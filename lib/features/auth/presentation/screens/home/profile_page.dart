import 'package:biotrack_healthcare/features/auth/presentation/screens/home/app_settings_page.dart';
import 'package:biotrack_healthcare/features/auth/presentation/screens/home/health_permission_page.dart';

import 'package:flutter/material.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F8EF),

      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: const Color(0xFFF4F8EF),
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Profile',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
      ),

      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          child: Column(
            children: [
              /// USER INFO CARD
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Column(
                  children: [
                    Text(
                      'Mark M. Words',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Male | Age 32',
                      style: TextStyle(fontSize: 14, color: Colors.grey),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              /// MENU ITEMS
              _profileItem(
                icon: Icons.edit,
                title: 'Edit Profile',
                onTap: () {},
              ),

              _profileItem(
                icon: Icons.phone,
                title: 'Emergency Contact',
                subtitle: '+639123456789',
                onTap: () {},
              ),

              _profileItem(
                icon: Icons.check_box_outlined,
                title: 'Health Permission',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const HealthPermissionPage(),
                    ),
                  );
                },
              ),

              _profileItem(
                icon: Icons.settings,
                title: 'Privacy and App Settings',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AppSettingsPage()),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// PROFILE ROW ITEM
  static Widget _profileItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: ListTile(
        leading: Icon(icon, color: Colors.black),
        title: Text(
          title,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
        ),
        subtitle: subtitle != null
            ? Text(subtitle, style: const TextStyle(fontSize: 13))
            : null,
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }
}
