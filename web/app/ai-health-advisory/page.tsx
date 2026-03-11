'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Lightbulb, ListChecks, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import { PatientPageContentSkeleton } from '@/components/patient-page-skeleton';
import { fetchMyAlerts, fetchMyHealthSummary, fetchMyTrendInsight } from '@/lib/patient-role';

type AlertItem = { id: string; type: string; severity: string; message: string; createdAt: string };
type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
type TrendLevel = 'INCREASING' | 'DECREASING' | 'STABLE' | 'INSUFFICIENT_DATA';

function normalizeRisk(value: string): RiskLevel {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'LOW') return 'LOW';
  if (normalized === 'MODERATE') return 'MODERATE';
  if (normalized === 'HIGH') return 'HIGH';
  if (normalized === 'CRITICAL') return 'CRITICAL';
  return 'UNKNOWN';
}

function normalizeTrend(value: string): TrendLevel {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'INCREASING') return 'INCREASING';
  if (normalized === 'DECREASING') return 'DECREASING';
  if (normalized === 'STABLE') return 'STABLE';
  return 'INSUFFICIENT_DATA';
}

function formatRiskLabel(value: RiskLevel) {
  if (value === 'LOW') return 'Low';
  if (value === 'MODERATE') return 'Moderate';
  if (value === 'HIGH') return 'High';
  if (value === 'CRITICAL') return 'Critical';
  return 'Unknown';
}

function formatTrendLabel(value: TrendLevel) {
  if (value === 'INCREASING') return 'Rising';
  if (value === 'DECREASING') return 'Lowering';
  if (value === 'STABLE') return 'Stable';
  return 'Need more data';
}

function riskBadgeVariant(value: RiskLevel): 'default' | 'secondary' | 'destructive' {
  if (value === 'CRITICAL' || value === 'HIGH') return 'destructive';
  if (value === 'MODERATE') return 'secondary';
  return 'default';
}

function trendBadgeVariant(value: TrendLevel): 'default' | 'secondary' | 'destructive' {
  if (value === 'INCREASING') return 'destructive';
  if (value === 'STABLE' || value === 'DECREASING') return 'default';
  return 'secondary';
}

function severityBadgeVariant(value: string): 'default' | 'secondary' | 'destructive' {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'HIGH' || normalized === 'CRITICAL') return 'destructive';
  if (normalized === 'MODERATE') return 'secondary';
  return 'default';
}

function formatAlertType(value: string) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function describeTrend(value: TrendLevel) {
  if (value === 'INCREASING') return 'Your latest monitored values are trending upward.';
  if (value === 'DECREASING') return 'Your latest monitored values are trending downward.';
  if (value === 'STABLE') return 'Your recent readings are relatively consistent.';
  return 'There is not enough data yet to calculate a reliable trend.';
}

function describeRisk(value: RiskLevel, fallEvents: number, alertCount: number) {
  if (value === 'CRITICAL') return `Critical risk was detected. ${fallEvents} fall event(s) and ${alertCount} alert(s) need prompt review.`;
  if (value === 'HIGH') return `High risk was detected. ${fallEvents} fall event(s) and ${alertCount} alert(s) should be reviewed soon.`;
  if (value === 'MODERATE') return 'Moderate risk was detected. Keep monitoring and watch for symptoms.';
  if (value === 'LOW') return 'Current risk is low based on available monitoring data.';
  return 'Risk level is unavailable. Add more monitoring records for better analysis.';
}

function toSentenceList(input: string): string[] {
  const cleaned = String(input ?? '')
    .replace(/\s+/g, ' ')
    .replace(/Health Trend Insight/gi, '')
    .replace(/Health Summary Report/gi, '')
    .trim();

  if (!cleaned) return [];

  return cleaned
    .replace(/\s+-\s+/g, '. ')
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.replace(/^[,;:\-\s]+/, '').trim())
    .filter(Boolean);
}

function uniqueLines(lines: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(line.trim());
  }
  return result;
}

function recommendedActions(risk: RiskLevel, trend: TrendLevel, fallEvents: number, alertCount: number) {
  const actions: string[] = [];
  if (risk === 'CRITICAL' || risk === 'HIGH' || fallEvents > 0) {
    actions.push('Contact your healthcare provider for a focused review of your recent records.');
  }
  if (trend === 'INCREASING') {
    actions.push('Recheck your heart rate after rest and compare results with your previous values.');
  }
  if (alertCount > 0) {
    actions.push('Open each alert below and verify if the warning still applies to your current condition.');
  }
  actions.push('Continue daily monitoring to improve the quality of AI interpretation.');
  actions.push('If you feel chest pain, severe dizziness, or breathing difficulty, seek emergency care immediately.');
  return uniqueLines(actions);
}

export default function AIHealthAdvisoryPage() {
  const [language, setLanguage] = useState<'en' | 'fil'>('en');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [summaryObservations, setSummaryObservations] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [fallEvents, setFallEvents] = useState(0);
  const [trend, setTrend] = useState('INSUFFICIENT_DATA');
  const [trendInsight, setTrendInsight] = useState('');
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    const persisted = typeof window !== 'undefined' ? window.localStorage.getItem('biotrack.ai.language') : null;
    if (persisted === 'fil' || persisted === 'en') {
      setLanguage(persisted);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [summaryRes, trendRes, alertsRes] = await Promise.all([
        fetchMyHealthSummary(7, {}, language),
        fetchMyTrendInsight({}, language),
        fetchMyAlerts(10),
      ]);
      if (!active) return;
      const nextErrors: string[] = [];

      if (summaryRes.error) {
        nextErrors.push(`Summary endpoint: ${summaryRes.error}`);
      } else {
        setSummary(summaryRes.data?.insight ?? '');
        setSummaryObservations(summaryRes.data?.summaryData?.observations ?? []);
        setRiskLevel(summaryRes.data?.summaryData?.overallRisk ?? 'LOW');
        setFallEvents(Number(summaryRes.data?.summaryData?.fallEvents ?? 0));
      }

      if (trendRes.error) {
        nextErrors.push(`Trend endpoint: ${trendRes.error}`);
      } else {
        setTrend(trendRes.data?.trendData?.trend ?? 'INSUFFICIENT_DATA');
        setTrendInsight(trendRes.data?.insight ?? '');
      }

      if (alertsRes.error) {
        nextErrors.push(`Alerts endpoint: ${alertsRes.error}`);
      } else {
        setAlerts(
          (alertsRes.alerts ?? []).map((a) => ({
            id: a._id,
            type: a.type,
            severity: a.severity,
            message: a.message,
            createdAt: a.createdAt,
          }))
        );
      }

      setErrors(nextErrors);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [language]);

  const normalizedRisk = useMemo(() => normalizeRisk(riskLevel), [riskLevel]);
  const normalizedTrend = useMemo(() => normalizeTrend(trend), [trend]);
  const trendMeaning = useMemo(() => describeTrend(normalizedTrend), [normalizedTrend]);
  const riskMeaning = useMemo(
    () => describeRisk(normalizedRisk, Number(fallEvents ?? 0), alerts.length),
    [alerts.length, fallEvents, normalizedRisk]
  );
  const actions = useMemo(
    () => recommendedActions(normalizedRisk, normalizedTrend, Number(fallEvents ?? 0), alerts.length),
    [alerts.length, fallEvents, normalizedRisk, normalizedTrend]
  );

  const aiHighlights = useMemo(() => {
    const observationLines = (summaryObservations ?? []).map((item) => String(item ?? '').trim()).filter(Boolean);
    const aiLines = [...toSentenceList(summary), ...toSentenceList(trendInsight)];
    return uniqueLines([trendMeaning, riskMeaning, ...observationLines, ...aiLines]).slice(0, 7);
  }, [riskMeaning, summary, summaryObservations, trendInsight, trendMeaning]);

  const detailedNotes = useMemo(() => {
    return uniqueLines([...toSentenceList(trendInsight), ...toSentenceList(summary)]).slice(0, 8);
  }, [summary, trendInsight]);

  if (loading) {
    return (
      <DashboardLayout>
        <PatientPageContentSkeleton stats={3} chartCards={2} listCards={1} listRows={4} footerNotice />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Health Advisory</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Easy-to-read guidance based on your latest monitoring records and alerts.
            </p>
          </div>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 text-sm text-foreground/90 space-y-1">
              <p className="font-medium">How to use this page</p>
              <p>
                Start with the summary cards, then review "What this means" and "What to do next." Detailed AI text is
                available below for technical review.
              </p>
            </CardContent>
          </Card>
          <div className="flex gap-2">
            <button
              type="button"
              className={`rounded-md border px-3 py-1 text-sm ${language === 'en' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              onClick={() => {
                setLanguage('en');
                window.localStorage.setItem('biotrack.ai.language', 'en');
              }}
            >
              English
            </button>
            <button
              type="button"
              className={`rounded-md border px-3 py-1 text-sm ${language === 'fil' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
              onClick={() => {
                setLanguage('fil');
                window.localStorage.setItem('biotrack.ai.language', 'fil');
              }}
            >
              Filipino
            </button>
          </div>
        </header>

        {errors.length > 0 ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">
              <p>Some AI data could not be loaded:</p>
              <ul className="mt-2 list-disc pl-5">
                {errors.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">{formatTrendLabel(normalizedTrend)}</p>
                <Badge variant={trendBadgeVariant(normalizedTrend)}>{normalizedTrend.replaceAll('_', ' ')}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{trendMeaning}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Risk Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold">{formatRiskLabel(normalizedRisk)}</p>
                <Badge variant={riskBadgeVariant(normalizedRisk)}>{normalizedRisk}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Fall events detected: {fallEvents}. {riskMeaning}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alerts.length}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {alerts.length === 0
                  ? 'No active alerts right now.'
                  : `${alerts.length} alert(s) need your review.`}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                What This Means
              </CardTitle>
              <CardDescription>Plain-language interpretation of your current monitoring status.</CardDescription>
            </CardHeader>
            <CardContent>
              {aiHighlights.length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  {aiHighlights.map((line, index) => (
                    <li key={`${line}-${index}`}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No advisory interpretation available yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                What To Do Next
              </CardTitle>
              <CardDescription>Suggested actions based on your trend, risk level, and alerts.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                {actions.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI Observations</CardTitle>
            <CardDescription>Important findings extracted from your weekly summary endpoint.</CardDescription>
          </CardHeader>
          <CardContent>
            {summaryObservations.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                {summaryObservations.map((observation, index) => (
                  <li key={`${observation}-${index}`}>{observation}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No observations returned yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Advisory Alerts
            </CardTitle>
            <CardDescription>Warnings generated from your recent health records.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <Badge variant={severityBadgeVariant(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{formatAlertType(alert.type)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.message || 'No message.'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No advisory alerts available.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Detailed AI Notes
            </CardTitle>
            <CardDescription>Simplified endpoint outputs for users who want a deeper review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {detailedNotes.length > 0 ? (
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                {detailedNotes.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No detailed AI notes available yet.</p>
            )}
            <details className="rounded-lg border border-border bg-muted/30 p-3">
              <summary className="cursor-pointer text-sm font-medium">Show raw AI response text</summary>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">Trend endpoint:</span>{' '}
                  {trendInsight || 'No trend insight returned.'}
                </p>
                <p>
                  <span className="font-semibold text-foreground">Summary endpoint:</span>{' '}
                  {summary || 'No summary insight returned.'}
                </p>
              </div>
            </details>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-base">Medical Disclaimer</CardTitle>
                <CardDescription className="mt-2">
                  AI insights are advisory only and should not replace professional medical evaluation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
