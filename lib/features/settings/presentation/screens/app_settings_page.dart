import 'package:biotrack_healthcare/core/services/app_preferences_service.dart';
import 'package:biotrack_healthcare/core/theme/app_colors.dart';
import 'package:biotrack_healthcare/core/theme/app_radii.dart';
import 'package:biotrack_healthcare/core/theme/app_spacing.dart';
import 'package:biotrack_healthcare/core/widgets/app_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppSettingsPage extends StatefulWidget {
  const AppSettingsPage({super.key});

  @override
  State<AppSettingsPage> createState() => _AppSettingsPageState();
}

class _AppSettingsPageState extends State<AppSettingsPage> {
  bool healthAlerts = true;
  bool generalNotifications = true;
  bool exportHealthData = true;
  String advisoryLanguage = AppPreferencesService.english;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final language = await AppPreferencesService.advisoryLanguageCode();
    if (!mounted) return;
    setState(() {
      advisoryLanguage = language;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(title: const Text('Privacy and App Settings')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.lg,
            AppSpacing.sm,
            AppSpacing.lg,
            AppSpacing.xl,
          ),
          children: [
            const AppPageHeader(
              eyebrow: 'PRIVACY AND PREFERENCES',
              title: 'Control how BioTrack communicates and stores guidance',
              subtitle:
                  'Settings are grouped to make data protection, advisory language, and notifications easy to review without crowding the page.',
            ),
            const SizedBox(height: AppSpacing.lg),
            const AppSectionHeader(
              title: 'Data protection',
              subtitle:
                  'Your health information is handled with secure storage and record integrity checks.',
            ),
            const SizedBox(height: AppSpacing.md),
            const AppInfoCard(
              title: 'Encrypted health data',
              description:
                  'BioTrack stores health information using encrypted local and cloud-backed storage flows designed for healthcare monitoring.',
              tone: AppTone.info,
            ),
            const SizedBox(height: AppSpacing.sm),
            const AppInfoCard(
              title: 'Blockchain verification',
              description:
                  'Record hashes can be verified so you can review whether a medical record still matches its stored authenticity proof.',
              tone: AppTone.success,
              trailingLabel: 'Active',
            ),
            const SizedBox(height: AppSpacing.lg),
            const AppSectionHeader(
              title: 'AI advisory language',
              subtitle:
                  'Choose the language BioTrack should prefer when generating mobile AI guidance.',
            ),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: DropdownButtonFormField<String>(
                initialValue: advisoryLanguage,
                decoration: const InputDecoration(
                  labelText: 'Preferred advisory language',
                ),
                items: const [
                  DropdownMenuItem(
                    value: AppPreferencesService.english,
                    child: Text('English'),
                  ),
                  DropdownMenuItem(
                    value: AppPreferencesService.filipino,
                    child: Text('Filipino'),
                  ),
                ],
                onChanged: (value) async {
                  if (value == null) return;
                  await AppPreferencesService.setAdvisoryLanguageCode(value);
                  if (!mounted) return;
                  setState(() => advisoryLanguage = value);
                },
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            const AppSectionHeader(
              title: 'Notifications and exports',
              subtitle:
                  'Adjust how BioTrack surfaces important changes and whether export tools stay available on this device.',
            ),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  _SettingsSwitchRow(
                    value: healthAlerts,
                    onChanged: (value) => setState(() => healthAlerts = value),
                    title: 'Health alerts',
                    subtitle:
                        'Receive high-priority updates when BioTrack detects unusual pulse or activity changes.',
                  ),
                  const Divider(height: 1),
                  _SettingsSwitchRow(
                    value: generalNotifications,
                    onChanged: (value) =>
                        setState(() => generalNotifications = value),
                    title: 'General notifications',
                    subtitle:
                        'Allow reminders for sync status, reports, and account-related updates.',
                  ),
                  const Divider(height: 1),
                  _SettingsSwitchRow(
                    value: exportHealthData,
                    onChanged: (value) =>
                        setState(() => exportHealthData = value),
                    title: 'Report export tools',
                    subtitle:
                        'Keep mobile report copying and export shortcuts available on this device.',
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            const AppSectionHeader(
              title: 'Data actions',
              subtitle:
                  'Open your report tools or review how export access is currently configured.',
            ),
            const SizedBox(height: AppSpacing.md),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Report access',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    exportHealthData
                        ? 'Report export tools are enabled. Open the reports screen when you need a copy-ready health summary.'
                        : 'Report export tools are currently disabled on this device. You can turn them back on above at any time.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: AppSpacing.md),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: exportHealthData
                          ? () => context.push('/reports')
                          : null,
                      icon: const Icon(Icons.summarize_outlined),
                      label: const Text('Open reports and summary'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            const AppInfoBanner(
              title: 'Settings note',
              message:
                  'Some preferences affect local device behavior only, while record authenticity and AI history are managed from their dedicated screens.',
              tone: AppTone.info,
            ),
          ],
        ),
      ),
    );
  }
}

class AppInfoCard extends StatelessWidget {
  const AppInfoCard({
    super.key,
    required this.title,
    required this.description,
    required this.tone,
    this.trailingLabel,
  });

  final String title;
  final String description;
  final AppTone tone;
  final String? trailingLabel;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      color: appToneBackground(tone).withValues(alpha: 0.45),
      borderColor: appToneForeground(tone).withValues(alpha: 0.16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: appToneBackground(tone),
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: Icon(
              tone == AppTone.success
                  ? Icons.verified_user_outlined
                  : Icons.lock_outline_rounded,
              color: appToneForeground(tone),
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
                        title,
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    if (trailingLabel != null)
                      AppStatusBadge(label: trailingLabel!, tone: tone),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(description, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SettingsSwitchRow extends StatelessWidget {
  const _SettingsSwitchRow({
    required this.value,
    required this.onChanged,
    required this.title,
    required this.subtitle,
  });

  final bool value;
  final ValueChanged<bool> onChanged;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      value: value,
      onChanged: onChanged,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.xs,
      ),
      title: Text(title, style: Theme.of(context).textTheme.titleSmall),
      subtitle: Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
    );
  }
}
