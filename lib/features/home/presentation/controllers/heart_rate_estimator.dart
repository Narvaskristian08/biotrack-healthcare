import 'dart:math' as math;
import 'dart:collection';

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
    this.minSamplesForEstimate = 28,
    this.reliabilityThreshold = 0.30,
    this.minimumAcceptConfidence = 0.14,
  });

  final int windowMs;
  final int minBpm;
  final int maxBpm;
  final int minSamplesForEstimate;
  final double reliabilityThreshold;
  final double minimumAcceptConfidence;
  
  static const double _minSignalStdDev = 0.0018;
  static const double _maxSignalStdDev = 0.018;
  static const int _maxStepPerUpdate = 7;
  static const int _consensusToleranceBpm = 8;
  static const int _hardDisagreementBpm = 24;

  // Optimized: Using ListQueue for O(1) removals at the front of the window.
  final ListQueue<_SignalSample> _samples = ListQueue<_SignalSample>();
  
  int _lastPeakMs = -1;
  int _lastBpm = 0;
  int _lastCandidateBpm = 0;
  double _lastConfidence = 0;
  double _lastRegularity = 0;
  double _lastSnr = 0;
  double _lastSignalStrength = 0;

  int get latestBpm => _lastBpm;
  int get latestCandidateBpm => _lastCandidateBpm;
  double get confidence => _lastConfidence;
  double get regularity => _lastRegularity;
  double get snr => _lastSnr;
  bool get hasReliableSignal => _lastConfidence >= reliabilityThreshold;
  bool get hasEnoughData => _samples.length >= minSamplesForEstimate;
  double get signalStrength => _lastSignalStrength;

  void reset() {
    _samples.clear();
    _lastPeakMs = -1;
    _lastBpm = 0;
    _lastCandidateBpm = 0;
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

    // Optimized: Extracting values into a fixed-length list for fast access
    final length = _samples.length;
    final values = List<double>.generate(length, (i) => _samples.elementAt(i).value);
    
    final smoothed = _smooth(values);
    
    // Optimized: Calculate mean and variance in streamlined passes
    var sum = 0.0;
    for (var i = 0; i < length; i++) {
      sum += smoothed[i];
    }
    final mean = sum / length;

    var varianceSum = 0.0;
    final centered = List<double>.filled(length, 0.0);
    for (var i = 0; i < length; i++) {
      final c = smoothed[i] - mean;
      centered[i] = c;
      varianceSum += c * c;
    }
    
    final variance = varianceSum / length;
    final stdDev = math.sqrt(variance);
    _lastSignalStrength = stdDev;

    if (stdDev < _minSignalStdDev) {
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
    _lastCandidateBpm = selected.bpm;

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
    _lastBpm = _stabilizeBpm(selected.bpm);
    return _lastBpm;
  }

  _BpmCandidate? _estimateFromPeaks({
    required List<double> centered,
    required double stdDev,
  }) {
    final threshold = math.max(stdDev * 0.54, 0.0030).toDouble();
    final peaks = <int>[];
    final peakValues = <double>[];

    for (var i = 1; i < centered.length - 1; i++) {
      final isPeak =
          centered[i] > centered[i - 1] &&
          centered[i] > centered[i + 1] &&
          centered[i] > threshold;
          
      if (!isPeak) continue;

      final peakTimeMs = _samples.elementAt(i).timestampMs;
      if (peaks.isNotEmpty && peakTimeMs - peaks.last < 300) {
        continue;
      }
      peaks.add(peakTimeMs);
      peakValues.add(centered[i].abs());
    }

    if (peaks.length < 3) return null;

    final intervalsMs = <int>[];
    var intervalSum = 0;
    for (var i = 1; i < peaks.length; i++) {
      final interval = peaks[i] - peaks[i - 1];
      intervalsMs.add(interval);
      intervalSum += interval;
    }
    
    if (intervalsMs.length < 2) return null;

    final avgIntervalMs = intervalSum / intervalsMs.length;
    final bpm = (60000 / avgIntervalMs).round();
    if (bpm < minBpm || bpm > maxBpm) return null;

    var intervalVarianceSum = 0.0;
    for (final v in intervalsMs) {
      final diff = v - avgIntervalMs;
      intervalVarianceSum += diff * diff;
    }
    
    final intervalVariance = intervalVarianceSum / intervalsMs.length;
    final intervalStdDev = math.sqrt(intervalVariance);
    final regularityRatio = intervalStdDev / avgIntervalMs;
    final regularity = (1 - (regularityRatio / 0.45)).clamp(0.0, 1.0).toDouble();

    var peakAmplitudeSum = 0.0;
    for (final v in peakValues) peakAmplitudeSum += v;
    final avgPeakAmplitude = peakAmplitudeSum / math.max(1, peakValues.length);
    
    var noiseFloorSum = 0.0;
    for (final v in centered) noiseFloorSum += v.abs();
    final noiseFloor = noiseFloorSum / centered.length;
    
    final snr = avgPeakAmplitude / (noiseFloor + 1e-9);
    final snrScore = ((snr - 0.95) / 1.5).clamp(0.0, 1.0).toDouble();
    final signalScore = _signalScoreFromStdDev(stdDev);

    final confidence = (0.35 * signalScore + 0.35 * regularity + 0.30 * snrScore).toDouble();

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
    if (sampleIntervalMs <= 0 || centered.length < 35) return null;

    final minLag = (60000 / maxBpm / sampleIntervalMs).floor().clamp(2, centered.length ~/ 2);
    final maxLag = (60000 / minBpm / sampleIntervalMs).ceil().clamp(minLag + 1, centered.length - 2);
    
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

    final confidence = (0.45 * periodicity + 0.35 * separationScore + 0.20 * signalScore).toDouble();

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
    if (first == null) return second;
    if (second == null) return first;

    final gap = (first.bpm - second.bpm).abs();
    if (gap <= _consensusToleranceBpm) {
      final totalConfidence = first.confidence + second.confidence + 1e-9;
      final blendedBpm = ((first.bpm * first.confidence + second.bpm * second.confidence) / totalConfidence).round();
      final blendedConfidence = ((first.confidence + second.confidence) / 2 + 0.07).clamp(0.0, 1.0).toDouble();
      final blendedRegularity = ((first.regularity + second.regularity) / 2).clamp(0.0, 1.0).toDouble();
      final blendedSnr = (first.snr + second.snr) / 2;

      return _BpmCandidate(
        bpm: blendedBpm,
        confidence: blendedConfidence,
        regularity: blendedRegularity,
        snr: blendedSnr,
      );
    }

    final stronger = first.confidence >= second.confidence ? first : second;
    if (gap >= _hardDisagreementBpm && stronger.confidence < minimumAcceptConfidence + 0.06) {
      return null;
    }

    final downgradedConfidence = gap >= _hardDisagreementBpm
        ? (stronger.confidence * 0.82).clamp(0.0, 1.0).toDouble()
        : (stronger.confidence * 0.92).clamp(0.0, 1.0).toDouble();

    return _BpmCandidate(
      bpm: stronger.bpm,
      confidence: downgradedConfidence,
      regularity: stronger.regularity,
      snr: stronger.snr,
    );
  }

  int _stabilizeBpm(int incomingBpm) {
    final incoming = incomingBpm.clamp(minBpm, maxBpm).toInt();
    if (_lastBpm <= 0) return incoming;

    final delta = (incoming - _lastBpm).clamp(-_maxStepPerUpdate, _maxStepPerUpdate);
    final limited = (_lastBpm + delta).clamp(minBpm, maxBpm).toInt();
    final blended = ((_lastBpm * 0.72) + (limited * 0.28)).round();
    
    return blended.clamp(minBpm, maxBpm).toInt();
  }

  double _signalScoreFromStdDev(double stdDev) {
    return ((stdDev - _minSignalStdDev) / (_maxSignalStdDev - _minSignalStdDev))
        .clamp(0.0, 1.0)
        .toDouble();
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

  void _trimSamples(int nowMs) {
    // Optimized: O(1) removal using removeFirst on the ListQueue
    while (_samples.isNotEmpty && nowMs - _samples.first.timestampMs > windowMs) {
      _samples.removeFirst();
    }
  }
}
