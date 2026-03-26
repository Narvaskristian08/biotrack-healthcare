import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/utils/health_formatters.dart';
import '../../../../core/widgets/app_ui.dart';
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

  Future<void> _copyValue(String value, String label) async {
    final normalized = value.trim();
    if (normalized.isEmpty) return;
    await Clipboard.setData(ClipboardData(text: normalized));
    if (!mounted) return;
    setState(() {
      _notice = '$label copied to clipboard.';
    });
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

  @override
  Widget build(BuildContext context) {
    final record = _record;
    final verification = _verification;
    final status =
        verification?.status ??
        record?.blockchain.verificationStatus ??
        'pending';
    final anchoredAt =
        verification?.verifiedAt ??
        record?.blockchain.lastVerifiedAt ??
        record?.blockchain.anchoredAt;

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(title: const Text('Medical Record')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadRecord,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.lg,
              AppSpacing.sm,
              AppSpacing.lg,
              AppSpacing.xl,
            ),
            children: [
              if (_loading && record == null)
                const _RecordDetailLoadingSkeleton()
              else if (_errorMessage.isNotEmpty)
                AppEmptyState(
                  icon: Icons.error_outline,
                  title: 'Unable to load this record',
                  subtitle: _errorMessage,
                  action: ElevatedButton(
                    onPressed: _loadRecord,
                    child: const Text('Retry'),
                  ),
                )
              else if (record == null)
                const AppEmptyState(
                  icon: Icons.folder_open_outlined,
                  title: 'Record not found',
                  subtitle: 'This medical record is no longer available.',
                )
              else ...[
                if (_notice.isNotEmpty) ...[
                  AppInfoBanner(message: _notice, tone: AppTone.success),
                  const SizedBox(height: AppSpacing.md),
                ],
                AppCard(
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
                                  HealthFormatters.formatRecordType(
                                    record.type,
                                  ),
                                  style: Theme.of(
                                    context,
                                  ).textTheme.headlineMedium,
                                ),
                                const SizedBox(height: AppSpacing.xs),
                                Text(
                                  'Captured ${HealthFormatters.formatDate(record.scannedAt)} at ${HealthFormatters.formatTime(record.scannedAt)}',
                                  style: Theme.of(context).textTheme.bodyMedium,
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: AppSpacing.sm),
                          AppStatusBadge(
                            label: HealthFormatters.statusLabel(status),
                            tone: _statusTone(status),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      Text(
                        record.bpm == null
                            ? 'No stable heart-rate estimate was captured for this scan.'
                            : 'Recorded heart rate: ${record.bpm} bpm',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final tileWidth =
                        (constraints.maxWidth - AppSpacing.sm) / 2;
                    return Wrap(
                      spacing: AppSpacing.sm,
                      runSpacing: AppSpacing.sm,
                      children: [
                        SizedBox(
                          width: tileWidth,
                          child: AppMetricCard(
                            icon: Icons.favorite_outline_rounded,
                            label: 'Heart rate',
                            value: record.bpm == null
                                ? '-- bpm'
                                : '${record.bpm} bpm',
                            helper:
                                'Signal quality ${record.signalQuality.toStringAsFixed(2)}',
                            tone: AppTone.accent,
                          ),
                        ),
                        SizedBox(
                          width: tileWidth,
                          child: AppMetricCard(
                            icon: Icons.directions_walk_outlined,
                            label: 'Activity',
                            value: record.activityLabel,
                            helper:
                                'Movement ${record.movementIntensity.toStringAsFixed(2)}',
                            tone: AppTone.info,
                          ),
                        ),
                        SizedBox(
                          width: tileWidth,
                          child: AppMetricCard(
                            icon: Icons.health_and_safety_outlined,
                            label: 'Fall status',
                            value: record.fallDetected ? 'Detected' : 'No fall',
                            helper:
                                'Gyro ${record.gyroMagnitude.toStringAsFixed(2)}',
                            tone: record.fallDetected
                                ? AppTone.danger
                                : AppTone.success,
                          ),
                        ),
                        SizedBox(
                          width: tileWidth,
                          child: AppMetricCard(
                            icon: Icons.fingerprint_rounded,
                            label: 'Finger confidence',
                            value:
                                '${(record.fingerConfidence * 100).toStringAsFixed(0)}%',
                            helper: record.fingerDetected
                                ? 'Finger detected during capture'
                                : 'Finger detection was unstable',
                            tone: record.fingerDetected
                                ? AppTone.success
                                : AppTone.warning,
                          ),
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: AppSpacing.md),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              'Authenticity and blockchain',
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          AppStatusBadge(
                            label: HealthFormatters.statusLabel(status),
                            tone: _statusTone(status),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.md),
                      _DetailRow(
                        label: 'Verification time',
                        value: anchoredAt == null
                            ? 'Not yet verified'
                            : HealthFormatters.formatDateTime(anchoredAt),
                      ),
                      _DetailRow(
                        label: 'Integrity match',
                        value: verification == null
                            ? 'Not checked in this session'
                            : verification.integrityMatch
                            ? 'Confirmed'
                            : 'Mismatch detected',
                      ),
                      if (verification?.blockNumber != null)
                        _DetailRow(
                          label: 'Block number',
                          value: '${verification!.blockNumber}',
                        ),
                      if (verification?.reason.trim().isNotEmpty == true)
                        _DetailRow(
                          label: 'Verification note',
                          value: verification!.reason,
                        ),
                      const SizedBox(height: AppSpacing.sm),
                      _HashField(
                        label: 'Record hash',
                        value: record.recordHash.isNotEmpty
                            ? record.recordHash
                            : 'N/A',
                        onCopy: record.recordHash.trim().isEmpty
                            ? null
                            : () =>
                                  _copyValue(record.recordHash, 'Record hash'),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      _HashField(
                        label: 'Transaction ID',
                        value: verification?.txId.isNotEmpty == true
                            ? verification!.txId
                            : record.blockchain.txId.isNotEmpty
                            ? record.blockchain.txId
                            : 'N/A',
                        onCopy:
                            (verification?.txId.isNotEmpty == true ||
                                record.blockchain.txId.isNotEmpty)
                            ? () => _copyValue(
                                verification?.txId.isNotEmpty == true
                                    ? verification!.txId
                                    : record.blockchain.txId,
                                'Transaction ID',
                              )
                            : null,
                      ),
                      if (record.blockchain.contractAddress
                          .trim()
                          .isNotEmpty) ...[
                        const SizedBox(height: AppSpacing.sm),
                        _HashField(
                          label: 'Contract address',
                          value: record.blockchain.contractAddress,
                          onCopy: () => _copyValue(
                            record.blockchain.contractAddress,
                            'Contract address',
                          ),
                        ),
                      ],
                      const SizedBox(height: AppSpacing.md),
                      Wrap(
                        spacing: AppSpacing.sm,
                        runSpacing: AppSpacing.sm,
                        children: [
                          SizedBox(
                            width: 220,
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
                                    : 'Verify authenticity',
                              ),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: AppColors.primaryGreenDark,
                              ),
                            ),
                          ),
                          SizedBox(
                            width: 180,
                            child: ElevatedButton.icon(
                              onPressed: record.recordHash.trim().isEmpty
                                  ? null
                                  : () => _copyValue(
                                      record.recordHash,
                                      'Record hash',
                                    ),
                              icon: const Icon(Icons.copy_outlined),
                              label: const Text('Copy hash'),
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

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: AppSpacing.xxs),
          Text(value, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _HashField extends StatelessWidget {
  const _HashField({required this.label, required this.value, this.onCopy});

  final String label;
  final String value;
  final VoidCallback? onCopy;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: AppSpacing.xs),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(
            color: AppColors.surfaceMuted,
            borderRadius: BorderRadius.circular(AppRadii.lg),
            border: Border.all(color: AppColors.mutedBorder),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: SelectableText(
                  value,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppColors.darkText,
                    fontFamily: 'Roboto',
                  ),
                ),
              ),
              if (onCopy != null) ...[
                const SizedBox(width: AppSpacing.sm),
                IconButton(
                  onPressed: onCopy,
                  tooltip: 'Copy',
                  icon: const Icon(Icons.copy_outlined),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

class _RecordDetailLoadingSkeleton extends StatelessWidget {
  const _RecordDetailLoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        AppSkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              AppSkeletonParagraph(
                lines: 2,
                lineHeight: 14,
                lastLineFactor: 0.44,
              ),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(width: 140, height: 12, radius: AppRadii.pill),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: List.generate(
            4,
            (index) => SizedBox(
              width: (MediaQuery.sizeOf(context).width - 52) / 2,
              child: const AppSkeletonCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppSkeletonBlock(
                      width: 36,
                      height: 36,
                      radius: AppRadii.md,
                    ),
                    SizedBox(height: AppSpacing.sm),
                    AppSkeletonBlock(
                      width: 86,
                      height: 18,
                      radius: AppRadii.pill,
                    ),
                    SizedBox(height: AppSpacing.xs),
                    AppSkeletonBlock(
                      width: 94,
                      height: 12,
                      radius: AppRadii.pill,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        const AppSkeletonCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppSkeletonParagraph(
                lines: 2,
                lineHeight: 12,
                lastLineFactor: 0.52,
              ),
              SizedBox(height: AppSpacing.md),
              AppSkeletonParagraph(
                lines: 5,
                lineHeight: 12,
                lastLineFactor: 0.66,
              ),
              SizedBox(height: AppSpacing.md),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.sm),
              AppSkeletonBlock(height: 54, radius: AppRadii.lg),
              SizedBox(height: AppSpacing.md),
              Row(
                children: [
                  Expanded(
                    child: AppSkeletonBlock(height: 48, radius: AppRadii.lg),
                  ),
                  SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: AppSkeletonBlock(height: 48, radius: AppRadii.lg),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
