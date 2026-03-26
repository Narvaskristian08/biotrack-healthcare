import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_ui.dart';

class ScanPage extends StatelessWidget {
  const ScanPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Vital Scan'),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.sm,
          AppSpacing.lg,
          140,
        ),
        children: [
          const AppPageHeader(
            eyebrow: 'CAMERA-BASED MEASUREMENT',
            title: 'Prepare for a calm, steady scan',
            subtitle:
                'Place one fingertip over the camera and flash, then hold still while BioTrack measures your pulse.',
          ),
          const SizedBox(height: AppSpacing.xl),
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadii.xl),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: <Color>[Color(0xFF162B23), Color(0xFF27493D)],
              ),
            ),
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadii.xl),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadii.lg),
                    child: AspectRatio(
                      aspectRatio: 1,
                      child: Image.asset(
                        'assets/images/finger_scan.png',
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  'BioTrack uses light and color changes from your fingertip to estimate heart rate.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.white.withValues(alpha: 0.88),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.xl),
          const AppSectionHeader(
            title: 'Before you begin',
            subtitle:
                'A better signal produces a more trustworthy reading and smoother AI interpretation.',
          ),
          const SizedBox(height: AppSpacing.md),
          const _InstructionStep(
            number: '1',
            title: 'Cover the camera and flash fully',
            description:
                'Use a single fingertip and make sure both the lens and flash are blocked.',
          ),
          const SizedBox(height: AppSpacing.sm),
          const _InstructionStep(
            number: '2',
            title: 'Rest your hand on a stable surface',
            description:
                'Reducing movement helps the scan lock onto a clearer pulse pattern faster.',
          ),
          const SizedBox(height: AppSpacing.sm),
          const _InstructionStep(
            number: '3',
            title: 'Stay in bright, steady lighting',
            description:
                'If torch support is limited on your device, ambient light will improve finger detection.',
          ),
          const SizedBox(height: AppSpacing.lg),
          const AppInfoBanner(
            title: 'Privacy note',
            message:
                'The live camera preview is used only during the scan flow to measure pulse quality and store your resulting health record.',
            tone: AppTone.info,
          ),
          const SizedBox(height: AppSpacing.lg),
          AppCard(
            color: AppColors.surfaceMuted,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ready to measure?',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  'A full scan takes about 18 seconds. You can review signal quality and finish early if needed.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: AppSpacing.md),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => context.push('/scan/live'),
                    child: const Text('Begin camera scan'),
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

class _InstructionStep extends StatelessWidget {
  const _InstructionStep({
    required this.number,
    required this.title,
    required this.description,
  });

  final String number;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: AppColors.primaryGreenLight,
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            alignment: Alignment.center,
            child: Text(
              number,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                color: AppColors.primaryGreenDark,
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: AppSpacing.xxs),
                Text(description, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
