import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/health_formatters.dart';
import '../../../../core/widgets/app_ui.dart';
import '../../data/services/ai_insights_api_service.dart';

class AiInsightsPage extends StatefulWidget {
  const AiInsightsPage({super.key});

  @override
  State<AiInsightsPage> createState() => _AiInsightsPageState();
}

class _AiInsightsPageState extends State<AiInsightsPage> {
  final AiInsightsApiService _api = AiInsightsApiService();

  bool _loading = true;
  bool _clearing = false;
  List<String> _errors = const <String>[];

  String _summaryInsight = '';
  List<String> _summaryObservations = const <String>[];
  String _overallRisk = 'LOW';
  int _fallEvents = 0;

  String _trendStatus = 'INSUFFICIENT_DATA';
  String _trendInsight = '';
  List<int> _recentHeartRates = const <int>[];

  List<AiAlertItem> _alerts = const <AiAlertItem>[];
  DateTime? _lastUpdatedAt;

  @override
  void initState() {
    super.initState();
    _loadInsights();
  }

  Future<void> _loadInsights({bool showLoader = true}) async {
    if (showLoader) {
      setState(() {
        _loading = true;
      });
    }

    try {
      final data = await _api.fetchInsights(days: 7, alertLimit: 10);
      if (!mounted) return;
      setState(() {
        _loading = false;
        _errors = data.errors;
        _summaryInsight = data.summaryInsight;
        _summaryObservations = data.summaryObservations;
        _overallRisk = data.overallRisk;
        _fallEvents = data.fallEvents;
        _trendStatus = data.trendStatus;
        _trendInsight = data.trendInsight;
        _recentHeartRates = data.recentHeartRates;
        _alerts = data.alerts;
        _lastUpdatedAt = DateTime.now();
      });
    } on AiInsightsApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _errors = <String>[error.message];
        _summaryInsight = '';
        _summaryObservations = const <String>[];
        _overallRisk = 'LOW';
        _fallEvents = 0;
        _trendStatus = 'INSUFFICIENT_DATA';
        _trendInsight = '';
        _recentHeartRates = const <int>[];
        _alerts = const <AiAlertItem>[];
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _errors = const <String>[
          'Failed to load AI insights. Please try again.',
        ];
      });
    }
  }

  Future<void> _clearMonitoringHistory() async {
    final shouldClear = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Clear monitoring history?'),
          content: const Text(
            'This removes synced monitoring samples and generated alerts from the backend so you can rebuild a fresh baseline.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.danger,
              ),
              child: const Text('Clear history'),
            ),
          ],
        );
      },
    );

    if (shouldClear != true) return;

    setState(() {
      _clearing = true;
    });

    try {
      final result = await _api.clearMonitoringHistory();
      if (!mounted) return;
      setState(() {
        _errors = <String>[];
        _summaryInsight = '';
        _summaryObservations = const <String>[];
        _overallRisk = 'LOW';
        _fallEvents = 0;
        _trendStatus = 'INSUFFICIENT_DATA';
        _trendInsight = '';
        _recentHeartRates = const <int>[];
        _alerts = const <AiAlertItem>[];
        _lastUpdatedAt = DateTime.now();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '${result.message} (${result.deletedHealthRecords} samples, ${result.deletedAlerts} alerts removed)',
          ),
        ),
      );
    } on AiInsightsApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _errors = <String>[error.message];
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errors = const <String>[
          'Failed to clear monitoring history. Please try again.',
        ];
      });
    } finally {
      if (mounted) {
        setState(() {
          _clearing = false;
        });
      }
    }
  }

  AppTone _severityTone(String severity) {
    switch (severity.toUpperCase()) {
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

  String _recommendedAction() {
    final risk = _overallRisk.toUpperCase();
    if (risk == 'CRITICAL' || risk == 'HIGH') {
      return 'Review symptoms now, repeat the scan in a resting position, and contact your clinician or assigned healthcare location if the pattern continues.';
    }
    if (_alerts.isNotEmpty) {
      return 'Open the latest alerts, compare them with your recent scans, and repeat monitoring later today to confirm whether the change persists.';
    }
    if (_recentHeartRates.isEmpty) {
      return 'Continue capturing daily scans so BioTrack can build a stronger baseline for future guidance.';
    }
    return 'Continue routine monitoring and repeat a scan whenever your symptoms, activity level, or wellbeing noticeably changes.';
  }

  @override
  Widget build(BuildContext context) {
    final latestHeartRate = _recentHeartRates.isNotEmpty
        ? _recentHeartRates.last
        : null;
    final showInitialSkeleton =
        _loading &&
        _lastUpdatedAt == null &&
        _errors.isEmpty &&
        _summaryInsight.trim().isEmpty &&
        _summaryObservations.isEmpty &&
        _recentHeartRates.isEmpty &&
        _alerts.isEmpty;
    final hasInsightContent =
        _summaryInsight.trim().isNotEmpty ||
        _trendInsight.trim().isNotEmpty ||
        _alerts.isNotEmpty ||
        _summaryObservations.isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('AI Insights'),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _loadInsights(showLoader: false),
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
                eyebrow: 'AI HEALTH ADVISORY',
                title: 'Your latest interpreted health summary',
                subtitle:
                    'BioTrack groups recent signal patterns, risk level, and advisory alerts into one readable report.',
              ),
              const SizedBox(height: AppSpacing.lg),
              if (_loading) ...[
                const LinearProgressIndicator(minHeight: 3),
                const SizedBox(height: AppSpacing.md),
              ],
              if (_errors.isNotEmpty) ...[
                AppInfoBanner(
                  title: 'Insight sync issue',
                  message: _errors.join(' '),
                  tone: AppTone.danger,
                ),
                const SizedBox(height: AppSpacing.md),
              ],
              if (showInitialSkeleton)
                const _AiInsightsLoadingSkeleton()
              else ...[
                _AiSummaryHero(
                  overallRisk: _overallRisk,
                  summaryInsight: _summaryInsight.isNotEmpty
                      ? _summaryInsight
                      : 'No AI advisory summary is available yet.',
                  updatedAt: _lastUpdatedAt,
                  riskTone: _severityTone(_overallRisk),
                  onRefresh: _loading
                      ? null
                      : () => _loadInsights(showLoader: false),
                  onClear: (_loading || _clearing)
                      ? null
                      : _clearMonitoringHistory,
                  clearing: _clearing,
                ),
                const SizedBox(height: AppSpacing.md),
                Row(
                  children: [
                    Expanded(
                      child: AppMetricCard(
                        icon: Icons.favorite_outline_rounded,
                        label: 'Latest BPM',
                        value: latestHeartRate == null
                            ? '--'
                            : '$latestHeartRate',
                        helper: _recentHeartRates.isEmpty
                            ? 'Awaiting more scans'
                            : '${_recentHeartRates.length} recent sample(s)',
                        tone: AppTone.accent,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: AppMetricCard(
                        icon: Icons.trending_up_rounded,
                        label: 'Trend',
                        value: HealthFormatters.sentenceCase(_trendStatus),
                        helper: latestHeartRate == null
                            ? 'No recent comparison yet'
                            : 'Based on current pulse history',
                        tone: _severityTone(_overallRisk),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: AppMetricCard(
                        icon: Icons.warning_amber_rounded,
                        label: 'Alerts',
                        value: '${_alerts.length}',
                        helper: 'Fall events: $_fallEvents',
                        tone: _alerts.isEmpty
                            ? AppTone.success
                            : AppTone.warning,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                if (!hasInsightContent && !_loading)
                  AppEmptyState(
                    icon: Icons.auto_awesome_outlined,
                    title: 'Not enough AI data yet',
                    subtitle:
                        'Complete more scans and keep monitoring enabled to build stronger trend analysis and alert history.',
                    action: OutlinedButton(
                      onPressed: () => _loadInsights(showLoader: false),
                      child: const Text('Refresh insights'),
                    ),
                  )
                else ...[
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const AppSectionHeader(
                          title: 'Trend interpretation',
                          subtitle:
                              'How BioTrack reads your recent pulse direction and movement context.',
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          _trendInsight.isNotEmpty
                              ? _trendInsight
                              : 'No trend interpretation is available yet.',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                        if (_recentHeartRates.isNotEmpty) ...[
                          const SizedBox(height: AppSpacing.md),
                          Wrap(
                            spacing: AppSpacing.xs,
                            runSpacing: AppSpacing.xs,
                            children: _recentHeartRates
                                .take(8)
                                .map(
                                  (value) => AppStatusBadge(
                                    label: '$value bpm',
                                    tone: AppTone.neutral,
                                  ),
                                )
                                .toList(growable: false),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const AppSectionHeader(
                          title: 'Recommended next step',
                          subtitle:
                              'A concise action to help you interpret the current AI result calmly.',
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          _recommendedAction(),
                          style: Theme.of(context).textTheme.bodyMedium,
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
                          title: 'Key observations',
                          subtitle:
                              'Short highlights extracted from your recent monitoring window.',
                        ),
                        const SizedBox(height: AppSpacing.md),
                        if (_summaryObservations.isEmpty)
                          Text(
                            'No observations are available yet.',
                            style: Theme.of(context).textTheme.bodySmall,
                          )
                        else
                          Wrap(
                            spacing: AppSpacing.xs,
                            runSpacing: AppSpacing.xs,
                            children: _summaryObservations
                                .map(
                                  (entry) => AppStatusBadge(
                                    label: entry,
                                    tone: AppTone.info,
                                  ),
                                )
                                .toList(growable: false),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppCard(
                    padding: EdgeInsets.zero,
                    child: Column(
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(
                            AppSpacing.md,
                            AppSpacing.md,
                            AppSpacing.md,
                            AppSpacing.sm,
                          ),
                          child: const AppSectionHeader(
                            title: 'Alert history',
                            subtitle:
                                'Severity-based alerts are grouped below so they stay readable instead of stacking into one long text block.',
                          ),
                        ),
                        if (_alerts.isEmpty)
                          Padding(
                            padding: const EdgeInsets.fromLTRB(
                              AppSpacing.md,
                              AppSpacing.sm,
                              AppSpacing.md,
                              AppSpacing.md,
                            ),
                            child: Text(
                              'No advisory alerts are active right now.',
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          )
                        else
                          ..._alerts.map(
                            (alert) => _AlertTile(
                              alert: alert,
                              tone: _severityTone(alert.severity),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ],
              const SizedBox(height: AppSpacing.md),
              const AppInfoBanner(
                title: 'Advisory reminder',
                message:
                    'AI insights support awareness and follow-up planning, but they do not replace professional medical evaluation.',
                tone: AppTone.info,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AiInsightsLoadingSkeleton extends StatelessWidget {
  const _AiInsightsLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppSkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              AppSkeletonBlock(width: 110, height: 14, radius: AppRadii.pill),
              SizedBox(height: AppSpacing.md),
              AppSkeletonParagraph(
                lines: 3,
                lineHeight: 13,
                lastLineFactor: 0.7,
              ),
              SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: AppSkeletonBlock(height: 12, radius: AppRadii.pill),
                  ),
                  SizedBox(width: AppSpacing.sm),
                  AppSkeletonBlock(width: 92, height: 40, radius: AppRadii.lg),
                ],
              ),
              SizedBox(height: AppSpacing.sm),
              AppSkeletonBlock(height: 48, radius: AppRadii.lg),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        const Row(
          children: [
            Expanded(child: _AiMetricSkeleton()),
            SizedBox(width: AppSpacing.sm),
            Expanded(child: _AiMetricSkeleton()),
            SizedBox(width: AppSpacing.sm),
            Expanded(child: _AiMetricSkeleton()),
          ],
        ),
        const SizedBox(height: AppSpacing.lg),
        const _AiSectionSkeleton(chipCount: 5),
        const SizedBox(height: AppSpacing.md),
        const _AiSectionSkeleton(),
        const SizedBox(height: AppSpacing.md),
        const _AiSectionSkeleton(chipCount: 4),
        const SizedBox(height: AppSpacing.md),
        AppSkeletonCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: const [
              Padding(
                padding: EdgeInsets.fromLTRB(
                  AppSpacing.md,
                  AppSpacing.md,
                  AppSpacing.md,
                  AppSpacing.sm,
                ),
                child: AppSkeletonParagraph(
                  lines: 2,
                  lineHeight: 12,
                  lastLineFactor: 0.55,
                ),
              ),
              _AiAlertSkeleton(),
              _AiAlertSkeleton(),
            ],
          ),
        ),
      ],
    );
  }
}

class _AiMetricSkeleton extends StatelessWidget {
  const _AiMetricSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppSkeletonCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          AppSkeletonBlock(width: 36, height: 36, radius: AppRadii.md),
          SizedBox(height: AppSpacing.sm),
          AppSkeletonBlock(width: 64, height: 18, radius: AppRadii.pill),
          SizedBox(height: AppSpacing.xs),
          AppSkeletonBlock(width: 84, height: 12, radius: AppRadii.pill),
          SizedBox(height: AppSpacing.xs),
          AppSkeletonBlock(width: 72, height: 12, radius: AppRadii.pill),
        ],
      ),
    );
  }
}

class _AiSectionSkeleton extends StatelessWidget {
  const _AiSectionSkeleton({this.chipCount = 0});

  final int chipCount;

  @override
  Widget build(BuildContext context) {
    return AppSkeletonCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSkeletonParagraph(
            lines: 2,
            lineHeight: 12,
            lastLineFactor: 0.58,
          ),
          const SizedBox(height: AppSpacing.md),
          const AppSkeletonParagraph(
            lines: 4,
            lineHeight: 13,
            lastLineFactor: 0.72,
          ),
          if (chipCount > 0) ...[
            const SizedBox(height: AppSpacing.md),
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: List.generate(
                chipCount,
                (index) => AppSkeletonBlock(
                  width: 66 + (index % 3) * 18,
                  height: 28,
                  radius: AppRadii.pill,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AiAlertSkeleton extends StatelessWidget {
  const _AiAlertSkeleton();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.sm,
        0,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: AppSkeletonCard(
        child: Row(
          children: const [
            AppSkeletonBlock(width: 38, height: 38, radius: AppRadii.md),
            SizedBox(width: AppSpacing.md),
            Expanded(
              child: AppSkeletonParagraph(
                lines: 3,
                lineHeight: 12,
                lastLineFactor: 0.62,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AiSummaryHero extends StatelessWidget {
  const _AiSummaryHero({
    required this.overallRisk,
    required this.summaryInsight,
    required this.updatedAt,
    required this.riskTone,
    required this.onRefresh,
    required this.onClear,
    required this.clearing,
  });

  final String overallRisk;
  final String summaryInsight;
  final DateTime? updatedAt;
  final AppTone riskTone;
  final VoidCallback? onRefresh;
  final VoidCallback? onClear;
  final bool clearing;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Latest status',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Text(
                      summaryInsight,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              AppStatusBadge(
                label: HealthFormatters.sentenceCase(overallRisk),
                tone: riskTone,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              if (updatedAt != null)
                Expanded(
                  child: Text(
                    'Updated ${HealthFormatters.formatTime(updatedAt!)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                )
              else
                const Spacer(),
              const SizedBox(width: AppSpacing.sm),
              OutlinedButton.icon(
                onPressed: onRefresh,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Refresh'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onClear,
              icon: Icon(
                clearing ? Icons.hourglass_top_rounded : Icons.delete_outline,
                color: AppColors.danger,
              ),
              label: Text(
                clearing ? 'Clearing history...' : 'Clear backend history',
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  const _AlertTile({required this.alert, required this.tone});

  final AiAlertItem alert;
  final AppTone tone;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.sm,
        0,
        AppSpacing.sm,
        AppSpacing.sm,
      ),
      child: Material(
        color: AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        child: ExpansionTile(
          tilePadding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.xs,
          ),
          childrenPadding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            0,
            AppSpacing.md,
            AppSpacing.md,
          ),
          backgroundColor: AppColors.surfaceMuted,
          collapsedBackgroundColor: AppColors.surfaceMuted,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.lg),
          ),
          collapsedShape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadii.lg),
          ),
          leading: Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: appToneBackground(tone),
              borderRadius: BorderRadius.circular(AppRadii.md),
            ),
            child: Icon(
              Icons.priority_high_rounded,
              color: appToneForeground(tone),
            ),
          ),
          title: Text(
            HealthFormatters.humanize(alert.type),
            style: Theme.of(context).textTheme.titleSmall,
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: AppSpacing.xxs),
            child: AppStatusBadge(
              label: HealthFormatters.sentenceCase(alert.severity),
              tone: tone,
            ),
          ),
          children: [
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                alert.message,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
