'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Brain, Heart, Lock, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardLayout from '@/components/dashboard-layout';
import {
  exportJson,
  extractHeartRate,
  fetchPatientAlerts,
  fetchPatientById,
  fetchPatientRecords,
  fetchPatientSummary,
  fetchPatientTrend,
  patientDisplayName,
  type ProviderPatient,
} from '@/lib/provider-role';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const patientId = params.id;
  const [patient, setPatient] = useState<ProviderPatient | null>(null);
  const [risk, setRisk] = useState('LOW');
  const [summaryText, setSummaryText] = useState('');
  const [alerts, setAlerts] = useState<Array<{ id: string; severity: string; type: string; message: string }>>([]);
  const [heartRates, setHeartRates] = useState<number[]>([]);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [recordCount, setRecordCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [patientRes, summaryRes, alertsRes, trendRes, recordsRes] = await Promise.all([
        fetchPatientById(patientId),
        fetchPatientSummary(patientId, 7),
        fetchPatientAlerts(patientId, 20),
        fetchPatientTrend(patientId),
        fetchPatientRecords(patientId),
      ]);
      if (!active) return;
      if (patientRes.error) {
        setError(patientRes.error);
        setLoading(false);
        return;
      }
      const records = recordsRes.records ?? [];
      setPatient(patientRes.patient ?? null);
      setRisk(summaryRes.summaryData?.overallRisk ?? 'LOW');
      setSummaryText(summaryRes.insight ?? '');
      setAlerts((alertsRes.alerts ?? []).map((a) => ({ id: a._id, severity: a.severity, type: a.type, message: a.message })));
      setHeartRates(trendRes.trendData?.recentHeartRates ?? []);
      setRecordCount(records.length);
      setVerifiedCount(records.filter((r) => String(r.blockchain?.verificationStatus ?? '').toLowerCase() === 'anchored').length);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  const chartData = useMemo(() => heartRates.map((value, idx) => ({ point: `${idx + 1}`, bpm: value })), [heartRates]);
  const currentBpm = heartRates.length > 0 ? heartRates[heartRates.length - 1] : null;

  const exportReport = async () => {
    const recordsRes = await fetchPatientRecords(patientId);
    exportJson(`provider-user-report-${patientId}.json`, {
      generatedAt: new Date().toISOString(),
      patient,
      risk,
      summaryText,
      alerts,
      trendHeartRates: heartRates,
      records: recordsRes.records ?? [],
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href="/users" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to users
        </Link>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading user detail...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle>{patient ? patientDisplayName(patient) : 'Patient'}</CardTitle>
                    <CardDescription>{patient?.email}</CardDescription>
                  </div>
                  <Badge variant={risk === 'HIGH' || risk === 'CRITICAL' ? 'destructive' : 'secondary'}>{risk}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Current BPM</p>
                  <p className="text-2xl font-bold">{currentBpm ?? 'N/A'}{currentBpm !== null ? ' bpm' : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verified Records</p>
                  <p className="text-2xl font-bold">{verifiedCount}/{recordCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Alerts</p>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-primary" />
                    Vital Trend
                  </CardTitle>
                  <CardDescription>Recent heart-rate pattern</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="point" stroke="var(--muted-foreground)" />
                      <YAxis stroke="var(--muted-foreground)" />
                      <Tooltip />
                      <Line type="monotone" dataKey="bpm" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    Records Integrity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Blockchain-anchored records are read-only and tamper-evident.</p>
                  <p className="text-sm mt-2">Verified: {verifiedCount}</p>
                  <p className="text-sm">Total: {recordCount}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-accent" />
                  AI Advisory (Read-Only)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{summaryText || 'No advisory available.'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-secondary" />
                  Restriction Notice
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Provider role can verify assigned patient record proofs and prepare clinical summaries, but it cannot manage governance settings or alter immutable blockchain history.
              </CardContent>
            </Card>

            <Button onClick={exportReport}>Export User Report</Button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
