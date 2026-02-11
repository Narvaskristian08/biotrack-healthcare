import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';
import 'package:biotrack_healthcare/core/services/permission_service.dart';

class HealthPermissionPage extends StatefulWidget {
  const HealthPermissionPage({super.key});

  @override
  State<HealthPermissionPage> createState() => _HealthPermissionPageState();
}

class _HealthPermissionPageState extends State<HealthPermissionPage> {
  bool _cameraGranted = false;
  bool _motionGranted = false;
  bool _notificationGranted = false;
  bool _busy = false;

  // Show confirmation dialog for a permission
  void _confirmPermission(
    BuildContext context, {
    required String title,
    required Future<bool> Function() requestPermission,
    required void Function(bool granted) onResult,
    String? nextRoute,
  }) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Text(title),
        content: const Text('Allow this permission now?'),
        actions: [
          TextButton(onPressed: () => context.pop(), child: const Text('No')),
          ElevatedButton(
            onPressed: () {
              context.pop();
              _requestPermission(
                title: title,
                requestPermission: requestPermission,
                onResult: onResult,
              );

              // Navigate to next page if provided
              if (nextRoute != null) {
                context.go(nextRoute);
              }
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
    required Future<bool> Function() requestPermission,
    required void Function(bool granted) onResult,
    required bool granted,
    String? nextRoute,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
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
                    onPressed: _busy
                        ? null
                        : () => _confirmPermission(
                            context,
                            title: title,
                            requestPermission: requestPermission,
                            onResult: onResult,
                            nextRoute: nextRoute,
                          ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: granted
                          ? Colors.green
                          : AppColors.primaryBlue,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                    ),
                    child: Text(
                      granted ? 'Granted' : 'Allow',
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

  Future<void> _requestPermission({
    required String title,
    required Future<bool> Function() requestPermission,
    required void Function(bool granted) onResult,
  }) async {
    setState(() => _busy = true);
    final granted = await requestPermission();
    if (!mounted) {
      return;
    }

    onResult(granted);
    setState(() => _busy = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          granted ? '$title granted' : '$title denied by the system',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.pop()),
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
              requestPermission: PermissionService.requestCameraPermission,
              onResult: (granted) => setState(() => _cameraGranted = granted),
              granted: _cameraGranted,
            ),

            const SizedBox(height: 16),

            _permissionCard(
              context: context,
              icon: Icons.directions_run,
              title: 'Motion Sensors',
              description:
                  'Allows BioTrack to detect physical activity, movement patterns, and possible fall events.',
              requestPermission: PermissionService.requestMotionPermission,
              onResult: (granted) => setState(() => _motionGranted = granted),
              granted: _motionGranted,
            ),

            const SizedBox(height: 16),

            _permissionCard(
              context: context,
              icon: Icons.notifications_active,
              title: 'Notifications',
              description:
                  'Receive alerts when unusual vital signs are detected or when immediate attention is required.',
              requestPermission:
                  PermissionService.requestNotificationPermission,
              onResult: (granted) =>
                  setState(() => _notificationGranted = granted),
              granted: _notificationGranted,
            ),
            const SizedBox(height: 20),
            Text(
              'Current status: Camera ${_cameraGranted ? "granted" : "pending"} | '
              'Motion ${_motionGranted ? "granted" : "pending"} | '
              'Notifications ${_notificationGranted ? "granted" : "pending"}',
              style: const TextStyle(fontSize: 12, color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }
}
