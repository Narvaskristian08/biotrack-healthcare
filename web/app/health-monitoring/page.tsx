'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, FilePlus2, Heart, RefreshCw, Shield, Sparkles, Trash2, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import {
  analyzeMyVitals,
  clearMyMonitoringHistory,
  createMyPatientRecord,
  fetchMyAiInsights,
  fetchMyAlerts,
  fetchMyHealthSummary,
  fetchMyTrendInsight,
  type PatientRecordCreateInput,
  type PatientVitalsAnalysisInput,
} from '@/lib/patient-role';
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

type SelfMonitoringFormState = {
  capturedAt: string;
  heartRate: string;
  activityLevel: string;
  fallDetected: '' | 'yes' | 'no';
  note: string;
};

type MonitoringSnapshot = {
  heartRates: number[];
  baseline: number | null;
  trend: string;
  trendInsight: string;
  summary: typeof DEFAULT_SUMMARY;
  summaryInsight: string;
  alerts: { id: string; message: string; severity: string }[];
  error: string;
};

const selfMonitoringTextareaClassName =
  'min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';

function toDateTimeLocalValue(date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromLocalInput(value: string): string | undefined {
  const normalized = String(value ?? '').trim();
  if (!normalized) return undefined;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function createEmptySelfMonitoringForm(): SelfMonitoringFormState {
  return {
    capturedAt: toDateTimeLocalValue(),
    heartRate: '',
    activityLevel: '',
    fallDetected: '',
    note: '',
  };
}

function buildSelfMonitoringSubmission(
  form: SelfMonitoringFormState
): { recordPayload?: PatientRecordCreateInput; analysisPayload?: PatientVitalsAnalysisInput; error?: string } {
  const heartRate = Number(form.heartRate);
  if (!Number.isFinite(heartRate) || heartRate <= 0) {
    return { error: 'Enter a valid heart-rate reading before saving.' };
  }
  if (heartRate < 25 || heartRate > 250) {
    return { error: 'Heart rate should be between 25 and 250 bpm.' };
  }

  const capturedAt = toIsoFromLocalInput(form.capturedAt);
  const activityLevel = String(form.activityLevel ?? '').trim().toUpperCase();
  const note = String(form.note ?? '').trim();
  const fallDetected =
    form.fallDetected === 'yes' ? true : form.fallDetected === 'no' ? false : undefined;

  const metrics: Record<string, unknown> = {
    heartRate,
    bpm: heartRate,
  };
  if (fallDetected !== undefined) metrics.fallDetected = fallDetected;

  const data: Record<string, unknown> = {
    source: 'patient_web_manual',
    entryMode: 'self_monitoring',
    manuallyEntered: true,
    heartRate,
    bpm: heartRate,
    metrics,
  };

  if (activityLevel) {
    data.activityLevel = activityLevel;
  }
  if (fallDetected !== undefined) {
    data.fallDetected = fallDetected;
  }
  if (note) {
    data.note = note;
    data.assessment = note;
  }

  return {
    recordPayload: {
      type: 'vitals',
      data,
      ...(capturedAt ? { capturedAt } : {}),
    },
    analysisPayload: {
      heartRate,
      ...(activityLevel ? { activity: activityLevel } : {}),
      ...(fallDetected !== undefined ? { fallDetected } : {}),
      language: 'en',
    },
  };
}

async function loadMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  try {
    const [insightsRes, trendRes, alertsRes, summaryRes] = await Promise.all([
      fetchMyAiInsights(1),
      fetchMyTrendInsight({}, 'en', false),
      fetchMyAlerts(10),
      fetchMyHealthSummary(7, {}, 'en', false),
    ]);

    const errors = [
      insightsRes.error ?? '',
      trendRes.error ?? '',
      alertsRes.error ?? '',
      summaryRes.error ?? '',
    ].filter(Boolean);

    const latestInsight = (insightsRes.insights ?? [])[0] ?? null;

    return {
      heartRates: trendRes.data?.trendData?.recentHeartRates ?? [],
      baseline: typeof trendRes.data?.trendData?.baseline === 'number' ? Number(trendRes.data?.trendData?.baseline) : null,
      trend: trendRes.data?.trendData?.trend ?? 'INSUFFICIENT_DATA',
      trendInsight: '',
      summary: summaryRes.data?.summaryData ?? DEFAULT_SUMMARY,
      summaryInsight: String(latestInsight?.text ?? '').trim(),
      alerts: (alertsRes.alerts ?? []).map((alert) => ({
        id: alert._id,
        message: alert.message,
        severity: alert.severity,
      })),
      error: errors[0] ?? '',
    };
  } catch (error) {
    return {
      heartRates: [],
      baseline: null,
      trend: 'INSUFFICIENT_DATA',
      trendInsight: '',
      summary: DEFAULT_SUMMARY,
      summaryInsight: '',
      alerts: [],
      error: error instanceof Error ? error.message : 'Failed to load monitoring data.',
    };
  }
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
  const [savingRecord, setSavingRecord] = useState(false);
  const [selfMonitoringForm, setSelfMonitoringForm] = useState<SelfMonitoringFormState>(() => createEmptySelfMonitoringForm());
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const applyMonitoringSnapshot = (snapshot: MonitoringSnapshot) => {
    setHeartRates(snapshot.heartRates);
    setBaseline(snapshot.baseline);
    setTrend(snapshot.trend);
    setTrendInsight(snapshot.trendInsight);
    setSummary(snapshot.summary);
    setSummaryInsight(snapshot.summaryInsight);
    setAlerts(snapshot.alerts);
  };

  useEffect(() => {
    if (!isReady || !isAuthenticated || role !== 'patient') return;

    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      const snapshot = await loadMonitoringSnapshot();
      if (!active) return;
      applyMonitoringSnapshot(snapshot);
      setError(snapshot.error);
      setLoading(false);
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

  const updateSelfMonitoringForm = <Key extends keyof SelfMonitoringFormState>(
    key: Key,
    value: SelfMonitoringFormState[Key]
  ) => {
    setSelfMonitoringForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelfMonitoringSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const built = buildSelfMonitoringSubmission(selfMonitoringForm);
    if (built.error || !built.recordPayload || !built.analysisPayload) {
      setNotice('');
      setError(built.error ?? 'Unable to build self-monitoring record');
      return;
    }

    setSavingRecord(true);
    setError('');
    setNotice('');

    const recordResult = await createMyPatientRecord(built.recordPayload);
    if (recordResult.error || !recordResult.record) {
      setSavingRecord(false);
      setError(recordResult.error ?? 'Failed to save self-monitoring record');
      return;
    }

    const analysisResult = await analyzeMyVitals(built.analysisPayload);
    const snapshot = await loadMonitoringSnapshot();
    applyMonitoringSnapshot(snapshot);
    setSavingRecord(false);
    setSelfMonitoringForm(createEmptySelfMonitoringForm());

    const recordSavedMessage = 'Self-monitoring record saved to your medical history.';
    if (analysisResult.error || snapshot.error) {
      setError('');
      setNotice(`${recordSavedMessage} Monitoring insights may take a moment to refresh. You can still review the entry on Medical Records.`);
      return;
    }

    setError('');
    setNotice('Self-monitoring record saved and your monitoring insights were refreshed.');
  };

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
    const deletedInsights = Number(result.data?.deleted?.aiInsights ?? 0);

    setHeartRates([]);
    setBaseline(null);
    setTrend('INSUFFICIENT_DATA');
    setTrendInsight('');
    setSummary(DEFAULT_SUMMARY);
    setSummaryInsight('');
    setAlerts([]);
    setNotice(`Monitoring history cleared (${deletedHealthRecords} samples, ${deletedAlerts} alerts, ${deletedInsights} insights).`);
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

        <Card id="self-monitoring-entry" className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <FilePlus2 className="h-5 w-5 text-primary" />
                  Add Self-Monitoring Record
                </CardTitle>
                <CardDescription>
                  Enter a home reading manually when you are not using the mobile camera scan. BioTrack stores it as a vitals record and updates your monitoring insights.
                </CardDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href="/medical-records">Review medical records</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSelfMonitoringSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="capturedAt">Recorded at</Label>
                  <Input
                    id="capturedAt"
                    type="datetime-local"
                    value={selfMonitoringForm.capturedAt}
                    onChange={(event) => updateSelfMonitoringForm('capturedAt', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heartRate">Heart rate (bpm)</Label>
                  <Input
                    id="heartRate"
                    type="number"
                    min="25"
                    max="250"
                    placeholder="72"
                    value={selfMonitoringForm.heartRate}
                    onChange={(event) => updateSelfMonitoringForm('heartRate', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activityLevel">Activity level</Label>
                  <Select
                    value={selfMonitoringForm.activityLevel || 'unset'}
                    onValueChange={(value) => updateSelfMonitoringForm('activityLevel', value === 'unset' ? '' : value)}
                  >
                    <SelectTrigger id="activityLevel">
                      <SelectValue placeholder="Select activity level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not specified</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MODERATE">Moderate</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fallDetected">Fall or safety event</Label>
                  <Select
                    value={selfMonitoringForm.fallDetected || 'unset'}
                    onValueChange={(value) =>
                      updateSelfMonitoringForm('fallDetected', value === 'unset' ? '' : (value as SelfMonitoringFormState['fallDetected']))
                    }
                  >
                    <SelectTrigger id="fallDetected">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">Not specified</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="monitoringNote">Notes</Label>
                  <textarea
                    id="monitoringNote"
                    className={selfMonitoringTextareaClassName}
                    placeholder="Optional symptoms, context, or what was happening during the reading."
                    value={selfMonitoringForm.note}
                    onChange={(event) => updateSelfMonitoringForm('note', event.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  This creates a patient-entered vitals record and then refreshes your monitoring overview so your chart and alerts stay current.
                </p>
                <Button type="submit" className="gap-2" disabled={savingRecord}>
                  {savingRecord ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                  Save self-monitoring record
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
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
