import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/health_formatters.dart';
import '../../../../core/widgets/app_ui.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/ai_insights_api_service.dart';
import '../../data/services/scan_record_store.dart';

class PatientReportsPage extends StatefulWidget {
  const PatientReportsPage({super.key});

  @override
  State<PatientReportsPage> createState() => _PatientReportsPageState();
}

class _PatientReportsPageState extends State<PatientReportsPage> {
  final AiInsightsApiService _aiApi = AiInsightsApiService();

  bool _loading = true;
  String _errorMessage = '';
  String _notice = '';
  List<ScanRecord> _records = const <ScanRecord>[];
  AiInsightsBundle? _insights;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _loading = true;
      _errorMessage = '';
      _notice = '';
    });

    try {
      final records = await ScanRecordStore.list();
      AiInsightsBundle? insights;
      try {
        insights = await _aiApi.fetchInsights(days: 30, alertLimit: 20);
      } on AiInsightsApiException {
        insights = null;
      }

      if (!mounted) return;
      setState(() {
        _records = records;
        _insights = insights;
      });
    } on ScanRecordStoreException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Unable to load report data right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _copyReport() async {
    final reportText = _buildReportText();
    if (reportText.trim().isEmpty) return;
    await Clipboard.setData(ClipboardData(text: reportText));
    if (!mounted) return;
    setState(() {
      _notice = 'Report copied. You can paste it into notes, chat, or email.';
    });
  }

  String _buildReportText() {
    final bpmValues = _records
        .map((record) => record.bpm)
        .whereType<int>()
        .toList();
    final latestRecord = _records.isNotEmpty ? _records.first : null;
    final verifiedCount = _records
        .where((record) => record.blockchain.isVerified)
        .length;
    final averageBpm = bpmValues.isEmpty
        ? null
        : (bpmValues.reduce((a, b) => a + b) / bpmValues.length).round();

    final lines = <String>[
      'BioTrack Mobile Patient Report',
      'Generated: ${HealthFormatters.formatDateTime(DateTime.now())}',
      '',
      'Records captured: ${_records.length}',
      'Verified records: $verifiedCount',
      'Latest heart rate: ${latestRecord?.bpm != null ? '${latestRecord!.bpm} bpm' : 'N/A'}',
      'Average heart rate: ${averageBpm != null ? '$averageBpm bpm' : 'N/A'}',
      'Current risk level: ${_insights?.overallRisk ?? 'UNKNOWN'}',
      'Recent fall events: ${_insights?.fallEvents ?? 0}',
      'Active alerts: ${_insights?.alerts.length ?? 0}',
      '',
      'Summary',
      _insights?.summaryInsight.isNotEmpty == true
          ? _insights!.summaryInsight
          : 'No AI summary was available for the selected records.',
    ];

    if ((_insights?.summaryObservations ?? const <String>[]).isNotEmpty) {
      lines
        ..add('')
        ..add('Observations');
      for (final observation in _insights!.summaryObservations) {
        lines.add('- $observation');
      }
    }

    if ((_insights?.alerts ?? const <AiAlertItem>[]).isNotEmpty) {
      lines
        ..add('')
        ..add('Alerts');
      for (final alert in _insights!.alerts.take(10)) {
        lines.add('- ${alert.severity}: ${alert.message}');
      }
    }

    if (_records.isNotEmpty) {
      lines
        ..add('')
        ..add('Recent Records');
      for (final record in _records.take(5)) {
        lines.add(
          '- ${HealthFormatters.formatRecordType(record.type)} | ${HealthFormatters.formatDateTime(record.scannedAt)} | ${record.bpm != null ? '${record.bpm} bpm' : 'No BPM'} | ${HealthFormatters.statusLabel(record.blockchain.verificationStatus)}',
        );
      }
    }

    return lines.join('\n');
  }

  @override
  Widget build(BuildContext context) {
    final reportText = _buildReportText();
    final verifiedCount = _records
        .where((record) => record.blockchain.isVerified)
        .length;
    final latestBpm = _records.isNotEmpty ? _records.first.bpm : null;
    final showInitialSkeleton =
        _loading &&
        _records.isEmpty &&
        _insights == null &&
        _errorMessage.isEmpty &&
        _notice.isEmpty;

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        title: const Text('Reports and Summary'),
        actions: [
          IconButton(
            tooltip: 'Refresh report',
            onPressed: _loading ? null : _loadData,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
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
                eyebrow: 'EXPORT AND SHARING',
                title: 'Generate a concise mobile patient summary',
                subtitle:
                    'This page combines recent record history and AI observations into a copy-ready report for follow-up or sharing.',
              ),
              const SizedBox(height: AppSpacing.lg),
              if (_errorMessage.isNotEmpty) ...[
                AppInfoBanner(message: _errorMessage, tone: AppTone.danger),
                const SizedBox(height: AppSpacing.md),
              ],
              if (_notice.isNotEmpty) ...[
                AppInfoBanner(message: _notice, tone: AppTone.success),
                const SizedBox(height: AppSpacing.md),
              ],
              if (showInitialSkeleton)
                const _ReportsLoadingSkeleton()
              else if (_loading)
                const LinearProgressIndicator(minHeight: 3)
              else ...[
                Row(
                  children: [
                    Expanded(
                      child: AppMetricCard(
                        icon: Icons.folder_outlined,
                        label: 'Records',
                        value: '${_records.length}',
                        helper: 'Available for this summary',
                        tone: AppTone.info,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: AppMetricCard(
                        icon: Icons.verified_outlined,
                        label: 'Verified',
                        value: '$verifiedCount',
                        helper: 'Integrity checks passed',
                        tone: AppTone.success,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: AppMetricCard(
                        icon: Icons.favorite_outline_rounded,
                        label: 'Latest BPM',
                        value: latestBpm == null ? '--' : '$latestBpm',
                        helper: 'Most recent scan',
                        tone: AppTone.accent,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const AppSectionHeader(
                        title: 'Copy-ready report',
                        subtitle:
                            'Use this text as a mobile-friendly summary for notes, chat, or email.',
                      ),
                      const SizedBox(height: AppSpacing.md),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: reportText.trim().isEmpty
                              ? null
                              : _copyReport,
                          icon: const Icon(Icons.copy_outlined),
                          label: const Text('Copy report text'),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceMuted,
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: SelectableText(
                          reportText.isEmpty
                              ? 'No report data is available yet.'
                              : reportText,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: AppColors.darkText,
                                height: 1.5,
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

class _ReportsLoadingSkeleton extends StatelessWidget {
  const _ReportsLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        Row(
          children: [
            Expanded(child: _ReportsMetricSkeleton()),
            SizedBox(width: AppSpacing.sm),
            Expanded(child: _ReportsMetricSkeleton()),
            SizedBox(width: AppSpacing.sm),
            Expanded(child: _ReportsMetricSkeleton()),
          ],
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
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 52, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 220, radius: AppRadii.lg),
            ],
          ),
        ),
      ],
    );
  }
}

class _ReportsMetricSkeleton extends StatelessWidget {
  const _ReportsMetricSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppSkeletonCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          AppSkeletonBlock(width: 36, height: 36, radius: AppRadii.md),
          SizedBox(height: AppSpacing.sm),
          AppSkeletonBlock(width: 70, height: 18, radius: AppRadii.pill),
          SizedBox(height: AppSpacing.xs),
          AppSkeletonBlock(width: 88, height: 12, radius: AppRadii.pill),
        ],
      ),
    );
  }
}
