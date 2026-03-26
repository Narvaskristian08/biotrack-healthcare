import 'dart:math' as math;
import 'dart:collection';

class _SignalSample {
  const _SignalSample({required this.timestampMs, required this.value});

  final int timestampMs;
  final double value;
}

enum _CandidateSource { peak, autocorrelation }

class _BpmCandidate {
  const _BpmCandidate({
    required this.bpm,
    required this.confidence,
    required this.regularity,
    required this.snr,
    required this.source,
    this.peakCount = 0,
    this.intervalCount = 0,
    this.medianIntervalMs = 0,
  });

  final int bpm;
  final double confidence;
  final double regularity;
  final double snr;
  final _CandidateSource source;
  final int peakCount;
  final int intervalCount;
  final double medianIntervalMs;
}

class _PreparedSignalWindow {
  const _PreparedSignalWindow({
    required this.centered,
    required this.stdDev,
    required this.sampleIntervalMs,
  });

  final List<double> centered;
  final double stdDev;
  final double sampleIntervalMs;
}

class HeartRateEstimator {
  HeartRateEstimator({
    this.windowMs = 8000,
    this.minBpm = 48,
    this.maxBpm = 150,
    this.minSamplesForEstimate = 20,
    this.reliabilityThreshold = 0.24,
    this.minimumAcceptConfidence = 0.08,
  });

  final int windowMs;
  final int minBpm;
  final int maxBpm;
  final int minSamplesForEstimate;
  final double reliabilityThreshold;
  final double minimumAcceptConfidence;

  static const double _minSignalStdDev = 0.00035;
  static const double _maxSignalStdDev = 0.028;
  static const int _maxStepPerUpdate = 7;
  static const int _consensusToleranceBpm = 8;
  static const int _hardDisagreementBpm = 24;
  static const double _harmonicRatioMin = 1.45;
  static const double _harmonicRatioMax = 2.15;
  static const double _lowCutoffHz = 0.8;
  static const double _highCutoffHz = 2.5;
  static const int _minimumPeaksForEstimate = 4;
  static const int _minimumDiscoveryPeaks = 3;
  static const int _minimumRestingPeakSpacingMs = 500;
  static const int _relaxedMinimumPeakSpacingMs = 430;
  static const int _harmonicSuppressionThresholdBpm = 110;
  static const int _restingPreferenceCeilingBpm = 118;
  static const int _recentStableMatchToleranceBpm = 14;
  static const int _halfCandidatePeerToleranceBpm = 10;
  static const double _strictPeakThresholdMultiplier = 0.38;
  static const double _relaxedPeakThresholdMultiplier = 0.18;
  static const double _strictPeakThresholdFloor = 0.0010;
  static const double _relaxedPeakThresholdFloor = 0.00025;
  static const double _strictProminenceFactor = 0.92;
  static const double _relaxedProminenceFactor = 0.35;
  static const double _strictIntervalToleranceRatio = 0.16;
  static const double _relaxedIntervalToleranceRatio = 0.34;
  static const double _minimumDiscoveryConfidence = 0.03;

  // Optimized: Using ListQueue for O(1) removals at the front of the window.
  final ListQueue<_SignalSample> _samples = ListQueue<_SignalSample>();

  int _lastPeakMs = -1;
  int _lastBpm = 0;
  int _lastCandidateBpm = 0;
  double _lastConfidence = 0;
  double _lastRegularity = 0;
  double _lastSnr = 0;
  double _lastSignalStrength = 0;
  int _lastDominantCandidateBpm = 0;
  int _lastHalfCandidateBpm = 0;
  int _lastChosenCandidateBpm = 0;
  int _lastProvisionalCandidateBpm = 0;
  int _lastFinalCandidateBpm = 0;
  int _lastHarmonicAdjustedCandidateBpm = 0;
  int _lastPeakCount = 0;
  int _lastIntervalCount = 0;
  int _lastRelaxedPeakCount = 0;
  int _lastRelaxedIntervalCount = 0;
  String _lastRejectionReason = 'waiting_for_samples';
  bool _lastCandidateDiscoveryUsed = false;
  bool _lastRecoveryPassUsed = false;
  bool _lastStrictPathTried = false;
  bool _lastStrictPathSucceeded = false;
  int _lastRelaxedCandidateBpm = 0;
  int _lastRecoveryCandidateBpm = 0;

  int get latestBpm => _lastBpm;
  int get latestCandidateBpm => _lastCandidateBpm;
  double get confidence => _lastConfidence;
  double get regularity => _lastRegularity;
  double get snr => _lastSnr;
  bool get hasReliableSignal => _lastConfidence >= reliabilityThreshold;
  bool get hasEnoughData => _samples.length >= minSamplesForEstimate;
  double get signalStrength => _lastSignalStrength;
  int get lastDominantCandidateBpm => _lastDominantCandidateBpm;
  int get lastHalfCandidateBpm => _lastHalfCandidateBpm;
  int get lastChosenCandidateBpm => _lastChosenCandidateBpm;
  int get lastProvisionalCandidateBpm => _lastProvisionalCandidateBpm;
  int get lastFinalCandidateBpm => _lastFinalCandidateBpm;
  int get lastHarmonicAdjustedCandidateBpm => _lastHarmonicAdjustedCandidateBpm;
  int get lastPeakCount => _lastPeakCount;
  int get lastIntervalCount => _lastIntervalCount;
  int get lastRelaxedPeakCount => _lastRelaxedPeakCount;
  int get lastRelaxedIntervalCount => _lastRelaxedIntervalCount;
  String get lastRejectionReason => _lastRejectionReason;
  bool get lastCandidateDiscoveryUsed => _lastCandidateDiscoveryUsed;
  bool get lastRecoveryPassUsed => _lastRecoveryPassUsed;
  bool get lastStrictPathTried => _lastStrictPathTried;
  bool get lastStrictPathSucceeded => _lastStrictPathSucceeded;
  int get lastRelaxedCandidateBpm => _lastRelaxedCandidateBpm;
  int get lastRecoveryCandidateBpm => _lastRecoveryCandidateBpm;
  String get timingModeLabel => 'timestamps';

  void reset() {
    _samples.clear();
    _lastPeakMs = -1;
    _lastBpm = 0;
    _lastCandidateBpm = 0;
    _lastConfidence = 0;
    _lastRegularity = 0;
    _lastSnr = 0;
    _lastSignalStrength = 0;
    _lastDominantCandidateBpm = 0;
    _lastHalfCandidateBpm = 0;
    _lastChosenCandidateBpm = 0;
    _lastProvisionalCandidateBpm = 0;
    _lastFinalCandidateBpm = 0;
    _lastHarmonicAdjustedCandidateBpm = 0;
    _lastPeakCount = 0;
    _lastIntervalCount = 0;
    _lastRelaxedPeakCount = 0;
    _lastRelaxedIntervalCount = 0;
    _lastRejectionReason = 'reset';
    _lastCandidateDiscoveryUsed = false;
    _lastRecoveryPassUsed = false;
    _lastStrictPathTried = false;
    _lastStrictPathSucceeded = false;
    _lastRelaxedCandidateBpm = 0;
    _lastRecoveryCandidateBpm = 0;
  }

  int? addSample({required int timestampMs, required double normalizedSignal}) {
    _samples.add(
      _SignalSample(timestampMs: timestampMs, value: normalizedSignal),
    );
    _trimSamples(timestampMs);
    _lastRecoveryPassUsed = false;
    _lastCandidateDiscoveryUsed = false;
    _lastStrictPathTried = false;
    _lastStrictPathSucceeded = false;
    _lastFinalCandidateBpm = 0;
    _lastProvisionalCandidateBpm = 0;
    _lastRelaxedCandidateBpm = 0;
    _lastRecoveryCandidateBpm = 0;

    if (!hasEnoughData) {
      _lastRejectionReason = 'insufficient_samples';
      return null;
    }

    final prepared = _prepareSignalWindow();
    if (prepared == null) {
      _lastConfidence = 0;
      _lastChosenCandidateBpm = 0;
      return null;
    }

    _lastStrictPathTried = true;
    final strictPeakCandidate = _estimateFromPeaks(
      centered: prepared.centered,
      stdDev: prepared.stdDev,
      relaxed: false,
    );
    final strictAutoCandidate = _estimateFromAutocorrelation(
      centered: prepared.centered,
      stdDev: prepared.stdDev,
      sampleIntervalMs: prepared.sampleIntervalMs,
      relaxed: false,
    );
    _lastPeakCount = strictPeakCandidate?.peakCount ?? 0;
    _lastIntervalCount = strictPeakCandidate?.intervalCount ?? 0;

    final strictSelected = _selectBestCandidate(
      strictPeakCandidate,
      strictAutoCandidate,
    );
    _lastStrictPathSucceeded = strictSelected != null;

    _BpmCandidate? discoverySelected = strictSelected;
    if (discoverySelected == null) {
      _lastCandidateDiscoveryUsed = true;
      final relaxedPeakCandidate = _estimateFromPeaks(
        centered: prepared.centered,
        stdDev: prepared.stdDev,
        relaxed: true,
      );
      final relaxedAutoCandidate = _estimateFromAutocorrelation(
        centered: prepared.centered,
        stdDev: prepared.stdDev,
        sampleIntervalMs: prepared.sampleIntervalMs,
        relaxed: true,
      );
      _lastRelaxedPeakCount = relaxedPeakCandidate?.peakCount ?? 0;
      _lastRelaxedIntervalCount = relaxedPeakCandidate?.intervalCount ?? 0;
      discoverySelected = _selectBestCandidate(
        relaxedPeakCandidate,
        relaxedAutoCandidate,
      );
      _lastRelaxedCandidateBpm = discoverySelected?.bpm ?? 0;
    } else {
      _lastRelaxedPeakCount = 0;
      _lastRelaxedIntervalCount = 0;
    }

    if (discoverySelected == null) {
      _lastConfidence = 0;
      _lastChosenCandidateBpm = 0;
      _lastRejectionReason = _lastCandidateDiscoveryUsed
          ? 'no_viable_candidate_after_relaxed'
          : 'no_viable_candidate';
      return null;
    }

    _lastConfidence = discoverySelected.confidence;
    _lastRegularity = discoverySelected.regularity;
    _lastSnr = discoverySelected.snr;
    _lastCandidateBpm = discoverySelected.bpm;
    _lastChosenCandidateBpm = discoverySelected.bpm;
    _lastProvisionalCandidateBpm = discoverySelected.bpm;

    final finalSelected =
        strictSelected != null &&
            strictSelected.confidence >= minimumAcceptConfidence
        ? strictSelected
        : null;
    if (finalSelected == null) {
      if (discoverySelected.confidence < _minimumDiscoveryConfidence) {
        _lastRejectionReason = 'candidate_too_weak';
      } else if (_lastCandidateDiscoveryUsed) {
        _lastRejectionReason = 'discovery_candidate_only';
      } else {
        _lastRejectionReason = 'confidence_below_minimum';
      }
      return null;
    }

    _lastFinalCandidateBpm = finalSelected.bpm;
    _lastConfidence = finalSelected.confidence;
    _lastRegularity = finalSelected.regularity;
    _lastSnr = finalSelected.snr;
    _lastCandidateBpm = finalSelected.bpm;
    _lastChosenCandidateBpm = finalSelected.bpm;

    // Prevent bursty updates within a very short interval.
    if (_lastPeakMs > 0) {
      final nowMs = _samples.last.timestampMs;
      if (nowMs - _lastPeakMs < 220) {
        _lastRejectionReason = 'update_throttled';
        return _lastBpm > 0 ? _lastBpm : finalSelected.bpm;
      }
    }

    _lastPeakMs = _samples.last.timestampMs;
    _lastBpm = _stabilizeBpm(finalSelected.bpm);
    _lastRejectionReason = 'none';
    return _lastBpm;
  }

  _BpmCandidate? _estimateFromPeaks({
    required List<double> centered,
    required double stdDev,
    required bool relaxed,
  }) {
    final threshold = math
        .max(
          stdDev *
              (relaxed
                  ? _relaxedPeakThresholdMultiplier
                  : _strictPeakThresholdMultiplier),
          relaxed ? _relaxedPeakThresholdFloor : _strictPeakThresholdFloor,
        )
        .toDouble();
    final peaks = <int>[];
    final peakValues = <double>[];
    final minimumPeakSpacingMs = _adaptiveMinimumPeakSpacingMs(
      relaxed: relaxed,
    );
    final minimumPeaks = relaxed
        ? _minimumDiscoveryPeaks
        : _minimumPeaksForEstimate;
    final prominenceFactor = relaxed
        ? _relaxedProminenceFactor
        : _strictProminenceFactor;
    final replacementFactor = relaxed ? 1.03 : 1.08;

    for (var i = 1; i < centered.length - 1; i++) {
      final leftBaseline = math.min(
        centered[i - 1],
        i > 1 ? centered[i - 2] : centered[i - 1],
      );
      final rightBaseline = math.min(
        centered[i + 1],
        i + 2 < centered.length ? centered[i + 2] : centered[i + 1],
      );
      final prominence = centered[i] - math.max(leftBaseline, rightBaseline);
      final isPeak =
          centered[i] > centered[i - 1] &&
          centered[i] > centered[i + 1] &&
          centered[i] > threshold &&
          prominence > threshold * prominenceFactor;

      if (!isPeak) continue;

      final peakTimeMs = _samples.elementAt(i).timestampMs;
      if (peaks.isNotEmpty && peakTimeMs - peaks.last < minimumPeakSpacingMs) {
        if (centered[i].abs() > peakValues.last * replacementFactor) {
          peaks[peaks.length - 1] = peakTimeMs;
          peakValues[peakValues.length - 1] = centered[i].abs();
        }
        continue;
      }
      peaks.add(peakTimeMs);
      peakValues.add(centered[i].abs());
    }

    if (peaks.length < minimumPeaks) return null;

    final intervalsMs = <int>[];
    for (var i = 1; i < peaks.length; i++) {
      final interval = peaks[i] - peaks[i - 1];
      if (interval >= minimumPeakSpacingMs) {
        intervalsMs.add(interval);
      }
    }

    if (intervalsMs.length < 2) return null;

    final medianIntervalMs = _medianInt(intervalsMs);
    final maximumDeviationMs = math.max(
      relaxed ? 130.0 : 90.0,
      medianIntervalMs *
          (relaxed
              ? _relaxedIntervalToleranceRatio
              : _strictIntervalToleranceRatio),
    );
    final consistentIntervals = intervalsMs
        .where((interval) {
          return (interval - medianIntervalMs).abs() <= maximumDeviationMs;
        })
        .toList(growable: false);

    if (consistentIntervals.length < 2) return null;

    final refinedMedianIntervalMs = _medianInt(consistentIntervals);
    final avgIntervalMs = _averageInt(consistentIntervals);
    final bpm = (60000 / refinedMedianIntervalMs).round();
    if (bpm < minBpm || bpm > maxBpm) return null;

    final intervalStdDev = _standardDeviationInt(
      consistentIntervals,
      avgIntervalMs,
    );
    final regularityRatio = intervalStdDev / refinedMedianIntervalMs;
    final regularity = (1 - (regularityRatio / 0.45))
        .clamp(0.0, 1.0)
        .toDouble();

    var peakAmplitudeSum = 0.0;
    for (final v in peakValues) {
      peakAmplitudeSum += v;
    }
    final avgPeakAmplitude = peakAmplitudeSum / math.max(1, peakValues.length);

    var noiseFloorSum = 0.0;
    for (final v in centered) {
      noiseFloorSum += v.abs();
    }
    final noiseFloor = noiseFloorSum / centered.length;

    final snr = avgPeakAmplitude / (noiseFloor + 1e-9);
    final snrScore = ((snr - 0.95) / 1.5).clamp(0.0, 1.0).toDouble();
    final signalScore = _signalScoreFromStdDev(stdDev);

    final confidence = relaxed
        ? (0.28 * signalScore + 0.30 * regularity + 0.42 * snrScore).toDouble()
        : (0.35 * signalScore + 0.35 * regularity + 0.30 * snrScore).toDouble();

    return _BpmCandidate(
      bpm: bpm,
      confidence: confidence,
      regularity: regularity,
      snr: snr,
      source: _CandidateSource.peak,
      peakCount: peaks.length,
      intervalCount: consistentIntervals.length,
      medianIntervalMs: refinedMedianIntervalMs,
    );
  }

  _BpmCandidate? _estimateFromAutocorrelation({
    required List<double> centered,
    required double stdDev,
    required double sampleIntervalMs,
    required bool relaxed,
  }) {
    if (sampleIntervalMs <= 0 || centered.length < (relaxed ? 18 : 24)) {
      return null;
    }

    final minLag = (60000 / maxBpm / sampleIntervalMs).floor().clamp(
      2,
      centered.length ~/ 2,
    );
    final maxLag = (60000 / minBpm / sampleIntervalMs).ceil().clamp(
      minLag + 1,
      centered.length - 2,
    );

    if (maxLag <= minLag) return null;

    var signalEnergy = 0.0;
    for (final value in centered) {
      signalEnergy += value * value;
    }
    if (signalEnergy <= 1e-12) return null;

    var bestLag = -1;
    var bestCorr = -1.0;
    var secondCorr = -1.0;

    for (var lag = minLag; lag <= maxLag; lag++) {
      var sum = 0.0;
      for (var i = lag; i < centered.length; i++) {
        sum += centered[i] * centered[i - lag];
      }
      final normalized = sum / signalEnergy;

      if (normalized > bestCorr) {
        secondCorr = bestCorr;
        bestCorr = normalized;
        bestLag = lag;
      } else if (normalized > secondCorr) {
        secondCorr = normalized;
      }
    }

    if (bestLag <= 0 || bestCorr <= 0) return null;

    final bpm = (60000 / (bestLag * sampleIntervalMs)).round();
    if (bpm < minBpm || bpm > maxBpm) return null;

    final periodicity = bestCorr.clamp(0.0, 1.0).toDouble();
    final separation = (bestCorr - math.max(0, secondCorr)).clamp(0.0, 1.0);
    final separationScore = (separation / 0.16).clamp(0.0, 1.0).toDouble();
    final signalScore = _signalScoreFromStdDev(stdDev);

    final confidence = relaxed
        ? (0.56 * periodicity + 0.20 * separationScore + 0.24 * signalScore)
              .toDouble()
        : (0.50 * periodicity + 0.28 * separationScore + 0.22 * signalScore)
              .toDouble();

    return _BpmCandidate(
      bpm: bpm,
      confidence: confidence,
      regularity: periodicity,
      snr: bestCorr,
      source: _CandidateSource.autocorrelation,
    );
  }

  _BpmCandidate? _selectBestCandidate(
    _BpmCandidate? first,
    _BpmCandidate? second,
  ) {
    if (first == null) {
      if (second == null) {
        return null;
      }
      return _applyRestingPreference(dominant: second);
    }
    if (second == null) {
      return _applyRestingPreference(dominant: first);
    }

    final gap = (first.bpm - second.bpm).abs();
    if (gap <= _consensusToleranceBpm) {
      final totalConfidence = first.confidence + second.confidence + 1e-9;
      final blendedBpm =
          ((first.bpm * first.confidence + second.bpm * second.confidence) /
                  totalConfidence)
              .round();
      final blendedConfidence =
          ((first.confidence + second.confidence) / 2 + 0.07)
              .clamp(0.0, 1.0)
              .toDouble();
      final blendedRegularity = ((first.regularity + second.regularity) / 2)
          .clamp(0.0, 1.0)
          .toDouble();
      final blendedSnr = (first.snr + second.snr) / 2;

      final blended = _BpmCandidate(
        bpm: blendedBpm,
        confidence: blendedConfidence,
        regularity: blendedRegularity,
        snr: blendedSnr,
        source: first.source == second.source
            ? first.source
            : _CandidateSource.autocorrelation,
        peakCount: math.max(first.peakCount, second.peakCount),
        intervalCount: math.max(first.intervalCount, second.intervalCount),
        medianIntervalMs: first.medianIntervalMs > 0
            ? first.medianIntervalMs
            : second.medianIntervalMs,
      );
      return _applyRestingPreference(
        dominant: blended,
        peer: first.bpm <= second.bpm ? first : second,
      );
    }

    final lower = first.bpm <= second.bpm ? first : second;
    final higher = identical(lower, first) ? second : first;
    final harmonicRatio = higher.bpm / math.max(1, lower.bpm);
    final looksLikeHarmonicMismatch =
        harmonicRatio >= _harmonicRatioMin &&
        harmonicRatio <= _harmonicRatioMax;
    if (looksLikeHarmonicMismatch) {
      final lowerSignal =
          lower.confidence +
          (lower.regularity * 0.18) +
          (lower.source == _CandidateSource.autocorrelation ? 0.05 : 0.0);
      final higherSignal = higher.confidence + (higher.regularity * 0.10);
      final preferLower =
          lowerSignal >= higherSignal * 0.82 ||
          (lower.source == _CandidateSource.autocorrelation &&
              lower.confidence >= minimumAcceptConfidence &&
              lower.regularity >= 0.18);

      if (preferLower) {
        return _applyRestingPreference(
          dominant: _BpmCandidate(
            bpm: lower.bpm,
            confidence: (lower.confidence + 0.04).clamp(0.0, 1.0).toDouble(),
            regularity: lower.regularity,
            snr: lower.snr,
            source: lower.source,
            peakCount: lower.peakCount,
            intervalCount: lower.intervalCount,
            medianIntervalMs: lower.medianIntervalMs,
          ),
          peer: higher,
        );
      }
    }

    final stronger = first.confidence >= second.confidence ? first : second;
    if (gap >= _hardDisagreementBpm &&
        stronger.confidence < minimumAcceptConfidence + 0.02) {
      return null;
    }

    final downgradedConfidence = gap >= _hardDisagreementBpm
        ? (stronger.confidence * 0.88).clamp(0.0, 1.0).toDouble()
        : (stronger.confidence * 0.92).clamp(0.0, 1.0).toDouble();

    return _applyRestingPreference(
      dominant: _BpmCandidate(
        bpm: stronger.bpm,
        confidence: downgradedConfidence,
        regularity: stronger.regularity,
        snr: stronger.snr,
        source: stronger.source,
        peakCount: stronger.peakCount,
        intervalCount: stronger.intervalCount,
        medianIntervalMs: stronger.medianIntervalMs,
      ),
      peer: identical(stronger, first) ? second : first,
    );
  }

  int _stabilizeBpm(int incomingBpm) {
    final incoming = incomingBpm.clamp(minBpm, maxBpm).toInt();
    if (_lastBpm <= 0) return incoming;

    final delta = (incoming - _lastBpm).clamp(
      -_maxStepPerUpdate,
      _maxStepPerUpdate,
    );
    final limited = (_lastBpm + delta).clamp(minBpm, maxBpm).toInt();
    final blended = ((_lastBpm * 0.72) + (limited * 0.28)).round();

    return blended.clamp(minBpm, maxBpm).toInt();
  }

  double _signalScoreFromStdDev(double stdDev) {
    return ((stdDev - _minSignalStdDev) / (_maxSignalStdDev - _minSignalStdDev))
        .clamp(0.0, 1.0)
        .toDouble();
  }

  int? recoverLateScanCandidate({
    int maxPlausibleBpm = _restingPreferenceCeilingBpm,
    double minimumConfidence = _minimumDiscoveryConfidence,
  }) {
    _lastRecoveryPassUsed = true;
    _lastFinalCandidateBpm = 0;
    _lastRecoveryCandidateBpm = 0;

    final prepared = _prepareSignalWindow();
    if (prepared == null) {
      return null;
    }

    final relaxedPeakCandidate = _estimateFromPeaks(
      centered: prepared.centered,
      stdDev: prepared.stdDev,
      relaxed: true,
    );
    final relaxedAutoCandidate = _estimateFromAutocorrelation(
      centered: prepared.centered,
      stdDev: prepared.stdDev,
      sampleIntervalMs: prepared.sampleIntervalMs,
      relaxed: true,
    );
    _lastRelaxedPeakCount = relaxedPeakCandidate?.peakCount ?? 0;
    _lastRelaxedIntervalCount = relaxedPeakCandidate?.intervalCount ?? 0;

    final recoveredCandidate = _selectBestCandidate(
      relaxedPeakCandidate,
      relaxedAutoCandidate,
    );
    if (recoveredCandidate == null) {
      _lastRejectionReason = 'recovery_no_viable_candidate';
      return null;
    }

    _lastCandidateDiscoveryUsed = true;
    _lastProvisionalCandidateBpm = recoveredCandidate.bpm;
    _lastCandidateBpm = recoveredCandidate.bpm;
    _lastChosenCandidateBpm = recoveredCandidate.bpm;
    _lastRecoveryCandidateBpm = recoveredCandidate.bpm;
    _lastConfidence = recoveredCandidate.confidence;
    _lastRegularity = recoveredCandidate.regularity;
    _lastSnr = recoveredCandidate.snr;

    if (recoveredCandidate.bpm > maxPlausibleBpm) {
      _lastRejectionReason = 'recovery_candidate_above_cap';
      return null;
    }
    if (recoveredCandidate.confidence < minimumConfidence) {
      _lastRejectionReason = 'recovery_candidate_too_weak';
      return null;
    }

    _lastFinalCandidateBpm = recoveredCandidate.bpm;
    _lastRejectionReason = 'recovery_candidate_ready';
    return recoveredCandidate.bpm;
  }

  int _adaptiveMinimumPeakSpacingMs({required bool relaxed}) {
    final referenceBpm = _lastCandidateBpm > 0 ? _lastCandidateBpm : _lastBpm;
    if (referenceBpm <= 0) {
      return relaxed
          ? _relaxedMinimumPeakSpacingMs
          : _minimumRestingPeakSpacingMs;
    }

    final expectedIntervalMs = 60000 / referenceBpm;
    return math.max(
      relaxed ? _relaxedMinimumPeakSpacingMs : _minimumRestingPeakSpacingMs,
      (expectedIntervalMs * 0.62).round(),
    );
  }

  _BpmCandidate _applyRestingPreference({
    required _BpmCandidate dominant,
    _BpmCandidate? peer,
  }) {
    _lastDominantCandidateBpm = dominant.bpm;
    _lastHalfCandidateBpm = 0;
    _lastHarmonicAdjustedCandidateBpm = 0;

    var chosen = dominant;
    final peerIsPlausibleResting =
        peer != null &&
        peer.bpm <= _restingPreferenceCeilingBpm &&
        peer.confidence >= dominant.confidence * 0.84;
    if (dominant.bpm > _restingPreferenceCeilingBpm && peerIsPlausibleResting) {
      chosen = _boostCandidate(peer, 0.02);
    }

    final halfCandidate = _buildHalfCandidate(dominant: dominant, peer: peer);
    if (halfCandidate != null) {
      _lastHalfCandidateBpm = halfCandidate.bpm;
      final recentStableMatch =
          _lastBpm > 0 &&
          (halfCandidate.bpm - _lastBpm).abs() <=
              _recentStableMatchToleranceBpm;
      final peerSupportsHalf =
          peer != null &&
          (peer.bpm - halfCandidate.bpm).abs() <=
              _halfCandidatePeerToleranceBpm;
      final preferHalf =
          peerSupportsHalf ||
          recentStableMatch ||
          (dominant.bpm > _restingPreferenceCeilingBpm &&
              halfCandidate.confidence >= dominant.confidence * 0.82);
      if (preferHalf) {
        chosen = halfCandidate;
      }
    }

    if (chosen.bpm != dominant.bpm) {
      _lastHarmonicAdjustedCandidateBpm = chosen.bpm;
    }
    _lastChosenCandidateBpm = chosen.bpm;
    return chosen;
  }

  _PreparedSignalWindow? _prepareSignalWindow() {
    final sampleIntervalMs = _estimatedSampleIntervalMs();
    if (sampleIntervalMs <= 0) {
      _lastRejectionReason = 'timestamp_interval_invalid';
      return null;
    }

    final length = _samples.length;
    final values = List<double>.generate(
      length,
      (i) => _samples.elementAt(i).value,
    );
    final smoothed = _smooth(values);
    final bandPassed = _bandPass(
      values: smoothed,
      sampleIntervalMs: sampleIntervalMs,
    );

    var sum = 0.0;
    for (var i = 0; i < length; i++) {
      sum += bandPassed[i];
    }
    final mean = sum / length;

    var varianceSum = 0.0;
    final centered = List<double>.filled(length, 0.0);
    for (var i = 0; i < length; i++) {
      final centeredValue = bandPassed[i] - mean;
      centered[i] = centeredValue;
      varianceSum += centeredValue * centeredValue;
    }

    final stdDev = math.sqrt(varianceSum / length);
    _lastSignalStrength = stdDev;
    if (stdDev < _minSignalStdDev) {
      _lastRejectionReason = 'signal_too_weak';
      return null;
    }

    return _PreparedSignalWindow(
      centered: centered,
      stdDev: stdDev,
      sampleIntervalMs: sampleIntervalMs,
    );
  }

  _BpmCandidate? _buildHalfCandidate({
    required _BpmCandidate dominant,
    _BpmCandidate? peer,
  }) {
    if (dominant.bpm <= _harmonicSuppressionThresholdBpm) {
      return null;
    }

    final halfBpm = (dominant.bpm / 2).round();
    if (halfBpm < minBpm || halfBpm > _restingPreferenceCeilingBpm) {
      return null;
    }

    final peerSupportsHalf =
        peer != null &&
        (peer.bpm - halfBpm).abs() <= _halfCandidatePeerToleranceBpm;
    final recentStableMatch =
        _lastBpm > 0 &&
        (halfBpm - _lastBpm).abs() <= _recentStableMatchToleranceBpm &&
        (dominant.bpm - _lastBpm).abs() > (halfBpm - _lastBpm).abs();
    final dominantLooksSuspicious =
        dominant.bpm > _restingPreferenceCeilingBpm &&
        dominant.confidence < 0.78;

    if (!peerSupportsHalf && !recentStableMatch && !dominantLooksSuspicious) {
      return null;
    }

    final confidence =
        (dominant.confidence * (peerSupportsHalf ? 0.95 : 0.82) +
                (peerSupportsHalf ? 0.08 : 0.0) +
                (recentStableMatch ? 0.06 : 0.0))
            .clamp(0.0, 1.0)
            .toDouble();

    return _BpmCandidate(
      bpm: halfBpm,
      confidence: confidence,
      regularity: math.max(dominant.regularity, peer?.regularity ?? 0.0),
      snr: dominant.snr,
      source: peerSupportsHalf ? peer.source : dominant.source,
      peakCount: math.max(dominant.peakCount, peer?.peakCount ?? 0),
      intervalCount: math.max(dominant.intervalCount, peer?.intervalCount ?? 0),
      medianIntervalMs: peer != null && peer.medianIntervalMs > 0
          ? peer.medianIntervalMs
          : dominant.medianIntervalMs * 2,
    );
  }

  _BpmCandidate _boostCandidate(_BpmCandidate candidate, double delta) {
    return _BpmCandidate(
      bpm: candidate.bpm,
      confidence: (candidate.confidence + delta).clamp(0.0, 1.0).toDouble(),
      regularity: candidate.regularity,
      snr: candidate.snr,
      source: candidate.source,
      peakCount: candidate.peakCount,
      intervalCount: candidate.intervalCount,
      medianIntervalMs: candidate.medianIntervalMs,
    );
  }

  double _estimatedSampleIntervalMs() {
    if (_samples.length < 2) return 0;

    final durationMs = _samples.last.timestampMs - _samples.first.timestampMs;
    if (durationMs <= 0) return 0;

    return durationMs / (_samples.length - 1);
  }

  List<double> _smooth(List<double> values) {
    if (values.length < 5) return values;

    final out = List<double>.filled(values.length, 0);
    for (var i = 0; i < values.length; i++) {
      final start = math.max(0, i - 2);
      final end = math.min(values.length - 1, i + 2);
      var sum = 0.0;
      for (var j = start; j <= end; j++) {
        sum += values[j];
      }
      out[i] = sum / (end - start + 1);
    }
    return out;
  }

  double _averageInt(List<int> values) {
    if (values.isEmpty) {
      return 0;
    }
    var sum = 0;
    for (final value in values) {
      sum += value;
    }
    return sum / values.length;
  }

  double _medianInt(List<int> values) {
    if (values.isEmpty) {
      return 0;
    }
    final sorted = List<int>.from(values)..sort();
    final middle = sorted.length ~/ 2;
    if (sorted.length.isOdd) {
      return sorted[middle].toDouble();
    }
    return (sorted[middle - 1] + sorted[middle]) / 2.0;
  }

  double _standardDeviationInt(List<int> values, double mean) {
    if (values.isEmpty) {
      return 0;
    }
    var varianceSum = 0.0;
    for (final value in values) {
      final diff = value - mean;
      varianceSum += diff * diff;
    }
    return math.sqrt(varianceSum / values.length);
  }

  List<double> _bandPass({
    required List<double> values,
    required double sampleIntervalMs,
  }) {
    if (values.length < 5) {
      return values;
    }

    final dt = sampleIntervalMs / 1000.0;
    if (dt <= 0) {
      return values;
    }

    final lowPassedBaseline = _lowPass(values, _lowCutoffHz, dt);
    final highPassed = List<double>.filled(values.length, 0.0);
    for (var i = 0; i < values.length; i++) {
      highPassed[i] = values[i] - lowPassedBaseline[i];
    }

    return _lowPass(highPassed, _highCutoffHz, dt);
  }

  List<double> _lowPass(
    List<double> values,
    double cutoffHz,
    double dtSeconds,
  ) {
    if (values.isEmpty) {
      return values;
    }

    final rc = 1.0 / (2 * math.pi * cutoffHz);
    final alpha = dtSeconds / (rc + dtSeconds);
    final out = List<double>.filled(values.length, 0.0);
    out[0] = values[0];

    for (var i = 1; i < values.length; i++) {
      out[i] = out[i - 1] + alpha * (values[i] - out[i - 1]);
    }

    return out;
  }

  void _trimSamples(int nowMs) {
    // Optimized: O(1) removal using removeFirst on the ListQueue
    while (_samples.isNotEmpty &&
        nowMs - _samples.first.timestampMs > windowMs) {
      _samples.removeFirst();
    }
  }
}
