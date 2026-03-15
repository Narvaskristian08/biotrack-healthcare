'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Download, Shield, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import {
  exportJson,
  extractActivityLevel,
  extractFallDetected,
  extractHeartRate,
  fetchPatientAlerts,
  fetchPatientById,
  fetchPatientRecords,
  fetchPatientSummary,
  fetchPatientTrend,
  patientDisplayName,
  verifyPatientRecord,
  type ProviderPatient,
  type ProviderPatientRecord,
  type ProviderRecordVerification,
} from '@/lib/provider-role';

export default function PatientDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const patientId = typeof params?.id === 'string' ? params.id : params?.id?.[0] ?? '';
  const [patient, setPatient] = useState<ProviderPatient | null>(null);
  const [records, setRecords] = useState<ProviderPatientRecord[]>([]);
  const [alerts, setAlerts] = useState<Array<{ id: string; severity: string; message: string; type: string }>>([]);
  const [summary, setSummary] = useState<{ risk: string; fallEvents: number; insight: string }>({ risk: 'LOW', fallEvents: 0, insight: '' });
  const [trend, setTrend] = useState<number[]>([]);
  const [verification, setVerification] = useState<Record<string, ProviderRecordVerification | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) {
      setError('Patient id is missing');
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      const [patientRes, recordsRes, alertsRes, summaryRes, trendRes] = await Promise.all([
        fetchPatientById(patientId),
        fetchPatientRecords(patientId),
        fetchPatientAlerts(patientId, 20),
        fetchPatientSummary(patientId, 7),
        fetchPatientTrend(patientId),
      ]);
      if (!active) return;
      if (patientRes.error) {
        setError(patientRes.error);
        setLoading(false);
        return;
      }
      setPatient(patientRes.patient ?? null);
      setRecords(recordsRes.records ?? []);
      setAlerts((alertsRes.alerts ?? []).map((a) => ({ id: a._id, severity: a.severity, message: a.message, type: a.type })));
      setSummary({
        risk: summaryRes.summaryData?.overallRisk ?? 'LOW',
        fallEvents: Number(summaryRes.summaryData?.fallEvents ?? 0),
        insight: summaryRes.insight ?? '',
      });
      setTrend(trendRes.trendData?.recentHeartRates ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  const latest = records[0] ?? null;
  const latestHeartRate = extractHeartRate(latest);
  const latestActivity = extractActivityLevel(latest);
  const latestFall = extractFallDetected(latest);

  const verifiedCount = useMemo(() => {
    return records.filter((record) => {
      const status = verification[record._id]?.status ?? record.blockchain?.verificationStatus ?? '';
      return String(status).toLowerCase() === 'anchored' || String(status).toLowerCase() === 'verified';
    }).length;
  }, [records, verification]);

  const verifyRecordIntegrity = async (recordId: string) => {
    const result = await verifyPatientRecord(patientId, recordId);
    if (result.error || !result.data) {
      setError(result.error ?? 'Verification failed');
      return;
    }
    setVerification((prev) => ({ ...prev, [recordId]: result.data }));
  };

  const exportPatientSummary = () => {
    exportJson(`provider-patient-summary-${patientId}.json`, {
      generatedAt: new Date().toISOString(),
      patient,
      summary,
      alerts,
      trend,
      recordCount: records.length,
      verifiedRecordCount: verifiedCount,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href="/patients" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to assigned patients
        </Link>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading patient oversight view...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <CardTitle>{patient ? patientDisplayName(patient) : 'Patient'}</CardTitle>
                    <CardDescription>{patient?.email ?? ''}</CardDescription>
                  </div>
                  <Badge variant={summary.risk === 'HIGH' || summary.risk === 'CRITICAL' ? 'destructive' : 'secondary'}>{summary.risk}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Current heart rate</p>
                  <p className="text-xl font-bold">{latestHeartRate ?? 'N/A'}{latestHeartRate !== null ? ' bpm' : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Activity level</p>
                  <p className="text-xl font-bold">{latestActivity ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fall detected</p>
                  <p className="text-xl font-bold">{latestFall ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verified records</p>
                  <p className="text-xl font-bold">{verifiedCount}/{records.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Risk Flags and Advisory</CardTitle>
                <CardDescription>Generated warnings and intervention signals (read-only output)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{summary.insight || 'No AI advisory available.'}</p>
                <p className="text-sm text-muted-foreground">Fall incidents requiring intervention: {summary.fallEvents}</p>
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>{alert.severity}</Badge>
                        <p className="text-sm font-medium">{alert.type.replaceAll('_', ' ')}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message || 'No message.'}</p>
                    </div>
                  ))}
                  {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No alert notifications.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verified Medical Records</CardTitle>
                <CardDescription>Health history, authenticity checks, and tamper validation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {records.map((record) => {
                  const verify = verification[record._id];
                  const status = verify?.status ?? record.blockchain?.verificationStatus ?? 'pending';
                  const tampered = String(status).toLowerCase() === 'tampered' || String(status).toLowerCase() === 'anchor_mismatch';
                  return (
                    <div key={record._id} className="p-3 rounded-lg border border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{record.type}</p>
                          <p className="text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleString()}</p>
                        </div>
                        <Badge variant={tampered ? 'destructive' : 'secondary'}>{status}</Badge>
                      </div>
                      <p className="text-xs font-mono break-all mt-2">{record.recordHash}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => verifyRecordIntegrity(record._id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                        <span className="text-xs text-muted-foreground self-center">Tx: {record.blockchain?.txId || 'N/A'}</span>
                        {tampered ? <ShieldAlert className="h-4 w-4 text-destructive self-center" /> : <Shield className="h-4 w-4 text-green-600 self-center" />}
                      </div>
                    </div>
                  );
                })}
                {records.length === 0 ? <p className="text-sm text-muted-foreground">No medical records available.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generate Provider Report</CardTitle>
                <CardDescription>Export clinical summary for medical review documentation</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={exportPatientSummary}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Patient Summary
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
