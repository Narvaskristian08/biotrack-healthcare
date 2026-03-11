import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../domain/vitals_scanner_logic.dart';
import '../../data/services/ppg_processor.dart'; 
import '../../../../core/services/permission_service.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/scan_record_store.dart';
import 'heart_rate_estimator.dart';

class ScanVitalsController extends ChangeNotifier {
  static const Duration scanDuration = Duration(seconds: 25);
  static const double _fingerConfidenceThreshold = 0.52;
  static const int _clearBpmAfterNoFingerFrames = 14;
  static const int _clearBpmAfterLowQualityFrames = 42;
  static const int _minFrameIntervalMs = 80;
  static const int _maxLiveBpmSamples = 7;

  final HeartRateEstimator _heartRateEstimator = HeartRateEstimator(
    minSamplesForEstimate: 28,
    reliabilityThreshold: 0.28,
    minimumAcceptConfidence: 0.12,
  );

  CameraController? cameraController;
  StreamSubscription<AccelerometerEvent>? _accelerometerSub;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSub;
  Timer? _progressTicker;

  bool initializing = true;
  bool scanComplete = false;
  bool fallDetected = false;
  bool fingerDetected = false;
  int? estimatedBpm;
  double fingerConfidence = 0;
  double movementIntensity = 0;
  double gyroMagnitude = 0;
  double hrConfidence = 0;
  bool accelerometerAvailable = true;
  bool gyroscopeAvailable = true;
  String? errorMessage;
  DateTime? scanStartedAt;

  final List<int> _liveBpmSamples = <int>[];
  bool _isProcessingFrame = false;
  DateTime _lastProcessedFrameAt = DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
  DateTime? _impactDetectedAt;
  int _noFingerFrameStreak = 0;
  int _lowQualityFrameStreak = 0;

  Future<void> startScan() async {
    _resetState();
    notifyListeners();

    try {
      final permissions = await PermissionService.requestCorePermissions();
      if (!permissions.cameraGranted) {
        errorMessage = 'Camera permission is required to start PPG scanning.';
        initializing = false;
        notifyListeners();
        return;
      }

      await _initializeCamera();
      _startMotionTracking();
      
      initializing = false;
      scanStartedAt = DateTime.now();
      _startTicker();
      notifyListeners();
    } catch (e) {
      errorMessage = 'Initialization failed: $e';
      initializing = false;
      notifyListeners();
    }
  }

  void _resetState() {
    _progressTicker?.cancel();
    _accelerometerSub?.cancel(); // Safety: clear previous subs
    _gyroscopeSub?.cancel();
    
    initializing = true;
    scanComplete = false;
    fallDetected = false;
    estimatedBpm = null;
    fingerConfidence = 0;
    fingerDetected = false;
    movementIntensity = 0;
    gyroMagnitude = 0;
    hrConfidence = 0;
    accelerometerAvailable = true;
    gyroscopeAvailable = true;
    errorMessage = null;
    _noFingerFrameStreak = 0;
    _lowQualityFrameStreak = 0;
    _impactDetectedAt = null;
    _liveBpmSamples.clear();
    _heartRateEstimator.reset();
  }

  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) throw Exception('No camera found');

    final selected = cameras.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.back,
      orElse: () => cameras.first,
    );

    cameraController = CameraController(
      selected,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup: Platform.isIOS ? ImageFormatGroup.bgra8888 : ImageFormatGroup.yuv420,
    );

    await cameraController!.initialize();
    await cameraController!.lockCaptureOrientation(DeviceOrientation.portraitUp);
    await cameraController!.setFlashMode(FlashMode.torch);
    
    try { await cameraController!.setExposureMode(ExposureMode.locked); } catch (_) {}
    try { await cameraController!.setFocusMode(FocusMode.locked); } catch (_) {}
    
    await cameraController!.startImageStream(_onCameraFrame);
  }

  void _onCameraFrame(CameraImage image) {
    if (scanComplete || _isProcessingFrame) return;

    final now = DateTime.now();
    if (now.difference(_lastProcessedFrameAt).inMilliseconds < _minFrameIntervalMs) return;

    _isProcessingFrame = true;
    _lastProcessedFrameAt = now;

    try {
      final frameMetrics = PPGProcessor.extractFrameMetrics(image);
      fingerConfidence = frameMetrics.fingerConfidence;
      fingerDetected = fingerConfidence >= _fingerConfidenceThreshold;

      if (!fingerDetected) {
        _handleNoFinger();
      } else {
        _processVitals(frameMetrics, now);
      }
      notifyListeners();
    } finally {
      _isProcessingFrame = false;
    }
  }

  void _handleNoFinger() {
    _noFingerFrameStreak++;
    _lowQualityFrameStreak = 0;
    hrConfidence = 0;
    if (_noFingerFrameStreak >= _clearBpmAfterNoFingerFrames) {
      estimatedBpm = null;
      _heartRateEstimator.reset();
      _liveBpmSamples.clear();
    }
  }

  void _processVitals(dynamic metrics, DateTime now) {
    _noFingerFrameStreak = 0;
    final bpm = _heartRateEstimator.addSample(
      timestampMs: now.millisecondsSinceEpoch,
      normalizedIntensity: metrics.intensity,
    );

    hrConfidence = _heartRateEstimator.confidence;
    final liveCandidate = bpm ?? _heartRateEstimator.latestCandidateBpm;
    
    final canUseLiveCandidate = fingerDetected && 
                               fingerConfidence >= 0.66 && 
                               hrConfidence >= 0.08 && 
                               movementIntensity < 2.6 && 
                               liveCandidate > 0;

    if (canUseLiveCandidate) {
      VitalsScannerLogic.pushLiveBpmSample(_liveBpmSamples, liveCandidate, _maxLiveBpmSamples);
      final median = VitalsScannerLogic.calculateMedianBpm(_liveBpmSamples) ?? liveCandidate;
      estimatedBpm = VitalsScannerLogic.blendLiveBpm(estimatedBpm, median);
      _lowQualityFrameStreak = 0;
    } else {
      _lowQualityFrameStreak++;
      if (_lowQualityFrameStreak >= _clearBpmAfterLowQualityFrames) {
        estimatedBpm = null;
        _liveBpmSamples.clear();
      }
    }
  }

  void _startMotionTracking() {
    _accelerometerSub?.cancel();
    _accelerometerSub = accelerometerEventStream().listen(
      (event) {
        accelerometerAvailable = true;
        final mag = math.sqrt(event.x * event.x + event.y * event.y + event.z * event.z);
        movementIntensity = (mag - 9.81).abs();

        // Simple fall detection logic.
        if (mag > 24) _impactDetectedAt = DateTime.now();
        if (_impactDetectedAt != null &&
            DateTime.now().difference(_impactDetectedAt!) < const Duration(seconds: 2) &&
            movementIntensity < 1.3) {
          fallDetected = true;
        }
        notifyListeners();
      },
      onError: (_) {
        accelerometerAvailable = false;
        movementIntensity = 0;
        notifyListeners();
      },
    );

    _gyroscopeSub?.cancel();
    _gyroscopeSub = gyroscopeEventStream().listen(
      (event) {
        gyroscopeAvailable = true;
        gyroMagnitude = math.sqrt(event.x * event.x + event.y * event.y + event.z * event.z);
        notifyListeners();
      },
      onError: (_) {
        gyroscopeAvailable = false;
        gyroMagnitude = 0;
        notifyListeners();
      },
    );
  }

  void _startTicker() {
    _progressTicker?.cancel();
    _progressTicker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!scanComplete && scanProgress >= 1) finishScan();
      notifyListeners();
    });
  }

  Future<Map<String, dynamic>> finishScan() async {
    if (scanComplete) return {'success': false};
    scanComplete = true;
    _progressTicker?.cancel();
    _accelerometerSub?.cancel();
    _gyroscopeSub?.cancel();

    try {
      if (cameraController != null && cameraController!.value.isStreamingImages) {
        await cameraController?.stopImageStream();
      }
      await cameraController?.setFlashMode(FlashMode.off);
    } catch (_) {}

    final successfulScan = fingerDetected;
    var resolvedBpm = estimatedBpm;
    final median = VitalsScannerLogic.calculateMedianBpm(_liveBpmSamples);
    
    if (successfulScan && resolvedBpm == null && fingerConfidence >= 0.66 && (median ?? 0) > 0) {
      resolvedBpm = median;
      estimatedBpm = resolvedBpm;
    }

    bool savedToServer = false;
    String? saveError;

    if (successfulScan) {
      try {
        final record = ScanRecord(
          id: DateTime.now().microsecondsSinceEpoch.toString(),
          scannedAt: DateTime.now(),
          bpm: resolvedBpm,
          fallDetected: fallDetected,
          signalQuality: signalQualityScore,
          fingerDetected: fingerDetected,
          fingerConfidence: fingerConfidence,
          movementIntensity: movementIntensity,
          gyroMagnitude: gyroMagnitude,
        );
        await ScanRecordStore.add(record);
        savedToServer = true;
      } catch (e) {
        saveError = e.toString();
      }
    }

    notifyListeners();
    return {
      'success': successfulScan,
      'saved': savedToServer,
      'error': saveError,
    };
  }

  // --- Helpers ---
  double get scanProgress {
    if (scanStartedAt == null) return 0;
    return (DateTime.now().difference(scanStartedAt!).inMilliseconds / scanDuration.inMilliseconds).clamp(0.0, 1.0);
  }

  double get signalQualityScore => (_heartRateEstimator.signalStrength * 24).clamp(0.0, 1.0);
  
  String get movementLabel => VitalsScannerLogic.getMovementLabel(movementIntensity);
  String get timeLabel => VitalsScannerLogic.getTimeLabel(scanProgress, scanDuration);
  String get signalLabel => VitalsScannerLogic.getSignalLabel(
    fingerDetected: fingerDetected,
    movementIntensity: movementIntensity,
    estimatedBpm: estimatedBpm,
    hrConfidence: hrConfidence,
  );
  double get qualityCoachScore {
    final fingerPart = fingerConfidence.clamp(0.0, 1.0).toDouble() * 0.55;
    final confidencePart = hrConfidence.clamp(0.0, 1.0).toDouble() * 0.30;
    final movementPenalty = (1 - (movementIntensity / 3.5).clamp(0.0, 1.0)).toDouble() * 0.15;

    final sensorPenalty = (!accelerometerAvailable || !gyroscopeAvailable) ? 0.12 : 0.0;
    final score = (fingerPart + confidencePart + movementPenalty - sensorPenalty).clamp(0.0, 1.0);
    return score;
  }

  String get qualityCoachLevel {
    final score = qualityCoachScore;
    if (score >= 0.75) return 'Excellent';
    if (score >= 0.5) return 'Good';
    if (score >= 0.3) return 'Fair';
    return 'Poor';
  }

  String get qualityCoachMessage {
    if (!fingerDetected) {
      return 'Cover the camera and flash fully with your fingertip.';
    }
    if (movementIntensity > 2.8) {
      return 'Reduce hand movement for a cleaner pulse signal.';
    }
    if (!accelerometerAvailable || !gyroscopeAvailable) {
      return 'Motion sensors unavailable. Heart-rate scan still works with reduced motion context.';
    }
    if (hrConfidence < 0.12) {
      return 'Hold still for a few more seconds to stabilize pulse detection.';
    }
    return 'Signal looks stable. Keep your finger in place until scan ends.';
  }

  String get sensorHealthLabel {
    if (accelerometerAvailable && gyroscopeAvailable) return 'All sensors active';
    if (!accelerometerAvailable && !gyroscopeAvailable) return 'Accelerometer and gyroscope unavailable';
    if (!accelerometerAvailable) return 'Accelerometer unavailable';
    return 'Gyroscope unavailable';
  }

  @override
  void dispose() {
    _progressTicker?.cancel();
    _accelerometerSub?.cancel();
    _gyroscopeSub?.cancel();
    cameraController?.dispose();
    super.dispose();
  }
}
