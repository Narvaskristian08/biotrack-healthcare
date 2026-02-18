class HealthCenterOption {
  const HealthCenterOption({
    required this.id,
    required this.name,
    required this.barangayName,
    required this.cityMunicipality,
    required this.healthCenterName,
    required this.address,
    required this.contactNumber,
  });

  final String id;
  final String name;
  final String barangayName;
  final String cityMunicipality;
  final String healthCenterName;
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
      barangayName: (json['barangayName'] ?? '').toString().trim(),
      cityMunicipality: (json['cityMunicipality'] ?? '').toString().trim(),
      healthCenterName: (json['healthCenterName'] ?? '').toString().trim(),
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

  String get primaryLabel {
    if (barangayName.isNotEmpty && cityMunicipality.isNotEmpty) {
      return '$barangayName, $cityMunicipality';
    }
    if (barangayName.isNotEmpty) return barangayName;
    if (cityMunicipality.isNotEmpty) return cityMunicipality;
    if (name.isNotEmpty) return name;
    if (healthCenterName.isNotEmpty) return healthCenterName;
    return 'Unnamed Health Center';
  }

  String get secondaryLabel {
    final parts = <String>[
      if (healthCenterName.isNotEmpty) healthCenterName,
      if (address.isNotEmpty) address,
      if (contactNumber.isNotEmpty) contactNumber,
    ];

    final unique = <String>[];
    for (final entry in parts) {
      if (!unique.contains(entry)) {
        unique.add(entry);
      }
    }

    return unique.join(' | ');
  }

  String get subtitle {
    return secondaryLabel;
  }
}
