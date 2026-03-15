import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:biotrack_healthcare/features/home/presentation/controllers/scan_vitals_controller.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  test(
    'finishScan stays successful when called again after completion',
    () async {
      final controller = ScanVitalsController()
        ..fingerDetected = true
        ..fingerConfidence = 0.79
        ..hrConfidence = 0.31
        ..estimatedBpm = 51;

      final first = await controller.finishScan();
      final second = await controller.finishScan();

      expect(first['success'], isTrue);
      expect(first['saved'], isFalse);
      expect(second['success'], isTrue);
      expect(second['saved'], first['saved']);
      expect(second['error'], first['error']);
    },
  );

  test(
    'finishScan treats an existing bpm result as a successful scan',
    () async {
      final controller = ScanVitalsController()
        ..fingerDetected = false
        ..fingerConfidence = 0.12
        ..hrConfidence = 0.03
        ..estimatedBpm = 64;

      final result = await controller.finishScan();

      expect(result['success'], isTrue);
      expect(result['saved'], isFalse);
    },
  );

  test(
    'finishScan no longer succeeds from contact alone without a stable bpm',
    () async {
      final controller = ScanVitalsController()
        ..fingerDetected = true
        ..fingerConfidence = 0.81
        ..hrConfidence = 0.28;

      final result = await controller.finishScan();

      expect(result['success'], isFalse);
      expect(result['saved'], isFalse);
      expect(result['reason'], 'unstable_signal');
    },
  );

  test(
    'finishScan reports no_finger when contact was never detected',
    () async {
      final controller = ScanVitalsController()
        ..fingerDetected = false
        ..fingerConfidence = 0.10
        ..hrConfidence = 0.0;

      final result = await controller.finishScan();

      expect(result['success'], isFalse);
      expect(result['saved'], isFalse);
      expect(result['reason'], 'no_finger');
    },
  );

  test(
    'finishScan falls back to a plausible recent late-scan candidate',
    () async {
      final controller = ScanVitalsController()
        ..fingerDetected = false
        ..fingerConfidence = 0.22
        ..hrConfidence = 0.04
        ..movementIntensity = 0.18;

      controller.debugSeedFallbackCandidate(
        observedAt: DateTime.now(),
        bpm: 78,
        hrConfidence: 0.17,
        fingerConfidence: 0.82,
        movementIntensity: 0.16,
      );

      final result = await controller.finishScan();

      expect(result['success'], isTrue);
      expect(result['saved'], isFalse);
      expect(controller.estimatedBpm, 78);
    },
  );

  test(
    'finishScan rejects a high recent candidate during fallback finalization',
    () async {
      final controller = ScanVitalsController()
        ..fingerDetected = false
        ..fingerConfidence = 0.22
        ..hrConfidence = 0.04
        ..movementIntensity = 0.18;

      controller.debugSeedFallbackCandidate(
        observedAt: DateTime.now(),
        bpm: 136,
        hrConfidence: 0.19,
        fingerConfidence: 0.84,
        movementIntensity: 0.12,
      );

      final result = await controller.finishScan();

      expect(result['success'], isFalse);
      expect(result['saved'], isFalse);
      expect(result['reason'], 'no_finger');
    },
  );

  test(
    'finishScan can recover from the estimator buffer when no fallback sample was tracked',
    () async {
      final controller = ScanVitalsController()
        ..fingerDetected = true
        ..fingerConfidence = 0.81
        ..movementIntensity = 0.18;

      for (var timestampMs = 0; timestampMs <= 9000; timestampMs += 95) {
        final phase = 2 * math.pi * 75 * timestampMs / 60000.0;
        final pulse = math.sin(phase) * 0.0028;
        final harmonic = math.sin(phase * 2) * 0.0013;
        final drift = math.sin(timestampMs / 2600.0) * 0.0008;
        controller.debugFeedEstimatorSample(
          timestampMs: timestampMs,
          normalizedSignal: pulse + harmonic + drift,
        );
      }

      final result = await controller.finishScan();

      expect(result['success'], isTrue);
      expect(result['saved'], isFalse);
      expect(controller.estimatedBpm, inInclusiveRange(65, 85));
    },
  );
}
