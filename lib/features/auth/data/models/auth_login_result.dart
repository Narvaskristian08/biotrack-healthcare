class AuthLoginResult {
  const AuthLoginResult({
    required this.accessToken,
    required this.patientId,
    required this.firstName,
    required this.lastName,
    required this.email,
  });

  final String accessToken;
  final String patientId;
  final String firstName;
  final String lastName;
  final String email;

  String get fullName {
    final name = '$firstName $lastName'.trim();
    return name.isEmpty ? email : name;
  }
}
