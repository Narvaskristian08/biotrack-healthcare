import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
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
        _errors = const <String>['Failed to load AI insights. Please try again.'];
      });
    }
  }

  String _formatTime(DateTime value) {
    final hour24 = value.hour;
    final minute = value.minute.toString().padLeft(2, '0');
    final meridiem = hour24 >= 12 ? 'PM' : 'AM';
    final hour12 = hour24 % 12 == 0 ? 12 : hour24 % 12;
    return '$hour12:$minute $meridiem';
  }

  Future<void> _clearMonitoringHistory() async {
    final shouldClear = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          title: const Text('Clear monitoring history?'),
          content: const Text(
            'This removes your synced monitoring samples and generated alerts from the backend.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(true),
              style: TextButton.styleFrom(foregroundColor: AppColors.danger),
              child: const Text('Clear'),
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
            '${result.message} (${result.deletedHealthRecords} samples, ${result.deletedAlerts} alerts)',
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

  Color _severityColor(String severity) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return AppColors.danger;
      case 'MODERATE':
        return const Color(0xFFA86C00);
      default:
        return AppColors.primaryGreenDark;
    }
  }

  Widget _metricCard({
    required IconData icon,
    required String label,
    required String value,
    required String helper,
  }) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.mutedBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 20, color: AppColors.primaryGreenDark),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: AppColors.darkText,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.bodyText,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              helper,
              style: const TextStyle(
                fontSize: 11,
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
    final latestHeartRate = _recentHeartRates.isNotEmpty ? _recentHeartRates.last : null;

    return Scaffold(
      backgroundColor: AppColors.softBackground,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: AppColors.softBackground,
        elevation: 0,
        centerTitle: true,
        title: const Text(
          'AI Insights',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh insights',
            onPressed: _loading ? null : () => _loadInsights(showLoader: false),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => _loadInsights(showLoader: false),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 16),
            children: [
              if (_loading) ...[
                const LinearProgressIndicator(minHeight: 3),
                const SizedBox(height: 12),
              ],
              if (_lastUpdatedAt != null) ...[
                Text(
                  'Updated ${_formatTime(_lastUpdatedAt!)}',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.secondaryText,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              if (_errors.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFF0B7B7)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: _errors
                        .map(
                          (error) => Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Text(
                              error,
                              style: const TextStyle(
                                color: AppColors.danger,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        )
                        .toList(growable: false),
                  ),
                ),
                const SizedBox(height: 10),
              ],
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: Row(
                  children: [
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Monitoring Controls',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: AppColors.darkText,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            'Clear backend-generated monitoring samples and alerts when you need a fresh baseline.',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: AppColors.bodyText,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    OutlinedButton(
                      onPressed: _loading || _clearing ? null : _clearMonitoringHistory,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        side: const BorderSide(color: AppColors.danger),
                      ),
                      child: Text(_clearing ? 'Clearing...' : 'Clear'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  _metricCard(
                    icon: Icons.favorite_outline,
                    label: 'Trend',
                    value: _trendStatus,
                    helper: latestHeartRate != null ? 'Latest: $latestHeartRate bpm' : 'No recent BPM',
                  ),
                  const SizedBox(width: 10),
                  _metricCard(
                    icon: Icons.health_and_safety_outlined,
                    label: 'Risk Level',
                    value: _overallRisk,
                    helper: 'Fall events: $_fallEvents',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Trend Interpretation',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _trendInsight.isNotEmpty
                          ? _trendInsight
                          : 'No trend interpretation available yet.',
                      style: const TextStyle(
                        fontSize: 13.5,
                        color: AppColors.bodyText,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'AI Summary',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _summaryInsight.isNotEmpty
                          ? _summaryInsight
                          : 'No AI advisory summary available yet.',
                      style: const TextStyle(
                        fontSize: 13.5,
                        color: AppColors.bodyText,
                        height: 1.4,
                      ),
                    ),
                    if (_summaryObservations.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      ..._summaryObservations.map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            '- $entry',
                            style: const TextStyle(
                              fontSize: 12.5,
                              color: AppColors.secondaryText,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Alerts',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: AppColors.darkText,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (_alerts.isEmpty)
                      const Text(
                        'No advisory alerts available.',
                        style: TextStyle(
                          fontSize: 13.5,
                          color: AppColors.bodyText,
                        ),
                      )
                    else
                      ..._alerts.map(
                        (alert) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7FAF5),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.mutedBorder),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: _severityColor(alert.severity).withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  alert.severity,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: _severityColor(alert.severity),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      alert.type.replaceAll('_', ' '),
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                        fontSize: 12.5,
                                        color: AppColors.darkText,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      alert.message,
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        color: AppColors.bodyText,
                                        height: 1.35,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primaryGreenLight,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.mutedBorder),
                ),
                child: const Text(
                  'AI insights are advisory only and should not replace professional medical evaluation.',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: AppColors.bodyText,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
