import 'package:flutter/material.dart';
import 'package:biotrack_healthcare/core/constants/app_colors.dart';

class HealthPermissionPage extends StatelessWidget {
  const HealthPermissionPage({super.key});

  void _confirmPermission(
    BuildContext context, {
    required String title,
    required String description,
  }) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: const Text('Are you sure you want to allow this permission?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('No'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text('$title enabled')));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color.fromARGB(255, 169, 238, 152),
              foregroundColor: Colors.white,
            ),
            child: const Text(
              'Yes',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _permissionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String description,
    required String buttonText,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color.fromARGB(255, 255, 255, 255),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primaryBlue, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  description,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: ElevatedButton(
                    onPressed: () => _confirmPermission(
                      context,
                      title: title,
                      description: description,
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryBlue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                    child: Text(
                      buttonText,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: const Text(
          'Enable Health Permission',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'To accurately monitor your health, BioTrack needs access to the following features. '
              'Your data is encrypted, private, and always under your control.',
              style: TextStyle(color: Colors.grey, fontSize: 13, height: 1.4),
            ),
            const SizedBox(height: 24),

            _permissionCard(
              context: context,
              icon: Icons.camera_alt,
              title: 'Camera & Flash',
              description:
                  'Used to measure your heart rate by detecting subtle changes in blood flow.',
              buttonText: 'Allow Camera Access',
            ),

            const SizedBox(height: 16),

            _permissionCard(
              context: context,
              icon: Icons.directions_run,
              title: 'Motion Sensors',
              description:
                  'Allows BioTrack to detect physical activity, movement patterns, and possible fall events.',
              buttonText: 'Enable Motion Access',
            ),

            const SizedBox(height: 16),

            _permissionCard(
              context: context,
              icon: Icons.notifications_active,
              title: 'Notifications',
              description:
                  'Receive alerts when unusual vital signs are detected or when immediate attention is required.',
              buttonText: 'Allow Notification Access',
            ),
          ],
        ),
      ),
    );
  }
}
