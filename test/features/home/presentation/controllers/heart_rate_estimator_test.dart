import 'dart:math' as math;

import 'package:flutter_test/flutter_test.dart';
import 'package:biotrack_healthcare/features/home/presentation/controllers/heart_rate_estimator.dart';

void main() {
  int? pumpEstimator({
    required HeartRateEstimator estimator,
    required int bpm,
    required int durationMs,
    required int intervalMs,
    required double amplitude,
    double secondaryPeakAmplitude = 0.18,
  }) {
    int? latest;

    for (
      var timestampMs = 0;
      timestampMs <= durationMs;
      timestampMs += intervalMs
    ) {
      final phase = 2 * math.pi * bpm * timestampMs / 60000.0;
      final harmonic = math.sin(phase * 2) * amplitude * secondaryPeakAmplitude;
      final drift = math.sin(timestampMs / 3200.0) * amplitude * 0.08;
      final signal = math.sin(phase) * amplitude + harmonic + drift;
      latest = estimator.addSample(
        timestampMs: timestampMs,
        normalizedSignal: signal,
      );
    }

    return latest;
  }

  test('heart-rate estimator resolves a clean pulse waveform', () {
    final estimator = HeartRateEstimator();

    final latest = pumpEstimator(
      estimator: estimator,
      bpm: 72,
      durationMs: 14000,
      intervalMs: 85,
      amplitude: 0.010,
    );

    expect(latest, isNotNull);
    expect((latest! - 72).abs(), lessThanOrEqualTo(8));
    expect(estimator.latestCandidateBpm, greaterThan(0));
    expect(estimator.confidence, greaterThan(0.08));
  });

  test(
    'heart-rate estimator resolves weaker fingertip signals after the lower rejection floor',
    () {
      final estimator = HeartRateEstimator();

      pumpEstimator(
        estimator: estimator,
        bpm: 84,
        durationMs: 16000,
        intervalMs: 90,
        amplitude: 0.0032,
      );

      expect(estimator.latestCandidateBpm, greaterThan(0));
      expect((estimator.latestCandidateBpm - 84).abs(), lessThanOrEqualTo(14));
      expect(estimator.confidence, greaterThan(0.03));
    },
  );

  test('heart-rate estimator avoids locking onto strong secondary peaks', () {
    final estimator = HeartRateEstimator();

    pumpEstimator(
      estimator: estimator,
      bpm: 90,
      durationMs: 18000,
      intervalMs: 85,
      amplitude: 0.006,
      secondaryPeakAmplitude: 0.42,
    );

    expect(estimator.latestCandidateBpm, greaterThan(0));
    expect((estimator.latestCandidateBpm - 90).abs(), lessThanOrEqualTo(14));
  });

  test(
    'heart-rate estimator tolerates drift and high-frequency noise in the band-pass window',
    () {
      final estimator = HeartRateEstimator();
      int? latest;

      for (var timestampMs = 0; timestampMs <= 16000; timestampMs += 85) {
        final phase = 2 * math.pi * 78 * timestampMs / 60000.0;
        final pulse = math.sin(phase) * 0.010;
        final drift = math.sin(timestampMs / 1800.0) * 0.010;
        final noise = math.sin(timestampMs / 55.0) * 0.003;
        latest = estimator.addSample(
          timestampMs: timestampMs,
          normalizedSignal: pulse + drift + noise,
        );
      }

      expect(latest, isNotNull);
      expect((latest! - 78).abs(), lessThanOrEqualTo(12));
    },
  );

  test(
    'heart-rate estimator suppresses a dominant second harmonic in resting scans',
    () {
      final estimator = HeartRateEstimator();
      int? latest;

      for (var timestampMs = 0; timestampMs <= 18000; timestampMs += 85) {
        final phase = 2 * math.pi * 76 * timestampMs / 60000.0;
        final fundamental = math.sin(phase) * 0.0045;
        final dominantHarmonic = math.sin(phase * 2) * 0.0100;
        final drift = math.sin(timestampMs / 3000.0) * 0.0012;
        latest = estimator.addSample(
          timestampMs: timestampMs,
          normalizedSignal: fundamental + dominantHarmonic + drift,
        );
      }

      expect(latest, isNotNull);
      expect((latest! - 76).abs(), lessThanOrEqualTo(12));
      expect(estimator.lastChosenCandidateBpm, inInclusiveRange(70, 82));
      expect(
        estimator.lastHalfCandidateBpm == 0 ||
            estimator.lastHalfCandidateBpm <= 82,
        isTrue,
      );
    },
  );

  test(
    'heart-rate estimator recovers a plausible late candidate from a weak resting window',
    () {
      final estimator = HeartRateEstimator();

      for (var timestampMs = 0; timestampMs <= 9000; timestampMs += 95) {
        final phase = 2 * math.pi * 74 * timestampMs / 60000.0;
        final pulse = math.sin(phase) * 0.0028;
        final harmonic = math.sin(phase * 2) * 0.0014;
        final drift = math.sin(timestampMs / 2600.0) * 0.0008;
        estimator.addSample(
          timestampMs: timestampMs,
          normalizedSignal: pulse + harmonic + drift,
        );
      }

      final recovered = estimator.recoverLateScanCandidate(
        maxPlausibleBpm: 118,
        minimumConfidence: 0.05,
      );

      expect(recovered, isNotNull);
      expect((recovered! - 74).abs(), lessThanOrEqualTo(14));
      expect(estimator.lastRecoveryPassUsed, isTrue);
      expect(estimator.lastProvisionalCandidateBpm, greaterThan(0));
      expect(estimator.lastRelaxedPeakCount, greaterThanOrEqualTo(3));
    },
  );
}
