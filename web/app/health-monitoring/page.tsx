'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Heart, Shield, Sparkles, Trash2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import { PatientPageContentSkeleton } from '@/components/patient-page-skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { clearMyMonitoringHistory, fetchMyAlerts, fetchMyHealthSummary, fetchMyTrendInsight } from '@/lib/patient-role';
import { useDashboardRole } from '@/hooks/use-dashboard-role';

const DEFAULT_SUMMARY = {
  period: 'Weekly',
  overallRisk: 'LOW',
  observations: ['No sufficient data available'],
  trend: 'INSUFFICIENT_DATA',
  fallEvents: 0,
};

function formatTrendLabel(value: string) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'INCREASING') return 'Rising';
  if (normalized === 'DECREASING') return 'Lowering';
  if (normalized === 'STABLE') return 'Stable';
  return 'Need more data';
}

function trendBadgeVariant(value: string): 'default' | 'secondary' | 'destructive' {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'INCREASING') return 'destructive';
  if (normalized === 'STABLE' || normalized === 'DECREASING') return 'default';
  return 'secondary';
}

function riskBadgeVariant(value: string): 'default' | 'secondary' | 'destructive' {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'destructive';
  if (normalized === 'MODERATE') return 'secondary';
  return 'default';
}

function describeTrend(value: string, latest: number | null, baseline: number | null) {
  const trend = String(value ?? '').trim().toUpperCase();
  if (trend === 'INCREASING') {
    if (latest !== null && baseline !== null) {
      return `Your recent average heart rate is higher than your earlier baseline (${Math.round(baseline)} bpm).`;
    }
    return 'Your recent heart-rate samples are trending upward.';
  }
  if (trend === 'DECREASING') {
    return 'Your recent heart-rate samples are trending downward.';
  }
  if (trend === 'STABLE') {
    return 'Your heart-rate pattern looks relatively stable in recent samples.';
  }
  return 'At least 3 monitoring samples are needed for a reliable trend.';
}

export default function HealthMonitoringPage() {
  const { isReady, isAuthenticated, role } = useDashboardRole();
  const [heartRates, setHeartRates] = useState<number[]>([]);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [trend, setTrend] = useState('INSUFFICIENT_DATA');
  const [trendInsight, setTrendInsight] = useState('');
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [summaryInsight, setSummaryInsight] = useState('');
  const [alerts, setAlerts] = useState<{ id: string; message: string; severity: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady || !isAuthenticated || role !== 'patient') return;

    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [trendRes, alertsRes, summaryRes] = await Promise.all([
          fetchMyTrendInsight(),
          fetchMyAlerts(10),
          fetchMyHealthSummary(7),
        ]);
        if (!active) return;
        if (trendRes.error) {
          setError(trendRes.error);
        } else {
          setHeartRates(trendRes.data?.trendData?.recentHeartRates ?? []);
          setBaseline(
            typeof trendRes.data?.trendData?.baseline === 'number' ? Number(trendRes.data?.trendData?.baseline) : null
          );
          setTrend(trendRes.data?.trendData?.trend ?? 'INSUFFICIENT_DATA');
          setTrendInsight(String(trendRes.data?.insight ?? '').trim());
        }
        if (alertsRes.error) {
          setError((prev) => prev || alertsRes.error || '');
        } else {
          setAlerts((alertsRes.alerts ?? []).map((a) => ({ id: a._id, message: a.message, severity: a.severity })));
        }
        if (summaryRes.error) {
          setError((prev) => prev || summaryRes.error || '');
        } else {
          setSummary(summaryRes.data?.summaryData ?? DEFAULT_SUMMARY);
          setSummaryInsight(String(summaryRes.data?.insight ?? '').trim());
        }
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load monitoring data.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [isAuthenticated, isReady, role]);

  const chartData = useMemo(
    () => heartRates.map((value, idx) => ({ time: `#${idx + 1}`, heartRate: value })),
    [heartRates]
  );
  const latestHeartRate = heartRates.length > 0 ? heartRates[heartRates.length - 1] : null;
  const trendDescription = describeTrend(trend, latestHeartRate, baseline);

  const handleClearHistory = async () => {
    const hasData = heartRates.length > 0 || alerts.length > 0;
    if (!hasData) {
      setNotice('No monitoring history to clear.');
      return;
    }

    const confirmed = window.confirm(
      'Clear monitoring history? This removes chart samples and alert log for your account. Medical records will not be deleted.'
    );
    if (!confirmed) return;

    setClearing(true);
    setError('');
    setNotice('');
    const result = await clearMyMonitoringHistory();
    setClearing(false);

    if (result.error || !result.data?.success) {
      setError(result.error ?? 'Failed to clear monitoring history');
      return;
    }

    const deletedHealthRecords = Number(result.data?.deleted?.healthRecords ?? 0);
    const deletedAlerts = Number(result.data?.deleted?.alerts ?? 0);

    setHeartRates([]);
    setBaseline(null);
    setTrend('INSUFFICIENT_DATA');
    setTrendInsight('');
    setSummary(DEFAULT_SUMMARY);
    setSummaryInsight('');
    setAlerts([]);
    setNotice(`Monitoring history cleared (${deletedHealthRecords} samples, ${deletedAlerts} alerts).`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PatientPageContentSkeleton stats={3} chartCards={1} listCards={1} listRows={4} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Health Monitoring</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Understand your recent monitoring results, trends, and health warnings in one place.
              </p>
            </div>
            <Button variant="destructive" className="gap-2 sm:w-auto" onClick={handleClearHistory} disabled={clearing}>
              <Trash2 className="h-4 w-4" />
              {clearing ? 'Clearing...' : 'Clear Monitoring History'}
            </Button>
          </div>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 text-sm text-foreground/90 space-y-1">
              <p className="font-medium">What this page shows</p>
              <p>
                Trend chart = your latest monitored samples. Alert log = events that may need attention. This is
                informational support and does not replace professional diagnosis.
              </p>
            </CardContent>
          </Card>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}
        {notice ? (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardContent className="pt-6 text-sm text-emerald-700">{notice}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Latest heart rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{latestHeartRate !== null ? `${latestHeartRate} bpm` : 'N/A'}</p>
              <p className="text-xs text-muted-foreground mt-1">Most recent sample</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{formatTrendLabel(trend)}</p>
                <Badge variant={trendBadgeVariant(trend)}>{trend.replaceAll('_', ' ')}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{trendDescription}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Recent alert events</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Weekly AI Health Interpretation
            </CardTitle>
            <CardDescription>Plain-language interpretation of your recent monitoring data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={riskBadgeVariant(summary.overallRisk)}>Overall Risk: {summary.overallRisk}</Badge>
              <Badge variant="secondary">Falls Detected: {Number(summary.fallEvents ?? 0)}</Badge>
              <Badge variant={trendBadgeVariant(summary.trend)}>Trend: {formatTrendLabel(summary.trend)}</Badge>
            </div>
            <p className="text-sm">{summaryInsight || trendInsight || trendDescription}</p>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              {(summary.observations ?? []).map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your heart-rate trend</CardTitle>
            <CardDescription>Based on latest available monitored samples for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monitoring samples yet. Start new monitoring to generate trend data.</p>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="time" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                    <Legend />
                    <Line type="monotone" dataKey="heartRate" name="Heart rate (bpm)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alert log
            </CardTitle>
            <CardDescription>Detected alert events associated with your records</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <div className="space-y-1">
                    <Badge variant={riskBadgeVariant(alert.severity)}>{alert.severity}</Badge>
                    <p className="text-sm">{alert.message || 'No message'}</p>
                  </div>
                </li>
              ))}
              {alerts.length === 0 ? <li className="text-sm text-muted-foreground">No alerts found.</li> : null}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-base">Safety Reminder</CardTitle>
                <CardDescription className="mt-2">
                  Monitoring insights help you track patterns early, but emergency symptoms should always be handled by
                  immediate medical care.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
