import 'dart:async';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

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

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final controller = context.read<ScanVitalsController>();
      controller.addListener(() {
        if (controller.scanComplete && !_isShowingPopup && mounted) {
          _handleFinish(controller);
        }
      });
    });
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

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ScanVitalsController>();

    return Scaffold(
      backgroundColor: const Color(0xFFF4F8EF),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF4F8EF),
        elevation: 0,
        leading: IconButton(
          onPressed: () => context.pop(),
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text(
          'Live Vital Scan',
          style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: controller.initializing
              ? const Center(child: CircularProgressIndicator())
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
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            height: 220,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(18),
            ),
            clipBehavior: Clip.antiAlias,
            child:
                controller.cameraController != null &&
                    controller.cameraController!.value.isInitialized
                ? CameraPreview(controller.cameraController!)
                : const Center(
                    child: Text(
                      'Camera unavailable',
                      style: TextStyle(color: Colors.white70),
                    ),
                  ),
          ),
          const SizedBox(height: 14),
          Text(
            controller.scanComplete
                ? 'Scan complete'
                : 'Scanning in progress (${controller.timeLabel} remaining)',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            value: controller.scanProgress,
            minHeight: 8,
            color: const Color(0xFF4C9A2A),
            borderRadius: BorderRadius.circular(12),
            backgroundColor: const Color(0xFFE4E9DE),
          ),
          const SizedBox(height: 16),
          _MetricCard(
            title: 'Heart Rate',
            value: controller.estimatedBpm == null
                ? '-- bpm'
                : '${controller.estimatedBpm} bpm',
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: 'Finger Cover',
                  value: controller.fingerDetected
                      ? 'Detected'
                      : 'Not detected',
                  valueColor: controller.fingerDetected
                      ? Colors.green
                      : Colors.red,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  title: 'Finger Confidence',
                  value:
                      '${(controller.fingerConfidence * 100).toStringAsFixed(0)}%',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: 'Activity',
                  value: controller.movementLabel,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  title: 'Gyro',
                  value: controller.gyroMagnitude.toStringAsFixed(2),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _MetricCard(
                  title: 'Fall Status',
                  value: controller.fallDetected ? 'Possible fall' : 'Normal',
                  valueColor: controller.fallDetected
                      ? Colors.red
                      : Colors.green,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _MetricCard(
                  title: 'Signal State',
                  value: controller.signalLabel,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'Quality Coach',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${(controller.qualityCoachScore * 100).toStringAsFixed(0)}% - ${controller.qualityCoachLevel}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.black54,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  controller.qualityCoachMessage,
                  style: const TextStyle(fontSize: 13, color: Colors.black87),
                ),
                const SizedBox(height: 4),
                Text(
                  controller.sensorHealthLabel,
                  style: const TextStyle(fontSize: 12, color: Colors.black54),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          if (controller.scanComplete)
            ElevatedButton(
              onPressed: controller.startScan,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4C9A2A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(26),
                ),
              ),
              child: const Text('Scan Again'),
            )
          else
            Row(
              children: [
                if (controller.canSwitchLens) ...[
                  Expanded(
                    child: OutlinedButton(
                      onPressed: controller.restartWithNextLens,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF4C9A2A),
                        side: const BorderSide(color: Color(0xFF4C9A2A)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(26),
                        ),
                      ),
                      child: Text(controller.activeLensLabel),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _handleFinish(controller),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4C9A2A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(26),
                      ),
                    ),
                    child: const Text('Finish Early'),
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
            ? 'No finger was detected. Torch is unavailable on this camera - use a bright light source and cover the lens fully, then retry.'
            : controller.canSwitchLens
            ? 'No finger was detected. Cover the camera lens and flash fully, or tap ${controller.activeLensLabel} to try another back camera.'
            : 'No finger was detected. Cover the camera lens and flash fully. Some phones have the flash too far from the camera for this scan to work.',
      'weak_contact' =>
        'Finger contact was too weak to extract a reliable pulse. Cover the camera and flash more fully, then hold steady.',
      _ =>
        'A finger was detected, but the pulse signal was not stable enough to produce a reliable BPM. Hold still, keep steady pressure, and retry.',
    };

    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Text(
            !successfulScan ? 'Scanning Unsuccessful' : 'Scan Successful',
          ),
          content: Text(
            !successfulScan
                ? failureMessage
                : 'Your vitals have been recorded. ${savedToServer ? "" : "\n\nNote: $saveErrorMessage"}',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close', style: TextStyle(color: Colors.grey)),
            ),
            if (successfulScan)
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(dialogContext);
                  context.go('/records');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF4C9A2A),
                ),
                child: const Text(
                  'View Records',
                  style: TextStyle(color: Colors.white),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    this.valueColor,
  });

  final String title;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 12, color: Colors.black54),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: valueColor ?? Colors.black87,
            ),
          ),
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
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 16),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 14),
          ElevatedButton(onPressed: onRetry, child: const Text('Try Again')),
        ],
      ),
    );
  }
}
