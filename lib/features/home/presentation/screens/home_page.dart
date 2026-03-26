import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/health_formatters.dart';
import '../../../../core/widgets/app_ui.dart';
import '../../../auth/data/services/auth_session_store.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/ai_insights_api_service.dart';
import '../../data/services/scan_record_store.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final AiInsightsApiService _insightsApi = AiInsightsApiService();

  String _patientName = 'Patient';
  late Future<_HomeDashboardData> _dashboardFuture;

  @override
  void initState() {
    super.initState();
    _dashboardFuture = _loadDashboard();
    _loadPatientName();
  }

  Future<void> _loadPatientName() async {
    final storedName = await AuthSessionStore.patientName();
    final name = (storedName ?? '').trim();
    if (!mounted || name.isEmpty) return;
    setState(() {
      _patientName = name.split(' ').first;
    });
  }

  Future<_HomeDashboardData> _loadDashboard() async {
    final errors = <String>[];
    List<ScanRecord> records = const <ScanRecord>[];
    AiInsightsBundle? insights;

    try {
      records = await ScanRecordStore.list();
    } on ScanRecordStoreException catch (error) {
      errors.add(error.message);
    } catch (_) {
      errors.add('Unable to load your synced records.');
    }

    try {
      insights = await _insightsApi.fetchInsights(days: 7, alertLimit: 10);
      errors.addAll(insights.errors);
    } on AiInsightsApiException catch (error) {
      errors.add(error.message);
    } catch (_) {
      errors.add('Unable to load your AI health overview.');
    }

    return _HomeDashboardData(
      records: records,
      insights: insights,
      errors: errors,
    );
  }

  Future<void> _refreshDashboard() async {
    final future = _loadDashboard();
    setState(() {
      _dashboardFuture = future;
    });
    await future;
  }

  String _buildSnapshotMessage(_HomeDashboardData data) {
    final insights = data.insights;
    final risk = (insights?.overallRisk ?? '').trim().toUpperCase();
    final alertsCount = insights?.alerts.length ?? 0;

    if (risk == 'CRITICAL') {
      return 'Critical changes were detected. Review alerts and recent scans as soon as possible.';
    }
    if (risk == 'HIGH') {
      return 'Your recent readings suggest closer monitoring today.';
    }
    if (alertsCount > 0) {
      return '$alertsCount alert${alertsCount == 1 ? '' : 's'} need review, while the rest of your monitoring remains synced.';
    }
    if (insights != null && insights.summaryInsight.trim().isNotEmpty) {
      return insights.summaryInsight.trim();
    }
    return 'Your latest health snapshot is available and ready for review.';
  }

  AppTone _riskTone(String risk) {
    switch (risk.trim().toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return AppTone.danger;
      case 'MODERATE':
        return AppTone.warning;
      case 'LOW':
        return AppTone.success;
      default:
        return AppTone.info;
    }
  }

  AppTone _statusTone(String status) {
    final normalized = status.trim().toLowerCase();
    if (normalized == 'anchored' || normalized == 'verified') {
      return AppTone.success;
    }
    if (normalized == 'local_hash_only') {
      return AppTone.warning;
    }
    if (normalized == 'tampered' || normalized == 'anchor_mismatch') {
      return AppTone.danger;
    }
    return AppTone.neutral;
  }

  String _alertHelper(AiInsightsBundle? insights) {
    final alerts = insights?.alerts ?? const <AiAlertItem>[];
    if (alerts.isEmpty) return 'No active alerts';
    final topSeverity = HealthFormatters.sentenceCase(alerts.first.severity);
    return '$topSeverity attention suggested';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.softBackground,
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: <Color>[
              AppColors.lightGreen.withValues(alpha: 0.5),
              AppColors.softBackground,
              AppColors.softBackground,
            ],
          ),
        ),
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: _refreshDashboard,
            child: FutureBuilder<_HomeDashboardData>(
              future: _dashboardFuture,
              builder: (context, snapshot) {
                final data =
                    snapshot.data ??
                    const _HomeDashboardData(records: <ScanRecord>[]);
                final records = data.records;
                final insights = data.insights;
                final bpmValues = records
                    .map((item) => item.bpm)
                    .whereType<int>()
                    .toList(growable: false);
                final latestRecord = records.isNotEmpty ? records.first : null;
                final latestBpm = latestRecord?.bpm;
                final averageBpm = bpmValues.isEmpty
                    ? null
                    : (bpmValues.reduce((a, b) => a + b) / bpmValues.length)
                          .round();
                final alertsCount = insights?.alerts.length ?? 0;
                final riskValue =
                    insights?.overallRisk.trim().isNotEmpty == true
                    ? insights!.overallRisk
                    : 'LOW';
                final trendStatus =
                    insights?.trendStatus.trim().isNotEmpty == true
                    ? insights!.trendStatus
                    : 'INSUFFICIENT_DATA';
                final isLoading =
                    snapshot.connectionState == ConnectionState.waiting &&
                    !snapshot.hasData;
                final showInitialSkeleton =
                    isLoading &&
                    data.errors.isEmpty &&
                    records.isEmpty &&
                    insights == null;

                return ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.lg,
                    AppSpacing.lg,
                    AppSpacing.lg,
                    120,
                  ),
                  children: [
                    AppPageHeader(
                      eyebrow: 'DAILY OVERVIEW',
                      title: 'Hello, $_patientName',
                      subtitle:
                          'Keep your latest scan, AI guidance, and verified medical history in one calm workspace.',
                      trailing: _HeaderActionButton(
                        icon: Icons.refresh_rounded,
                        tooltip: 'Refresh dashboard',
                        onTap: _refreshDashboard,
                      ),
                    ),
                    const SizedBox(height: AppSpacing.xl),
                    _DashboardHeroCard(onStartScan: () => context.go('/scan')),
                    const SizedBox(height: AppSpacing.lg),
                    if (isLoading) ...[
                      const LinearProgressIndicator(minHeight: 3),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    if (data.errors.isNotEmpty) ...[
                      AppInfoBanner(
                        title: 'Sync attention needed',
                        message: data.errors.join(' '),
                        tone: AppTone.danger,
                      ),
                      const SizedBox(height: AppSpacing.md),
                    ],
                    if (showInitialSkeleton)
                      const _HomeLoadingSkeleton()
                    else ...[
                      Row(
                        children: [
                          Expanded(
                            child: AppMetricCard(
                              icon: Icons.favorite_outline_rounded,
                              label: 'Latest heart rate',
                              value: latestBpm == null
                                  ? '-- bpm'
                                  : '$latestBpm bpm',
                              helper: averageBpm == null
                                  ? 'No stable pulse saved yet'
                                  : '7-day average $averageBpm bpm',
                              tone: AppTone.accent,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: AppMetricCard(
                              icon: Icons.notification_important_outlined,
                              label: 'Alerts',
                              value: '$alertsCount',
                              helper: _alertHelper(insights),
                              tone: alertsCount > 0
                                  ? AppTone.warning
                                  : AppTone.success,
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          Expanded(
                            child: AppMetricCard(
                              icon: Icons.shield_outlined,
                              label: 'Risk level',
                              value: HealthFormatters.sentenceCase(riskValue),
                              helper: HealthFormatters.sentenceCase(
                                trendStatus,
                              ),
                              tone: _riskTone(riskValue),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      const AppSectionHeader(
                        title: 'Quick actions',
                        subtitle:
                            'Jump into the tasks you are most likely to use today.',
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: AppSpacing.md,
                        runSpacing: AppSpacing.md,
                        children: [
                          _SizedActionTile(
                            icon: Icons.camera_alt_outlined,
                            title: 'New scan',
                            subtitle: 'Capture a fresh vital reading',
                            onTap: () => context.go('/scan'),
                          ),
                          _SizedActionTile(
                            icon: Icons.insights_outlined,
                            title: 'AI insights',
                            subtitle: 'Review trends and guidance',
                            onTap: () => context.go('/ai-insights'),
                          ),
                          _SizedActionTile(
                            icon: Icons.folder_outlined,
                            title: 'Medical records',
                            subtitle: 'See your synced health history',
                            onTap: () => context.go('/records'),
                          ),
                          _SizedActionTile(
                            icon: Icons.summarize_outlined,
                            title: 'Reports',
                            subtitle: 'Open your mobile-ready summary',
                            onTap: () => context.push('/reports'),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      AppCard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Latest AI brief',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleMedium,
                                      ),
                                      const SizedBox(height: AppSpacing.xs),
                                      Text(
                                        _buildSnapshotMessage(data),
                                        style: Theme.of(
                                          context,
                                        ).textTheme.bodyMedium,
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: AppSpacing.sm),
                                AppStatusBadge(
                                  label: HealthFormatters.sentenceCase(
                                    riskValue,
                                  ),
                                  tone: _riskTone(riskValue),
                                ),
                              ],
                            ),
                            if ((insights?.summaryObservations ??
                                    const <String>[])
                                .isNotEmpty) ...[
                              const SizedBox(height: AppSpacing.md),
                              Wrap(
                                spacing: AppSpacing.xs,
                                runSpacing: AppSpacing.xs,
                                children: insights!.summaryObservations
                                    .take(3)
                                    .map(
                                      (entry) => AppStatusBadge(
                                        label: entry,
                                        tone: AppTone.neutral,
                                      ),
                                    )
                                    .toList(growable: false),
                              ),
                            ],
                            const SizedBox(height: AppSpacing.md),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: TextButton(
                                onPressed: () => context.go('/ai-insights'),
                                child: const Text('Open full AI guidance'),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      AppSectionHeader(
                        title: 'Recent records',
                        subtitle: records.isEmpty
                            ? 'Your latest scans will appear here once saved.'
                            : 'Tap any record to review verification and scan details.',
                        action: TextButton(
                          onPressed: () => context.go('/records'),
                          child: const Text('See all'),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      if (isLoading)
                        const Padding(
                          padding: EdgeInsets.symmetric(
                            vertical: AppSpacing.xl,
                          ),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (records.isEmpty)
                        AppEmptyState(
                          icon: Icons.favorite_outline_rounded,
                          title: 'No scans saved yet',
                          subtitle:
                              'Start a finger scan to create your first verified health record.',
                          action: ElevatedButton(
                            onPressed: () => context.go('/scan'),
                            child: const Text('Start vital scan'),
                          ),
                        )
                      else
                        ...records
                            .take(3)
                            .map(
                              (record) => Padding(
                                padding: const EdgeInsets.only(
                                  bottom: AppSpacing.md,
                                ),
                                child: _HomeRecordTile(
                                  title: HealthFormatters.formatRecordType(
                                    record.type,
                                  ),
                                  subtitle:
                                      '${HealthFormatters.formatRelativeDay(record.scannedAt)} | ${HealthFormatters.formatTime(record.scannedAt)}',
                                  status: HealthFormatters.statusLabel(
                                    record.blockchain.verificationStatus,
                                  ),
                                  statusTone: _statusTone(
                                    record.blockchain.verificationStatus,
                                  ),
                                  bpmLabel: record.bpm == null
                                      ? 'No BPM'
                                      : '${record.bpm} bpm',
                                  onTap: () =>
                                      context.push('/records/${record.id}'),
                                ),
                              ),
                            ),
                    ],
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}

class _HomeDashboardData {
  const _HomeDashboardData({
    required this.records,
    this.insights,
    this.errors = const <String>[],
  });

  final List<ScanRecord> records;
  final AiInsightsBundle? insights;
  final List<String> errors;
}

class _HeaderActionButton extends StatelessWidget {
  const _HeaderActionButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final Future<void> Function() onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.softSurface,
      borderRadius: BorderRadius.circular(AppRadii.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.lg),
            border: Border.all(color: AppColors.mutedBorder),
          ),
          child: Icon(icon, color: AppColors.darkText, semanticLabel: tooltip),
        ),
      ),
    );
  }
}

class _DashboardHeroCard extends StatelessWidget {
  const _DashboardHeroCard({required this.onStartScan});

  final VoidCallback onStartScan;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadii.xl),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: <Color>[Color(0xFF204D40), Color(0xFF315F52)],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryGreenDark.withValues(alpha: 0.18),
            blurRadius: 28,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const AppStatusBadge(
              label: 'Camera scan ready',
              tone: AppTone.success,
              icon: Icons.shield_rounded,
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Start a new vital scan',
                        style: theme.headlineMedium?.copyWith(
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        'Measure heart rate with your camera in under a minute, then review AI guidance and authenticity checks in one flow.',
                        style: theme.bodyMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.86),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Container(
                  width: 76,
                  height: 76,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadii.xl),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.18),
                    ),
                  ),
                  child: const Icon(
                    Icons.favorite_rounded,
                    color: Colors.white,
                    size: 38,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: onStartScan,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primaryGreenDark,
                    ),
                    child: const Text('Start vital scan'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadii.pill),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.14),
                    ),
                  ),
                  child: Text(
                    'Approx. 18 sec',
                    style: theme.labelSmall?.copyWith(color: Colors.white),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SizedActionTile extends StatelessWidget {
  const _SizedActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final width = (MediaQuery.sizeOf(context).width - 56) / 2;
    return SizedBox(
      width: width.clamp(0, 220).toDouble(),
      child: AppActionTile(
        icon: icon,
        title: title,
        subtitle: subtitle,
        onTap: onTap,
      ),
    );
  }
}

class _HomeRecordTile extends StatelessWidget {
  const _HomeRecordTile({
    required this.title,
    required this.subtitle,
    required this.status,
    required this.statusTone,
    required this.bpmLabel,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final String status;
  final AppTone statusTone;
  final String bpmLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).textTheme;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        child: AppCard(
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primaryGreenLight,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                ),
                child: const Icon(
                  Icons.favorite_outline_rounded,
                  color: AppColors.primaryGreenDark,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.titleSmall),
                    const SizedBox(height: AppSpacing.xxs),
                    Text(subtitle, style: theme.bodySmall),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  AppStatusBadge(label: status, tone: statusTone),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    bpmLabel,
                    style: theme.labelLarge?.copyWith(
                      color: AppColors.primaryGreenDark,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeLoadingSkeleton extends StatelessWidget {
  const _HomeLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Expanded(child: _HomeMetricSkeleton()),
            SizedBox(width: AppSpacing.sm),
            Expanded(child: _HomeMetricSkeleton()),
            SizedBox(width: AppSpacing.sm),
            Expanded(child: _HomeMetricSkeleton()),
          ],
        ),
        const SizedBox(height: AppSpacing.xl),
        const AppSkeletonParagraph(
          lines: 2,
          lineHeight: 12,
          lastLineFactor: 0.46,
        ),
        const SizedBox(height: AppSpacing.md),
        Wrap(
          spacing: AppSpacing.md,
          runSpacing: AppSpacing.md,
          children: List.generate(4, (index) => const _HomeActionSkeleton()),
        ),
        const SizedBox(height: AppSpacing.xl),
        AppSkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              AppSkeletonParagraph(
                lines: 3,
                lineHeight: 12,
                lastLineFactor: 0.7,
              ),
              SizedBox(height: AppSpacing.md),
              Wrap(
                spacing: AppSpacing.xs,
                runSpacing: AppSpacing.xs,
                children: [
                  AppSkeletonBlock(
                    width: 76,
                    height: 28,
                    radius: AppRadii.pill,
                  ),
                  AppSkeletonBlock(
                    width: 92,
                    height: 28,
                    radius: AppRadii.pill,
                  ),
                  AppSkeletonBlock(
                    width: 70,
                    height: 28,
                    radius: AppRadii.pill,
                  ),
                ],
              ),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(width: 132, height: 16, radius: AppRadii.pill),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.xl),
        const AppSkeletonParagraph(
          lines: 2,
          lineHeight: 12,
          lastLineFactor: 0.42,
        ),
        const SizedBox(height: AppSpacing.md),
        const _HomeRecordSkeleton(),
        const SizedBox(height: AppSpacing.md),
        const _HomeRecordSkeleton(),
        const SizedBox(height: AppSpacing.md),
        const _HomeRecordSkeleton(),
      ],
    );
  }
}

class _HomeMetricSkeleton extends StatelessWidget {
  const _HomeMetricSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppSkeletonCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          AppSkeletonBlock(width: 36, height: 36, radius: AppRadii.md),
          SizedBox(height: AppSpacing.sm),
          AppSkeletonBlock(width: 70, height: 18, radius: AppRadii.pill),
          SizedBox(height: AppSpacing.xxs),
          AppSkeletonBlock(width: 82, height: 12, radius: AppRadii.pill),
          SizedBox(height: AppSpacing.xxs),
          AppSkeletonBlock(width: 74, height: 12, radius: AppRadii.pill),
        ],
      ),
    );
  }
}

class _HomeActionSkeleton extends StatelessWidget {
  const _HomeActionSkeleton();

  @override
  Widget build(BuildContext context) {
    final width = (MediaQuery.sizeOf(context).width - 56) / 2;
    return SizedBox(
      width: width.clamp(0, 220).toDouble(),
      child: AppSkeletonCard(
        child: Row(
          children: const [
            AppSkeletonBlock(width: 46, height: 46, radius: AppRadii.md),
            SizedBox(width: AppSpacing.md),
            Expanded(
              child: AppSkeletonParagraph(
                lines: 2,
                lineHeight: 12,
                lastLineFactor: 0.58,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeRecordSkeleton extends StatelessWidget {
  const _HomeRecordSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppSkeletonCard(
      child: Row(
        children: const [
          AppSkeletonBlock(width: 44, height: 44, radius: AppRadii.md),
          SizedBox(width: AppSpacing.md),
          Expanded(
            child: AppSkeletonParagraph(
              lines: 3,
              lineHeight: 12,
              lastLineFactor: 0.64,
            ),
          ),
          SizedBox(width: AppSpacing.sm),
          AppSkeletonBlock(width: 62, height: 28, radius: AppRadii.pill),
        ],
      ),
    );
  }
}
