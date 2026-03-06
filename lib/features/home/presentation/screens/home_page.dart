import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
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

  void _refreshDashboard() {
    setState(() {
      _dashboardFuture = _loadDashboard();
    });
  }

  String _formatTime(DateTime dateTime) {
    final hour24 = dateTime.hour;
    final minute = dateTime.minute.toString().padLeft(2, '0');
    final meridiem = hour24 >= 12 ? 'PM' : 'AM';
    final hour12 = hour24 % 12 == 0 ? 12 : hour24 % 12;
    return '$hour12:$minute $meridiem';
  }

  String _formatDay(DateTime dateTime) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(dateTime.year, dateTime.month, dateTime.day);
    final diffDays = today.difference(target).inDays;

    if (diffDays == 0) return 'Today';
    if (diffDays == 1) return 'Yesterday';
    return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')}';
  }

  String _formatRecordType(String type) {
    final normalized = type.trim().toLowerCase();
    if (normalized.isEmpty) return 'Health Record';
    return normalized
        .replaceAll('_', ' ')
        .split(' ')
        .where((part) => part.isNotEmpty)
        .map((part) => '${part[0].toUpperCase()}${part.substring(1)}')
        .join(' ');
  }

  String _buildSnapshotMessage(_HomeDashboardData data) {
    final insights = data.insights;
    final risk = (insights?.overallRisk ?? '').trim().toUpperCase();
    final alertsCount = insights?.alerts.length ?? 0;

    if (risk == 'CRITICAL') {
      return 'Critical changes were detected. Review your alerts and recent scans now.';
    }
    if (risk == 'HIGH') {
      return 'Your latest readings need closer monitoring today.';
    }
    if (alertsCount > 0) {
      return '$alertsCount alert(s) need review, but your latest data is synced and ready.';
    }
    if (insights != null && insights.summaryInsight.trim().isNotEmpty) {
      return insights.summaryInsight.trim();
    }
    return 'Your latest synced health snapshot is ready to review.';
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

  Widget _quickActionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.mutedBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: AppColors.primaryGreenDark),
            const SizedBox(height: 10),
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.secondaryText,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.softBackground,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 16),
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Good day, $_patientName',
                        style: const TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: AppColors.darkText,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Your mobile dashboard now mirrors your synced patient data.',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.bodyText,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  width: 44,
                  height: 44,
                  child: Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: _refreshDashboard,
                      child: const Icon(Icons.refresh),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFFFFFF), Color(0xFFCBE8B2)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 62,
                    height: 62,
                    decoration: BoxDecoration(
                      color: const Color(0xFFDFF3CB),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(
                      Icons.favorite_rounded,
                      size: 36,
                      color: AppColors.primaryGreenDark,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Start Vital Scan',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Measure your heart rate using the camera in under one minute.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.bodyText,
                            height: 1.35,
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 36,
                          child: ElevatedButton(
                            onPressed: () => context.go('/scan'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primaryGreen,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                              ),
                            ),
                            child: const Text(
                              'Continue',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            FutureBuilder<_HomeDashboardData>(
              future: _dashboardFuture,
              builder: (context, snapshot) {
                final data =
                    snapshot.data ?? const _HomeDashboardData(records: <ScanRecord>[]);
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
                final isLoading =
                    snapshot.connectionState == ConnectionState.waiting &&
                    !snapshot.hasData;
                final alertsCount = insights?.alerts.length ?? 0;
                final riskValue = insights?.overallRisk ?? 'LOW';
                final trendStatus = insights?.trendStatus ?? 'SYNCING';

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (isLoading) ...[
                      const LinearProgressIndicator(minHeight: 3),
                      const SizedBox(height: 12),
                    ],
                    if (data.errors.isNotEmpty) ...[
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF1F1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: data.errors
                              .map(
                                (error) => Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Text(
                                    error,
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.danger,
                                    ),
                                  ),
                                ),
                              )
                              .toList(growable: false),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    Row(
                      children: [
                        Expanded(
                          child: _KpiCard(
                            icon: Icons.favorite_outline,
                            label: 'Heart Rate',
                            value: latestBpm == null ? '-- bpm' : '$latestBpm bpm',
                            sublabel: averageBpm == null
                                ? 'No synced BPM yet'
                                : 'Avg $averageBpm bpm',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _KpiCard(
                            icon: Icons.notification_important_outlined,
                            label: 'Alerts',
                            value: '$alertsCount',
                            sublabel: alertsCount == 0
                                ? 'No active alerts'
                                : '${insights?.alerts.first.severity ?? 'Active'} attention needed',
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _KpiCard(
                            icon: Icons.health_and_safety_outlined,
                            label: 'Risk',
                            value: riskValue,
                            sublabel:
                                'Trend ${trendStatus.replaceAll('_', ' ')}',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),
                    const Text(
                      'Quick Actions',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _quickActionCard(
                            icon: Icons.camera_alt_outlined,
                            title: 'New Scan',
                            subtitle: 'Capture vitals now',
                            onTap: () => context.go('/scan'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _quickActionCard(
                            icon: Icons.insights_outlined,
                            title: 'AI Advice',
                            subtitle: 'View guidance',
                            onTap: () => context.go('/ai-insights'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: _quickActionCard(
                            icon: Icons.bar_chart_outlined,
                            title: 'Records',
                            subtitle: 'See medical history',
                            onTap: () => context.go('/records'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _quickActionCard(
                            icon: Icons.summarize_outlined,
                            title: 'Reports',
                            subtitle: 'Copy a mobile report',
                            onTap: () => context.push('/reports'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 22),
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
                            'AI Health Insights',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Text(
                            _buildSnapshotMessage(data),
                            style: const TextStyle(
                              fontSize: 14,
                              color: AppColors.bodyText,
                              height: 1.35,
                            ),
                          ),
                          if ((insights?.summaryObservations ?? const <String>[])
                              .isNotEmpty) ...[
                            const SizedBox(height: 10),
                            ...insights!.summaryObservations.take(2).map(
                                  (entry) => Padding(
                                    padding: const EdgeInsets.only(bottom: 4),
                                    child: Text(
                                      '- $entry',
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        color: AppColors.secondaryText,
                                      ),
                                    ),
                                  ),
                                ),
                          ],
                          const SizedBox(height: 12),
                          InkWell(
                            onTap: () => context.go('/ai-insights'),
                            child: const Text(
                              'View full advice',
                              style: TextStyle(
                                color: AppColors.primaryGreenDark,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),
                    const Text(
                      'Recent Records',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 10),
                    if (isLoading)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 8),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (records.isEmpty)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.mutedBorder),
                        ),
                        child: const Text(
                          'No recent scan records yet.',
                          style: TextStyle(
                            fontSize: 13,
                            color: AppColors.bodyText,
                          ),
                        ),
                      )
                    else
                      ...records.take(3).map(
                            (record) => _RecordRow(
                              title: _formatRecordType(record.type),
                              subtitle:
                                  '${_formatDay(record.scannedAt)}, ${_formatTime(record.scannedAt)} • ${_statusLabel(record.blockchain.verificationStatus)}',
                              onTap: () => context.push('/records/${record.id}'),
                            ),
                          ),
                  ],
                );
              },
            ),
          ],
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

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.sublabel,
  });

  final IconData icon;
  final String label;
  final String value;
  final String sublabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.mutedBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primaryGreenDark, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 14,
              color: AppColors.darkText,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.secondaryText,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            sublabel,
            style: const TextStyle(fontSize: 11, color: AppColors.bodyText),
          ),
        ],
      ),
    );
  }
}

class _RecordRow extends StatelessWidget {
  const _RecordRow({
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.mutedBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.primaryGreenLight,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.favorite_outline,
                size: 20,
                color: AppColors.primaryGreenDark,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondaryText,
                    ),
                  ),
                ],
              ),
            ),
            const Text(
              'View',
              style: TextStyle(
                color: AppColors.primaryGreenDark,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
