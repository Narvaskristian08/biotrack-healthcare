import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/services/auth_api_service.dart';
import '../../../auth/data/services/auth_session_store.dart';

class PatientProfileSettingsPage extends StatefulWidget {
  const PatientProfileSettingsPage({super.key});

  @override
  State<PatientProfileSettingsPage> createState() =>
      _PatientProfileSettingsPageState();
}

class _PatientProfileSettingsPageState extends State<PatientProfileSettingsPage> {
  final AuthApiService _api = AuthApiService();
  final TextEditingController _firstNameController = TextEditingController();
  final TextEditingController _lastNameController = TextEditingController();
  final TextEditingController _middleInitialController =
      TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _contactNumberController =
      TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  final TextEditingController _emergencyContactNameController =
      TextEditingController();
  final TextEditingController _emergencyContactPhoneController =
      TextEditingController();

  bool _loading = true;
  bool _saving = false;
  String _errorMessage = '';
  String _successMessage = '';
  PatientProfileResult? _profile;
  List<PatientLoginHistoryEntry> _history = const <PatientLoginHistoryEntry>[];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _middleInitialController.dispose();
    _emailController.dispose();
    _contactNumberController.dispose();
    _addressController.dispose();
    _emergencyContactNameController.dispose();
    _emergencyContactPhoneController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _errorMessage = '';
      _successMessage = '';
    });

    try {
      final profile = await _api.fetchMyPatientProfile();
      List<PatientLoginHistoryEntry> history = const <PatientLoginHistoryEntry>[];
      try {
        history = await _api.fetchMyLoginHistory(limit: 20);
      } on AuthApiException {
        history = const <PatientLoginHistoryEntry>[];
      }

      if (!mounted) return;
      _applyProfile(profile);
      setState(() {
        _profile = profile;
        _history = history;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Unable to load profile settings right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _applyProfile(PatientProfileResult profile) {
    _firstNameController.text = profile.firstName;
    _lastNameController.text = profile.lastName;
    _middleInitialController.text = profile.middleInitial;
    _emailController.text = profile.email;
    _contactNumberController.text = profile.contactNumber;
    _addressController.text = profile.address;
    _emergencyContactNameController.text = profile.emergencyContactName;
    _emergencyContactPhoneController.text = profile.emergencyContactPhone;
  }

  Future<void> _saveProfile() async {
    setState(() {
      _saving = true;
      _errorMessage = '';
      _successMessage = '';
    });

    try {
      final updated = await _api.updateMyPatientProfile(
        firstName: _firstNameController.text,
        lastName: _lastNameController.text,
        middleInitial: _middleInitialController.text,
        email: _emailController.text,
        contactNumber: _contactNumberController.text,
        address: _addressController.text,
        emergencyContactName: _emergencyContactNameController.text,
        emergencyContactPhone: _emergencyContactPhoneController.text,
      );
      await AuthSessionStore.updatePatientIdentity(
        fullName: updated.fullName,
        email: updated.email,
      );
      if (!mounted) return;
      setState(() {
        _profile = updated;
        _successMessage = 'Profile updated successfully.';
      });
      _applyProfile(updated);
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Unable to save your profile right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  String _formatDateTime(DateTime? value) {
    if (value == null) return 'N/A';
    final local = value.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    final meridiem = local.hour >= 12 ? 'PM' : 'AM';
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    return '${local.year}-$month-$day $hour:$minute $meridiem';
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: AppColors.darkText,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.mutedBorder),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.mutedBorder),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(
                color: AppColors.primaryGreenDark,
                width: 1.5,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 12,
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final assignedCenter = _profile?.assignedHealthCenter;
    final centerContact = assignedCenter == null
        ? ''
        : (assignedCenter.contactNumber.trim().isNotEmpty
              ? assignedCenter.contactNumber
              : assignedCenter.officialContactInfo);

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        backgroundColor: AppColors.softBackground,
        elevation: 0,
        title: const Text(
          'Profile & Settings',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            children: [
              if (_errorMessage.isNotEmpty) ...[
                _InlineNotice(
                  message: _errorMessage,
                  backgroundColor: const Color(0xFFFFF1F1),
                  textColor: AppColors.danger,
                ),
                const SizedBox(height: 12),
              ],
              if (_successMessage.isNotEmpty) ...[
                _InlineNotice(
                  message: _successMessage,
                  backgroundColor: const Color(0xFFEFF8EA),
                  textColor: AppColors.primaryGreenDark,
                ),
                const SizedBox(height: 12),
              ],
              if (assignedCenter != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.mutedBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Assigned Healthcare Location',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        assignedCenter.displayName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.darkText,
                        ),
                      ),
                      if (assignedCenter.locationLabel.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          assignedCenter.locationLabel,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.bodyText,
                          ),
                        ),
                      ],
                      if (assignedCenter.address.trim().isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Address: ${assignedCenter.address}',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.bodyText,
                          ),
                        ),
                      ],
                      if (centerContact.trim().isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          'Contact: $centerContact',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.bodyText,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: _loading
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Personal Information',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            label: 'First Name',
                            controller: _firstNameController,
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            label: 'Last Name',
                            controller: _lastNameController,
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            label: 'Middle Initial',
                            controller: _middleInitialController,
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            label: 'Email',
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            label: 'Contact Number',
                            controller: _contactNumberController,
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            label: 'Address',
                            controller: _addressController,
                            maxLines: 2,
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            label: 'Emergency Contact Name',
                            controller: _emergencyContactNameController,
                          ),
                          const SizedBox(height: 12),
                          _buildTextField(
                            label: 'Emergency Contact Phone',
                            controller: _emergencyContactPhoneController,
                            keyboardType: TextInputType.phone,
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _saving ? null : _saveProfile,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primaryGreenDark,
                                padding:
                                    const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                              child: Text(
                                _saving ? 'Saving...' : 'Save Profile',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
              ),
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Login History',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 10),
                    if (_loading)
                      const Text(
                        'Loading session history...',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.bodyText,
                        ),
                      )
                    else if (_history.isEmpty)
                      const Text(
                        'No login history available yet.',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.bodyText,
                        ),
                      )
                    else
                      ..._history.map(
                        (entry) => Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7FAF5),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.mutedBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _formatDateTime(entry.loginAt),
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.darkText,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'IP: ${entry.ip.isEmpty ? 'N/A' : entry.ip}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.bodyText,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Expires: ${_formatDateTime(entry.expiresAt)}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.bodyText,
                                ),
                              ),
                              if (entry.userAgent.trim().isNotEmpty) ...[
                                const SizedBox(height: 2),
                                Text(
                                  entry.userAgent,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: AppColors.secondaryText,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InlineNotice extends StatelessWidget {
  const _InlineNotice({
    required this.message,
    required this.backgroundColor,
    required this.textColor,
  });

  final String message;
  final Color backgroundColor;
  final Color textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
