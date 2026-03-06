import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
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
    final bpmValues = _records.map((record) => record.bpm).whereType<int>().toList();
    final latestRecord = _records.isNotEmpty ? _records.first : null;
    final verifiedCount = _records.where((record) => record.blockchain.isVerified).length;
    final averageBpm = bpmValues.isEmpty
        ? null
        : (bpmValues.reduce((a, b) => a + b) / bpmValues.length).round();

    final lines = <String>[
      'BioTrack Mobile Patient Report',
      'Generated: ${_formatDateTime(DateTime.now())}',
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
          '- ${_formatRecordType(record.type)} | ${_formatDateTime(record.scannedAt)} | ${record.bpm != null ? '${record.bpm} bpm' : 'No BPM'} | ${_statusLabel(record.blockchain.verificationStatus)}',
        );
      }
    }

    return lines.join('\n');
  }

  String _statusLabel(String status) {
    final normalized = status.trim().toLowerCase();
    if (normalized == 'anchored' || normalized == 'verified') {
      return 'Verified';
    }
    if (normalized == 'local_hash_only') {
      return 'Verified Locally';
    }
    if (normalized == 'tampered' || normalized == 'anchor_mismatch') {
      return 'Needs Review';
    }
    return 'Pending';
  }

  String _formatRecordType(String type) {
    final normalized = type.trim().toLowerCase();
    if (normalized.isEmpty) return 'Health record';
    return normalized
        .replaceAll('_', ' ')
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map(
          (part) => '${part[0].toUpperCase()}${part.substring(1)}',
        )
        .join(' ');
  }

  String _formatDateTime(DateTime value) {
    final local = value.toLocal();
    final month = local.month.toString().padLeft(2, '0');
    final day = local.day.toString().padLeft(2, '0');
    final minute = local.minute.toString().padLeft(2, '0');
    final meridiem = local.hour >= 12 ? 'PM' : 'AM';
    final hour = local.hour % 12 == 0 ? 12 : local.hour % 12;
    return '${local.year}-$month-$day $hour:$minute $meridiem';
  }

  @override
  Widget build(BuildContext context) {
    final reportText = _buildReportText();
    final verifiedCount = _records.where((record) => record.blockchain.isVerified).length;
    final latestBpm = _records.isNotEmpty ? _records.first.bpm : null;

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        backgroundColor: AppColors.softBackground,
        elevation: 0,
        title: const Text(
          'Reports & Summary',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
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
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
            children: [
              if (_errorMessage.isNotEmpty) ...[
                _ReportNotice(
                  message: _errorMessage,
                  backgroundColor: const Color(0xFFFFF1F1),
                  textColor: AppColors.danger,
                ),
                const SizedBox(height: 12),
              ],
              if (_notice.isNotEmpty) ...[
                _ReportNotice(
                  message: _notice,
                  backgroundColor: const Color(0xFFEFF8EA),
                  textColor: AppColors.primaryGreenDark,
                ),
                const SizedBox(height: 12),
              ],
              if (_loading)
                const LinearProgressIndicator(minHeight: 3)
              else ...[
                Row(
                  children: [
                    Expanded(
                      child: _StatCard(
                        title: 'Records',
                        value: '${_records.length}',
                        helper: 'Backend-backed history',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _StatCard(
                        title: 'Verified',
                        value: '$verifiedCount',
                        helper: 'Authenticity checks passed',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _StatCard(
                        title: 'Latest BPM',
                        value: latestBpm == null ? '--' : '$latestBpm',
                        helper: 'Most recent record',
                      ),
                    ),
                  ],
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
                        'Mobile Report',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'This mobile view condenses the same patient data used on the web into a copy-ready summary.',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.bodyText,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: reportText.trim().isEmpty ? null : _copyReport,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryGreenDark,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                          icon: const Icon(Icons.copy, color: Colors.white),
                          label: const Text(
                            'Copy Report Text',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      SelectableText(
                        reportText.isEmpty
                            ? 'No report data available yet.'
                            : reportText,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.45,
                          color: AppColors.bodyText,
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

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.title,
    required this.value,
    required this.helper,
  });

  final String title;
  final String value;
  final String helper;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.mutedBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.darkText,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.secondaryText,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            helper,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.bodyText,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportNotice extends StatelessWidget {
  const _ReportNotice({
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
