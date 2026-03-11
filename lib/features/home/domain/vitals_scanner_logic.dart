class VitalsScannerLogic {
  /// Determines the human-readable movement intensity label
  static String getMovementLabel(double movementIntensity) {
    if (movementIntensity < 1.0) {
      return 'Low';
    }
    if (movementIntensity < 2.8) {
      return 'Moderate';
    }
    return 'High';
  }

  /// Determines the signal state message based on scan progress and quality
  static String getSignalLabel({
    required bool fingerDetected,
    required double movementIntensity,
    required int? estimatedBpm,
    required double hrConfidence,
  }) {
    if (!fingerDetected) {
      return 'No finger detected';
    }
    if (movementIntensity >= 2.6) {
      return 'Hold still for better accuracy';
    }
    if (estimatedBpm == null) {
      return 'Collecting stable pulse';
    }
    if (hrConfidence < 0.38) {
      return 'Live estimate';
    }
    return 'Reliable pulse';
  }

  /// Formats the remaining time string
  static String getTimeLabel(double scanProgress, Duration scanDuration) {
    final remainingSeconds = (scanDuration.inSeconds * (1 - scanProgress))
        .round();
    return '${remainingSeconds.clamp(0, scanDuration.inSeconds)}s';
  }

  /// Adds a new BPM sample to the provided list and maintains the maximum sample size
  static void pushLiveBpmSample(List<int> samples, int bpm, int maxSamples) {
    samples.add(bpm.clamp(42, 190).toInt());
    if (samples.length > maxSamples) {
      samples.removeAt(0);
    }
  }

  /// Calculates the median BPM from a list of samples to filter out outliers
  static int? calculateMedianBpm(List<int> samples) {
    if (samples.isEmpty) return null;
    final sorted = List<int>.from(samples)..sort();
    return sorted[sorted.length ~/ 2];
  }

  /// Blends the new incoming BPM with the current estimate using an exponential moving average
  static int blendLiveBpm(int? currentBpm, int incomingBpm) {
    final clampedIncoming = incomingBpm.clamp(42, 190).toInt();
    if (currentBpm == null || currentBpm <= 0) {
      return clampedIncoming;
    }
    // Weights: 78% previous value, 22% new value
    return ((currentBpm * 0.78) + (clampedIncoming * 0.22)).round().clamp(
      42,
      190,
    );
  }
}
