'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Heart, Sparkles, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/dashboard-layout';
import { PatientPageContentSkeleton } from '@/components/patient-page-skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchMyAiInsights, fetchMyAlerts, fetchMyHealthSummary, fetchMyTrendCompare, fetchMyTrendInsight } from '@/lib/patient-role';

type Range = 'daily' | 'weekly' | 'monthly';

const DEFAULT_SUMMARY = {
  period: 'Weekly',
  overallRisk: 'LOW',
  observations: [] as string[],
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
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'INCREASING') {
    if (latest !== null && baseline !== null) {
      return `Your latest value is above your baseline of ${Math.round(baseline)} bpm.`;
    }
    return 'Your recent heart-rate readings are trending upward.';
  }
  if (normalized === 'DECREASING') {
    return 'Your recent heart-rate readings are trending downward.';
  }
  if (normalized === 'STABLE') {
    return 'Your heart-rate pattern has been relatively steady.';
  }
  return 'There are not enough readings yet to determine a clear trend.';
}

function describeRisk(overallRisk: string, fallEvents: number, alerts: number) {
  const risk = String(overallRisk ?? '').trim().toUpperCase();
  if (risk === 'CRITICAL') {
    return `Critical risk was detected. ${fallEvents} fall event(s) and ${alerts} alert(s) should be reviewed immediately.`;
  }
  if (risk === 'HIGH') {
    return `High risk was detected. ${fallEvents} fall event(s) and ${alerts} alert(s) need prompt attention.`;
  }
  if (risk === 'MODERATE') {
    return `Moderate risk was detected with ${alerts} recent alert(s). Continue close monitoring.`;
  }
  return 'Current risk appears low based on the available monitoring data.';
}

function classifyHeartRate(value: number): { label: string; badge: 'default' | 'secondary' | 'destructive'; hint: string } {
  if (value >= 120) {
    return {
      label: 'High',
      badge: 'destructive',
      hint: 'This is high for resting heart rate. Rest and seek medical advice if symptoms are present.',
    };
  }
  if (value >= 100) {
    return {
      label: 'Elevated',
      badge: 'secondary',
      hint: 'Slightly elevated reading. Compare against your usual pattern.',
    };
  }
  if (value < 60) {
    return {
      label: 'Low',
      badge: 'secondary',
      hint: 'Lower than common resting range. Watch symptoms and consult a provider if needed.',
    };
  }
  return {
    label: 'Normal',
    badge: 'default',
    hint: 'Within common resting range for many adults.',
  };
}

function uniqueLines(lines: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  lines.forEach((line) => {
    const normalized = String(line ?? '').trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });
  return result;
}

export default function VitalsHistoryPage() {
  const [timeRange, setTimeRange] = useState<Range>('weekly');
  const [loading, setLoading] = useState(true);
  const [heartRates, setHeartRates] = useState<number[]>([]);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [trend, setTrend] = useState('INSUFFICIENT_DATA');
  const [trendInsight, setTrendInsight] = useState('');
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [summaryInsight, setSummaryInsight] = useState('');
  const [alerts, setAlerts] = useState<{ id: string; message: string; severity: string }[]>([]);
  const [comparison, setComparison] = useState<{
    currentWindow: { averageHeartRate: number | null; sampleCount: number; trend: string; days: number };
    previousWindow: { averageHeartRate: number | null; sampleCount: number; trend: string; days: number };
    deltaBpm: number | null;
    deltaPercent: number | null;
    direction: string;
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [insightsRes, trendRes, summaryRes, alertsRes] = await Promise.all([
          fetchMyAiInsights(1),
          fetchMyTrendInsight({}, 'en', false),
          fetchMyHealthSummary(7, {}, 'en', false),
          fetchMyAlerts(10),
        ]);
        if (!active) return;

        let nextError = '';
        if (insightsRes.error) {
          nextError = insightsRes.error;
        } else {
          const latestInsight = (insightsRes.insights ?? [])[0] ?? null;
          setSummaryInsight(String(latestInsight?.text ?? '').trim());
        }
        if (trendRes.error) {
          if (!nextError) nextError = trendRes.error;
        } else {
          setHeartRates(trendRes.data?.trendData?.recentHeartRates ?? []);
          setBaseline(
            typeof trendRes.data?.trendData?.baseline === 'number' ? Number(trendRes.data?.trendData?.baseline) : null
          );
          setTrend(trendRes.data?.trendData?.trend ?? 'INSUFFICIENT_DATA');
          setTrendInsight('');
        }

        if (summaryRes.error) {
          if (!nextError) nextError = summaryRes.error;
        } else {
          setSummary(summaryRes.data?.summaryData ?? DEFAULT_SUMMARY);
        }

        if (alertsRes.error) {
          if (!nextError) nextError = alertsRes.error;
        } else {
          setAlerts((alertsRes.alerts ?? []).map((entry) => ({ id: entry._id, message: entry.message, severity: entry.severity })));
        }

        setError(nextError);
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load vitals data.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const selectedDays = timeRange === 'daily' ? 1 : timeRange === 'weekly' ? 7 : 30;

    (async () => {
      const result = await fetchMyTrendCompare(selectedDays, selectedDays);
      if (!active) return;
      if (result.error) {
        setError((prev) => prev || result.error || '');
        return;
      }
      setComparison(result.data?.comparison ?? null);
    })();

    return () => {
      active = false;
    };
  }, [timeRange]);

  const rangeSampleCount = timeRange === 'daily' ? 8 : timeRange === 'weekly' ? 20 : 40;
  const filteredHeartRates = useMemo(() => heartRates.slice(-rangeSampleCount), [heartRates, rangeSampleCount]);
  const chartData = useMemo(() => {
    const startSample = Math.max(0, heartRates.length - filteredHeartRates.length);
    return filteredHeartRates.map((value, idx) => ({
      sample: `#${startSample + idx + 1}`,
      heartRate: value,
    }));
  }, [filteredHeartRates, heartRates.length]);

  const current = filteredHeartRates.length > 0 ? filteredHeartRates[filteredHeartRates.length - 1] : null;
  const average =
    filteredHeartRates.length > 0
      ? filteredHeartRates.reduce((accumulator, value) => accumulator + value, 0) / filteredHeartRates.length
      : null;
  const min = filteredHeartRates.length > 0 ? Math.min(...filteredHeartRates) : null;
  const max = filteredHeartRates.length > 0 ? Math.max(...filteredHeartRates) : null;
  const baselineDelta = baseline !== null && current !== null ? current - baseline : null;

  const trendDescription = describeTrend(trend, current, baseline);
  const riskDescription = describeRisk(summary.overallRisk, Number(summary.fallEvents ?? 0), alerts.length);
  const latestClass = current !== null ? classifyHeartRate(current) : null;

  const insightLines = useMemo(() => {
    return uniqueLines([
      trendDescription,
      riskDescription,
      summaryInsight,
      trendInsight,
      ...(summary.observations ?? []),
    ]).slice(0, 6);
  }, [riskDescription, summary.observations, summaryInsight, trendDescription, trendInsight]);

  const recentReadings = useMemo(() => {
    const startSample = Math.max(0, heartRates.length - filteredHeartRates.length);
    return filteredHeartRates
      .map((value, idx) => {
        const status = classifyHeartRate(value);
        return {
          sample: `#${startSample + idx + 1}`,
          value,
          status,
        };
      })
      .reverse();
  }, [filteredHeartRates, heartRates.length]);

  if (loading) {
    return (
      <DashboardLayout>
        <PatientPageContentSkeleton stats={4} controls={3} chartCards={1} listCards={2} listRows={5} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vitals History</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Review your heart-rate history with clear trend explanations and easy-to-read summaries.
            </p>
          </div>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 text-sm text-foreground/90">
              This page shows your latest readings, chart trend, and risk context from recent AI analysis. It supports
              monitoring and does not replace professional diagnosis.
            </CardContent>
          </Card>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant={timeRange === 'daily' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('daily')}>
            Daily
          </Button>
          <Button variant={timeRange === 'weekly' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('weekly')}>
            Weekly
          </Button>
          <Button variant={timeRange === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('monthly')}>
            Monthly
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Latest Heart Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{current !== null ? `${current} bpm` : 'N/A'}</p>
              {latestClass ? (
                <div className="mt-2 space-y-1">
                  <Badge variant={latestClass.badge}>{latestClass.label}</Badge>
                  <p className="text-xs text-muted-foreground">{latestClass.hint}</p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">No readings in this range yet.</p>
              )}
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
                Baseline Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {baselineDelta === null ? 'N/A' : `${baselineDelta >= 0 ? '+' : ''}${baselineDelta.toFixed(1)} bpm`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Baseline: {baseline !== null ? `${Math.round(baseline)} bpm` : 'Not available'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risk & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{summary.overallRisk}</p>
                <Badge variant={riskBadgeVariant(summary.overallRisk)}>{summary.overallRisk}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {alerts.length} active alert(s), {Number(summary.fallEvents ?? 0)} fall event(s)
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Period-over-Period Comparison</CardTitle>
            <CardDescription>
              Current {timeRange} window versus previous {timeRange} window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!comparison ? (
              <p className="text-sm text-muted-foreground">Comparison data is not available yet.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  Current avg: {comparison.currentWindow.averageHeartRate ?? 'N/A'} bpm ({comparison.currentWindow.sampleCount} sample(s))
                </p>
                <p>
                  Previous avg: {comparison.previousWindow.averageHeartRate ?? 'N/A'} bpm ({comparison.previousWindow.sampleCount} sample(s))
                </p>
                <p>
                  Delta: {comparison.deltaBpm === null ? 'N/A' : `${comparison.deltaBpm >= 0 ? '+' : ''}${comparison.deltaBpm} bpm`} |{' '}
                  {comparison.deltaPercent === null ? 'N/A' : `${comparison.deltaPercent >= 0 ? '+' : ''}${comparison.deltaPercent}%`}
                </p>
                <Badge variant={comparison.direction === 'higher' ? 'destructive' : comparison.direction === 'lower' ? 'default' : 'secondary'}>
                  {comparison.direction.replace('_', ' ')}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Heart-Rate Trend Chart</CardTitle>
            <CardDescription>
              Displaying the latest {filteredHeartRates.length} reading(s) for the selected range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No heart-rate history yet. Start monitoring to build your trend chart.
              </p>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="sample" className="text-xs" />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What This Means
              </CardTitle>
              <CardDescription>Patient-friendly interpretation of your recent vitals history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-border bg-muted/40 p-2">
                  <p className="text-xs text-muted-foreground">Average</p>
                  <p className="font-semibold">{average !== null ? `${average.toFixed(1)} bpm` : 'N/A'}</p>
                </div>
                <div className="rounded-md border border-border bg-muted/40 p-2">
                  <p className="text-xs text-muted-foreground">Range</p>
                  <p className="font-semibold">
                    {min !== null && max !== null ? `${min} - ${max} bpm` : 'N/A'}
                  </p>
                </div>
              </div>
              {insightLines.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {insightLines.map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No interpretation is available yet.</p>
              )}
              <p className="text-xs text-muted-foreground">{riskDescription}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Readings</CardTitle>
              <CardDescription>Latest heart-rate entries in this selected range.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentReadings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No readings to display yet.</p>
              ) : (
                recentReadings.map((row) => (
                  <div key={`${row.sample}-${row.value}`} className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">
                        Sample {row.sample}: {row.value} bpm
                      </p>
                      <Badge variant={row.status.badge}>{row.status.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{row.status.hint}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
