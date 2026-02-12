'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  extractActivityLevel,
  extractHeartRate,
  fetchAssignedPatients,
  fetchPatientAlerts,
  fetchPatientRecords,
  fetchPatientSummary,
  fetchPatientTrend,
  patientDisplayName,
  exportJson,
} from '@/lib/provider-role';

type AnalyticsRow = {
  patientId: string;
  patientName: string;
  risk: string;
  alertCount: number;
  heartRate: number | null;
  activity: number | null;
  trendSeries: number[];
};

function riskScore(risk: string): number {
  const normalized = risk.toUpperCase();
  if (normalized === 'CRITICAL') return 4;
  if (normalized === 'HIGH') return 3;
  if (normalized === 'MODERATE') return 2;
  return 1;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<AnalyticsRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const patientsRes = await fetchAssignedPatients();
      if (!active) return;
      if (patientsRes.error) {
        setError(patientsRes.error);
        setLoading(false);
        return;
      }
      const patients = patientsRes.patients ?? [];
      const merged = await Promise.all(
        patients.map(async (patient) => {
          const [summaryRes, alertRes, recordsRes, trendRes] = await Promise.all([
            fetchPatientSummary(patient._id, 7),
            fetchPatientAlerts(patient._id, 20),
            fetchPatientRecords(patient._id),
            fetchPatientTrend(patient._id),
          ]);
          const latestRecord = (recordsRes.records ?? [])[0];
          return {
            patientId: patient._id,
            patientName: patientDisplayName(patient),
            risk: summaryRes.summaryData?.overallRisk ?? 'LOW',
            alertCount: (alertRes.alerts ?? []).length,
            heartRate: extractHeartRate(latestRecord),
            activity: extractActivityLevel(latestRecord),
            trendSeries: trendRes.trendData?.recentHeartRates ?? [],
          } satisfies AnalyticsRow;
        })
      );
      if (!active) return;
      setRows(merged);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const bpmVals = rows.map((r) => r.heartRate).filter((v): v is number => typeof v === 'number');
    const avgBpm = bpmVals.length ? bpmVals.reduce((a, b) => a + b, 0) / bpmVals.length : 0;
    const totalAlerts = rows.reduce((sum, row) => sum + row.alertCount, 0);
    const highRisk = rows.filter((row) => riskScore(row.risk) >= 3).length;
    return { avgBpm, totalAlerts, highRisk };
  }, [rows]);

  const riskDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach((row) => {
      counts[row.risk] = (counts[row.risk] ?? 0) + 1;
    });
    return Object.entries(counts).map(([risk, count]) => ({ risk, count }));
  }, [rows]);

  const trendData = useMemo(() => {
    const maxLen = Math.max(...rows.map((row) => row.trendSeries.length), 0);
    return Array.from({ length: maxLen }).map((_, idx) => {
      const values = rows.map((row) => row.trendSeries[idx]).filter((v): v is number => Number.isFinite(v));
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      return { point: `#${idx + 1}`, avg };
    });
  }, [rows]);

  const patientRiskData = rows.map((row) => ({
    name: row.patientName,
    alerts: row.alertCount,
    riskScore: riskScore(row.risk),
  }));

  const exportAnalytics = () => {
    exportJson(`provider-analytics-${new Date().toISOString().slice(0, 10)}.json`, {
      generatedAt: new Date().toISOString(),
      summary,
      rows,
      riskDistribution,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Provider Analytics
          </h1>
          <p className="text-muted-foreground">Risk-level, alerts, and vital trend analytics for assigned patients</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Avg Heart Rate</p>
              <p className="text-3xl font-bold">{summary.avgBpm ? summary.avgBpm.toFixed(1) : 'N/A'}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p className="text-3xl font-bold">{summary.totalAlerts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">High/Critical Risk Patients</p>
              <p className="text-3xl font-bold">{summary.highRisk}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Heart-Rate Trend</CardTitle>
              <CardDescription>Average trend across assigned patients</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="point" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avg" stroke="var(--primary)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Distribution</CardTitle>
              <CardDescription>AI risk levels by patient count</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={riskDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="risk" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="var(--chart-2)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Alerts and Risk Flags</CardTitle>
              <CardDescription>Per-patient criticality overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={patientRiskData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="alerts" fill="var(--chart-3)" />
                  <Bar dataKey="riskScore" fill="var(--chart-1)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold">Generate Analytics Documentation</h3>
              <p className="text-sm text-muted-foreground">Export current analytics for medical review documentation.</p>
            </div>
            <Button onClick={exportAnalytics} disabled={loading}>
              Export JSON Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
