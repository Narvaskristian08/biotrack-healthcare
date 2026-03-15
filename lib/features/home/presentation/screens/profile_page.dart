import 'package:biotrack_healthcare/features/home/presentation/screens/health_permission_page.dart';
import 'package:biotrack_healthcare/features/settings/presentation/screens/app_settings_page.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/widgets/app_ui.dart';
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

  String _initials() {
    final fullName = _profile?.fullName.trim() ?? '';
    if (fullName.isEmpty) return 'P';
    final parts = fullName.split(' ').where((part) => part.isNotEmpty).toList();
    if (parts.length == 1) return parts.first[0].toUpperCase();
    return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final showInitialSkeleton =
        _loading && _profile == null && _errorMessage.isEmpty;
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
        title: const Text('Profile'),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadProfile,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              120,
            ),
            children: [
              const AppPageHeader(
                eyebrow: 'ACCOUNT',
                title: 'Personal profile and care settings',
                subtitle:
                    'Manage your patient details, assigned care location, privacy controls, and reporting shortcuts.',
              ),
              const SizedBox(height: AppSpacing.lg),
              if (_errorMessage.isNotEmpty) ...[
                AppInfoBanner(
                  title: 'Profile sync issue',
                  message: _errorMessage,
                  tone: AppTone.danger,
                ),
                const SizedBox(height: AppSpacing.md),
              ],
              if (showInitialSkeleton)
                const _ProfileLoadingSkeleton()
              else ...[
                AppCard(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: AppColors.primaryGreenLight,
                          borderRadius: BorderRadius.circular(AppRadii.xl),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          _initials(),
                          style: Theme.of(context).textTheme.headlineMedium
                              ?.copyWith(color: AppColors.primaryGreenDark),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    _profile?.fullName ?? 'Patient',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.headlineMedium,
                                  ),
                                ),
                                const AppStatusBadge(
                                  label: 'Patient account',
                                  tone: AppTone.success,
                                ),
                              ],
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              _profile?.email.trim().isNotEmpty == true
                                  ? _profile!.email
                                  : 'No email available',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                            if (_profile?.contactNumber.trim().isNotEmpty ==
                                true) ...[
                              const SizedBox(height: AppSpacing.xxs),
                              Text(
                                _profile!.contactNumber,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                            if (_loading) ...[
                              const SizedBox(height: AppSpacing.sm),
                              const LinearProgressIndicator(minHeight: 3),
                            ],
                          ],
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
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Assigned healthcare location',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          AppStatusBadge(
                            label: assignedCenter == null
                                ? 'Unavailable'
                                : 'Connected',
                            tone: assignedCenter == null
                                ? AppTone.warning
                                : AppTone.success,
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      if (_loading)
                        Text(
                          'Loading assigned care location...',
                          style: Theme.of(context).textTheme.bodySmall,
                        )
                      else ...[
                        Text(
                          assignedCenter?.displayName ??
                              'Healthcare provider not available',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        if (centerLocation.isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            centerLocation,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                        if (assignedCenter?.address.trim().isNotEmpty ==
                            true) ...[
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            assignedCenter!.address,
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
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                const AppSectionHeader(
                  title: 'Account and support',
                  subtitle:
                      'Use these shortcuts to manage your patient account and supporting health features.',
                ),
                const SizedBox(height: AppSpacing.md),
                AppActionTile(
                  icon: Icons.manage_accounts_outlined,
                  title: 'Edit profile and login history',
                  subtitle:
                      'Update your information and review recent sign-ins.',
                  onTap: _openProfileSettings,
                ),
                const SizedBox(height: AppSpacing.sm),
                AppActionTile(
                  icon: Icons.summarize_outlined,
                  title: 'Reports and summary',
                  subtitle:
                      'Open your mobile-friendly patient report and export tools.',
                  onTap: () => context.push('/reports'),
                ),
                const SizedBox(height: AppSpacing.sm),
                AppActionTile(
                  icon: Icons.emergency_outlined,
                  title: 'Emergency contact',
                  subtitle: emergencyContact.isNotEmpty
                      ? emergencyContact
                      : 'No emergency contact has been saved yet.',
                  onTap: _openProfileSettings,
                ),
                const SizedBox(height: AppSpacing.sm),
                AppActionTile(
                  icon: Icons.check_box_outlined,
                  title: 'Health permissions',
                  subtitle: 'Review camera, motion, and notification access.',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const HealthPermissionPage(),
                      ),
                    );
                  },
                ),
                const SizedBox(height: AppSpacing.sm),
                AppActionTile(
                  icon: Icons.settings_outlined,
                  title: 'Privacy and app settings',
                  subtitle:
                      'Control advisory language, notifications, and data settings.',
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => const AppSettingsPage(),
                      ),
                    );
                  },
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfileLoadingSkeleton extends StatelessWidget {
  const _ProfileLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        AppSkeletonCard(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppSkeletonBlock(width: 72, height: 72, radius: AppRadii.xl),
              SizedBox(width: AppSpacing.md),
              Expanded(
                child: AppSkeletonParagraph(
                  lines: 4,
                  lineHeight: 13,
                  lastLineFactor: 0.52,
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: AppSpacing.md),
        AppSkeletonCard(
          child: AppSkeletonParagraph(
            lines: 5,
            lineHeight: 12,
            lastLineFactor: 0.48,
          ),
        ),
        SizedBox(height: AppSpacing.lg),
        AppSkeletonParagraph(lines: 2, lineHeight: 12, lastLineFactor: 0.44),
        SizedBox(height: AppSpacing.md),
        _ProfileActionSkeleton(),
        SizedBox(height: AppSpacing.sm),
        _ProfileActionSkeleton(),
        SizedBox(height: AppSpacing.sm),
        _ProfileActionSkeleton(),
        SizedBox(height: AppSpacing.sm),
        _ProfileActionSkeleton(),
        SizedBox(height: AppSpacing.sm),
        _ProfileActionSkeleton(),
      ],
    );
  }
}

class _ProfileActionSkeleton extends StatelessWidget {
  const _ProfileActionSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppSkeletonCard(
      child: Row(
        children: const [
          AppSkeletonBlock(width: 46, height: 46, radius: AppRadii.md),
          SizedBox(width: AppSpacing.md),
          Expanded(
            child: AppSkeletonParagraph(
              lines: 2,
              lineHeight: 12,
              lastLineFactor: 0.62,
            ),
          ),
        ],
      ),
    );
  }
}
