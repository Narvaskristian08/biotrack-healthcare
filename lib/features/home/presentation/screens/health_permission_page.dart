import 'package:biotrack_healthcare/core/services/permission_service.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';
import 'package:biotrack_healthcare/core/theme/app_radii.dart';
import 'package:biotrack_healthcare/core/theme/app_spacing.dart';
import 'package:biotrack_healthcare/core/widgets/app_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

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

  void _confirmPermission({
    required String title,
    required Future<bool> Function() requestPermission,
    required void Function(bool granted) onResult,
  }) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Allow $title?'),
        content: const Text(
          'BioTrack will request this permission from the system now.',
        ),
        actions: [
          TextButton(
            onPressed: () => context.pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              context.pop();
              _requestPermission(
                title: title,
                requestPermission: requestPermission,
                onResult: onResult,
              );
            },
            child: const Text('Continue'),
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
    if (!mounted) return;

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
    final grantedCount = <bool>[
      _cameraGranted,
      _motionGranted,
      _notificationGranted,
    ].where((value) => value).length;

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        leading: BackButton(onPressed: () => context.pop()),
        title: const Text('Health Permissions'),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            AppSpacing.xl,
          ),
          children: [
            const AppPageHeader(
              eyebrow: 'DEVICE ACCESS',
              title: 'Enable the permissions needed for health monitoring',
              subtitle:
                  'BioTrack uses camera, motion, and notification access to deliver scans, safety context, and timely alerts.',
            ),
            const SizedBox(height: AppSpacing.lg),
            AppCard(
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: AppColors.primaryGreenLight,
                      borderRadius: BorderRadius.circular(AppRadii.lg),
                    ),
                    child: const Icon(
                      Icons.shield_outlined,
                      color: AppColors.primaryGreenDark,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Permission status',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: AppSpacing.xxs),
                        Text(
                          '$grantedCount of 3 permissions granted',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  AppStatusBadge(
                    label: grantedCount == 3 ? 'Ready' : 'Needs review',
                    tone: grantedCount == 3 ? AppTone.success : AppTone.warning,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            _PermissionCard(
              icon: Icons.camera_alt_outlined,
              title: 'Camera and flash',
              description:
                  'Used to measure your heart rate by reading pulse-related light changes through your fingertip.',
              granted: _cameraGranted,
              busy: _busy,
              onPressed: () => _confirmPermission(
                title: 'Camera and flash',
                requestPermission: PermissionService.requestCameraPermission,
                onResult: (granted) => setState(() => _cameraGranted = granted),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            _PermissionCard(
              icon: Icons.directions_run_outlined,
              title: 'Motion sensors',
              description:
                  'Lets BioTrack track movement quality during scans and observe potential fall-related changes.',
              granted: _motionGranted,
              busy: _busy,
              onPressed: () => _confirmPermission(
                title: 'Motion sensors',
                requestPermission: PermissionService.requestMotionPermission,
                onResult: (granted) => setState(() => _motionGranted = granted),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            _PermissionCard(
              icon: Icons.notifications_active_outlined,
              title: 'Notifications',
              description:
                  'Allows BioTrack to surface high-priority health alerts and monitoring reminders.',
              granted: _notificationGranted,
              busy: _busy,
              onPressed: () => _confirmPermission(
                title: 'Notifications',
                requestPermission:
                    PermissionService.requestNotificationPermission,
                onResult: (granted) =>
                    setState(() => _notificationGranted = granted),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            const AppInfoBanner(
              title: 'Privacy reminder',
              message:
                  'Permissions can be changed later from the operating system if you need to review or revoke access.',
              tone: AppTone.info,
            ),
          ],
        ),
      ),
    );
  }
}

class _PermissionCard extends StatelessWidget {
  const _PermissionCard({
    required this.icon,
    required this.title,
    required this.description,
    required this.granted,
    required this.busy,
    required this.onPressed,
  });

  final IconData icon;
  final String title;
  final String description;
  final bool granted;
  final bool busy;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: granted
                  ? AppColors.primaryGreenLight
                  : AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: Icon(
              icon,
              color: granted
                  ? AppColors.primaryGreenDark
                  : AppColors.secondaryText,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    AppStatusBadge(
                      label: granted ? 'Granted' : 'Pending',
                      tone: granted ? AppTone.success : AppTone.warning,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(description, style: Theme.of(context).textTheme.bodySmall),
                const SizedBox(height: AppSpacing.md),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: busy ? null : onPressed,
                    child: Text(
                      granted ? 'Review permission' : 'Allow permission',
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
}
