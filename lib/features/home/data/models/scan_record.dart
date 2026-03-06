class ScanRecordBlockchainInfo {
  const ScanRecordBlockchainInfo({
    this.enabled = false,
    this.verificationStatus = 'pending',
    this.txId = '',
    this.contractAddress = '',
    this.anchoredAt,
    this.lastVerifiedAt,
  });

  final bool enabled;
  final String verificationStatus;
  final String txId;
  final String contractAddress;
  final DateTime? anchoredAt;
  final DateTime? lastVerifiedAt;

  String get normalizedStatus => verificationStatus.trim().toLowerCase();

  bool get isVerified =>
      normalizedStatus == 'anchored' || normalizedStatus == 'verified';
}

class ScanRecordVerificationResult {
  const ScanRecordVerificationResult({
    required this.status,
    required this.storedHash,
    required this.recomputedHash,
    required this.integrityMatch,
    required this.blockchainAvailable,
    required this.blockchainVerified,
    required this.txId,
    required this.blockNumber,
    required this.reason,
    required this.verifiedAt,
  });

  final String status;
  final String storedHash;
  final String recomputedHash;
  final bool integrityMatch;
  final bool blockchainAvailable;
  final bool? blockchainVerified;
  final String txId;
  final int? blockNumber;
  final String reason;
  final DateTime? verifiedAt;

  bool get isVerified {
    final normalized = status.trim().toLowerCase();
    return normalized == 'verified' || normalized == 'anchored';
  }
}

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
    this.type = 'vitals',
    this.recordHash = '',
    this.createdAt,
    this.blockchain = const ScanRecordBlockchainInfo(),
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
  final String type;
  final String recordHash;
  final DateTime? createdAt;
  final ScanRecordBlockchainInfo blockchain;

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
      type: (json['type'] ?? 'vitals').toString(),
      recordHash: (json['recordHash'] ?? '').toString(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? '').toString()),
      blockchain: ScanRecordBlockchainInfo(
        enabled: json['blockchainEnabled'] == true,
        verificationStatus:
            (json['blockchainStatus'] ?? 'pending').toString(),
        txId: (json['blockchainTxId'] ?? '').toString(),
        contractAddress: (json['blockchainContractAddress'] ?? '').toString(),
        anchoredAt: DateTime.tryParse(
          (json['blockchainAnchoredAt'] ?? '').toString(),
        ),
        lastVerifiedAt: DateTime.tryParse(
          (json['blockchainLastVerifiedAt'] ?? '').toString(),
        ),
      ),
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
      'type': type,
      'recordHash': recordHash,
      'createdAt': createdAt?.toIso8601String(),
      'blockchainEnabled': blockchain.enabled,
      'blockchainStatus': blockchain.verificationStatus,
      'blockchainTxId': blockchain.txId,
      'blockchainContractAddress': blockchain.contractAddress,
      'blockchainAnchoredAt': blockchain.anchoredAt?.toIso8601String(),
      'blockchainLastVerifiedAt':
          blockchain.lastVerifiedAt?.toIso8601String(),
    };
  }

  String get activityLabel {
    if (movementIntensity < 1.0) return 'Low';
    if (movementIntensity < 2.8) return 'Moderate';
    return 'High';
  }
}
