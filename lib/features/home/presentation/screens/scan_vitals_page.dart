import 'dart:async';
import 'dart:io';
import 'dart:math' as math;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../../../core/services/permission_service.dart';
import '../controllers/heart_rate_estimator.dart';

class ScanVitalsPage extends StatefulWidget {
  const ScanVitalsPage({super.key});

  @override
  State<ScanVitalsPage> createState() => _ScanVitalsPageState();
}

class _ScanVitalsPageState extends State<ScanVitalsPage> {
  static const Duration _scanDuration = Duration(seconds: 25);
  static const double _fingerConfidenceThreshold = 0.56;
  static const int _clearBpmAfterNoFingerFrames = 8;
  static const int _clearBpmAfterLowQualityFrames = 18;

  final HeartRateEstimator _heartRateEstimator = HeartRateEstimator();

  CameraController? _cameraController;
  StreamSubscription<AccelerometerEvent>? _accelerometerSub;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSub;
  Timer? _progressTicker;

  bool _initializing = true;
  bool _scanComplete = false;
  bool _fallDetected = false;
  bool _isProcessingFrame = false;
  bool _hasCameraPermission = false;
  bool _hasMotionPermission = false;
  bool _hasNotificationPermission = false;
  DateTime? _scanStartedAt;
  DateTime? _impactDetectedAt;
  DateTime _lastProcessedFrameAt = DateTime.fromMillisecondsSinceEpoch(
    0,
    isUtc: true,
  );

  int? _estimatedBpm;
  double _hrConfidence = 0;
  double _signalStrength = 0;
  double _fingerConfidence = 0;
  bool _fingerDetected = false;
  double _movementIntensity = 0;
  double _gyroMagnitude = 0;
  String? _errorMessage;
  int _noFingerFrameStreak = 0;
  int _lowQualityFrameStreak = 0;

  @override
  void initState() {
    super.initState();
    unawaited(_startScanFlow());
  }

  @override
  void dispose() {
    _progressTicker?.cancel();
    unawaited(_shutdownCamera());
    _accelerometerSub?.cancel();
    _gyroscopeSub?.cancel();
    super.dispose();
  }

  Future<void> _startScanFlow() async {
    setState(() {
      _initializing = true;
      _scanComplete = false;
      _fallDetected = false;
      _estimatedBpm = null;
      _hrConfidence = 0;
      _signalStrength = 0;
      _fingerConfidence = 0;
      _fingerDetected = false;
      _movementIntensity = 0;
      _gyroMagnitude = 0;
      _errorMessage = null;
      _noFingerFrameStreak = 0;
      _lowQualityFrameStreak = 0;
    });

    final permissions = await PermissionService.requestCorePermissions();
    _hasCameraPermission = permissions.cameraGranted;
    _hasMotionPermission = permissions.motionGranted;
    _hasNotificationPermission = permissions.notificationGranted;

    if (!_hasCameraPermission) {
      setState(() {
        _initializing = false;
        _errorMessage = 'Camera permission is required to start PPG scanning.';
      });
      return;
    }

    await _initializeCamera();
    _startMotionTracking();
  }

  Future<void> _initializeCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() {
          _initializing = false;
          _errorMessage = 'No camera was found on this device.';
        });
        return;
      }

      final selectedCamera = cameras.firstWhere(
        (camera) => camera.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      final controller = CameraController(
        selectedCamera,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: Platform.isIOS
            ? ImageFormatGroup.bgra8888
            : ImageFormatGroup.yuv420,
      );

      await controller.initialize();
      await controller.lockCaptureOrientation(DeviceOrientation.portraitUp);
      await controller.setFlashMode(FlashMode.torch);
      try {
        await controller.setExposureMode(ExposureMode.locked);
      } catch (_) {
        // Ignore unsupported/manual exposure errors for this device.
      }
      try {
        await controller.setFocusMode(FocusMode.locked);
      } catch (_) {
        // Ignore unsupported/manual focus errors for this device.
      }
      await controller.startImageStream(_onCameraFrame);

      _cameraController = controller;
      _heartRateEstimator.reset();
      _scanStartedAt = DateTime.now();

      _progressTicker?.cancel();
      _progressTicker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!_scanComplete && _scanProgress >= 1) {
          unawaited(_finishScan());
        }
        if (mounted) {
          setState(() {});
        }
      });

      if (mounted) {
        setState(() {
          _initializing = false;
        });
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _initializing = false;
        _errorMessage = 'Failed to initialize camera: $error';
      });
    }
  }

  void _onCameraFrame(CameraImage image) {
    if (_scanComplete || _isProcessingFrame) {
      return;
    }

    final now = DateTime.now();
    if (now.difference(_lastProcessedFrameAt).inMilliseconds < 90) {
      return;
    }

    _isProcessingFrame = true;
    _lastProcessedFrameAt = now;
    try {
      final frameMetrics = _extractFrameMetrics(image);
      _fingerConfidence = frameMetrics.fingerConfidence;
      _fingerDetected = _fingerConfidence >= _fingerConfidenceThreshold;

      if (!_fingerDetected) {
        _noFingerFrameStreak++;
        _lowQualityFrameStreak = 0;
        _hrConfidence = 0;
        _signalStrength = 0;

        if (_noFingerFrameStreak >= _clearBpmAfterNoFingerFrames) {
          _estimatedBpm = null;
          _heartRateEstimator.reset();
        }

        if (mounted) {
          setState(() {});
        }
        return;
      }

      _noFingerFrameStreak = 0;

      final bpm = _heartRateEstimator.addSample(
        timestampMs: now.millisecondsSinceEpoch,
        normalizedIntensity: frameMetrics.intensity,
      );
      _signalStrength = _heartRateEstimator.signalStrength;
      _hrConfidence = _heartRateEstimator.confidence;

      if (bpm != null && _hrConfidence >= 0.12) {
        _estimatedBpm = bpm;
        _lowQualityFrameStreak = 0;
      } else {
        _lowQualityFrameStreak++;
        if (_lowQualityFrameStreak >= _clearBpmAfterLowQualityFrames) {
          _estimatedBpm = null;
        }
      }

      if (mounted) {
        setState(() {});
      }

      if (_scanProgress >= 1) {
        unawaited(_finishScan());
      }
    } finally {
      _isProcessingFrame = false;
    }
  }

  _FrameMetrics _extractFrameMetrics(CameraImage image) {
    if (image.planes.isEmpty) {
      return const _FrameMetrics(intensity: 0, fingerConfidence: 0);
    }

    // On Android we use Y/U/V channels. On iOS we use BGRA bytes.
    if (image.format.group == ImageFormatGroup.yuv420) {
      final yBytes = image.planes[0].bytes;
      final uBytes = image.planes.length > 1 ? image.planes[1].bytes : yBytes;
      final vBytes = image.planes.length > 2 ? image.planes[2].bytes : yBytes;

      var sumY = 0;
      var sumU = 0;
      var sumV = 0;
      var count = 0;
      var redLikeCount = 0;

      for (var i = 0; i < yBytes.length; i += 24) {
        sumY += yBytes[i];
        count++;
      }

      for (var i = 0; i < uBytes.length; i += 8) {
        sumU += uBytes[i];
      }
      for (var i = 0; i < vBytes.length; i += 8) {
        sumV += vBytes[i];
      }

      final avgY = count == 0 ? 0.0 : (sumY / count);
      final avgU = sumU / math.max(1, uBytes.length ~/ 8);
      final avgV = sumV / math.max(1, vBytes.length ~/ 8);
      final redChroma = (avgV - avgU).clamp(-128.0, 128.0);

      final uvCount = math.min(uBytes.length, vBytes.length);
      for (var i = 0; i < uvCount; i += 12) {
        final redLike = (vBytes[i] - uBytes[i]) > 12;
        if (redLike && avgY > 55) {
          redLikeCount++;
        }
      }

      final coverageScore = redLikeCount / math.max(1, uvCount ~/ 12);
      final redDominance = ((avgV - avgU - 8) / 70).clamp(0.0, 1.0).toDouble();
      final brightnessScore = ((avgY - 45) / 150).clamp(0.0, 1.0).toDouble();
      final fingerConfidence =
          (0.5 * redDominance + 0.3 * coverageScore + 0.2 * brightnessScore)
              .clamp(0.0, 1.0)
              .toDouble();
      final yNorm = (avgY / 255).clamp(0.0, 1.0).toDouble();
      final redNorm = ((redChroma + 128) / 256).clamp(0.0, 1.0).toDouble();
      final intensity = (0.45 * yNorm + 0.55 * redNorm).clamp(0.0, 1.0);

      return _FrameMetrics(
        intensity: intensity.toDouble(),
        fingerConfidence: fingerConfidence,
      );
    }

    final bytes = image.planes.first.bytes;
    var sumLuma = 0.0;
    var sumR = 0.0;
    var sumG = 0.0;
    var count = 0;
    var redPixelCount = 0;

    for (var i = 0; i + 3 < bytes.length; i += 24) {
      final b = bytes[i].toDouble();
      final g = bytes[i + 1].toDouble();
      final r = bytes[i + 2].toDouble();
      sumLuma += (0.114 * b + 0.587 * g + 0.299 * r);
      sumR += r;
      sumG += g;
      if (r > g * 1.12 && r > b * 1.25 && r > 75) {
        redPixelCount++;
      }
      count++;
    }

    if (count == 0) {
      return const _FrameMetrics(intensity: 0, fingerConfidence: 0);
    }

    final avgR = sumR / count;
    final avgG = sumG / count;
    final avgLuma = sumLuma / count;
    final redDominance = ((avgR - avgG) / 80).clamp(0.0, 1.0).toDouble();
    final coverageScore = (redPixelCount / count).clamp(0.0, 1.0).toDouble();
    final brightnessScore = (avgLuma / 255).clamp(0.0, 1.0).toDouble();
    final fingerConfidence =
        (0.45 * redDominance + 0.35 * coverageScore + 0.2 * brightnessScore)
            .clamp(0.0, 1.0)
            .toDouble();
    final intensity = ((avgR * 0.7) + (avgG * 0.3)) / 255;

    return _FrameMetrics(
      intensity: intensity.clamp(0.0, 1.0).toDouble(),
      fingerConfidence: fingerConfidence,
    );
  }

  void _startMotionTracking() {
    _accelerometerSub?.cancel();
    _gyroscopeSub?.cancel();

    _accelerometerSub = accelerometerEventStream().listen((event) {
      final magnitude = math.sqrt(
        event.x * event.x + event.y * event.y + event.z * event.z,
      );
      final movement = (magnitude - 9.81).abs();
      _movementIntensity = movement;

      if (magnitude > 24) {
        _impactDetectedAt = DateTime.now();
      }

      final hasRecentImpact =
          _impactDetectedAt != null &&
          DateTime.now().difference(_impactDetectedAt!) <
              const Duration(seconds: 2);
      if (hasRecentImpact && movement < 1.3) {
        _fallDetected = true;
      }

      if (mounted) {
        setState(() {});
      }
    });

    _gyroscopeSub = gyroscopeEventStream().listen((event) {
      _gyroMagnitude = math.sqrt(
        event.x * event.x + event.y * event.y + event.z * event.z,
      );
      if (mounted) {
        setState(() {});
      }
    });
  }

  Future<void> _finishScan() async {
    if (_scanComplete) {
      return;
    }
    _scanComplete = true;
    _progressTicker?.cancel();

    try {
      if (_cameraController?.value.isStreamingImages ?? false) {
        await _cameraController?.stopImageStream();
      }
      await _cameraController?.setFlashMode(FlashMode.off);
    } catch (_) {
      // Ignore cleanup failures; user can still review results.
    }

    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _shutdownCamera() async {
    final controller = _cameraController;
    if (controller == null) {
      return;
    }

    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {
      // Ignore cleanup failures on dispose.
    }

    try {
      await controller.setFlashMode(FlashMode.off);
    } catch (_) {
      // Ignore cleanup failures on dispose.
    }

    await controller.dispose();
    _cameraController = null;
  }

  double get _scanProgress {
    if (_scanStartedAt == null) {
      return 0;
    }
    final elapsed = DateTime.now().difference(_scanStartedAt!);
    final progress = elapsed.inMilliseconds / _scanDuration.inMilliseconds;
    return progress.clamp(0, 1);
  }

  String get _movementLabel {
    if (_movementIntensity < 1.0) {
      return 'Low';
    }
    if (_movementIntensity < 2.8) {
      return 'Moderate';
    }
    return 'High';
  }

  String get _timeLabel {
    final remainingSeconds = (_scanDuration.inSeconds * (1 - _scanProgress))
        .round();
    return '${remainingSeconds.clamp(0, _scanDuration.inSeconds)}s';
  }

  String get _signalLabel {
    if (!_fingerDetected) {
      return 'No finger detected';
    }
    if (_estimatedBpm == null) {
      return 'Collecting stable pulse';
    }
    if (_hrConfidence < 0.45) {
      return 'Low confidence pulse';
    }
    return 'Reliable pulse';
  }

  String get _fingerStatusLabel {
    return _fingerDetected ? 'Detected' : 'Not detected';
  }

  Color get _fingerStatusColor {
    return _fingerDetected ? Colors.green : Colors.red;
  }

  String get _confidenceLabel {
    if (_hrConfidence <= 0) {
      return '--';
    }
    return '${(_hrConfidence * 100).toStringAsFixed(0)}%';
  }

  String get _fingerConfidenceLabel {
    if (_fingerConfidence <= 0) {
      return '--';
    }
    return '${(_fingerConfidence * 100).toStringAsFixed(0)}%';
  }

  double get _signalQualityScore {
    return (_signalStrength * 24).clamp(0.0, 1.0).toDouble();
  }

  @override
  Widget build(BuildContext context) {
    final controller = _cameraController;
    final isCameraReady = controller != null && controller.value.isInitialized;

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
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
          child: _initializing
              ? const Center(child: CircularProgressIndicator())
              : _errorMessage != null
              ? _ErrorView(message: _errorMessage!, onRetry: _startScanFlow)
              : LayoutBuilder(
                  builder: (context, constraints) => SingleChildScrollView(
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: constraints.maxHeight,
                      ),
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
                            child: isCameraReady
                                ? CameraPreview(controller)
                                : const Center(
                                    child: Text(
                                      'Camera unavailable',
                                      style: TextStyle(color: Colors.white70),
                                    ),
                                  ),
                          ),
                          const SizedBox(height: 14),
                          Text(
                            _scanComplete
                                ? 'Scan complete'
                                : 'Scanning in progress ($_timeLabel remaining)',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 8),
                          LinearProgressIndicator(
                            value: _scanProgress,
                            minHeight: 8,
                            color: const Color(0xFF4C9A2A),
                            borderRadius: BorderRadius.circular(12),
                            backgroundColor: const Color(0xFFE4E9DE),
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: _MetricCard(
                                  title: 'Heart Rate',
                                  value: _estimatedBpm == null
                                      ? '-- bpm'
                                      : '${_estimatedBpm!} bpm',
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _MetricCard(
                                  title: 'Pulse Confidence',
                                  value: _confidenceLabel,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: _MetricCard(
                                  title: 'Finger Cover',
                                  value: _fingerStatusLabel,
                                  valueColor: _fingerStatusColor,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _MetricCard(
                                  title: 'Finger Confidence',
                                  value: _fingerConfidenceLabel,
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
                                  value: _movementLabel,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _MetricCard(
                                  title: 'Gyro',
                                  value: _gyroMagnitude.toStringAsFixed(2),
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
                                  value: _fallDetected
                                      ? 'Possible fall'
                                      : 'Normal',
                                  valueColor: _fallDetected
                                      ? Colors.red
                                      : Colors.green,
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: _MetricCard(
                                  title: 'Signal State',
                                  value: _signalLabel,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: Text(
                              'Signal quality: ${_signalQualityScore.toStringAsFixed(2)} '
                              '| Camera: ${_hasCameraPermission ? "granted" : "blocked"} '
                              '| Motion: ${_hasMotionPermission ? "granted" : "blocked"} '
                              '| Notifications: ${_hasNotificationPermission ? "granted" : "blocked"}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () async {
                              await _shutdownCamera();
                              await _startScanFlow();
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF4C9A2A),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            child: Text(
                              _scanComplete ? 'Scan Again' : 'Restart Scan',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
        ),
      ),
    );
  }
}

class _FrameMetrics {
  const _FrameMetrics({
    required this.intensity,
    required this.fingerConfidence,
  });

  final double intensity;
  final double fingerConfidence;
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
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: () => unawaited(onRetry()),
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
