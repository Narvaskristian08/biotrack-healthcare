import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../auth/data/services/auth_session_store.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/scan_record_store.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  String _patientName = 'Patient';

  @override
  void initState() {
    super.initState();
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

  void _refreshDashboard() {
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final recordsFuture = ScanRecordStore.list();

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
                        'Your health snapshot looks stable today.',
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
            FutureBuilder<List<ScanRecord>>(
              future: recordsFuture,
              builder: (context, snapshot) {
                final records = snapshot.data ?? const <ScanRecord>[];
                final bpmValues = records
                    .map((item) => item.bpm)
                    .whereType<int>()
                    .toList();
                final latestRecord = records.isNotEmpty ? records.first : null;
                final averageBpm = bpmValues.isEmpty
                    ? null
                    : (bpmValues.reduce((a, b) => a + b) / bpmValues.length)
                          .round();
                final hasRecentFall = records
                    .take(5)
                    .any((item) => item.fallDetected);

                final heartRateValue = averageBpm == null
                    ? '-- bpm'
                    : '$averageBpm bpm';
                final heartRateSubLabel = bpmValues.isEmpty
                    ? 'Awaiting stable pulse'
                    : 'Avg ${bpmValues.length} scans';

                final activityValue = latestRecord?.activityLabel ?? 'No data';
                final activitySubLabel = latestRecord == null
                    ? 'Complete a new scan'
                    : latestRecord.movementIntensity.toStringAsFixed(2);

                final statusValue = hasRecentFall ? 'Alert' : 'Safe';
                final statusSubLabel = latestRecord == null
                    ? 'No alerts'
                    : _formatDay(latestRecord.scannedAt);

                return Row(
                  children: [
                    Expanded(
                      child: _KpiCard(
                        icon: Icons.favorite_outline,
                        label: 'Heart Rate',
                        value: heartRateValue,
                        sublabel: heartRateSubLabel,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _KpiCard(
                        icon: Icons.directions_walk_outlined,
                        label: 'Activity',
                        value: activityValue,
                        sublabel: activitySubLabel,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _KpiCard(
                        icon: Icons.verified_user_outlined,
                        label: 'Status',
                        value: statusValue,
                        sublabel: statusSubLabel,
                      ),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 22),
            const Text(
              'Quick Actions',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _quickActionCard(
                    context: context,
                    icon: Icons.camera_alt_outlined,
                    title: 'New Scan',
                    subtitle: 'Capture vitals now',
                    onTap: () => context.go('/scan'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _quickActionCard(
                    context: context,
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
                    context: context,
                    icon: Icons.bar_chart_outlined,
                    title: 'Records',
                    subtitle: 'See your trends',
                    onTap: () => context.go('/records'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _quickActionCard(
                    context: context,
                    icon: Icons.person_outline,
                    title: 'Profile',
                    subtitle: 'Manage account',
                    onTap: () => context.go('/profile'),
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
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'AI Health Insights',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'No incident detected. Recent trends are within healthy thresholds. Maintain hydration and light movement today.',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.bodyText,
                      height: 1.35,
                    ),
                  ),
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
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            FutureBuilder<List<ScanRecord>>(
              future: recordsFuture,
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  final errorMessage =
                      snapshot.error is ScanRecordStoreException
                      ? (snapshot.error as ScanRecordStoreException).message
                      : 'Unable to load records right now.';
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          errorMessage,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.bodyText,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: _refreshDashboard,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final records = snapshot.data ?? const <ScanRecord>[];
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }

                if (records.isEmpty) {
                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Text(
                      'No recent scan records yet.',
                      style: TextStyle(fontSize: 13, color: AppColors.bodyText),
                    ),
                  );
                }

                final recent = records.take(3).toList(growable: false);
                return Column(
                  children: recent
                      .map(
                        (record) => _RecordRow(
                          title: 'Heart Rate Scan',
                          subtitle:
                              '${_formatDay(record.scannedAt)}, ${_formatTime(record.scannedAt)}',
                          onTap: () => context.push('/records/${record.id}'),
                        ),
                      )
                      .toList(growable: false),
                );
              },
            ),
          ],
        ),
      ),
    );
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

  Widget _quickActionCard({
    required BuildContext context,
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
