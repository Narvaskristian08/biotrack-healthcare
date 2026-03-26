'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  fetchMyAiInsights,
  fetchMyAlerts,
  fetchMyHealthSummary,
  fetchMyPatientRecords,
  fetchMyTrendInsight,
  type AlertEntry,
  type PatientRecord,
} from '@/lib/patient-role';

type FeedbackItem = {
  source: 'summary' | 'alert';
  label: string;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function formatPct(value: number): string {
  return `${Math.round(value)}%`;
}

export default function EvaluationFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [trendLabel, setTrendLabel] = useState('INSUFFICIENT_DATA');
  const [heartRates, setHeartRates] = useState<number[]>([]);
  const [summaryInsight, setSummaryInsight] = useState('');
  const [summaryObservations, setSummaryObservations] = useState<string[]>([]);
  const [overallRisk, setOverallRisk] = useState('LOW');
  const [fallEvents, setFallEvents] = useState(0);

  useEffect(() => {
    let active = true;

    (async () => {
      const [insightsRes, summaryRes, trendRes, alertsRes, recordsRes] = await Promise.all([
        fetchMyAiInsights(1),
        fetchMyHealthSummary(30, {}, 'en', false),
        fetchMyTrendInsight({}, 'en', false),
        fetchMyAlerts(50),
        fetchMyPatientRecords(),
      ]);

      if (!active) return;

      if (insightsRes.error && summaryRes.error && trendRes.error && alertsRes.error && recordsRes.error) {
        setError(insightsRes.error || summaryRes.error || trendRes.error || alertsRes.error || recordsRes.error || 'Failed to load evaluation data.');
        setLoading(false);
        return;
      }

      if (!insightsRes.error) {
        const latestInsight = (insightsRes.insights ?? [])[0] ?? null;
        setSummaryInsight(String(latestInsight?.text ?? '').trim());
      }

      if (!summaryRes.error && summaryRes.data) {
        setSummaryObservations(summaryRes.data.summaryData?.observations ?? []);
        setOverallRisk(summaryRes.data.summaryData?.overallRisk ?? 'LOW');
        setFallEvents(Number(summaryRes.data.summaryData?.fallEvents ?? 0));
      }
      if (!trendRes.error && trendRes.data) {
        setTrendLabel(String(trendRes.data.trendData?.trend ?? 'INSUFFICIENT_DATA').toUpperCase());
        setHeartRates(trendRes.data.trendData?.recentHeartRates ?? []);
      }
      if (!alertsRes.error) {
        setAlerts(alertsRes.alerts ?? []);
      }
      if (!recordsRes.error) {
        setRecords(recordsRes.records ?? []);
      }

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const feedbackItems = useMemo<FeedbackItem[]>(() => {
    const fromSummary = summaryObservations.map((entry) => ({ source: 'summary' as const, label: entry }));
    const fromAlerts = alerts.slice(0, 10).map((alert) => ({
      source: 'alert' as const,
      label: `[${String(alert.severity).toUpperCase()}] ${alert.message}`,
    }));
    return [...fromSummary, ...fromAlerts];
  }, [alerts, summaryObservations]);

  const filteredFeedback = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return feedbackItems;
    return feedbackItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [feedbackItems, filter]);

  const averageHr = useMemo(() => average(heartRates), [heartRates]);
  const recordsInLast30Days = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return records.filter((record) => {
      const time = new Date(record.createdAt).getTime();
      return Number.isFinite(time) && time >= cutoff;
    }).length;
  }, [records]);

  const alertRate = useMemo(() => {
    if (records.length === 0) return 0;
    return Math.min(100, (alerts.length / records.length) * 100);
  }, [alerts.length, records.length]);

  const dataCompleteness = useMemo(() => {
    if (records.length === 0) return 0;
    if (heartRates.length === 0) return 20;
    return Math.min(100, 40 + (Math.min(records.length, 50) / 50) * 60);
  }, [heartRates.length, records.length]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Evaluation & Feedback</h1>
          <p className="text-muted-foreground mt-1">
            Live summary from your records, alerts, and AI insights
          </p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>Generated from latest alerts and observations</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading feedback...</p>
              ) : filteredFeedback.length === 0 ? (
                <p className="text-sm text-muted-foreground">No feedback available yet.</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {filteredFeedback.slice(0, 8).map((item, idx) => (
                    <li key={`${item.source}-${idx}`}>{item.label}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evaluation Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading metrics...</p>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">Trend: {trendLabel.replaceAll('_', ' ')}</div>
                  <div className="text-sm text-muted-foreground">Overall risk: {overallRisk}</div>
                  <div className="text-sm text-muted-foreground">
                    Avg. heart rate: {averageHr === null ? 'N/A' : `${Math.round(averageHr)} bpm`}
                  </div>
                  <Input
                    placeholder="Filter feedback by keyword..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Effectiveness Indicators</CardTitle>
              <CardDescription>Computed from your last 30 days of available data</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading indicators...</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Records in last 30 days: {recordsInLast30Days}</li>
                  <li>Fall events detected: {fallEvents}</li>
                  <li>Alert-to-record ratio: {formatPct(alertRate)}</li>
                  <li>Data completeness score: {formatPct(dataCompleteness)}</li>
                  <li>{summaryInsight || 'No AI summary narrative available yet.'}</li>
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
