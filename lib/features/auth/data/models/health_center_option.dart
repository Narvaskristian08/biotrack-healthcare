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
    final fallbackNameParts = <String>[
      (json['barangayName'] ?? '').toString().trim(),
      (json['cityMunicipality'] ?? '').toString().trim(),
    ].where((part) => part.isNotEmpty).toList(growable: false);

    final fallbackAddressParts = <String>[
      (json['barangayName'] ?? '').toString().trim(),
      (json['cityMunicipality'] ?? '').toString().trim(),
    ].where((part) => part.isNotEmpty).toList(growable: false);

    return HealthCenterOption(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: ((json['name'] ??
                  json['displayName'] ??
                  json['healthCenterName'] ??
                  (fallbackNameParts.isNotEmpty
                      ? fallbackNameParts.join(' - ')
                      : ''))
              .toString())
          .trim(),
      address: ((json['address'] ??
                  json['location'] ??
                  json['healthCenterName'] ??
                  (fallbackAddressParts.isNotEmpty
                      ? fallbackAddressParts.join(', ')
                      : ''))
              .toString())
          .trim(),
      contactNumber:
          ((json['contactNumber'] ?? json['officialContactInfo'] ?? '')
                  .toString())
              .trim(),
    );
  }

  String get subtitle {
    final parts = <String>[
      if (address.isNotEmpty) address,
      if (contactNumber.isNotEmpty) contactNumber,
    ];
    return parts.join(' | ');
  }
}
