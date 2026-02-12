'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle, FileText, Heart, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatsCard from './stats-card';
import {
  extractActivityLevel,
  extractFallDetected,
  extractHeartRate,
  fetchAssignedPatients,
  fetchPatientAlerts,
  fetchPatientRecords,
  fetchPatientSummary,
  fetchPatientTrend,
  patientDisplayName,
  type ProviderPatient,
  type ProviderPatientRecord,
} from '@/lib/provider-role';

type PatientView = {
  patient: ProviderPatient;
  latestRecord: ProviderPatientRecord | null;
  heartRate: number | null;
  activity: number | null;
  fallDetected: boolean;
  risk: string;
  alertCount: number;
  verifiedRecordCount: number;
  trendSeries: number[];
};

function severityRank(risk: string): number {
  const normalized = risk.toUpperCase();
  if (normalized === 'CRITICAL') return 4;
  if (normalized === 'HIGH') return 3;
  if (normalized === 'MODERATE') return 2;
  return 1;
}

export default function ProviderDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [patientsView, setPatientsView] = useState<PatientView[]>([]);

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
      const rows = await Promise.all(
        patients.map(async (patient) => {
          const [recordsRes, alertsRes, summaryRes, trendRes] = await Promise.all([
            fetchPatientRecords(patient._id),
            fetchPatientAlerts(patient._id, 10),
            fetchPatientSummary(patient._id, 7),
            fetchPatientTrend(patient._id),
          ]);

          const records = recordsRes.records ?? [];
          const latestRecord = records[0] ?? null;
          const verifiedRecordCount = records.filter((record) => String(record.blockchain?.verificationStatus ?? '').toLowerCase() === 'anchored').length;

          return {
            patient,
            latestRecord,
            heartRate: extractHeartRate(latestRecord),
            activity: extractActivityLevel(latestRecord),
            fallDetected: extractFallDetected(latestRecord),
            risk: summaryRes.summaryData?.overallRisk ?? 'LOW',
            alertCount: (alertsRes.alerts ?? []).length,
            verifiedRecordCount,
            trendSeries: trendRes.trendData?.recentHeartRates ?? [],
          } satisfies PatientView;
        })
      );

      if (!active) return;
      setPatientsView(rows);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return patientsView;
    return patientsView.filter((row) => {
      const name = patientDisplayName(row.patient).toLowerCase();
      const email = String(row.patient.email ?? '').toLowerCase();
      const mrn = String(row.patient.mrn ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || mrn.includes(q);
    });
  }, [patientsView, searchTerm]);

  const totalAlerts = useMemo(() => patientsView.reduce((sum, row) => sum + row.alertCount, 0), [patientsView]);
  const criticalPatients = useMemo(() => patientsView.filter((row) => severityRank(row.risk) >= 3).length, [patientsView]);
  const fallIncidents = useMemo(() => patientsView.filter((row) => row.fallDetected).length, [patientsView]);
  const verifiedRecords = useMemo(() => patientsView.reduce((sum, row) => sum + row.verifiedRecordCount, 0), [patientsView]);

  const trendChartData = useMemo(() => {
    const maxLength = Math.max(...patientsView.map((row) => row.trendSeries.length), 0);
    return Array.from({ length: maxLength }).map((_, idx) => {
      const sampleValues = patientsView
        .map((row) => row.trendSeries[idx])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      const avg = sampleValues.length > 0 ? sampleValues.reduce((a, b) => a + b, 0) / sampleValues.length : null;
      return {
        sample: `#${idx + 1}`,
        average: avg ?? 0,
      };
    });
  }, [patientsView]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Healthcare Provider Dashboard</h1>
        <p className="text-muted-foreground text-lg">Patient monitoring, risk flags, clinical oversight, and verified records</p>
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Assigned Patients" value={String(patientsView.length)} change="Scoped to your health center" icon={<Users className="h-5 w-5" />} trend="stable" />
        <StatsCard title="Active Alerts" value={String(totalAlerts)} change={`${criticalPatients} high-risk patients`} icon={<AlertTriangle className="h-5 w-5" />} trend="up" />
        <StatsCard title="Verified Records" value={String(verifiedRecords)} change="Blockchain anchored" icon={<CheckCircle className="h-5 w-5" />} trend="stable" />
        <StatsCard title="Fall Incidents" value={String(fallIncidents)} change="Latest monitored records" icon={<TrendingUp className="h-5 w-5" />} trend={fallIncidents > 0 ? 'up' : 'stable'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Real-Time Heart Rate Overview
            </CardTitle>
            <CardDescription>Average trend from assigned patients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="sample" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip />
                <Line type="monotone" dataKey="average" stroke="var(--primary)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Flag Dashboard</CardTitle>
            <CardDescription>AI-based risk levels and alert signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {patientsView
              .filter((row) => row.alertCount > 0 || severityRank(row.risk) >= 3)
              .slice(0, 5)
              .map((row) => (
                <div key={row.patient._id} className="p-3 rounded-lg border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{patientDisplayName(row.patient)}</p>
                      <p className="text-xs text-muted-foreground">{row.patient.email}</p>
                    </div>
                    <Badge variant={severityRank(row.risk) >= 3 ? 'destructive' : 'secondary'}>{row.risk}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Alerts: {row.alertCount}</p>
                </div>
              ))}
            {patientsView.length === 0 && !loading ? <p className="text-sm text-muted-foreground">No assigned patients found.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="space-y-3">
            <CardTitle>Assigned Patients</CardTitle>
            <CardDescription>Monitoring list with risk indicators, alert notifications, and latest vitals</CardDescription>
            <Input placeholder="Search assigned patients by name, email, or MRN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading assigned patients...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Heart Rate</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Alerts</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.patient._id}>
                      <TableCell>
                        <div className="font-medium">{patientDisplayName(row.patient)}</div>
                        <div className="text-xs text-muted-foreground">{row.patient.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={severityRank(row.risk) >= 3 ? 'destructive' : 'secondary'}>{row.risk}</Badge>
                      </TableCell>
                      <TableCell>{row.heartRate ?? 'N/A'}{row.heartRate !== null ? ' bpm' : ''}</TableCell>
                      <TableCell>{row.activity ?? 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={row.alertCount > 0 ? 'destructive' : 'outline'}>{row.alertCount}</Badge>
                      </TableCell>
                      <TableCell>{row.verifiedRecordCount}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/patients/${row.patient._id}`}>
                            <FileText className="h-4 w-4 mr-1" />
                            Open
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length === 0 ? <p className="text-sm text-muted-foreground mt-4">No patients matched your search.</p> : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
