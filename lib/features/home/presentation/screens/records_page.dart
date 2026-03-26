import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/health_formatters.dart';
import '../../../../core/widgets/app_line_chart.dart';
import '../../../../core/widgets/app_ui.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/scan_record_store.dart';

class RecordsPage extends StatefulWidget {
  const RecordsPage({super.key});

  @override
  State<RecordsPage> createState() => _RecordsPageState();
}

class _RecordsPageState extends State<RecordsPage> {
  late Future<List<ScanRecord>> _recordsFuture;
  int _pendingQueueCount = 0;
  bool _syncingPendingQueue = false;
  final Set<String> _deletingRecordIds = <String>{};
  int _selectedWindowDays = 30;

  @override
  void initState() {
    super.initState();
    _recordsFuture = ScanRecordStore.list();
    _loadPendingQueueStatus();
    _syncPendingQueue(silent: true);
  }

  Future<void> _reload() async {
    setState(() {
      _recordsFuture = ScanRecordStore.list();
    });
    try {
      await _recordsFuture;
      await _loadPendingQueueStatus();
    } catch (_) {
      // Errors are surfaced through FutureBuilder UI.
    }
  }

  Future<void> _loadPendingQueueStatus() async {
    final pendingCount = await ScanRecordStore.pendingQueueCount();
    if (!mounted) return;
    setState(() {
      _pendingQueueCount = pendingCount;
    });
  }

  Future<void> _syncPendingQueue({bool silent = false}) async {
    if (_syncingPendingQueue) return;
    setState(() => _syncingPendingQueue = true);

    try {
      final result = await ScanRecordStore.syncPendingNow();
      await _loadPendingQueueStatus();
      await _reload();
      if (!mounted || silent) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Pending sync complete: ${result.synced} uploaded, ${result.remaining} remaining.',
          ),
        ),
      );
    } on ScanRecordStoreException catch (error) {
      if (!mounted || silent) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } finally {
      if (mounted) {
        setState(() => _syncingPendingQueue = false);
      }
    }
  }

  Future<void> _deleteRecord(ScanRecord record) async {
    if (_deletingRecordIds.contains(record.id)) return;

    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Delete record?'),
          content: const Text(
            'This scan record will be removed from your recent records list.',
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
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (shouldDelete != true || !mounted) return;

    setState(() {
      _deletingRecordIds.add(record.id);
    });

    try {
      await ScanRecordStore.deleteById(record.id);
      await _reload();
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Record deleted')));
    } on ScanRecordStoreException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to delete record right now.')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _deletingRecordIds.remove(record.id);
        });
      }
    }
  }

  List<Widget> _buildAsyncChildren(
    BuildContext context,
    AsyncSnapshot<List<ScanRecord>> snapshot,
  ) {
    if (snapshot.connectionState == ConnectionState.waiting &&
        !snapshot.hasData) {
      return const <Widget>[_RecordsLoadingSkeleton()];
    }

    if (snapshot.hasError) {
      final errorMessage = snapshot.error is ScanRecordStoreException
          ? (snapshot.error as ScanRecordStoreException).message
          : 'Unable to load records right now.';
      return <Widget>[
        AppEmptyState(
          icon: Icons.folder_open_outlined,
          title: 'Could not load records',
          subtitle: errorMessage,
          action: ElevatedButton(
            onPressed: _reload,
            child: const Text('Retry'),
          ),
        ),
      ];
    }

    final allRecords = snapshot.data ?? const <ScanRecord>[];
    final records = _filteredRecords(allRecords);
    final bpmValues = records
        .map((record) => record.bpm)
        .whereType<int>()
        .toList(growable: false);
    final averageBpm = bpmValues.isEmpty
        ? null
        : (bpmValues.reduce((a, b) => a + b) / bpmValues.length).round();
    final verifiedCount = records
        .where((record) => record.blockchain.isVerified)
        .length;
    final latestRecord = records.isNotEmpty ? records.first : null;
    final chartValues = records
        .where((record) => record.bpm != null)
        .take(10)
        .toList(growable: false)
        .reversed
        .map((record) => record.bpm!.toDouble())
        .toList(growable: false);

    return <Widget>[
      _AnalyticsCard(
        recordCount: records.length,
        latestBpm: latestRecord?.bpm,
        averageBpm: averageBpm,
        verifiedCount: verifiedCount,
        chartValues: chartValues,
      ),
      const SizedBox(height: AppSpacing.lg),
      AppSectionHeader(
        title: 'Recent records',
        subtitle: records.isEmpty
            ? 'Complete a scan to populate your history.'
            : '${records.length} record(s) shown for the selected time window.',
      ),
      const SizedBox(height: AppSpacing.md),
      if (records.isEmpty)
        AppEmptyState(
          icon: Icons.favorite_outline_rounded,
          title: 'No records in this time range',
          subtitle:
              'Try a wider date range or complete a new finger scan to capture fresh data.',
          action: OutlinedButton(
            onPressed: () => setState(() => _selectedWindowDays = 0),
            child: const Text('Show all records'),
          ),
        )
      else
        ...records.map(
          (record) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: _RecordItem(
              record: record,
              statusTone: _statusTone(record.blockchain.verificationStatus),
              deleting: _deletingRecordIds.contains(record.id),
              onOpen: () => context.push('/records/${record.id}'),
              onDelete: () => _deleteRecord(record),
            ),
          ),
        ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<ScanRecord>>(
      future: _recordsFuture,
      builder: (context, snapshot) {
        return Scaffold(
          backgroundColor: AppColors.softBackground,
          appBar: AppBar(
            automaticallyImplyLeading: false,
            title: const Text('Records'),
          ),
          body: SafeArea(
            child: RefreshIndicator(
              onRefresh: _reload,
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
                    eyebrow: 'MEDICAL HISTORY',
                    title: 'Verified scans and recent health records',
                    subtitle:
                        'Review recent trends, pending sync activity, and detailed record metadata in one place.',
                  ),
                  const SizedBox(height: AppSpacing.lg),
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      ...const <int>[7, 30, 90, 0].map(
                        (days) => ChoiceChip(
                          label: Text(_windowLabel(days)),
                          selected: _selectedWindowDays == days,
                          onSelected: (_) {
                            if (_selectedWindowDays == days) return;
                            setState(() => _selectedWindowDays = days);
                          },
                        ),
                      ),
                      OutlinedButton.icon(
                        onPressed: () => context.push('/reports'),
                        icon: const Icon(Icons.ios_share_outlined),
                        label: const Text('Export'),
                      ),
                    ],
                  ),
                  if (_pendingQueueCount > 0 || _syncingPendingQueue) ...[
                    const SizedBox(height: AppSpacing.md),
                    AppInfoBanner(
                      title: _syncingPendingQueue
                          ? 'Syncing offline records'
                          : 'Offline records ready to sync',
                      message: _syncingPendingQueue
                          ? 'BioTrack is uploading recently captured records now.'
                          : '$_pendingQueueCount pending record(s) are waiting for upload.',
                      tone: AppTone.info,
                      action: TextButton(
                        onPressed: _syncingPendingQueue
                            ? null
                            : () => _syncPendingQueue(),
                        child: Text(
                          _syncingPendingQueue ? 'Syncing...' : 'Sync now',
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: AppSpacing.md),
                  ..._buildAsyncChildren(context, snapshot),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  List<ScanRecord> _filteredRecords(List<ScanRecord> records) {
    if (_selectedWindowDays <= 0) return records;
    final cutoff = DateTime.now().subtract(Duration(days: _selectedWindowDays));
    return records
        .where((record) => record.scannedAt.isAfter(cutoff))
        .toList(growable: false);
  }

  String _windowLabel(int days) {
    if (days <= 0) return 'All records';
    return 'Past $days days';
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
}

class _RecordsLoadingSkeleton extends StatelessWidget {
  const _RecordsLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
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
              Wrap(
                spacing: AppSpacing.md,
                runSpacing: AppSpacing.md,
                children: [
                  AppSkeletonBlock(
                    width: 72,
                    height: 18,
                    radius: AppRadii.pill,
                  ),
                  AppSkeletonBlock(
                    width: 78,
                    height: 18,
                    radius: AppRadii.pill,
                  ),
                  AppSkeletonBlock(
                    width: 74,
                    height: 18,
                    radius: AppRadii.pill,
                  ),
                  AppSkeletonBlock(
                    width: 76,
                    height: 18,
                    radius: AppRadii.pill,
                  ),
                ],
              ),
              SizedBox(height: AppSpacing.lg),
              AppSkeletonBlock(height: 188, radius: AppRadii.lg),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        AppSkeletonCard(
          child: Row(
            children: const [
              AppSkeletonBlock(width: 48, height: 48, radius: AppRadii.lg),
              SizedBox(width: AppSpacing.md),
              Expanded(
                child: AppSkeletonParagraph(
                  lines: 3,
                  lineHeight: 12,
                  lastLineFactor: 0.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        const AppSkeletonParagraph(
          lines: 2,
          lineHeight: 12,
          lastLineFactor: 0.42,
        ),
        const SizedBox(height: AppSpacing.md),
        const _RecordRowSkeleton(),
        const SizedBox(height: AppSpacing.sm),
        const _RecordRowSkeleton(),
        const SizedBox(height: AppSpacing.sm),
        const _RecordRowSkeleton(),
      ],
    );
  }
}

class _RecordRowSkeleton extends StatelessWidget {
  const _RecordRowSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppSkeletonCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSkeletonBlock(width: 44, height: 44, radius: AppRadii.md),
          const SizedBox(width: AppSpacing.md),
          const Expanded(
            child: AppSkeletonParagraph(
              lines: 4,
              lineHeight: 12,
              lastLineFactor: 0.66,
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              AppSkeletonBlock(width: 36, height: 36, radius: AppRadii.md),
              SizedBox(height: AppSpacing.xs),
              AppSkeletonBlock(width: 18, height: 18, radius: AppRadii.pill),
            ],
          ),
        ],
      ),
    );
  }
}

class _AnalyticsCard extends StatelessWidget {
  const _AnalyticsCard({
    required this.recordCount,
    required this.latestBpm,
    required this.averageBpm,
    required this.verifiedCount,
    required this.chartValues,
  });

  final int recordCount;
  final int? latestBpm;
  final int? averageBpm;
  final int verifiedCount;
  final List<double> chartValues;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const AppSectionHeader(
            title: 'Vitals overview',
            subtitle:
                'A cleaner view of recent heart-rate history for the selected record window.',
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _InlineStat(label: 'Records', value: '$recordCount'),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _InlineStat(
                  label: 'Latest BPM',
                  value: latestBpm == null ? '--' : '$latestBpm',
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _InlineStat(
                  label: 'Average BPM',
                  value: averageBpm == null ? '--' : '$averageBpm',
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _InlineStat(label: 'Verified', value: '$verifiedCount'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Container(
            height: 188,
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
            decoration: BoxDecoration(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(AppRadii.lg),
            ),
            child: chartValues.length < 2
                ? Center(
                    child: Text(
                      'More BPM readings are needed before the chart can show a trend.',
                      style: Theme.of(context).textTheme.bodySmall,
                      textAlign: TextAlign.center,
                    ),
                  )
                : AppLineChart(values: chartValues),
          ),
        ],
      ),
    );
  }
}

class _InlineStat extends StatelessWidget {
  const _InlineStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(color: AppColors.darkText),
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}

class _RecordItem extends StatelessWidget {
  const _RecordItem({
    required this.record,
    required this.statusTone,
    required this.deleting,
    required this.onOpen,
    required this.onDelete,
  });

  final ScanRecord record;
  final AppTone statusTone;
  final bool deleting;
  final VoidCallback onOpen;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final detailLabel = record.bpm == null
        ? 'No stable pulse captured'
        : '${record.bpm} bpm | ${record.fallDetected ? 'Fall pattern flagged' : 'No fall detected'}';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: deleting ? null : onOpen,
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
                    Text(
                      HealthFormatters.formatRecordType(record.type),
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: AppSpacing.xxs),
                    Text(
                      detailLabel,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${HealthFormatters.formatRelativeDay(record.scannedAt)} | ${HealthFormatters.formatTime(record.scannedAt)}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ),
                        AppStatusBadge(
                          label: HealthFormatters.statusLabel(
                            record.blockchain.verificationStatus,
                          ),
                          tone: statusTone,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Column(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: AppColors.surfaceMuted,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                    ),
                    child: IconButton(
                      onPressed: deleting ? null : onDelete,
                      tooltip: 'Delete record',
                      icon: deleting
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(
                              Icons.delete_outline_rounded,
                              color: AppColors.danger,
                            ),
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: AppColors.secondaryText,
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
