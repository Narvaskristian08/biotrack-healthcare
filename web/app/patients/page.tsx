'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Heart, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import {
  extractHeartRate,
  fetchAssignedPatients,
  fetchPatientAlerts,
  fetchPatientRecords,
  fetchPatientSummary,
  patientDisplayName,
  type ProviderPatient,
} from '@/lib/provider-role';

type Row = {
  patient: ProviderPatient;
  risk: string;
  alertCount: number;
  heartRate: number | null;
};

function riskVariant(risk: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = risk.toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'destructive';
  if (normalized === 'MODERATE') return 'secondary';
  return 'outline';
}

export default function PatientsPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Row[]>([]);

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
      const data = await Promise.all(
        patients.map(async (patient) => {
          const [alertsRes, summaryRes, recordsRes] = await Promise.all([
            fetchPatientAlerts(patient._id, 10),
            fetchPatientSummary(patient._id, 7),
            fetchPatientRecords(patient._id),
          ]);
          const latestRecord = (recordsRes.records ?? [])[0];
          return {
            patient,
            risk: summaryRes.summaryData?.overallRisk ?? 'LOW',
            alertCount: (alertsRes.alerts ?? []).length,
            heartRate: extractHeartRate(latestRecord),
          } satisfies Row;
        })
      );
      if (!active) return;
      setRows(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = patientDisplayName(row.patient).toLowerCase();
      const email = String(row.patient.email ?? '').toLowerCase();
      const mrn = String(row.patient.mrn ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || mrn.includes(q);
    });
  }, [rows, query]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Assigned Patients</h1>
          <p className="text-muted-foreground mt-1">Patient monitoring list with risk indicators and alerts</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search assigned patients..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading patients...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((row) => (
              <Card key={row.patient._id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle>{patientDisplayName(row.patient)}</CardTitle>
                      <CardDescription>{row.patient.email}</CardDescription>
                    </div>
                    <Badge variant={riskVariant(row.risk)}>{row.risk}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      Latest Heart Rate
                    </span>
                    <span className="font-semibold">{row.heartRate ?? 'N/A'}{row.heartRate !== null ? ' bpm' : ''}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Alerts
                    </span>
                    <Badge variant={row.alertCount > 0 ? 'destructive' : 'outline'}>{row.alertCount}</Badge>
                  </div>
                  <Link href={`/patients/${row.patient._id}`} className="text-sm text-primary hover:underline">
                    Open patient oversight
                  </Link>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No patients matched your search.</p> : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
