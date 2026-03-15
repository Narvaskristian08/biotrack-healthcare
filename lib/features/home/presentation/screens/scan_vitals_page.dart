import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_ui.dart';
import '../controllers/scan_vitals_controller.dart';

class ScanVitalsPage extends StatelessWidget {
  const ScanVitalsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ScanVitalsController()..startScan(),
      child: const _ScanVitalsView(),
    );
  }
}

class _ScanVitalsView extends StatefulWidget {
  const _ScanVitalsView();

  @override
  State<_ScanVitalsView> createState() => _ScanVitalsViewState();
}

class _ScanVitalsViewState extends State<_ScanVitalsView> {
  bool _isShowingPopup = false;
  ScanVitalsController? _observedController;
  VoidCallback? _controllerListener;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final controller = context.read<ScanVitalsController>();
      _observedController = controller;
      _controllerListener = () {
        if (controller.scanComplete && !_isShowingPopup && mounted) {
          _handleFinish(controller);
        }
      };
      controller.addListener(_controllerListener!);
    });
  }

  @override
  void dispose() {
    final controller = _observedController;
    final listener = _controllerListener;
    if (controller != null && listener != null) {
      controller.removeListener(listener);
    }
    super.dispose();
  }

  Future<void> _handleFinish(ScanVitalsController controller) async {
    if (_isShowingPopup) return;
    setState(() => _isShowingPopup = true);

    final result = await controller.finishScan();
    if (!mounted) return;

    final success = result['success'] as bool? ?? false;
    final saved = result['saved'] as bool? ?? false;
    final error = result['error'] as String?;
    final reason = result['reason'] as String?;

    await _showCompletionPopup(
      context,
      controller,
      success,
      saved,
      error,
      reason,
    );

    if (mounted) {
      setState(() => _isShowingPopup = false);
    }
  }

  AppTone _signalTone(ScanVitalsController controller) {
    if (controller.scanComplete) return AppTone.success;
    if (!controller.fingerDetected) return AppTone.warning;
    if (controller.movementIntensity > 2.8) return AppTone.warning;
    if (controller.hrConfidence >= 0.12) return AppTone.success;
    return AppTone.info;
  }

  AppTone _qualityTone(ScanVitalsController controller) {
    final score = controller.qualityCoachScore;
    if (score >= 0.75) return AppTone.success;
    if (score >= 0.5) return AppTone.accent;
    if (score >= 0.3) return AppTone.warning;
    return AppTone.danger;
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ScanVitalsController>();

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        backgroundColor: AppColors.softBackground,
        title: const Text('Live Vital Scan'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            AppSpacing.lg,
          ),
          child: controller.initializing
              ? const _LoadingState()
              : controller.errorMessage != null
              ? _ErrorView(
                  message: controller.errorMessage!,
                  onRetry: controller.startScan,
                )
              : _buildScannerContent(context, controller),
        ),
      ),
    );
  }

  Widget _buildScannerContent(
    BuildContext context,
    ScanVitalsController controller,
  ) {
    final qualityTone = _qualityTone(controller);
    final signalTone = _signalTone(controller);
    final progress = controller.scanProgress;
    final signalQuality = (controller.signalQualityScore * 100)
        .clamp(0, 100)
        .round();
    final fingerConfidence = (controller.fingerConfidence * 100)
        .clamp(0, 100)
        .round();

    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _ScanPreviewCard(controller: controller, tone: signalTone),
          const SizedBox(height: AppSpacing.md),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AppStatusBadge(
                            label: controller.scanComplete
                                ? 'Scan complete'
                                : controller.signalLabel,
                            tone: signalTone,
                            icon: controller.scanComplete
                                ? Icons.check_circle_outline
                                : Icons.monitor_heart_outlined,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Text(
                            controller.estimatedBpm == null
                                ? '-- bpm'
                                : '${controller.estimatedBpm} bpm',
                            style: Theme.of(context).textTheme.headlineLarge
                                ?.copyWith(color: AppColors.darkText),
                          ),
                          const SizedBox(height: AppSpacing.xxs),
                          Text(
                            controller.scanComplete
                                ? 'Final heart-rate estimate'
                                : 'Live estimate from your current pulse signal',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    SizedBox(
                      width: 72,
                      height: 72,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          CircularProgressIndicator(
                            value: progress,
                            strokeWidth: 7,
                            backgroundColor: AppColors.surfaceTint,
                            color: AppColors.primaryGreen,
                          ),
                          Center(
                            child: Text(
                              '${(progress * 100).round()}%',
                              style: Theme.of(context).textTheme.labelLarge,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                Text(
                  controller.scanComplete
                      ? 'Measurement saved. You can start another scan or review your records.'
                      : '${controller.timeLabel} remaining. Keep your fingertip steady for the most reliable reading.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.md),
                LinearProgressIndicator(
                  value: progress,
                  minHeight: 8,
                  backgroundColor: AppColors.surfaceTint,
                  borderRadius: BorderRadius.circular(AppRadii.pill),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          LayoutBuilder(
            builder: (context, constraints) {
              final tileWidth = (constraints.maxWidth - AppSpacing.sm) / 2;
              return Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  SizedBox(
                    width: tileWidth,
                    child: AppMetricCard(
                      icon: controller.fingerDetected
                          ? Icons.fingerprint_rounded
                          : Icons.touch_app_outlined,
                      label: 'Finger contact',
                      value: controller.fingerDetected
                          ? 'Detected'
                          : 'Adjust finger',
                      helper: 'Confidence $fingerConfidence%',
                      tone: controller.fingerDetected
                          ? AppTone.success
                          : AppTone.warning,
                    ),
                  ),
                  SizedBox(
                    width: tileWidth,
                    child: AppMetricCard(
                      icon: Icons.tune_rounded,
                      label: 'Signal quality',
                      value: '$signalQuality%',
                      helper: controller.hrConfidence <= 0
                          ? 'Awaiting a cleaner pulse trace'
                          : 'HR confidence ${(controller.hrConfidence * 100).round()}%',
                      tone: qualityTone,
                    ),
                  ),
                  SizedBox(
                    width: tileWidth,
                    child: AppMetricCard(
                      icon: Icons.motion_photos_auto_outlined,
                      label: 'Movement',
                      value: controller.movementLabel,
                      helper:
                          'Gyro ${controller.gyroMagnitude.toStringAsFixed(2)} rad/s',
                      tone: controller.movementIntensity > 2.8
                          ? AppTone.warning
                          : AppTone.success,
                    ),
                  ),
                  SizedBox(
                    width: tileWidth,
                    child: AppMetricCard(
                      icon: Icons.health_and_safety_outlined,
                      label: 'Safety context',
                      value: controller.fallDetected
                          ? 'Review posture'
                          : 'Stable',
                      helper: controller.sensorHealthLabel,
                      tone: controller.fallDetected
                          ? AppTone.danger
                          : AppTone.info,
                    ),
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: AppSpacing.md),
          _QualityCoachCard(
            level: controller.qualityCoachLevel,
            score: '${(controller.qualityCoachScore * 100).round()}%',
            message: controller.qualityCoachMessage,
            helper: controller.sensorHealthLabel,
            tone: qualityTone,
          ),
          const SizedBox(height: AppSpacing.lg),
          if (controller.scanComplete)
            ElevatedButton(
              onPressed: controller.startScan,
              child: const Text('Start another scan'),
            )
          else
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                if (controller.canSwitchLens)
                  SizedBox(
                    width: controller.canSwitchLens
                        ? (MediaQuery.sizeOf(context).width - 52) / 2
                        : double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: controller.restartWithNextLens,
                      icon: const Icon(Icons.cameraswitch_outlined),
                      label: Text(controller.activeLensLabel),
                    ),
                  ),
                SizedBox(
                  width: controller.canSwitchLens
                      ? (MediaQuery.sizeOf(context).width - 52) / 2
                      : double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _handleFinish(controller),
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Finish scan'),
                  ),
                ),
              ],
            ),
        ],
      ),
    );
  }

  Future<void> _showCompletionPopup(
    BuildContext context,
    ScanVitalsController controller,
    bool successfulScan,
    bool savedToServer,
    String? saveErrorMessage,
    String? failureReason,
  ) async {
    final failureMessage = switch (failureReason) {
      'no_finger' =>
        !controller.torchAvailable
            ? 'No finger was detected. Torch is unavailable on this camera, so use bright ambient light and cover the lens fully before retrying.'
            : controller.canSwitchLens
            ? 'No finger was detected. Cover the camera and flash fully, or try switching to another back camera before retrying.'
            : 'No finger was detected. Cover the camera and flash fully. Some devices place the flash too far from the camera for this type of scan.',
      'weak_contact' =>
        'Finger contact was too weak to extract a reliable pulse. Cover the camera and flash more fully, then keep your hand steady.',
      _ =>
        'A finger was detected, but the pulse signal was not stable enough to produce a reliable BPM. Hold still, keep steady pressure, and retry.',
    };

    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          titlePadding: const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            AppSpacing.xl,
            AppSpacing.xl,
            AppSpacing.sm,
          ),
          contentPadding: const EdgeInsets.fromLTRB(
            AppSpacing.xl,
            0,
            AppSpacing.xl,
            AppSpacing.xl,
          ),
          title: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: successfulScan
                      ? AppColors.primaryGreenLight
                      : AppColors.danger.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadii.lg),
                ),
                child: Icon(
                  successfulScan
                      ? Icons.check_circle_outline
                      : Icons.error_outline,
                  color: successfulScan
                      ? AppColors.primaryGreenDark
                      : AppColors.danger,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  successfulScan ? 'Scan completed' : 'Scan needs another try',
                ),
              ),
            ],
          ),
          content: Text(
            successfulScan
                ? 'Your vitals have been recorded.${savedToServer ? '' : ' The scan result is available, but syncing reported: $saveErrorMessage'}'
                : failureMessage,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(successfulScan ? 'Close' : 'Try again later'),
            ),
            if (successfulScan)
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(dialogContext);
                  context.go('/records');
                },
                child: const Text('View records'),
              ),
          ],
        );
      },
    );
  }
}

class _ScanPreviewCard extends StatelessWidget {
  const _ScanPreviewCard({required this.controller, required this.tone});

  final ScanVitalsController controller;
  final AppTone tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 290,
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(AppRadii.xl),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadow.withValues(alpha: 0.12),
            blurRadius: 28,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (controller.cameraController != null &&
              controller.cameraController!.value.isInitialized)
            CameraPreview(controller.cameraController!)
          else
            Container(
              color: const Color(0xFF101512),
              alignment: Alignment.center,
              child: const Text(
                'Camera unavailable',
                style: TextStyle(color: Colors.white70),
              ),
            ),
          IgnorePointer(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: <Color>[
                    Colors.black.withValues(alpha: 0.30),
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.45),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: AppSpacing.md,
            left: AppSpacing.md,
            child: AppStatusBadge(
              label: controller.fingerDetected
                  ? 'Finger detected'
                  : 'Position fingertip',
              tone: tone,
            ),
          ),
          Positioned(
            top: AppSpacing.md,
            right: AppSpacing.md,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xs,
              ),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(AppRadii.pill),
              ),
              child: Text(
                controller.timeLabel,
                style: Theme.of(
                  context,
                ).textTheme.labelSmall?.copyWith(color: Colors.white),
              ),
            ),
          ),
          Center(
            child: Container(
              width: 132,
              height: 132,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.5),
                  width: 2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.white.withValues(alpha: 0.12),
                    blurRadius: 18,
                    spreadRadius: 8,
                  ),
                ],
              ),
              child: Center(
                child: Icon(
                  Icons.fingerprint_rounded,
                  size: 42,
                  color: Colors.white.withValues(alpha: 0.85),
                ),
              ),
            ),
          ),
          Positioned(
            left: AppSpacing.md,
            right: AppSpacing.md,
            bottom: AppSpacing.md,
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadii.lg),
                border: Border.all(color: Colors.white.withValues(alpha: 0.16)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.monitor_heart_outlined, color: Colors.white),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      'Keep your finger steady over the camera and flash until the progress completes.',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QualityCoachCard extends StatelessWidget {
  const _QualityCoachCard({
    required this.level,
    required this.score,
    required this.message,
    required this.helper,
    required this.tone,
  });

  final String level;
  final String score;
  final String message;
  final String helper;
  final AppTone tone;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      color: appToneBackground(tone).withValues(alpha: 0.55),
      borderColor: appToneForeground(tone).withValues(alpha: 0.18),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: appToneBackground(tone),
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: Icon(
              Icons.auto_awesome_outlined,
              color: appToneForeground(tone),
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
                        'Quality coach',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    AppStatusBadge(label: '$score | $level', tone: tone),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(message, style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(helper, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: const [
          AppSkeletonCard(
            padding: EdgeInsets.zero,
            child: SizedBox(
              height: 290,
              child: AppSkeletonBlock(height: 290, radius: AppRadii.xl),
            ),
          ),
          SizedBox(height: AppSpacing.md),
          AppSkeletonCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: AppSkeletonParagraph(
                        lines: 4,
                        lineHeight: 13,
                        lastLineFactor: 0.58,
                      ),
                    ),
                    SizedBox(width: AppSpacing.md),
                    AppSkeletonBlock(
                      width: 72,
                      height: 72,
                      radius: AppRadii.pill,
                    ),
                  ],
                ),
                SizedBox(height: AppSpacing.md),
                AppSkeletonBlock(height: 8, radius: AppRadii.pill),
              ],
            ),
          ),
          SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(child: _ScanMetricSkeleton()),
              SizedBox(width: AppSpacing.sm),
              Expanded(child: _ScanMetricSkeleton()),
            ],
          ),
          SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              Expanded(child: _ScanMetricSkeleton()),
              SizedBox(width: AppSpacing.sm),
              Expanded(child: _ScanMetricSkeleton()),
            ],
          ),
          SizedBox(height: AppSpacing.md),
          AppSkeletonCard(
            child: AppSkeletonParagraph(
              lines: 4,
              lineHeight: 12,
              lastLineFactor: 0.62,
            ),
          ),
          SizedBox(height: AppSpacing.lg),
          AppSkeletonBlock(height: 52, radius: AppRadii.lg),
        ],
      ),
    );
  }
}

class _ScanMetricSkeleton extends StatelessWidget {
  const _ScanMetricSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppSkeletonCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          AppSkeletonBlock(width: 36, height: 36, radius: AppRadii.md),
          SizedBox(height: AppSpacing.sm),
          AppSkeletonBlock(width: 82, height: 18, radius: AppRadii.pill),
          SizedBox(height: AppSpacing.xs),
          AppSkeletonBlock(width: 92, height: 12, radius: AppRadii.pill),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AppEmptyState(
        icon: Icons.error_outline,
        title: 'Unable to start the scan',
        subtitle: message,
        action: ElevatedButton(
          onPressed: onRetry,
          child: const Text('Try again'),
        ),
      ),
    );
  }
}
