'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Download, Heart, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import StatsCard from './stats-card';
import {
  downloadTextFile,
  fetchMyAiInsights,
  fetchMyAlerts,
  fetchMyHealthSummary,
  fetchMyPatientRecords,
  fetchMyTrendInsight,
  type PatientRecord,
} from '@/lib/patient-role';

type DashboardState = {
  loading: boolean;
  refreshing: boolean;
  error: string;
  records: PatientRecord[];
  trend: number[];
  trendLabel: string;
  summaryText: string;
  fallEvents: number;
  alerts: { id: string; severity: string; type: string; message: string; createdAt: string }[];
  lastUpdatedAt: string | null;
};

const DASHBOARD_REFRESH_MS = 15_000;

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const n = Number(trimmed);
    if (Number.isFinite(n)) return n;

    const match = trimmed.match(/-?\d+(\.\d+)?/);
    if (match) {
      const parsed = Number(match[0]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (['true', '1', 'yes', 'y', 'detected', 'positive'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'none', 'negative'].includes(normalized)) return false;
  }
  return null;
}

function toObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function extractHeartRate(record: PatientRecord): number | null {
  const data = toObject(record.data);
  const vitals = toObject(data.vitals);
  const metrics = toObject(data.metrics);

  const candidates = [
    data.heartRate,
    data.bpm,
    data.pulse,
    vitals.heartRate,
    vitals.bpm,
    metrics.heartRate,
    metrics.bpm,
  ];

  for (const candidate of candidates) {
    const parsed = parseNumeric(candidate);
    if (parsed !== null && parsed > 0 && parsed <= 260) {
      return Math.round(parsed);
    }
  }

  return null;
}

function extractActivityLevel(record: PatientRecord): number | null {
  const data = toObject(record.data);
  const activity = toObject(data.activity);

  const direct = parseNumeric(data.activityLevel);
  if (direct !== null) return direct;

  const activityValue = parseNumeric(data.activity ?? activity.level);
  if (activityValue !== null) return activityValue;

  const activityLabel = String(data.activityLevel ?? data.activity ?? activity.level ?? '').trim().toUpperCase();
  if (activityLabel === 'LOW') return 25;
  if (activityLabel === 'MODERATE') return 60;
  if (activityLabel === 'HIGH') return 90;

  const steps = parseNumeric(data.steps ?? activity.steps);
  if (steps !== null) return Math.min(100, Math.round(steps / 120));

  const activeMinutes = parseNumeric(data.activeMinutes ?? activity.activeMinutes);
  if (activeMinutes !== null) return Math.min(100, Math.round(activeMinutes));

  return null;
}

function extractFallDetected(record: PatientRecord): boolean {
  const data = toObject(record.data);
  const fall = toObject(data.fall);
  const candidates = [data.fallDetected, data.fall, data.fallEvent, fall.detected];

  for (const candidate of candidates) {
    if (parseBoolean(candidate) === true) {
      return true;
    }
  }

  return false;
}

function deriveTrendFromRecords(records: PatientRecord[]): number[] {
  return records
    .slice(0, 20)
    .map((record) => extractHeartRate(record))
    .filter((value): value is number => value !== null)
    .reverse();
}

function deriveTrendLabelFromHeartRates(heartRates: number[]): string {
  if (heartRates.length < 3) return 'INSUFFICIENT_DATA';

  const midpoint = Math.max(1, Math.floor(heartRates.length / 2));
  const baseline = heartRates.slice(0, midpoint).reduce((sum, value) => sum + value, 0) / midpoint;
  const recentAvg = heartRates.slice(-3).reduce((sum, value) => sum + value, 0) / 3;

  if (recentAvg > baseline + 10) return 'INCREASING';
  if (recentAvg < baseline - 10) return 'DECREASING';
  return 'STABLE';
}

function formatTrendLabel(label: string): string {
  return label.replaceAll('_', ' ');
}

function formatSyncTimestamp(iso: string | null): string {
  if (!iso) return 'Waiting for live samples';
  const parsed = new Date(iso).getTime();
  if (!Number.isFinite(parsed)) return 'Waiting for live samples';
  return `Live sync: ${new Date(iso).toLocaleTimeString()}`;
}

function countFallEventsFromRecords(records: PatientRecord[], days: number): number {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return records.filter((record) => {
    const createdAt = new Date(record.createdAt).getTime();
    if (!Number.isFinite(createdAt) || createdAt < since) return false;
    return extractFallDetected(record);
  }).length;
}

function countFallAlertsInWindow(
  alerts: { id: string; severity: string; type: string; message: string; createdAt: string }[],
  days: number
): number {
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  return alerts.filter((alert) => {
    if (String(alert.type).toUpperCase() !== 'FALL_DETECTED') return false;
    const createdAt = new Date(alert.createdAt).getTime();
    if (!Number.isFinite(createdAt) || createdAt < since) return false;
    return true;
  }).length;
}

function getEffectiveFallEvents(
  summaryFallEvents: number,
  records: PatientRecord[],
  alerts: { id: string; severity: string; type: string; message: string; createdAt: string }[]
): number {
  return Math.max(summaryFallEvents, countFallEventsFromRecords(records, 7), countFallAlertsInWindow(alerts, 7));
}

function PatientDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`stats-skeleton-${index}`} className="glass glow-green">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-24" />
                </div>
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <Skeleton className="mt-4 h-4 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[280px] w-full rounded-lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-44" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function PatientDashboard() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    refreshing: false,
    error: '',
    records: [],
    trend: [],
    trendLabel: 'INSUFFICIENT_DATA',
    summaryText: '',
    fallEvents: 0,
    alerts: [],
    lastUpdatedAt: null,
  });

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const loadDashboard = async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') {
        setState((prev) => ({ ...prev, refreshing: true }));
      }

      const requestOptions =
        mode === 'refresh'
          ? {
            headers: {
              'x-biotrack-background': '1',
            },
          }
          : {};

      const [recordsRes, trendRes, summaryRes, alertsRes, insightsRes] = await Promise.all([
        fetchMyPatientRecords(requestOptions),
        fetchMyTrendInsight(requestOptions, 'en', false),
        fetchMyHealthSummary(7, requestOptions, 'en', false),
        fetchMyAlerts(20, requestOptions),
        fetchMyAiInsights(1, requestOptions),
      ]);

      if (!active) return;

      setState((prev) => {
        const nextRecords = recordsRes.error ? prev.records : recordsRes.records ?? [];
        const nextAlerts = alertsRes.error
          ? prev.alerts
          : (alertsRes.alerts ?? []).map((alert) => ({
            id: alert._id,
            severity: alert.severity,
            type: alert.type,
            message: alert.message,
            createdAt: alert.createdAt,
          }));

        const trendFromApi = trendRes.error ? prev.trend : trendRes.data?.trendData?.recentHeartRates ?? [];
        const trendFromRecords = deriveTrendFromRecords(nextRecords);
        const nextTrend = trendFromApi.length > 0 ? trendFromApi : trendFromRecords;

        const trendLabelFromApi = trendRes.error ? prev.trendLabel : trendRes.data?.trendData?.trend ?? '';
        const nextTrendLabel = trendLabelFromApi || deriveTrendLabelFromHeartRates(nextTrend);

        const nextSummaryFallEvents = summaryRes.error ? prev.fallEvents : Number(summaryRes.data?.summaryData?.fallEvents ?? 0);

        const errors = [recordsRes.error, trendRes.error, summaryRes.error, alertsRes.error, insightsRes.error].filter(Boolean);
        const hasAnySuccess = [recordsRes.error, trendRes.error, summaryRes.error, alertsRes.error, insightsRes.error].some((error) => !error);

        const latestInsight = insightsRes.error ? null : (insightsRes.insights ?? [])[0] ?? null;

        return {
          loading: false,
          refreshing: false,
          error: errors.length > 0 && !hasAnySuccess ? errors[0] ?? 'Failed to load dashboard data' : '',
          records: nextRecords,
          trend: nextTrend,
          trendLabel: nextTrendLabel,
          summaryText: insightsRes.error ? prev.summaryText : String(latestInsight?.text ?? ''),
          fallEvents: nextSummaryFallEvents,
          alerts: nextAlerts,
          lastUpdatedAt: hasAnySuccess ? new Date().toISOString() : prev.lastUpdatedAt,
        };
      });
    };

    void loadDashboard('initial');
    refreshTimer = setInterval(() => {
      void loadDashboard('refresh');
    }, DASHBOARD_REFRESH_MS);

    return () => {
      active = false;
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  const latestHeartRate = useMemo(() => {
    if (state.trend.length === 0) return null;
    return state.trend[state.trend.length - 1];
  }, [state.trend]);

  const displayedTrendLabel = useMemo(() => formatTrendLabel(state.trendLabel), [state.trendLabel]);
  const syncLabel = useMemo(() => formatSyncTimestamp(state.lastUpdatedAt), [state.lastUpdatedAt]);

  const heartRateChartData = useMemo(
    () =>
      state.trend.map((value, idx) => ({
        sample: `#${idx + 1}`,
        heartRate: value,
      })),
    [state.trend]
  );

  const activityChartData = useMemo(() => {
    const latest = state.records.slice(0, 20).reverse();
    return latest.flatMap((record, idx) => {
      const activity = extractActivityLevel(record);
      if (activity === null) return [];
      return [
        {
          idx: `${idx + 1}`,
          activity,
        },
      ];
    });
  }, [state.records]);

  const verifiedCount = useMemo(() => {
    return state.records.filter((record) => {
      const status = String(record.blockchain?.verificationStatus ?? '').toLowerCase();
      return status === 'anchored' || status === 'verified';
    }).length;
  }, [state.records]);

  const fallEventsLast7Days = useMemo(
    () => getEffectiveFallEvents(state.fallEvents, state.records, state.alerts),
    [state.fallEvents, state.records, state.alerts]
  );

  const downloadSummary = () => {
    const lines = [
      'BioTrack Patient Dashboard Summary',
      `Generated At: ${new Date().toISOString()}`,
      `Heart Rate Trend Label: ${state.trendLabel}`,
      `Latest Heart Rate: ${latestHeartRate ?? 'N/A'}`,
      `Fall Events (7 days): ${fallEventsLast7Days}`,
      `Total Records: ${state.records.length}`,
      `Blockchain Verified Records: ${verifiedCount}`,
      '',
      'AI Summary:',
      state.summaryText || 'No AI summary available.',
    ];
    downloadTextFile(`biotrack-dashboard-summary-${new Date().toISOString().slice(0, 10)}.txt`, lines.join('\n'));
  };

  if (state.loading) {
    return <PatientDashboardSkeleton />;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">My Health Dashboard</h1>
          <p className="text-muted-foreground text-lg mt-1">Personal health monitoring and record access</p>
          <p className="text-xs text-muted-foreground mt-1">
            {syncLabel}
            {state.refreshing ? ' (refreshing...)' : ''}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={downloadSummary}>
          <Download className="h-4 w-4" />
          Download Summary
        </Button>
      </div>

      {state.error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{state.error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Real-Time Heart Rate"
          value={latestHeartRate !== null ? `${latestHeartRate} bpm` : 'N/A'}
          change={latestHeartRate !== null ? displayedTrendLabel : 'Waiting for live samples'}
          icon={<Heart className="h-5 w-5" />}
          trend={state.trendLabel === 'INCREASING' ? 'up' : state.trendLabel === 'DECREASING' ? 'down' : 'stable'}
        />
        <StatsCard
          title="Activity History"
          value={`${activityChartData.length} samples`}
          change={activityChartData.length > 0 ? 'Recent records' : 'No activity metrics yet'}
          icon={<Activity className="h-5 w-5" />}
          trend="stable"
        />
        <StatsCard
          title="Fall Detection Logs"
          value={String(fallEventsLast7Days)}
          change="Last 7 days"
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={fallEventsLast7Days > 0 ? 'up' : 'stable'}
        />
        <StatsCard
          title="Verified Records"
          value={String(verifiedCount)}
          change={`${state.records.length} total records`}
          icon={<ShieldCheck className="h-5 w-5" />}
          trend="stable"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Heart Rate Trend
            </CardTitle>
            <CardDescription>Derived from recent health analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={heartRateChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="sample" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="heartRate" stroke="var(--primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              AI Health Insights
            </CardTitle>
            <CardDescription>Advisory summary and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg border bg-muted/40">
              <p className="text-sm">{state.summaryText || 'No AI advisory summary available yet.'}</p>
            </div>
            {state.alerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="p-3 rounded-lg border">
                <div className="flex items-start gap-2">
                  <Badge variant={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.type.replaceAll('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.message || 'No message provided.'}</p>
                  </div>
                </div>
              </div>
            ))}
            {state.alerts.length === 0 ? <p className="text-xs text-muted-foreground">No recent alerts.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Trend</CardTitle>
          <CardDescription>History derived from your recent records</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={activityChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="idx" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip />
              <Legend />
              <Bar dataKey="activity" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
