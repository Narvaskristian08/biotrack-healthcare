class ScanRecord {
  const ScanRecord({
    required this.id,
    required this.scannedAt,
    required this.bpm,
    required this.fallDetected,
    required this.signalQuality,
    required this.fingerDetected,
    required this.fingerConfidence,
    required this.movementIntensity,
    required this.gyroMagnitude,
  });

  final String id;
  final DateTime scannedAt;
  final int? bpm;
  final bool fallDetected;
  final double signalQuality;
  final bool fingerDetected;
  final double fingerConfidence;
  final double movementIntensity;
  final double gyroMagnitude;

  factory ScanRecord.fromJson(Map<String, dynamic> json) {
    return ScanRecord(
      id: (json['id'] ?? '').toString(),
      scannedAt: DateTime.tryParse((json['scannedAt'] ?? '').toString()) ??
          DateTime.now(),
      bpm: json['bpm'] == null ? null : int.tryParse(json['bpm'].toString()),
      fallDetected: json['fallDetected'] == true,
      signalQuality:
          double.tryParse((json['signalQuality'] ?? '0').toString()) ?? 0,
      fingerDetected: json['fingerDetected'] == true,
      fingerConfidence:
          double.tryParse((json['fingerConfidence'] ?? '0').toString()) ?? 0,
      movementIntensity:
          double.tryParse((json['movementIntensity'] ?? '0').toString()) ?? 0,
      gyroMagnitude:
          double.tryParse((json['gyroMagnitude'] ?? '0').toString()) ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'scannedAt': scannedAt.toIso8601String(),
      'bpm': bpm,
      'fallDetected': fallDetected,
      'signalQuality': signalQuality,
      'fingerDetected': fingerDetected,
      'fingerConfidence': fingerConfidence,
      'movementIntensity': movementIntensity,
      'gyroMagnitude': gyroMagnitude,
    };
  }

  String get activityLabel {
    if (movementIntensity < 1.0) return 'Low';
    if (movementIntensity < 2.8) return 'Moderate';
    return 'High';
  }
}
