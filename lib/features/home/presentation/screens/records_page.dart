import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/scan_record_store.dart';

class RecordsPage extends StatefulWidget {
  const RecordsPage({super.key});

  @override
  State<RecordsPage> createState() => _RecordsPageState();
}

class _RecordsPageState extends State<RecordsPage> {
  late Future<List<ScanRecord>> _recordsFuture;
  StreamSubscription<GyroscopeEvent>? _gyroscopeSub;
  double _liveGyroMagnitude = 0;
  bool _gyroStreamError = false;
  int _pendingQueueCount = 0;
  bool _syncingPendingQueue = false;
  final Set<String> _deletingRecordIds = <String>{};

  @override
  void initState() {
    super.initState();
    _recordsFuture = ScanRecordStore.list();
    _startGyroscopeTracking();
    _loadPendingQueueStatus();
    _syncPendingQueue(silent: true);
  }

  @override
  void dispose() {
    _gyroscopeSub?.cancel();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() {
      _recordsFuture = ScanRecordStore.list();
    });
    try {
      await _recordsFuture;
      await _loadPendingQueueStatus();
    } catch (_) {
      // Surface errors through FutureBuilder UI.
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
            'Pending sync: ${result.synced} uploaded, ${result.remaining} remaining.',
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
    if (_deletingRecordIds.contains(record.id)) {
      return;
    }

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
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Delete'),
            ),
          ],
        );
      },
    );

    if (shouldDelete != true || !mounted) {
      return;
    }

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

  void _startGyroscopeTracking() {
    _gyroscopeSub?.cancel();
    _gyroscopeSub = gyroscopeEventStream().listen(
      (event) {
        final magnitude = math.sqrt(
          event.x * event.x + event.y * event.y + event.z * event.z,
        );
        if (!mounted) return;
        setState(() {
          _gyroStreamError = false;
          _liveGyroMagnitude = magnitude;
        });
      },
      onError: (_) {
        if (!mounted) return;
        setState(() {
          _gyroStreamError = true;
          _liveGyroMagnitude = 0;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F8EF),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: const Color(0xFFF4F8EF),
        elevation: 0,
        title: const Text(
          'Records',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _reload,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      children: [
                        Text('Monthly', style: TextStyle(fontSize: 13)),
                        SizedBox(width: 4),
                        Icon(Icons.keyboard_arrow_down, size: 18),
                      ],
                    ),
                  ),
                  TextButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.upload, size: 18),
                    label: const Text('EXPORT'),
                    style: TextButton.styleFrom(foregroundColor: Colors.green),
                  ),
                ],
              ),
              if (_pendingQueueCount > 0 || _syncingPendingQueue) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.sync, color: AppColors.primaryGreenDark),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _syncingPendingQueue
                              ? 'Syncing pending offline records...'
                              : 'Offline queue: $_pendingQueueCount pending record(s)',
                          style: const TextStyle(fontSize: 13),
                        ),
                      ),
                      TextButton(
                        onPressed: _syncingPendingQueue ? null : () => _syncPendingQueue(),
                        child: Text(_syncingPendingQueue ? 'Syncing...' : 'Sync now'),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Image.asset(
                  'assets/images/records_chart.png',
                  fit: BoxFit.contain,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.favorite, color: Colors.green, size: 59),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Fall Detection',
                            style: TextStyle(
                              fontSize: 30,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _gyroStreamError
                                ? 'Gyroscope unavailable'
                                : 'Monitoring',
                            style: TextStyle(
                              color: _gyroStreamError
                                  ? Colors.red
                                  : Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _gyroStreamError
                                ? 'Unable to read gyroscope sensor right now.'
                                : 'Gyroscope (real-time): ${_liveGyroMagnitude.toStringAsFixed(2)} rad/s',
                            style: const TextStyle(fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Recent Records',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              FutureBuilder<List<ScanRecord>>(
                future: _recordsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.all(12),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  if (snapshot.hasError) {
                    final errorMessage =
                        snapshot.error is ScanRecordStoreException
                        ? (snapshot.error as ScanRecordStoreException).message
                        : 'Unable to load records right now.';
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            errorMessage,
                            style: const TextStyle(
                              color: AppColors.bodyText,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: _reload,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    );
                  }

                  final records = snapshot.data ?? const <ScanRecord>[];
                  if (records.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'No scan records yet. Complete a finger scan to see results here.',
                        style: TextStyle(
                          color: AppColors.bodyText,
                          fontSize: 13,
                        ),
                      ),
                    );
                  }

                  return Column(
                    children: records
                        .map((record) => _recordItem(record: record))
                        .toList(growable: false),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _recordItem({required ScanRecord record}) {
    final isDeleting = _deletingRecordIds.contains(record.id);

    return InkWell(
      onTap: isDeleting ? null : () => context.push('/records/${record.id}'),
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
                  const Text(
                    'Heart Rate Scan',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _recordSubtitle(record),
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondaryText,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  _formatTime(record.scannedAt),
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.darkText,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatDay(record.scannedAt),
                  style: TextStyle(
                    fontSize: 12,
                    color: record.fallDetected ? Colors.red : Colors.green,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(width: 6),
            IconButton(
              onPressed: isDeleting ? null : () => _deleteRecord(record),
              tooltip: 'Delete record',
              icon: isDeleting
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(
                      Icons.delete_outline,
                      size: 20,
                      color: Colors.red,
                    ),
            ),
          ],
        ),
      ),
    );
  }

  String _recordSubtitle(ScanRecord record) {
    final bpmPart = record.bpm == null
        ? 'No stable pulse'
        : '${record.bpm} bpm captured';
    final fallPart = record.fallDetected ? 'Fall signal detected' : 'Normal';
    return '$bpmPart | $fallPart';
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
}
