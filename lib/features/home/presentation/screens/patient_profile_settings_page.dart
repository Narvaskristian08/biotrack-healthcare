import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/health_formatters.dart';
import '../../../../core/widgets/app_ui.dart';
import '../../../auth/data/services/auth_api_service.dart';
import '../../../auth/data/services/auth_session_store.dart';

class PatientProfileSettingsPage extends StatefulWidget {
  const PatientProfileSettingsPage({super.key});

  @override
  State<PatientProfileSettingsPage> createState() =>
      _PatientProfileSettingsPageState();
}

class _PatientProfileSettingsPageState
    extends State<PatientProfileSettingsPage> {
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
      List<PatientLoginHistoryEntry> history =
          const <PatientLoginHistoryEntry>[];
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
    return HealthFormatters.formatDateTime(value.toLocal());
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
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: AppSpacing.xs),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLines: maxLines,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final showInitialSkeleton =
        _loading &&
        _profile == null &&
        _history.isEmpty &&
        _errorMessage.isEmpty &&
        _successMessage.isEmpty;
    final assignedCenter = _profile?.assignedHealthCenter;
    final centerContact = assignedCenter == null
        ? ''
        : (assignedCenter.contactNumber.trim().isNotEmpty
              ? assignedCenter.contactNumber
              : assignedCenter.officialContactInfo);

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(title: const Text('Profile and Settings')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadData,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              AppSpacing.xl,
            ),
            children: [
              const AppPageHeader(
                eyebrow: 'PROFILE MANAGEMENT',
                title: 'Update your patient details and session history',
                subtitle:
                    'BioTrack keeps profile information, emergency contacts, and recent logins grouped into clear sections.',
              ),
              const SizedBox(height: AppSpacing.lg),
              if (_errorMessage.isNotEmpty) ...[
                AppInfoBanner(message: _errorMessage, tone: AppTone.danger),
                const SizedBox(height: AppSpacing.md),
              ],
              if (_successMessage.isNotEmpty) ...[
                AppInfoBanner(message: _successMessage, tone: AppTone.success),
                const SizedBox(height: AppSpacing.md),
              ],
              if (showInitialSkeleton) ...[
                const _ProfileSettingsLoadingSkeleton(),
              ] else ...[
                if (assignedCenter != null) ...[
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const AppSectionHeader(
                          title: 'Assigned healthcare location',
                          subtitle:
                              'This location is connected to your patient profile and record routing.',
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          assignedCenter.displayName,
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        if (assignedCenter.locationLabel.isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            assignedCenter.locationLabel,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                        if (assignedCenter.address.trim().isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            assignedCenter.address,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                        if (centerContact.trim().isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            centerContact,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                ],
                AppCard(
                  child: (_loading && _profile == null)
                      ? const Padding(
                          padding: EdgeInsets.symmetric(
                            vertical: AppSpacing.xxl,
                          ),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const AppSectionHeader(
                              title: 'Personal information',
                              subtitle:
                                  'Keep your primary patient identity and contact details current.',
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            _buildTextField(
                              label: 'First name',
                              controller: _firstNameController,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              label: 'Last name',
                              controller: _lastNameController,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              label: 'Middle initial',
                              controller: _middleInitialController,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              label: 'Email',
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              label: 'Contact number',
                              controller: _contactNumberController,
                              keyboardType: TextInputType.phone,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              label: 'Address',
                              controller: _addressController,
                              maxLines: 2,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            const AppSectionHeader(
                              title: 'Emergency contact',
                              subtitle:
                                  'These details support follow-up communication when needed.',
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              label: 'Emergency contact name',
                              controller: _emergencyContactNameController,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              label: 'Emergency contact phone',
                              controller: _emergencyContactPhoneController,
                              keyboardType: TextInputType.phone,
                            ),
                            const SizedBox(height: AppSpacing.lg),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _saving ? null : _saveProfile,
                                child: Text(
                                  _saving
                                      ? 'Saving profile...'
                                      : 'Save profile',
                                ),
                              ),
                            ),
                          ],
                        ),
                ),
                const SizedBox(height: AppSpacing.md),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const AppSectionHeader(
                        title: 'Login history',
                        subtitle:
                            'Recent sessions help you verify where and when your patient account was accessed.',
                      ),
                      const SizedBox(height: AppSpacing.md),
                      if (_loading)
                        Text(
                          'Loading session history...',
                          style: Theme.of(context).textTheme.bodySmall,
                        )
                      else if (_history.isEmpty)
                        Text(
                          'No login history is available yet.',
                          style: Theme.of(context).textTheme.bodySmall,
                        )
                      else
                        ..._history.map(
                          (entry) => Padding(
                            padding: const EdgeInsets.only(
                              bottom: AppSpacing.sm,
                            ),
                            child: AppCard(
                              color: AppColors.surfaceMuted,
                              borderColor: AppColors.mutedBorder,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _formatDateTime(entry.loginAt),
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleSmall,
                                  ),
                                  const SizedBox(height: AppSpacing.xs),
                                  Text(
                                    'IP: ${entry.ip.isEmpty ? 'N/A' : entry.ip}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                  ),
                                  const SizedBox(height: AppSpacing.xxs),
                                  Text(
                                    'Session expires: ${_formatDateTime(entry.expiresAt)}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                  ),
                                  if (entry.userAgent.trim().isNotEmpty) ...[
                                    const SizedBox(height: AppSpacing.xxs),
                                    Text(
                                      entry.userAgent,
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodySmall,
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileSettingsLoadingSkeleton extends StatelessWidget {
  const _ProfileSettingsLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        AppSkeletonCard(
          child: AppSkeletonParagraph(
            lines: 5,
            lineHeight: 12,
            lastLineFactor: 0.5,
          ),
        ),
        SizedBox(height: AppSpacing.md),
        AppSkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppSkeletonParagraph(
                lines: 2,
                lineHeight: 12,
                lastLineFactor: 0.54,
              ),
              SizedBox(height: AppSpacing.lg),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 72, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.lg),
              AppSkeletonParagraph(
                lines: 2,
                lineHeight: 12,
                lastLineFactor: 0.48,
              ),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.lg),
              AppSkeletonBlock(height: 52, radius: AppRadii.lg),
            ],
          ),
        ),
        SizedBox(height: AppSpacing.md),
        AppSkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppSkeletonParagraph(
                lines: 2,
                lineHeight: 12,
                lastLineFactor: 0.52,
              ),
              SizedBox(height: AppSpacing.md),
              AppSkeletonParagraph(
                lines: 4,
                lineHeight: 12,
                lastLineFactor: 0.62,
              ),
              SizedBox(height: AppSpacing.sm),
              AppSkeletonParagraph(
                lines: 4,
                lineHeight: 12,
                lastLineFactor: 0.58,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
