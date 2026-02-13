import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/scan_record_store.dart';

class RecordDetailPage extends StatefulWidget {
  const RecordDetailPage({
    super.key,
    required this.recordId,
  });

  final String recordId;

  @override
  State<RecordDetailPage> createState() => _RecordDetailPageState();
}

class _RecordDetailPageState extends State<RecordDetailPage> {
  late Future<ScanRecord?> _recordFuture;

  @override
  void initState() {
    super.initState();
    _recordFuture = _loadRecord();
  }

  Future<ScanRecord?> _loadRecord() async {
    final records = await ScanRecordStore.list();
    for (final record in records) {
      if (record.id == widget.recordId) {
        return record;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F8EF),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF4F8EF),
        elevation: 0,
        title: const Text(
          'Heart Rate Scan',
          style: TextStyle(
            color: Colors.black,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      body: SafeArea(
        child: FutureBuilder<ScanRecord?>(
          future: _recordFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }

            final record = snapshot.data;
            if (record == null) {
              return const Center(
                child: Text(
                  'Record not found.',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.bodyText,
                  ),
                ),
              );
            }

            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Scan Details',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Captured on ${_formatDate(record.scannedAt)} • ${_formatTime(record.scannedAt)}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.bodyText,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    Expanded(
                      child: _metricCard(
                        title: 'Heart Rate',
                        value: record.bpm == null ? '-- bpm' : '${record.bpm} bpm',
                        valueColor: AppColors.primaryGreenDark,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _metricCard(
                        title: 'Activity',
                        value: '${record.activityLabel} (${record.movementIntensity.toStringAsFixed(2)})',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _metricCard(
                        title: 'Fall Status',
                        value: record.fallDetected ? 'Detected' : 'No fall',
                        valueColor: record.fallDetected ? Colors.red : Colors.green,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _metricCard(
                        title: 'Finger Confidence',
                        value: '${(record.fingerConfidence * 100).toStringAsFixed(0)}%',
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _metricCard(
                        title: 'Gyro',
                        value: record.gyroMagnitude.toStringAsFixed(2),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _metricCard(
                        title: 'Signal Quality',
                        value: record.signalQuality.toStringAsFixed(2),
                      ),
                    ),
                  ],
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _metricCard({
    required String title,
    required String value,
    Color? valueColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.secondaryText,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: valueColor ?? AppColors.darkText,
            ),
          ),
        ],
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

  String _formatDate(DateTime dateTime) {
    return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')}';
  }
}
