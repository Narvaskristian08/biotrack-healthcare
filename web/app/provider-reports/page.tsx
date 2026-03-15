'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/components/dashboard-layout';
import {
  exportJson,
  exportPatientsCsv,
  fetchAssignedPatients,
  fetchPatientAlerts,
  fetchPatientRecords,
  fetchPatientSummary,
  patientDisplayName,
  extractActivityLevel,
  extractHeartRate,
  type ProviderPatient,
} from '@/lib/provider-role';

type ReportRow = {
  patient: ProviderPatient;
  risk: string;
  alerts: number;
  heartRate: number | null;
  activity: number | null;
};

export default function ProviderReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          const [summaryRes, alertsRes, recordsRes] = await Promise.all([
            fetchPatientSummary(patient._id, 7),
            fetchPatientAlerts(patient._id, 20),
            fetchPatientRecords(patient._id),
          ]);
          const latest = (recordsRes.records ?? [])[0];
          return {
            patient,
            risk: summaryRes.summaryData?.overallRisk ?? 'LOW',
            alerts: (alertsRes.alerts ?? []).length,
            heartRate: extractHeartRate(latest),
            activity: extractActivityLevel(latest),
          } satisfies ReportRow;
        })
      );
      if (!active) return;
      setRows(data);
      setPatientId(data[0]?.patient._id ?? '');
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(() => rows.find((row) => row.patient._id === patientId) ?? null, [rows, patientId]);

  const exportSinglePatientSummary = () => {
    if (!selected) return;
    exportJson(`provider-patient-summary-${selected.patient._id}.json`, {
      generatedAt: new Date().toISOString(),
      patient: selected.patient,
      riskLevel: selected.risk,
      alertCount: selected.alerts,
      latestHeartRate: selected.heartRate,
      latestActivity: selected.activity,
    });
  };

  const exportBatchCsv = () => {
    exportPatientsCsv(
      `provider-assigned-patients-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((row) => ({
        patientId: row.patient._id,
        patientName: patientDisplayName(row.patient),
        email: row.patient.email,
        riskLevel: row.risk,
        alertCount: row.alerts,
        latestHeartRate: row.heartRate,
        latestActivity: row.activity,
      }))
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Provider Reports</h1>
          <p className="text-muted-foreground mt-1">Generate patient summaries and export clinical documentation</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Generate Patient Summary</CardTitle>
            <CardDescription>Create a report for a selected assigned patient</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading patient list...</p>
            ) : (
              <>
                <div className="space-y-2 max-w-sm">
                  <Label htmlFor="patient-select">Assigned patient</Label>
                  <select
                    id="patient-select"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                  >
                    {rows.map((row) => (
                      <option key={row.patient._id} value={row.patient._id}>
                        {patientDisplayName(row.patient)}
                      </option>
                    ))}
                  </select>
                </div>
                {selected ? (
                  <div className="p-3 rounded-lg border border-border text-sm">
                    <p className="font-medium">{patientDisplayName(selected.patient)}</p>
                    <p className="text-muted-foreground">Risk: {selected.risk}</p>
                    <p className="text-muted-foreground">Alerts: {selected.alerts}</p>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button onClick={exportSinglePatientSummary} disabled={!selected}>
                    Export Summary JSON
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Batch Exports</CardTitle>
            <CardDescription>Export assigned patient monitoring data for medical review</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportBatchCsv} disabled={loading || rows.length === 0}>
              Export Assigned Patients CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Role Restrictions</CardTitle>
            <CardDescription>
              Providers can review assigned patient records, verify integrity proofs, and export care summaries, but they cannot manage system governance, municipal/global audit scope, or alter immutable on-chain history.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
