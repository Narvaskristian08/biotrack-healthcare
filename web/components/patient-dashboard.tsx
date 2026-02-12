'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Download, Heart, ShieldCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  fetchMyAlerts,
  fetchMyHealthSummary,
  fetchMyPatientRecords,
  fetchMyTrendInsight,
  type PatientRecord,
} from '@/lib/patient-role';

type DashboardState = {
  loading: boolean;
  error: string;
  records: PatientRecord[];
  trend: number[];
  trendLabel: string;
  summaryText: string;
  fallEvents: number;
  alerts: { id: string; severity: string; type: string; message: string; createdAt: string }[];
};

function parseNumeric(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractActivityLevel(record: PatientRecord): number | null {
  const data = record.data ?? {};
  const direct = parseNumeric((data as Record<string, unknown>).activityLevel);
  if (direct !== null) return direct;
  const steps = parseNumeric((data as Record<string, unknown>).steps);
  if (steps !== null) return Math.min(100, Math.round(steps / 120));
  return null;
}

export default function PatientDashboard() {
  const [state, setState] = useState<DashboardState>({
    loading: true,
    error: '',
    records: [],
    trend: [],
    trendLabel: 'INSUFFICIENT_DATA',
    summaryText: '',
    fallEvents: 0,
    alerts: [],
  });

  useEffect(() => {
    let active = true;

    (async () => {
      const [recordsRes, trendRes, summaryRes, alertsRes] = await Promise.all([
        fetchMyPatientRecords(),
        fetchMyTrendInsight(),
        fetchMyHealthSummary(7),
        fetchMyAlerts(20),
      ]);

      if (!active) return;

      const errors = [recordsRes.error, trendRes.error, summaryRes.error, alertsRes.error].filter(Boolean);
      setState({
        loading: false,
        error: errors.length > 0 ? errors[0] ?? 'Failed to load dashboard data' : '',
        records: recordsRes.records ?? [],
        trend: trendRes.data?.trendData?.recentHeartRates ?? [],
        trendLabel: trendRes.data?.trendData?.trend ?? 'INSUFFICIENT_DATA',
        summaryText: summaryRes.data?.insight ?? '',
        fallEvents: Number(summaryRes.data?.summaryData?.fallEvents ?? 0),
        alerts: (alertsRes.alerts ?? []).map((a) => ({
          id: a._id,
          severity: a.severity,
          type: a.type,
          message: a.message,
          createdAt: a.createdAt,
        })),
      });
    })();

    return () => {
      active = false;
    };
  }, []);

  const latestHeartRate = useMemo(() => {
    if (state.trend.length === 0) return null;
    return state.trend[state.trend.length - 1];
  }, [state.trend]);

  const heartRateChartData = useMemo(
    () =>
      state.trend.map((value, idx) => ({
        sample: `#${idx + 1}`,
        heartRate: value,
      })),
    [state.trend]
  );

  const activityChartData = useMemo(() => {
    const latest = state.records.slice(0, 10).reverse();
    return latest.map((record, idx) => ({
      idx: `${idx + 1}`,
      activity: extractActivityLevel(record) ?? 0,
    }));
  }, [state.records]);

  const verifiedCount = useMemo(
    () => state.records.filter((record) => String(record.blockchain?.verificationStatus ?? '').toLowerCase() === 'anchored').length,
    [state.records]
  );

  const downloadSummary = () => {
    const lines = [
      'BioTrack Patient Dashboard Summary',
      `Generated At: ${new Date().toISOString()}`,
      `Heart Rate Trend Label: ${state.trendLabel}`,
      `Latest Heart Rate: ${latestHeartRate ?? 'N/A'}`,
      `Fall Events (7 days): ${state.fallEvents}`,
      `Total Records: ${state.records.length}`,
      `Blockchain Verified Records: ${verifiedCount}`,
      '',
      'AI Summary:',
      state.summaryText || 'No AI summary available.',
    ];
    downloadTextFile(`biotrack-dashboard-summary-${new Date().toISOString().slice(0, 10)}.txt`, lines.join('\n'));
  };

  if (state.loading) {
    return <div className="text-sm text-muted-foreground">Loading patient dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">My Health Dashboard</h1>
          <p className="text-muted-foreground text-lg mt-1">Personal health monitoring and record access</p>
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
          change={state.trendLabel}
          icon={<Heart className="h-5 w-5" />}
          trend={state.trendLabel === 'INCREASING' ? 'up' : state.trendLabel === 'DECREASING' ? 'down' : 'stable'}
        />
        <StatsCard
          title="Activity History"
          value={`${activityChartData.length} samples`}
          change="Recent records"
          icon={<Activity className="h-5 w-5" />}
          trend="stable"
        />
        <StatsCard
          title="Fall Detection Logs"
          value={String(state.fallEvents)}
          change="Last 7 days"
          icon={<AlertTriangle className="h-5 w-5" />}
          trend={state.fallEvents > 0 ? 'up' : 'stable'}
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
