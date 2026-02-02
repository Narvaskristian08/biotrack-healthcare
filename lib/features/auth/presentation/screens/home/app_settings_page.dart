import 'package:flutter/material.dart';
import 'package:biotrack_healthcare/core/constants/app_colors.dart';

class AppSettingsPage extends StatefulWidget {
  const AppSettingsPage({super.key});

  @override
  State<AppSettingsPage> createState() => _AppSettingsPageState();
}

class _AppSettingsPageState extends State<AppSettingsPage> {
  bool healthAlerts = true;
  bool generalNotifications = true;
  bool exportHealthData = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text('Privacy and App Settings'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Data Protection',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),

            _infoCard(
              title: 'Encrypted Health Data',
              description:
                  'Your health data is encrypted and securely stored on your device and cloud services.',
            ),

            const SizedBox(height: 12),

            _infoCard(
              title: 'Blockchain Verification',
              description:
                  'Health records are hashed and verified to ensure data integrity and tamper resistance.',
              trailing: const Text(
                'Verification Status: Active',
                style: TextStyle(color: Colors.green),
              ),
            ),

            const SizedBox(height: 24),

            const Text(
              'Customize Notifications',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),

            SwitchListTile(
              value: healthAlerts,
              onChanged: (v) => setState(() => healthAlerts = v),
              title: const Text('Health Alerts'),
              subtitle: const Text(
                'Receive alerts for unusual heart rate or activity changes',
              ),
              activeColor: AppColors.primaryBlue,
            ),

            SwitchListTile(
              value: generalNotifications,
              onChanged: (v) => setState(() => generalNotifications = v),
              title: const Text('General Notifications'),
              subtitle: const Text('Share anonymized data for research'),
              activeColor: AppColors.primaryBlue,
            ),

            SwitchListTile(
              value: exportHealthData,
              onChanged: (v) => setState(() => exportHealthData = v),
              title: const Text('Export Health Data'),
              subtitle: const Text('Download your health records securely'),
              activeColor: AppColors.primaryBlue,
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoCard({
    required String title,
    required String description,
    Widget? trailing,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 8),
          Text(description, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
