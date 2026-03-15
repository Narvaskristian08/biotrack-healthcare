import 'dart:async';
import 'dart:io';
import 'dart:math' as math;
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../domain/vitals_scanner_logic.dart';
import '../../data/services/ppg_processor.dart';
import '../../data/services/ppg_signal_conditioner.dart';
import '../../../../core/services/permission_service.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/scan_record_store.dart';
import 'heart_rate_estimator.dart';

class _FallbackBpmCandidate {
  const _FallbackBpmCandidate({
    required this.observedAt,
    required this.bpm,
    required this.hrConfidence,
    required this.fingerConfidence,
    required this.movementIntensity,
  });

  final DateTime observedAt;
  final int bpm;
  final double hrConfidence;
  final double fingerConfidence;
  final double movementIntensity;
}

class ScanVitalsController extends ChangeNotifier {
  static const Duration scanDuration = Duration(seconds: 18);
  static const double _fingerConfidenceThreshold = 0.52;
  static const int _clearBpmAfterNoFingerFrames = 14;
  static const int _clearBpmAfterLowQualityFrames = 42;
  static const int _minFrameIntervalMs = 80;
  static const int _maxLiveBpmSamples = 7;
  static const Duration _hardwareHintDelay = Duration(seconds: 6);
  static const List<Duration> _torchRetryDelays = <Duration>[
    Duration.zero,
    Duration(milliseconds: 120),
    Duration(milliseconds: 320),
  ];
  static const Duration _torchSettlingDuration = Duration(milliseconds: 900);
  static const Duration _stableFingerBeforeLockDuration = Duration(
    milliseconds: 700,
  );
  static const double _fingerConfidenceSmoothingAlpha = 0.24;
  static const double _minimumLiveFingerConfidence = 0.58;
  static const double _minimumLiveHrConfidence = 0.05;
  static const double _minimumConfidenceForLargeJump = 0.24;
  static const double _maximumLiveMovement = 2.8;
  static const int _maximumLiveBpmJump = 24;
  static const Duration _minimumMeasurementWarmup = Duration(seconds: 2);
  static const int _minimumStableBpmWindows = 1;
  static const int _stableBpmTolerance = 10;
  static const int _initialHighBpmGuard = 130;
  static const double _minimumConfidenceForInitialHighBpm = 0.16;
  static const Duration _windowUpdateInterval = Duration(seconds: 1);
  static const Duration _debugLogInterval = Duration(milliseconds: 600);
  static const Duration _fallbackCandidateWindow = Duration(seconds: 6);
  static const int _maxFallbackCandidates = 6;
  static const int _maximumFallbackBpm = 118;
  static const double _minimumFallbackHrConfidence = 0.06;
  static const double _minimumSingleFallbackConfidence = 0.12;
  static const double _minimumRecoveryFingerConfidence = 0.56;
  static const double _lateRecoveryProgressThreshold = 0.75;
  static const Duration _recoveryRetryInterval = Duration(milliseconds: 900);

  final HeartRateEstimator _heartRateEstimator = HeartRateEstimator(
    maxBpm: 150,
    minSamplesForEstimate: 20,
    reliabilityThreshold: 0.22,
    minimumAcceptConfidence: 0.08,
  );
  final PpgSignalConditioner _signalConditioner = PpgSignalConditioner();

  CameraController? cameraController;
  StreamSubscription<AccelerometerEvent>? _accelerometerSub;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSub;
  Timer? _progressTicker;

  List<CameraDescription> _candidateCameras = const <CameraDescription>[];
  int _preferredCameraIndex = 0;
  int _activeCameraIndex = 0;
  bool torchAvailable = true;
  bool torchEnabled = false;

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
  final List<_FallbackBpmCandidate> _recentFallbackCandidates =
      <_FallbackBpmCandidate>[];
  bool _isProcessingFrame = false;
  DateTime _lastProcessedFrameAt = DateTime.fromMillisecondsSinceEpoch(
    0,
    isUtc: true,
  );
  DateTime? _impactDetectedAt;
  int _noFingerFrameStreak = 0;
  int _lowQualityFrameStreak = 0;
  bool _hadFingerDetection = false;
  bool _hadReliablePulse = false;
  double _peakFingerConfidence = 0;
  double _peakHrConfidence = 0;
  int? _bestObservedBpm;
  Map<String, dynamic>? _lastFinishResult;
  DateTime? _torchActivatedAt;
  DateTime? _stableFingerDetectedAt;
  DateTime? _lastAcceptedWindowAt;
  DateTime? _lastDebugLogAt;
  DateTime? _lastRecoveryAttemptAt;
  bool _captureSettingsLocked = false;
  bool _lockingCaptureSettings = false;
  bool _fallbackFinalizationUsed = false;
  int? _lastFallbackCandidateBpm;
  String _lastFallbackDecision = 'none';

  Future<void> startScan() async {
    scanComplete = true; // Stop any in-flight frame processing before teardown.
    await _teardownCameraBestEffort();

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
    _hadFingerDetection = false;
    _hadReliablePulse = false;
    _peakFingerConfidence = 0;
    _peakHrConfidence = 0;
    _bestObservedBpm = null;
    _lastFinishResult = null;
    _torchActivatedAt = null;
    _stableFingerDetectedAt = null;
    _lastAcceptedWindowAt = null;
    _lastDebugLogAt = null;
    _lastRecoveryAttemptAt = null;
    _captureSettingsLocked = false;
    _lockingCaptureSettings = false;
    _fallbackFinalizationUsed = false;
    _lastFallbackCandidateBpm = null;
    _lastFallbackDecision = 'none';
    _liveBpmSamples.clear();
    _recentFallbackCandidates.clear();
    _heartRateEstimator.reset();
    _signalConditioner.reset();
  }

  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) throw Exception('No camera found');

    final candidates = cameras
        .where((c) => c.lensDirection == CameraLensDirection.back)
        .toList(growable: true);
    if (candidates.isEmpty) {
      candidates.addAll(cameras);
    }
    candidates.sort(
      (a, b) => _cameraSortScore(a.name).compareTo(_cameraSortScore(b.name)),
    );
    _candidateCameras = candidates.toList(growable: false);
    if (_preferredCameraIndex < 0 ||
        _preferredCameraIndex >= _candidateCameras.length) {
      _preferredCameraIndex = 0;
    }

    final ordered = <CameraDescription>[
      ..._candidateCameras.skip(_preferredCameraIndex),
      ..._candidateCameras.take(_preferredCameraIndex),
    ];

    CameraController? selectedController;
    CameraDescription? selectedCamera;
    bool selectedTorchAvailable = true;
    bool selectedTorchEnabled = false;

    // Prefer a camera that supports torch; fall back to any camera if none do.
    Object? lastError;
    for (final requireTorch in <bool>[true, false]) {
      for (final candidate in ordered) {
        final controller = CameraController(
          candidate,
          ResolutionPreset.medium,
          enableAudio: false,
          imageFormatGroup: Platform.isIOS
              ? ImageFormatGroup.bgra8888
              : ImageFormatGroup.yuv420,
        );

        try {
          await controller.initialize();
          await controller.lockCaptureOrientation(DeviceOrientation.portraitUp);

          final initialTorchStatus = await _enableTorchWithRetry(controller);
          var torchOk = initialTorchStatus.enabled;
          var torchAvail = initialTorchStatus.available;

          if (requireTorch && !torchOk) {
            await controller.dispose();
            continue;
          }

          try {
            await controller.setExposureMode(ExposureMode.auto);
          } catch (_) {}
          try {
            await controller.setFocusMode(FocusMode.auto);
          } catch (_) {}

          await controller.startImageStream(_onCameraFrame);
          final streamingTorchStatus = await _enableTorchWithRetry(controller);
          torchOk = streamingTorchStatus.enabled;
          torchAvail = torchAvail || streamingTorchStatus.available;

          if (requireTorch && !torchOk) {
            try {
              await controller.stopImageStream();
            } catch (_) {}
            await controller.dispose();
            continue;
          }

          selectedController = controller;
          selectedCamera = candidate;
          selectedTorchAvailable = torchAvail;
          selectedTorchEnabled = torchOk;
          break;
        } catch (e) {
          lastError = e;
          try {
            await controller.dispose();
          } catch (_) {}
        }
      }
      if (selectedController != null) break;
    }

    if (selectedController == null || selectedCamera == null) {
      throw Exception(
        'Unable to initialize camera: ${lastError ?? "unknown error"}',
      );
    }

    final resolvedController = selectedController;
    final resolvedCamera = selectedCamera;

    cameraController = resolvedController;
    _activeCameraIndex = _candidateCameras.indexWhere(
      (c) => c.name == resolvedCamera.name,
    );
    if (_activeCameraIndex < 0) _activeCameraIndex = 0;
    torchAvailable = selectedTorchAvailable;
    torchEnabled = selectedTorchEnabled;
    _torchActivatedAt = selectedTorchEnabled ? DateTime.now() : null;
  }

  Future<({bool available, bool enabled})> _enableTorchWithRetry(
    CameraController controller,
  ) async {
    for (final delay in _torchRetryDelays) {
      if (delay > Duration.zero) {
        await Future<void>.delayed(delay);
      }

      try {
        await controller.setFlashMode(FlashMode.torch);
        final enabled = controller.value.flashMode == FlashMode.torch;
        return (available: true, enabled: enabled);
      } catch (_) {}
    }

    final enabled = controller.value.flashMode == FlashMode.torch;
    return (available: enabled, enabled: enabled);
  }

  void _onCameraFrame(CameraImage image) {
    if (scanComplete || _isProcessingFrame) return;

    final now = DateTime.now();
    if (now.difference(_lastProcessedFrameAt).inMilliseconds <
        _minFrameIntervalMs) {
      return;
    }

    _isProcessingFrame = true;
    _lastProcessedFrameAt = now;

    try {
      final frameMetrics = PPGProcessor.extractFrameMetrics(image);
      fingerConfidence = _smoothFingerConfidence(frameMetrics.fingerConfidence);
      if (fingerConfidence > _peakFingerConfidence) {
        _peakFingerConfidence = fingerConfidence;
      }
      fingerDetected = fingerConfidence >= _fingerConfidenceThreshold;
      if (fingerDetected) {
        _stableFingerDetectedAt ??= now;
      } else {
        _stableFingerDetectedAt = null;
      }
      _maybeLockCaptureControls(now);
      if (fingerDetected) {
        _hadFingerDetection = true;
      }

      if (!fingerDetected) {
        _handleNoFinger(now);
      } else {
        _processVitals(frameMetrics, now);
      }
      notifyListeners();
    } finally {
      _isProcessingFrame = false;
    }
  }

  void _handleNoFinger(DateTime now) {
    _noFingerFrameStreak++;
    _lowQualityFrameStreak = 0;
    hrConfidence = 0;
    _signalConditioner.reset();
    if (_noFingerFrameStreak >= _clearBpmAfterNoFingerFrames) {
      estimatedBpm = null;
      _heartRateEstimator.reset();
      _liveBpmSamples.clear();
    }
    _logDebugSnapshot(now, normalizedSignal: null, latestCandidateBpm: 0);
  }

  void _processVitals(FrameMetrics metrics, DateTime now) {
    _noFingerFrameStreak = 0;
    if (!_isCaptureReadyForMeasurement(now) || !_isWarmupComplete(now)) {
      hrConfidence = 0;
      _logDebugSnapshot(
        now,
        normalizedSignal: null,
        latestCandidateBpm: _heartRateEstimator.latestCandidateBpm,
      );
      return;
    }

    final normalizedSignal = _signalConditioner.addSample(
      timestampMs: now.millisecondsSinceEpoch,
      redSignal: metrics.redSignal,
      greenSignal: metrics.greenSignal,
    );
    if (normalizedSignal == null) {
      hrConfidence = 0;
      _lowQualityFrameStreak++;
      _lastFallbackDecision = 'conditioner_rejected_signal';
      _logDebugSnapshot(now, normalizedSignal: null, latestCandidateBpm: 0);
      return;
    }

    final bpm = _heartRateEstimator.addSample(
      timestampMs: now.millisecondsSinceEpoch,
      normalizedSignal: normalizedSignal,
    );

    hrConfidence = _heartRateEstimator.confidence;
    if (hrConfidence > _peakHrConfidence) {
      _peakHrConfidence = hrConfidence;
    }
    final liveCandidate = bpm ?? _heartRateEstimator.latestCandidateBpm;

    final canUseLiveCandidate =
        fingerDetected &&
        fingerConfidence >= _minimumLiveFingerConfidence &&
        hrConfidence >= _minimumLiveHrConfidence &&
        movementIntensity < _maximumLiveMovement &&
        liveCandidate > 0;

    final recentBaseline = _liveBpmSamples.length >= 3
        ? VitalsScannerLogic.calculateMedianBpm(_liveBpmSamples)
        : (estimatedBpm ?? _bestObservedBpm);
    final largeJumpFromBaseline =
        recentBaseline != null &&
        (liveCandidate - recentBaseline).abs() > _maximumLiveBpmJump;
    final liveJumpAccepted =
        !largeJumpFromBaseline ||
        hrConfidence >= _minimumConfidenceForLargeJump;
    final initialHighBpmAccepted =
        estimatedBpm != null ||
        liveCandidate <= _initialHighBpmGuard ||
        hrConfidence >= _minimumConfidenceForInitialHighBpm;
    final fallbackTrackingDecision = _trackFallbackCandidate(
      now,
      liveCandidate: liveCandidate,
      liveJumpAccepted: liveJumpAccepted,
      initialHighBpmAccepted: initialHighBpmAccepted,
    );

    if (canUseLiveCandidate && liveJumpAccepted && initialHighBpmAccepted) {
      if (_isReadyForNextAcceptedWindow(now)) {
        VitalsScannerLogic.pushLiveBpmSample(
          _liveBpmSamples,
          liveCandidate,
          _maxLiveBpmSamples,
        );
        _lastAcceptedWindowAt = now;
        estimatedBpm ??= liveCandidate;
        final stableMedian = VitalsScannerLogic.calculateStableMedianBpm(
          _liveBpmSamples,
          minimumSamples: _minimumStableBpmWindows,
          toleranceBpm: _stableBpmTolerance,
        );
        if (stableMedian != null) {
          estimatedBpm = stableMedian;
          _bestObservedBpm = stableMedian;
          _hadReliablePulse = true;
        }
      }
      _lowQualityFrameStreak = 0;
    } else {
      _lowQualityFrameStreak++;
      if (_lowQualityFrameStreak >= _clearBpmAfterLowQualityFrames) {
        estimatedBpm = null;
        _liveBpmSamples.clear();
      }
    }
    final lateRecoveryDecision = _attemptLateRecovery(now);
    _lastFallbackDecision = lateRecoveryDecision ?? fallbackTrackingDecision;
    _logDebugSnapshot(
      now,
      normalizedSignal: normalizedSignal,
      latestCandidateBpm: liveCandidate,
    );
  }

  void _startMotionTracking() {
    _accelerometerSub?.cancel();
    _accelerometerSub = accelerometerEventStream().listen(
      (event) {
        accelerometerAvailable = true;
        final mag = math.sqrt(
          event.x * event.x + event.y * event.y + event.z * event.z,
        );
        movementIntensity = (mag - 9.81).abs();

        // Simple fall detection logic.
        if (mag > 24) _impactDetectedAt = DateTime.now();
        if (_impactDetectedAt != null &&
            DateTime.now().difference(_impactDetectedAt!) <
                const Duration(seconds: 2) &&
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
        gyroMagnitude = math.sqrt(
          event.x * event.x + event.y * event.y + event.z * event.z,
        );
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
      if (!scanComplete && scanProgress >= 1) {
        unawaited(finishScan());
        return;
      }
      notifyListeners();
    });
  }

  Future<Map<String, dynamic>> finishScan() async {
    if (_lastFinishResult != null) {
      return Map<String, dynamic>.from(_lastFinishResult!);
    }
    scanComplete = true;
    _progressTicker?.cancel();
    _accelerometerSub?.cancel();
    _gyroscopeSub?.cancel();

    try {
      if (cameraController != null &&
          cameraController!.value.isStreamingImages) {
        await cameraController?.stopImageStream();
      }
      await cameraController?.setFlashMode(FlashMode.off);
    } catch (_) {}

    final stableMedian = VitalsScannerLogic.calculateStableMedianBpm(
      _liveBpmSamples,
      minimumSamples: _minimumStableBpmWindows,
      toleranceBpm: _stableBpmTolerance,
    );
    var resolvedBpm = estimatedBpm ?? stableMedian ?? _bestObservedBpm;
    var fallbackDecision = 'not_needed';

    if (resolvedBpm == null) {
      final fallback = _resolveFallbackBpm(DateTime.now());
      fallbackDecision = fallback.reason;
      _lastFallbackDecision = fallback.reason;
      _lastFallbackCandidateBpm = fallback.bpm;
      _fallbackFinalizationUsed = fallback.used;
      if (fallback.bpm != null) {
        resolvedBpm = fallback.bpm;
        estimatedBpm = fallback.bpm;
        _bestObservedBpm = fallback.bpm;
        _hadReliablePulse = true;
      }
    } else {
      _fallbackFinalizationUsed = false;
      _lastFallbackCandidateBpm = null;
      _lastFallbackDecision = 'not_needed';
    }

    if (resolvedBpm != null) {
      estimatedBpm = resolvedBpm;
    }

    final successfulScan = resolvedBpm != null || _hadReliablePulse;
    final effectiveFingerConfidence = math.max(
      fingerConfidence,
      _peakFingerConfidence,
    );
    final failureReason = successfulScan
        ? null
        : (!_hadFingerDetection && !fingerDetected)
        ? 'no_finger'
        : (effectiveFingerConfidence < _minimumLiveFingerConfidence)
        ? 'weak_contact'
        : 'unstable_signal';

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
          fingerDetected: _hadFingerDetection || fingerDetected,
          fingerConfidence: math.max(fingerConfidence, _peakFingerConfidence),
          movementIntensity: movementIntensity,
          gyroMagnitude: gyroMagnitude,
        );
        await ScanRecordStore.add(record);
        savedToServer = true;
      } catch (e) {
        saveError = e.toString();
      }
    }

    _lastFinishResult = <String, dynamic>{
      'success': successfulScan,
      'saved': savedToServer,
      'error': saveError,
      'reason': failureReason,
    };
    final blankFinishReason = successfulScan
        ? 'none'
        : _deriveBlankFinishReason(failureReason, fallbackDecision);
    if (kDebugMode) {
      debugPrint(
        '[PPG DEBUG] '
        'fallbackUsed=$_fallbackFinalizationUsed '
        'fallbackCandidate=${_lastFallbackCandidateBpm ?? "null"} '
        'fallbackDecision=$fallbackDecision '
        'blankFinishReason=$blankFinishReason',
      );
    }
    notifyListeners();
    return Map<String, dynamic>.from(_lastFinishResult!);
  }

  // --- Helpers ---
  double get scanProgress {
    if (scanStartedAt == null) return 0;
    return (DateTime.now().difference(scanStartedAt!).inMilliseconds /
            scanDuration.inMilliseconds)
        .clamp(0.0, 1.0);
  }

  double get signalQualityScore =>
      (_heartRateEstimator.signalStrength * 24).clamp(0.0, 1.0);

  bool get canSwitchLens => _candidateCameras.length > 1;
  String get activeLensLabel {
    if (_candidateCameras.isEmpty) return 'Switch Lens';
    return 'Switch Lens (${_activeCameraIndex + 1}/${_candidateCameras.length})';
  }

  Future<void> restartWithNextLens() async {
    if (_candidateCameras.length <= 1) return;
    _preferredCameraIndex = (_activeCameraIndex + 1) % _candidateCameras.length;
    await startScan();
  }

  Future<void> _teardownCameraBestEffort() async {
    final controller = cameraController;
    cameraController = null;
    torchAvailable = true;
    torchEnabled = false;
    _torchActivatedAt = null;
    _stableFingerDetectedAt = null;
    _lastAcceptedWindowAt = null;
    _lastDebugLogAt = null;
    _captureSettingsLocked = false;
    _lockingCaptureSettings = false;

    if (controller == null) return;
    try {
      if (controller.value.isStreamingImages) {
        await controller.stopImageStream();
      }
    } catch (_) {}
    try {
      await controller.setFlashMode(FlashMode.off);
    } catch (_) {}
    try {
      await controller.dispose();
    } catch (_) {}
  }

  String get movementLabel =>
      VitalsScannerLogic.getMovementLabel(movementIntensity);
  String get timeLabel =>
      VitalsScannerLogic.getTimeLabel(scanProgress, scanDuration);
  String get signalLabel => VitalsScannerLogic.getSignalLabel(
    fingerDetected: fingerDetected,
    movementIntensity: movementIntensity,
    estimatedBpm: estimatedBpm,
    hrConfidence: hrConfidence,
  );
  double get qualityCoachScore {
    final fingerPart = fingerConfidence.clamp(0.0, 1.0).toDouble() * 0.55;
    final confidencePart = hrConfidence.clamp(0.0, 1.0).toDouble() * 0.30;
    final movementPenalty =
        (1 - (movementIntensity / 3.5).clamp(0.0, 1.0)).toDouble() * 0.15;

    final sensorPenalty = (!accelerometerAvailable || !gyroscopeAvailable)
        ? 0.12
        : 0.0;
    final score =
        (fingerPart + confidencePart + movementPenalty - sensorPenalty).clamp(
          0.0,
          1.0,
        );
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
      if (!torchAvailable) {
        return 'Cover the camera lens with your fingertip. Torch is unavailable - scan works best in bright light.';
      }
      final startedAt = scanStartedAt;
      final shouldShowHardwareHint =
          torchEnabled &&
          startedAt != null &&
          DateTime.now().difference(startedAt) >= _hardwareHintDelay;
      if (shouldShowHardwareHint) {
        if (canSwitchLens) {
          return 'Cover the camera and flash fully. If your flash is far from the lens, tap Switch Lens and retry.';
        }
        return 'Cover the camera and flash fully. Some phones have the flash too far from the camera for this scan to work.';
      }
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
    if (accelerometerAvailable && gyroscopeAvailable) {
      return 'All sensors active';
    }
    if (!accelerometerAvailable && !gyroscopeAvailable) {
      return 'Accelerometer and gyroscope unavailable';
    }
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

  static int _cameraSortScore(String name) {
    final digits = RegExp(r'([0-9]+)').firstMatch(name)?.group(1);
    final parsed = digits == null ? null : int.tryParse(digits);
    if (parsed != null) return parsed;
    return 999;
  }

  double _smoothFingerConfidence(double rawConfidence) {
    final normalized = rawConfidence.clamp(0.0, 1.0).toDouble();
    if (fingerConfidence <= 0) {
      return normalized;
    }
    return ((fingerConfidence * (1 - _fingerConfidenceSmoothingAlpha)) +
            (normalized * _fingerConfidenceSmoothingAlpha))
        .clamp(0.0, 1.0)
        .toDouble();
  }

  bool _isCaptureReadyForMeasurement(DateTime now) {
    final activatedAt = _torchActivatedAt;
    if (activatedAt == null) {
      return !torchAvailable;
    }
    return now.difference(activatedAt) >= _torchSettlingDuration;
  }

  bool _isWarmupComplete(DateTime now) {
    final startedAt = scanStartedAt;
    if (startedAt == null) {
      return false;
    }
    return now.difference(startedAt) >= _minimumMeasurementWarmup;
  }

  bool _isReadyForNextAcceptedWindow(DateTime now) {
    final lastAcceptedAt = _lastAcceptedWindowAt;
    if (lastAcceptedAt == null) {
      return true;
    }
    return now.difference(lastAcceptedAt) >= _windowUpdateInterval;
  }

  String? _attemptLateRecovery(DateTime now) {
    if (estimatedBpm != null ||
        scanProgress < _lateRecoveryProgressThreshold ||
        !fingerDetected ||
        fingerConfidence < _minimumRecoveryFingerConfidence ||
        movementIntensity >= _maximumLiveMovement) {
      return null;
    }

    final lastRecoveryAt = _lastRecoveryAttemptAt;
    if (lastRecoveryAt != null &&
        now.difference(lastRecoveryAt) < _recoveryRetryInterval) {
      return null;
    }
    _lastRecoveryAttemptAt = now;

    final recoveredCandidate = _buildRecoveredFallbackCandidate(now);
    if (recoveredCandidate == null) {
      return 'late_recovery_${_heartRateEstimator.lastRejectionReason}';
    }

    estimatedBpm ??= recoveredCandidate.bpm;
    _bestObservedBpm = recoveredCandidate.bpm;
    VitalsScannerLogic.pushLiveBpmSample(
      _liveBpmSamples,
      recoveredCandidate.bpm,
      _maxLiveBpmSamples,
    );
    _lastFallbackCandidateBpm = recoveredCandidate.bpm;
    return 'late_recovery_candidate_applied';
  }

  String _trackFallbackCandidate(
    DateTime now, {
    required int liveCandidate,
    required bool liveJumpAccepted,
    required bool initialHighBpmAccepted,
  }) {
    _trimFallbackCandidates(now);

    if (liveCandidate <= 0) {
      return 'fallback_no_candidate';
    }
    if (!fingerDetected) {
      return 'fallback_no_finger';
    }
    if (fingerConfidence < _minimumLiveFingerConfidence) {
      return 'fallback_finger_low';
    }
    if (movementIntensity >= _maximumLiveMovement) {
      return 'fallback_movement_high';
    }
    if (hrConfidence < _minimumFallbackHrConfidence) {
      return 'fallback_confidence_low';
    }
    if (!liveJumpAccepted) {
      return 'fallback_jump_rejected';
    }
    if (!initialHighBpmAccepted) {
      return 'fallback_high_bpm_rejected';
    }
    if (liveCandidate > _maximumFallbackBpm) {
      return 'fallback_candidate_above_resting_cap';
    }

    _recentFallbackCandidates.add(
      _FallbackBpmCandidate(
        observedAt: now,
        bpm: liveCandidate,
        hrConfidence: hrConfidence,
        fingerConfidence: fingerConfidence,
        movementIntensity: movementIntensity,
      ),
    );
    if (_recentFallbackCandidates.length > _maxFallbackCandidates) {
      _recentFallbackCandidates.removeAt(0);
    }
    return 'fallback_candidate_tracked';
  }

  ({int? bpm, bool used, String reason}) _resolveFallbackBpm(DateTime now) {
    _trimFallbackCandidates(now);

    final recoveredCandidate = _buildRecoveredFallbackCandidate(now);
    if (recoveredCandidate != null) {
      _recentFallbackCandidates.add(recoveredCandidate);
      if (_recentFallbackCandidates.length > _maxFallbackCandidates) {
        _recentFallbackCandidates.removeAt(0);
      }
    }

    final currentCandidate = _buildCurrentFallbackCandidate(now);
    if (currentCandidate != null) {
      _recentFallbackCandidates.add(currentCandidate);
      if (_recentFallbackCandidates.length > _maxFallbackCandidates) {
        _recentFallbackCandidates.removeAt(0);
      }
    }

    if (_recentFallbackCandidates.isEmpty) {
      return (
        bpm: null,
        used: false,
        reason: _heartRateEstimator.lastRecoveryPassUsed
            ? 'fallback_recovery_no_candidate'
            : 'fallback_no_recent_candidate',
      );
    }

    final plausibleCandidates = _recentFallbackCandidates
        .where((candidate) {
          return candidate.bpm > 0 &&
              candidate.bpm <= _maximumFallbackBpm &&
              candidate.hrConfidence >= _minimumFallbackHrConfidence &&
              candidate.fingerConfidence >= _minimumLiveFingerConfidence &&
              candidate.movementIntensity < _maximumLiveMovement;
        })
        .toList(growable: false);
    if (plausibleCandidates.isEmpty) {
      return (
        bpm: null,
        used: false,
        reason: 'fallback_candidates_rejected_by_guard',
      );
    }

    final sortedBpms = plausibleCandidates.map((c) => c.bpm).toList()..sort();
    final medianBpm = VitalsScannerLogic.calculateMedianBpm(sortedBpms);
    if (medianBpm == null) {
      return (bpm: null, used: false, reason: 'fallback_no_recent_candidate');
    }

    final consistentCandidates = plausibleCandidates
        .where((candidate) {
          return (candidate.bpm - medianBpm).abs() <= _stableBpmTolerance;
        })
        .toList(growable: false);

    if (consistentCandidates.length >= 2) {
      final consistentBpms = consistentCandidates.map((c) => c.bpm).toList();
      return (
        bpm: VitalsScannerLogic.calculateMedianBpm(consistentBpms),
        used: true,
        reason: 'fallback_consistent_recent_candidates',
      );
    }

    final bestCandidate = plausibleCandidates.reduce((current, next) {
      if (next.hrConfidence > current.hrConfidence) {
        return next;
      }
      if (next.hrConfidence == current.hrConfidence &&
          next.observedAt.isAfter(current.observedAt)) {
        return next;
      }
      return current;
    });

    if (bestCandidate.hrConfidence >= _minimumSingleFallbackConfidence) {
      return (
        bpm: bestCandidate.bpm,
        used: true,
        reason: 'fallback_single_recent_candidate',
      );
    }

    return (bpm: null, used: false, reason: 'fallback_recent_candidate_weak');
  }

  _FallbackBpmCandidate? _buildCurrentFallbackCandidate(DateTime now) {
    final liveCandidate = _heartRateEstimator.latestCandidateBpm;
    if (!fingerDetected ||
        fingerConfidence < _minimumLiveFingerConfidence ||
        movementIntensity >= _maximumLiveMovement ||
        hrConfidence < _minimumFallbackHrConfidence ||
        liveCandidate <= 0 ||
        liveCandidate > _maximumFallbackBpm) {
      return null;
    }

    return _FallbackBpmCandidate(
      observedAt: now,
      bpm: liveCandidate,
      hrConfidence: hrConfidence,
      fingerConfidence: fingerConfidence,
      movementIntensity: movementIntensity,
    );
  }

  _FallbackBpmCandidate? _buildRecoveredFallbackCandidate(DateTime now) {
    final recoveredBpm = _heartRateEstimator.recoverLateScanCandidate(
      maxPlausibleBpm: _maximumFallbackBpm,
      minimumConfidence: _minimumFallbackHrConfidence,
    );
    final effectiveFingerConfidence = math.max(
      fingerConfidence,
      _peakFingerConfidence,
    );
    if (recoveredBpm == null ||
        (!fingerDetected && !_hadFingerDetection) ||
        effectiveFingerConfidence < _minimumRecoveryFingerConfidence ||
        movementIntensity >= _maximumLiveMovement) {
      return null;
    }

    hrConfidence = _heartRateEstimator.confidence;
    return _FallbackBpmCandidate(
      observedAt: now,
      bpm: recoveredBpm,
      hrConfidence: _heartRateEstimator.confidence,
      fingerConfidence: effectiveFingerConfidence,
      movementIntensity: movementIntensity,
    );
  }

  void _trimFallbackCandidates(DateTime now) {
    _recentFallbackCandidates.removeWhere((candidate) {
      return now.difference(candidate.observedAt) > _fallbackCandidateWindow;
    });
  }

  void _logDebugSnapshot(
    DateTime now, {
    required double? normalizedSignal,
    required int latestCandidateBpm,
  }) {
    if (!kDebugMode) {
      return;
    }
    final lastDebugAt = _lastDebugLogAt;
    if (lastDebugAt != null &&
        now.difference(lastDebugAt) < _debugLogInterval) {
      return;
    }
    _lastDebugLogAt = now;
    debugPrint(
      '[PPG DEBUG] '
      'fingerDetected=$fingerDetected '
      'fingerConfidence=${fingerConfidence.toStringAsFixed(2)} '
      'hrConfidence=${hrConfidence.toStringAsFixed(2)} '
      'latestCandidateBpm=$latestCandidateBpm '
      'estimatedBpm=${estimatedBpm ?? "null"} '
      'signalStrength=${_heartRateEstimator.signalStrength.toStringAsFixed(6)} '
      'movementIntensity=${movementIntensity.toStringAsFixed(2)} '
      'acceptedWindows=${_liveBpmSamples.length} '
      'normalizedSignal=${normalizedSignal?.toStringAsFixed(6) ?? "n/a"} '
      'dominantCandidate=${_heartRateEstimator.lastDominantCandidateBpm} '
      'halfCandidate=${_heartRateEstimator.lastHalfCandidateBpm} '
      'chosenCandidate=${_heartRateEstimator.lastChosenCandidateBpm} '
      'harmonicAdjustedCandidate=${_heartRateEstimator.lastHarmonicAdjustedCandidateBpm} '
      'strictPathTried=${_heartRateEstimator.lastStrictPathTried} '
      'strictPathSucceeded=${_heartRateEstimator.lastStrictPathSucceeded} '
      'candidateDiscoveryUsed=${_heartRateEstimator.lastCandidateDiscoveryUsed} '
      'recoveryPassUsed=${_heartRateEstimator.lastRecoveryPassUsed} '
      'relaxedCandidate=${_heartRateEstimator.lastRelaxedCandidateBpm} '
      'recoveryCandidate=${_heartRateEstimator.lastRecoveryCandidateBpm} '
      'provisionalCandidate=${_heartRateEstimator.lastProvisionalCandidateBpm} '
      'finalCandidate=${_heartRateEstimator.lastFinalCandidateBpm} '
      'finalChosenCandidate=${_heartRateEstimator.lastChosenCandidateBpm} '
      'peakCount=${_heartRateEstimator.lastPeakCount} '
      'intervalCount=${_heartRateEstimator.lastIntervalCount} '
      'relaxedPeakCount=${_heartRateEstimator.lastRelaxedPeakCount} '
      'relaxedIntervalCount=${_heartRateEstimator.lastRelaxedIntervalCount} '
      'rejectionReason=${_heartRateEstimator.lastRejectionReason} '
      'timingMode=${_heartRateEstimator.timingModeLabel} '
      'fallbackUsed=$_fallbackFinalizationUsed '
      'fallbackCandidate=${_lastFallbackCandidateBpm ?? "null"} '
      'fallbackDecision=$_lastFallbackDecision',
    );
  }

  @visibleForTesting
  void debugSeedFallbackCandidate({
    required DateTime observedAt,
    required int bpm,
    required double hrConfidence,
    required double fingerConfidence,
    required double movementIntensity,
  }) {
    _recentFallbackCandidates.add(
      _FallbackBpmCandidate(
        observedAt: observedAt,
        bpm: bpm,
        hrConfidence: hrConfidence,
        fingerConfidence: fingerConfidence,
        movementIntensity: movementIntensity,
      ),
    );
  }

  @visibleForTesting
  void debugFeedEstimatorSample({
    required int timestampMs,
    required double normalizedSignal,
  }) {
    _heartRateEstimator.addSample(
      timestampMs: timestampMs,
      normalizedSignal: normalizedSignal,
    );
    hrConfidence = _heartRateEstimator.confidence;
  }

  String _deriveBlankFinishReason(
    String? failureReason,
    String fallbackDecision,
  ) {
    if (failureReason == 'no_finger') {
      return 'poor_contact';
    }
    if (failureReason == 'weak_contact') {
      return 'weak_contact';
    }
    if (movementIntensity >= _maximumLiveMovement) {
      return 'high_motion';
    }
    if (fallbackDecision.contains('movement')) {
      return 'high_motion';
    }
    if (fallbackDecision == 'fallback_no_candidate' ||
        fallbackDecision == 'fallback_no_recent_candidate' ||
        fallbackDecision == 'fallback_recovery_no_candidate' ||
        fallbackDecision == 'recovery_no_viable_candidate') {
      return 'no_candidate';
    }
    if (fallbackDecision.contains('rejected') ||
        fallbackDecision.contains('confidence') ||
        fallbackDecision.contains('weak') ||
        fallbackDecision.contains('above_cap') ||
        fallbackDecision.contains('above_resting_cap')) {
      return 'poor_quality';
    }
    return 'poor_quality';
  }

  void _maybeLockCaptureControls(DateTime now) {
    if (_captureSettingsLocked || _lockingCaptureSettings) return;
    final activatedAt = _torchActivatedAt;
    final stableFingerAt = _stableFingerDetectedAt;
    if (activatedAt == null || stableFingerAt == null) return;
    if (now.difference(activatedAt) < _torchSettlingDuration) return;
    if (now.difference(stableFingerAt) < _stableFingerBeforeLockDuration) {
      return;
    }
    final controller = cameraController;
    if (controller == null || !controller.value.isInitialized) return;
    _lockingCaptureSettings = true;
    unawaited(_lockCaptureControls(controller));
  }

  Future<void> _lockCaptureControls(CameraController controller) async {
    try {
      try {
        await controller.setExposureMode(ExposureMode.locked);
      } catch (_) {}
      try {
        await controller.setFocusMode(FocusMode.locked);
      } catch (_) {}
      _captureSettingsLocked = true;
    } finally {
      _lockingCaptureSettings = false;
      notifyListeners();
    }
  }
}
