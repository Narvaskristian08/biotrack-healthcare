class HealthCenterOption {
  const HealthCenterOption({
    required this.id,
    required this.name,
    required this.address,
    required this.contactNumber,
  });

  final String id;
  final String name;
  final String address;
  final String contactNumber;

  factory HealthCenterOption.fromJson(Map<String, dynamic> json) {
    return HealthCenterOption(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      address: (json['address'] ?? '').toString(),
      contactNumber: (json['contactNumber'] ?? '').toString(),
    );
  }

  String get subtitle {
    final parts = <String>[
      if (address.isNotEmpty) address,
      if (contactNumber.isNotEmpty) contactNumber,
    ];
    return parts.join(' • ');
  }
}
