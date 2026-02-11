import 'dart:math' as math;

class _SignalSample {
  const _SignalSample({required this.timestampMs, required this.value});

  final int timestampMs;
  final double value;
}

class _BpmCandidate {
  const _BpmCandidate({
    required this.bpm,
    required this.confidence,
    required this.regularity,
    required this.snr,
  });

  final int bpm;
  final double confidence;
  final double regularity;
  final double snr;
}

class HeartRateEstimator {
  HeartRateEstimator({
    this.windowMs = 20000,
    this.minBpm = 42,
    this.maxBpm = 190,
    this.reliabilityThreshold = 0.34,
    this.minimumAcceptConfidence = 0.18,
  });

  final int windowMs;
  final int minBpm;
  final int maxBpm;
  final double reliabilityThreshold;
  final double minimumAcceptConfidence;

  final List<_SignalSample> _samples = <_SignalSample>[];
  int _lastPeakMs = -1;
  int _lastBpm = 0;
  double _lastConfidence = 0;
  double _lastRegularity = 0;
  double _lastSnr = 0;
  double _lastSignalStrength = 0;

  int get latestBpm => _lastBpm;
  double get confidence => _lastConfidence;
  double get regularity => _lastRegularity;
  double get snr => _lastSnr;
  bool get hasReliableSignal => _lastConfidence >= reliabilityThreshold;
  bool get hasEnoughData => _samples.length >= 45;
  double get signalStrength => _lastSignalStrength;

  void reset() {
    _samples.clear();
    _lastPeakMs = -1;
    _lastBpm = 0;
    _lastConfidence = 0;
    _lastRegularity = 0;
    _lastSnr = 0;
    _lastSignalStrength = 0;
  }

  int? addSample({
    required int timestampMs,
    required double normalizedIntensity,
  }) {
    _samples.add(
      _SignalSample(timestampMs: timestampMs, value: normalizedIntensity),
    );
    _trimSamples(timestampMs);

    if (!hasEnoughData) {
      return null;
    }

    final values = _samples.map((e) => e.value).toList(growable: false);
    final smoothed = _smooth(values);
    final mean = smoothed.reduce((a, b) => a + b) / smoothed.length;
    final centered = smoothed.map((e) => e - mean).toList(growable: false);

    final variance =
        centered.map((v) => v * v).reduce((a, b) => a + b) / centered.length;
    final stdDev = math.sqrt(variance);
    _lastSignalStrength = stdDev;

    if (stdDev < 0.0025) {
      _lastConfidence = 0;
      return null;
    }

    final sampleIntervalMs = _estimatedSampleIntervalMs();
    final peakCandidate = _estimateFromPeaks(
      centered: centered,
      stdDev: stdDev,
    );
    final autoCandidate = _estimateFromAutocorrelation(
      centered: centered,
      stdDev: stdDev,
      sampleIntervalMs: sampleIntervalMs,
    );

    final selected = _selectBestCandidate(peakCandidate, autoCandidate);
    if (selected == null) {
      _lastConfidence = 0;
      return null;
    }

    _lastConfidence = selected.confidence;
    _lastRegularity = selected.regularity;
    _lastSnr = selected.snr;

    if (selected.confidence < minimumAcceptConfidence) {
      return null;
    }

    // Prevent bursty updates within a very short interval.
    if (_lastPeakMs > 0) {
      final nowMs = _samples.last.timestampMs;
      if (nowMs - _lastPeakMs < 220) {
        return _lastBpm > 0 ? _lastBpm : selected.bpm;
      }
    }

    _lastPeakMs = _samples.last.timestampMs;
    _lastBpm = selected.bpm;
    return selected.bpm;
  }

  _BpmCandidate? _estimateFromPeaks({
    required List<double> centered,
    required double stdDev,
  }) {
    final threshold = math.max(stdDev * 0.6, 0.0038).toDouble();
    final peaks = <int>[];
    final peakValues = <double>[];

    for (var i = 1; i < centered.length - 1; i++) {
      final isPeak =
          centered[i] > centered[i - 1] &&
          centered[i] > centered[i + 1] &&
          centered[i] > threshold;
      if (!isPeak) {
        continue;
      }

      final peakTimeMs = _samples[i].timestampMs;
      if (peaks.isNotEmpty && peakTimeMs - peaks.last < 320) {
        continue;
      }
      peaks.add(peakTimeMs);
      peakValues.add(centered[i].abs());
    }

    if (peaks.length < 3) {
      return null;
    }

    final intervalsMs = <int>[];
    for (var i = 1; i < peaks.length; i++) {
      intervalsMs.add(peaks[i] - peaks[i - 1]);
    }
    if (intervalsMs.length < 2) {
      return null;
    }

    final avgIntervalMs =
        intervalsMs.reduce((a, b) => a + b) / intervalsMs.length;
    final bpm = (60000 / avgIntervalMs).round();
    if (bpm < minBpm || bpm > maxBpm) {
      return null;
    }

    final intervalVariance =
        intervalsMs
            .map((v) => (v - avgIntervalMs) * (v - avgIntervalMs))
            .reduce((a, b) => a + b) /
        intervalsMs.length;
    final intervalStdDev = math.sqrt(intervalVariance);
    final regularityRatio = intervalStdDev / avgIntervalMs;
    final regularity = (1 - (regularityRatio / 0.45))
        .clamp(0.0, 1.0)
        .toDouble();

    final avgPeakAmplitude =
        peakValues.reduce((a, b) => a + b) / math.max(1, peakValues.length);
    final noiseFloor =
        centered.map((v) => v.abs()).reduce((a, b) => a + b) / centered.length;
    final snr = avgPeakAmplitude / (noiseFloor + 1e-9);
    final snrScore = ((snr - 1.02) / 1.6).clamp(0.0, 1.0).toDouble();
    final signalScore = ((stdDev - 0.0025) / 0.02).clamp(0.0, 1.0).toDouble();

    final confidence =
        (0.35 * signalScore + 0.35 * regularity + 0.30 * snrScore).toDouble();

    return _BpmCandidate(
      bpm: bpm,
      confidence: confidence,
      regularity: regularity,
      snr: snr,
    );
  }

  _BpmCandidate? _estimateFromAutocorrelation({
    required List<double> centered,
    required double stdDev,
    required double sampleIntervalMs,
  }) {
    if (sampleIntervalMs <= 0 || centered.length < 55) {
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
    if (maxLag <= minLag) {
      return null;
    }

    var signalEnergy = 0.0;
    for (final value in centered) {
      signalEnergy += value * value;
    }
    if (signalEnergy <= 1e-12) {
      return null;
    }

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

    if (bestLag <= 0 || bestCorr <= 0) {
      return null;
    }

    final bpm = (60000 / (bestLag * sampleIntervalMs)).round();
    if (bpm < minBpm || bpm > maxBpm) {
      return null;
    }

    final periodicity = bestCorr.clamp(0.0, 1.0).toDouble();
    final separation = (bestCorr - math.max(0, secondCorr)).clamp(0.0, 1.0);
    final separationScore = (separation / 0.18).clamp(0.0, 1.0).toDouble();
    final signalScore = ((stdDev - 0.0025) / 0.02).clamp(0.0, 1.0).toDouble();

    final confidence =
        (0.45 * periodicity + 0.35 * separationScore + 0.20 * signalScore)
            .toDouble();

    return _BpmCandidate(
      bpm: bpm,
      confidence: confidence,
      regularity: periodicity,
      snr: bestCorr,
    );
  }

  _BpmCandidate? _selectBestCandidate(
    _BpmCandidate? first,
    _BpmCandidate? second,
  ) {
    if (first == null) {
      return second;
    }
    if (second == null) {
      return first;
    }
    if (first.confidence >= second.confidence) {
      return first;
    }
    return second;
  }

  double _estimatedSampleIntervalMs() {
    if (_samples.length < 2) {
      return 0;
    }
    final durationMs = _samples.last.timestampMs - _samples.first.timestampMs;
    if (durationMs <= 0) {
      return 0;
    }
    return durationMs / (_samples.length - 1);
  }

  List<double> _smooth(List<double> values) {
    if (values.length < 5) {
      return values;
    }
    final out = List<double>.filled(values.length, 0);
    for (var i = 0; i < values.length; i++) {
      final start = math.max(0, i - 2);
      final end = math.min(values.length - 1, i + 2);
      var sum = 0.0;
      var count = 0;
      for (var j = start; j <= end; j++) {
        sum += values[j];
        count++;
      }
      out[i] = sum / count;
    }
    return out;
  }

  void _trimSamples(int nowMs) {
    while (_samples.isNotEmpty &&
        nowMs - _samples.first.timestampMs > windowMs) {
      _samples.removeAt(0);
    }
  }
}
