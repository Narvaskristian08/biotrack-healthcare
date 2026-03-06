import 'package:biotrack_healthcare/features/home/presentation/screens/health_permission_page.dart';
import 'package:biotrack_healthcare/features/settings/presentation/screens/app_settings_page.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/services/auth_api_service.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final AuthApiService _api = AuthApiService();

  bool _loading = true;
  String _errorMessage = '';
  PatientProfileResult? _profile;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _loading = true;
      _errorMessage = '';
    });
    try {
      final profile = await _api.fetchMyPatientProfile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
      });
    } on AuthApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Unable to load profile right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _openProfileSettings() async {
    await context.push('/profile-settings');
    if (mounted) {
      await _loadProfile();
    }
  }

  @override
  Widget build(BuildContext context) {
    final assignedCenter = _profile?.assignedHealthCenter;
    final centerLocation = assignedCenter?.locationLabel ?? '';
    final centerContact = assignedCenter == null
        ? ''
        : (assignedCenter.contactNumber.trim().isNotEmpty
              ? assignedCenter.contactNumber
              : assignedCenter.officialContactInfo);
    final emergencyContact = _profile == null
        ? ''
        : (_profile!.emergencyContactPhone.trim().isNotEmpty
              ? _profile!.emergencyContactPhone
              : _profile!.emergencyContactName.trim().isNotEmpty
                    ? _profile!.emergencyContactName
                    : '');

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: AppColors.softBackground,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'Profile',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadProfile,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: Column(
                  children: [
                    Text(
                      _profile?.fullName ?? 'Patient',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _profile?.email.trim().isNotEmpty == true
                          ? _profile!.email
                          : 'No email available',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.bodyText,
                      ),
                    ),
                    if (_profile?.contactNumber.trim().isNotEmpty == true) ...[
                      const SizedBox(height: 4),
                      Text(
                        _profile!.contactNumber,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.bodyText,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: _loading
                    ? const Text(
                        'Loading healthcare location...',
                        style: TextStyle(color: AppColors.bodyText),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Assigned Healthcare Location',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w700,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            assignedCenter?.displayName ??
                                'Healthcare provider not available',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (centerLocation.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              centerLocation,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.bodyText,
                              ),
                            ),
                          ],
                          if (assignedCenter?.address.trim().isNotEmpty ==
                              true) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Address: ${assignedCenter!.address}',
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
              if (_errorMessage.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEAEA),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _errorMessage,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: _loadProfile,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 12),
              _profileItem(
                icon: Icons.manage_accounts_outlined,
                title: 'Edit Profile & Login History',
                subtitle: 'Update your information and review sign-ins',
                onTap: _openProfileSettings,
              ),
              _profileItem(
                icon: Icons.summarize_outlined,
                title: 'Reports & Summary',
                subtitle: 'Copy a mobile-friendly patient report',
                onTap: () => context.push('/reports'),
              ),
              _profileItem(
                icon: Icons.phone_outlined,
                title: 'Emergency Contact',
                subtitle: emergencyContact.isNotEmpty
                    ? emergencyContact
                    : 'No emergency contact saved',
                onTap: _openProfileSettings,
              ),
              _profileItem(
                icon: Icons.check_box_outlined,
                title: 'Health Permission',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const HealthPermissionPage(),
                    ),
                  );
                },
              ),
              _profileItem(
                icon: Icons.settings_outlined,
                title: 'Privacy and App Settings',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AppSettingsPage()),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _profileItem({
    required IconData icon,
    required String title,
    String? subtitle,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.mutedBorder),
      ),
      child: ListTile(
        leading: Icon(icon, color: Colors.black),
        title: Text(
          title,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500),
        ),
        subtitle: subtitle != null
            ? Text(subtitle, style: const TextStyle(fontSize: 13))
            : null,
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }
}
