import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:camera/camera.dart';
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
  // Use a flag to ensure we only trigger the popup once
  bool _isShowingPopup = false;

  @override
  void initState() {
    super.initState();
    // Listen for the scan completing automatically via the controller's timer
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final controller = context.read<ScanVitalsController>();
      controller.addListener(() {
        if (controller.scanComplete && !_isShowingPopup && mounted) {
          _handleFinish(context, controller);
        }
      });
    });
  }

  Future<void> _handleFinish(BuildContext context, ScanVitalsController controller) async {
    if (_isShowingPopup) return;
    setState(() => _isShowingPopup = true);

    final result = await controller.finishScan();
    if (!mounted) return;

    final success = result['success'] as bool? ?? false;
    final saved = result['saved'] as bool? ?? false;
    final error = result['error'] as String?;

    await _showCompletionPopup(context, controller, success, saved, error);
    
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
        title: const Text('Live Vital Scan', 
          style: TextStyle(fontWeight: FontWeight.w600, color: Colors.black)),
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

  Widget _buildScannerContent(BuildContext context, ScanVitalsController controller) {
    return SingleChildScrollView(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Camera Preview
          Container(
            height: 220,
            decoration: BoxDecoration(
              color: Colors.black, 
              borderRadius: BorderRadius.circular(18),
            ),
            clipBehavior: Clip.antiAlias,
            child: controller.cameraController != null && 
                   controller.cameraController!.value.isInitialized
                ? CameraPreview(controller.cameraController!)
                : const Center(child: Text('Camera unavailable', 
                    style: TextStyle(color: Colors.white70))),
          ),
          const SizedBox(height: 14),
          
          // Progress Section
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

          // Metrics Grid
          _MetricCard(
            title: 'Heart Rate', 
            value: controller.estimatedBpm == null ? '-- bpm' : '${controller.estimatedBpm} bpm'
          ),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _MetricCard(
              title: 'Finger Cover', 
              value: controller.fingerDetected ? 'Detected' : 'Not detected',
              valueColor: controller.fingerDetected ? Colors.green : Colors.red,
            )),
            const SizedBox(width: 10),
            Expanded(child: _MetricCard(
              title: 'Finger Confidence', 
              value: '${(controller.fingerConfidence * 100).toStringAsFixed(0)}%'
            )),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _MetricCard(title: 'Activity', value: controller.movementLabel)),
            const SizedBox(width: 10),
            Expanded(child: _MetricCard(title: 'Gyro', value: controller.gyroMagnitude.toStringAsFixed(2))),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _MetricCard(
              title: 'Fall Status', 
              value: controller.fallDetected ? 'Possible fall' : 'Normal',
              valueColor: controller.fallDetected ? Colors.red : Colors.green,
            )),
            const SizedBox(width: 10),
            Expanded(child: _MetricCard(title: 'Signal State', value: controller.signalLabel)),
          ]),
          const SizedBox(height: 20),

          // Control Button
          ElevatedButton(
            onPressed: () {
              if (controller.scanComplete) {
                controller.startScan(); // Resets the scan
              } else {
                _handleFinish(context, controller); // Finishes early
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4C9A2A),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(26)),
            ),
            child: Text(controller.scanComplete ? 'Scan Again' : 'Finish Early'),
          ),
        ],
      ),
    );
  }

  Future<void> _showCompletionPopup(BuildContext context, ScanVitalsController controller, bool successfulScan, bool savedToServer, String? saveErrorMessage) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(!successfulScan ? 'Scanning Unsuccessful' : 'Scan Successful'),
          content: Text(!successfulScan 
            ? 'No finger was detected. Please place your fingertip over the camera and flash, then try again.' 
            : 'Your vitals have been recorded. ${savedToServer ? "" : "\n\nNote: $saveErrorMessage"}'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext), 
              child: const Text('Close', style: TextStyle(color: Colors.grey))
            ),
            if (successfulScan)
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(dialogContext);
                  context.go('/records');
                }, 
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF4C9A2A)),
                child: const Text('View Records', style: TextStyle(color: Colors.white))
              ),
          ],
        );
      },
    );
  }
}

// Re-using your original helper widgets
class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.title, required this.value, this.valueColor});
  final String title;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: valueColor ?? Colors.black87)),
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