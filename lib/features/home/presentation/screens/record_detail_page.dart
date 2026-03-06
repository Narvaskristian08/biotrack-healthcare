import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../../data/models/scan_record.dart';
import '../../data/services/scan_record_store.dart';

class RecordDetailPage extends StatefulWidget {
  const RecordDetailPage({super.key, required this.recordId});

  final String recordId;

  @override
  State<RecordDetailPage> createState() => _RecordDetailPageState();
}

class _RecordDetailPageState extends State<RecordDetailPage> {
  ScanRecord? _record;
  ScanRecordVerificationResult? _verification;
  bool _loading = true;
  bool _verifying = false;
  String _errorMessage = '';
  String _notice = '';

  @override
  void initState() {
    super.initState();
    _loadRecord();
  }

  Future<void> _loadRecord() async {
    setState(() {
      _loading = true;
      _errorMessage = '';
      _notice = '';
    });

    try {
      final record = await ScanRecordStore.getById(widget.recordId);
      if (!mounted) return;
      setState(() {
        _record = record;
      });
    } on ScanRecordStoreException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Unable to load this record right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  Future<void> _verifyRecord() async {
    final record = _record;
    if (record == null || _verifying) return;

    setState(() {
      _verifying = true;
      _errorMessage = '';
      _notice = '';
    });

    try {
      final verification = await ScanRecordStore.verifyById(record.id);
      final refreshedRecord = await ScanRecordStore.getById(record.id);
      if (!mounted) return;
      setState(() {
        _verification = verification;
        _record = refreshedRecord ?? record;
        _notice = verification.isVerified
            ? 'Record authenticity verified successfully.'
            : 'Verification completed. Review the blockchain status below.';
      });
    } on ScanRecordStoreException catch (error) {
      if (!mounted) return;
      setState(() {
        _errorMessage = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _errorMessage = 'Unable to verify this record right now.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _verifying = false;
        });
      }
    }
  }

  Future<void> _copyHash(String value) async {
    final normalized = value.trim();
    if (normalized.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: normalized));
    if (!mounted) return;
    setState(() {
      _notice = 'Record hash copied to clipboard.';
    });
  }

  String _formatTime(DateTime dateTime) {
    final hour24 = dateTime.hour;
    final minute = dateTime.minute.toString().padLeft(2, '0');
    final meridiem = hour24 >= 12 ? 'PM' : 'AM';
    final hour12 = hour24 % 12 == 0 ? 12 : hour24 % 12;
    return '$hour12:$minute $meridiem';
  }

  String _formatDate(DateTime? dateTime) {
    if (dateTime == null) return 'N/A';
    return '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')}';
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

  Color _statusColor(String status) {
    final normalized = status.trim().toLowerCase();
    if (normalized == 'anchored' || normalized == 'verified') {
      return AppColors.primaryGreenDark;
    }
    if (normalized == 'local_hash_only') {
      return const Color(0xFFA86C00);
    }
    if (normalized == 'tampered' || normalized == 'anchor_mismatch') {
      return AppColors.danger;
    }
    return AppColors.bodyText;
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
        border: Border.all(color: AppColors.mutedBorder),
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

  @override
  Widget build(BuildContext context) {
    final record = _record;
    final verification = _verification;
    final status =
        verification?.status ?? record?.blockchain.verificationStatus ?? 'pending';
    final anchoredAt = verification?.verifiedAt ??
        record?.blockchain.lastVerifiedAt ??
        record?.blockchain.anchoredAt;

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        backgroundColor: AppColors.softBackground,
        elevation: 0,
        title: const Text(
          'Medical Record',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadRecord,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            children: [
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 32),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_errorMessage.isNotEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      _errorMessage,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.bodyText,
                      ),
                    ),
                  ),
                )
              else if (record == null)
                const Center(
                  child: Text(
                    'Record not found.',
                    style: TextStyle(fontSize: 14, color: AppColors.bodyText),
                  ),
                )
              else ...[
                if (_notice.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF8EA),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _notice,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.primaryGreenDark,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.mutedBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        record.type.trim().isEmpty ? 'Vitals' : record.type,
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Captured on ${_formatDate(record.scannedAt)} | ${_formatTime(record.scannedAt)}',
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
                        value:
                            record.bpm == null ? '-- bpm' : '${record.bpm} bpm',
                        valueColor: AppColors.primaryGreenDark,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _metricCard(
                        title: 'Activity',
                        value:
                            '${record.activityLabel} (${record.movementIntensity.toStringAsFixed(2)})',
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
                        valueColor:
                            record.fallDetected ? Colors.red : Colors.green,
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
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _metricCard(
                        title: 'Finger Confidence',
                        value:
                            '${(record.fingerConfidence * 100).toStringAsFixed(0)}%',
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _metricCard(
                        title: 'Gyro',
                        value: record.gyroMagnitude.toStringAsFixed(2),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.mutedBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Authenticity & Blockchain',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: _statusColor(status).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _statusLabel(status),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: _statusColor(status),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      _DetailLine(
                        label: 'Record Hash',
                        value:
                            record.recordHash.isNotEmpty ? record.recordHash : 'N/A',
                      ),
                      _DetailLine(
                        label: 'Transaction ID',
                        value: verification?.txId.isNotEmpty == true
                            ? verification!.txId
                            : record.blockchain.txId.isNotEmpty
                                ? record.blockchain.txId
                                : 'N/A',
                      ),
                      _DetailLine(
                        label: 'Verified / Anchored At',
                        value: anchoredAt == null
                            ? 'Not yet verified'
                            : '${_formatDate(anchoredAt)} ${_formatTime(anchoredAt)}',
                      ),
                      if (verification != null) ...[
                        _DetailLine(
                          label: 'Integrity Match',
                          value: verification.integrityMatch ? 'Yes' : 'No',
                        ),
                        if (verification.reason.trim().isNotEmpty)
                          _DetailLine(
                            label: 'Verification Note',
                            value: verification.reason,
                          ),
                      ],
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _verifying ? null : _verifyRecord,
                              icon: _verifying
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.verified_outlined),
                              label: Text(
                                _verifying
                                    ? 'Verifying...'
                                    : 'Verify Authenticity',
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primaryGreenDark,
                                side: const BorderSide(
                                  color: AppColors.primaryGreenDark,
                                ),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: record.recordHash.trim().isEmpty
                                  ? null
                                  : () => _copyHash(record.recordHash),
                              icon: const Icon(Icons.copy_outlined),
                              label: const Text('Copy Hash'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.darkText,
                                side: const BorderSide(
                                  color: AppColors.mutedBorder,
                                ),
                                padding:
                                    const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14),
                                ),
                              ),
                            ),
                          ),
                        ],
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

class _DetailLine extends StatelessWidget {
  const _DetailLine({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.secondaryText,
            ),
          ),
          const SizedBox(height: 2),
          SelectableText(
            value,
            style: const TextStyle(
              fontSize: 13,
              color: AppColors.darkText,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
