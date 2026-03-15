import 'dart:collection';
import 'dart:math' as math;

class _ColorSample {
  const _ColorSample({
    required this.timestampMs,
    required this.redSignal,
    required this.greenSignal,
  });

  final int timestampMs;
  final double redSignal;
  final double greenSignal;
}

class PpgSignalConditioner {
  PpgSignalConditioner({
    this.baselineWindowMs = 3500,
    this.minSamplesForSignal = 8,
    this.minimumRedLevel = 0.16,
    this.minimumRedGreenRatio = 1.01,
    this.minimumRedGreenContrast = 0.006,
  });

  final int baselineWindowMs;
  final int minSamplesForSignal;
  final double minimumRedLevel;
  final double minimumRedGreenRatio;
  final double minimumRedGreenContrast;

  final ListQueue<_ColorSample> _samples = ListQueue<_ColorSample>();

  void reset() {
    _samples.clear();
  }

  double? addSample({
    required int timestampMs,
    required double redSignal,
    required double greenSignal,
  }) {
    _samples.add(
      _ColorSample(
        timestampMs: timestampMs,
        redSignal: redSignal,
        greenSignal: greenSignal,
      ),
    );
    _trim(timestampMs);

    if (_samples.length < minSamplesForSignal) {
      return null;
    }

    var redSum = 0.0;
    var greenSum = 0.0;
    for (final sample in _samples) {
      redSum += sample.redSignal;
      greenSum += sample.greenSignal;
    }

    final baselineRed = redSum / _samples.length;
    final baselineGreen = greenSum / _samples.length;
    final colorRatio = baselineRed / math.max(baselineGreen, 1e-6);
    final colorContrast = baselineRed - baselineGreen;

    if (baselineRed < minimumRedLevel ||
        colorRatio < minimumRedGreenRatio ||
        colorContrast < minimumRedGreenContrast) {
      return null;
    }

    final normalized = (redSignal - baselineRed) / math.max(baselineRed, 1e-6);
    return normalized.clamp(-0.35, 0.35).toDouble();
  }

  void _trim(int nowMs) {
    while (_samples.isNotEmpty &&
        nowMs - _samples.first.timestampMs > baselineWindowMs) {
      _samples.removeFirst();
    }
  }
}
