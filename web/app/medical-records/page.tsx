'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff, Lock, RefreshCw, Shield, ShieldAlert, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { PatientPageContentSkeleton } from '@/components/patient-page-skeleton';
import {
  downloadTextFile,
  fetchMyPatientRecords,
  requestMyRecordExtractionOnChain,
  type PatientRecord,
  verifyMyPatientRecord,
  type RecordVerificationResult,
} from '@/lib/patient-role';

type VerificationMap = Record<string, RecordVerificationResult | undefined>;

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'anchored' || normalized === 'verified') return { label: 'Verified', variant: 'default' as const };
  if (normalized === 'local_hash_only') return { label: 'Verified (Local)', variant: 'secondary' as const };
  if (normalized === 'tampered' || normalized === 'anchor_mismatch' || normalized === 'failed') {
    return { label: 'Needs Review', variant: 'destructive' as const };
  }
  return { label: 'Pending', variant: 'secondary' as const };
}

function formatRecordType(type: string) {
  const key = String(type ?? '').trim().toLowerCase();
  const labels: Record<string, string> = {
    consultation: 'Consultation',
    vitals: 'Vitals',
    immunization: 'Immunization',
    prenatal: 'Prenatal',
    lab: 'Laboratory',
    medication: 'Medication',
    referral: 'Referral',
    note: 'Clinical Note',
    other: 'Other',
  };
  return labels[key] ?? (key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : 'Medical Record');
}

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', '1', 'detected'].includes(normalized)) return true;
    if (['false', 'no', '0', 'none'].includes(normalized)) return false;
  }
  return null;
}

function toTitleWords(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPatientRecordSummary(record: PatientRecord) {
  const data = toObject(record.data);
  const metrics = toObject(data.metrics);
  const heartRate = toNumber(data.heartRate) ?? toNumber(data.bpm) ?? toNumber(metrics.heartRate) ?? toNumber(metrics.bpm);
  const fallDetected = toBoolean(data.fallDetected) ?? toBoolean(metrics.fallDetected);
  const activityRaw = String(data.activityLevel ?? data.activity ?? '').trim();
  const assessment = String(data.assessment ?? data.note ?? '').trim();

  return {
    heartRate: heartRate === null ? 'Not provided' : `${heartRate} bpm`,
    fallDetected: fallDetected === null ? 'Not provided' : fallDetected ? 'Yes' : 'No',
    activity: activityRaw ? toTitleWords(activityRaw) : 'Not provided',
    assessment: assessment || 'No notes available',
  };
}

function getStatusHelp(status: string) {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'anchored' || normalized === 'verified') {
    return 'Authenticity check passed and blockchain proof is available.';
  }
  if (normalized === 'local_hash_only') {
    return 'Authenticity check passed locally. Blockchain network proof is currently disabled in this environment.';
  }
  if (normalized === 'tampered' || normalized === 'anchor_mismatch' || normalized === 'failed') {
    return 'Verification found a mismatch. Contact your health center for review.';
  }
  return 'Record is saved. Tap "Check Authenticity" to verify integrity.';
}

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [verification, setVerification] = useState<VerificationMap>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [extracting, setExtracting] = useState<string>('');
  const [exportTxByRecord, setExportTxByRecord] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await fetchMyPatientRecords();
      if (!active) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRecords(result.records ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  const latestDate = useMemo(() => (records.length > 0 ? new Date(records[0].createdAt).toISOString().slice(0, 10) : 'N/A'), [records]);
  const verifiedCount = useMemo(() => {
    return records.filter((record) => {
      const status = verification[record._id]?.status ?? record.blockchain?.verificationStatus ?? 'pending';
      const normalized = String(status).toLowerCase();
      return normalized === 'verified' || normalized === 'anchored' || normalized === 'local_hash_only';
    }).length;
  }, [records, verification]);

  const verifyRecord = async (recordId: string) => {
    const result = await verifyMyPatientRecord(recordId);
    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to verify record');
      return;
    }
    setError('');
    setVerification((prev) => ({ ...prev, [recordId]: result.data }));
  };

  const requestExtraction = async (record: PatientRecord) => {
    setExtracting(record._id);
    const result = await requestMyRecordExtractionOnChain(record);
    setExtracting('');
    if (result.error) {
      setNotice('');
      setError(result.error);
      return;
    }

    setError('');
    if (result.txHash) {
      setExportTxByRecord((prev) => ({ ...prev, [record._id]: result.txHash ?? '' }));
      setNotice(`Extraction request submitted on-chain. Network fee was charged to your wallet. Tx: ${result.txHash}`);
      return;
    }

    setNotice('Extraction request submitted on-chain.');
  };

  const downloadRecord = (record: PatientRecord) => {
    const verificationData = verification[record._id];
    const lines = [
      `Record ID: ${record._id}`,
      `Type: ${record.type}`,
      `Created At: ${record.createdAt}`,
      `Record Hash: ${record.recordHash}`,
      `Blockchain Tx: ${record.blockchain?.txId ?? ''}`,
      `Blockchain Status: ${verificationData?.status ?? record.blockchain?.verificationStatus ?? 'pending'}`,
      '',
      'Data:',
      JSON.stringify(record.data ?? {}, null, 2),
    ];
    downloadTextFile(`medical-record-${record._id}.txt`, lines.join('\n'));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PatientPageContentSkeleton stats={3} chartCards={0} listCards={2} listRows={4} footerNotice />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Your health history with simple summaries and authenticity checks.
          </p>
          <p className="text-xs text-muted-foreground">
            On-chain export requests must be signed by the wallet linked in Profile &amp; Settings.
          </p>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{records.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Provider-issued and self-monitoring entries</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{verifiedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Blockchain confirmed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{latestDate}</div>
              <p className="text-xs text-muted-foreground mt-1">Most recent record date</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {records.map((record) => {
            const verifyData = verification[record._id];
            const status = verifyData?.status ?? record.blockchain?.verificationStatus ?? 'pending';
            const badge = getStatusBadge(String(status));
            const isExpanded = expanded === record._id;
            const summary = getPatientRecordSummary(record);
            const verifiedAt = verifyData?.verifiedAt ?? record.blockchain?.lastVerifiedAt ?? record.blockchain?.anchoredAt ?? null;
            return (
              <Card key={record._id} className="hover:shadow-md transition-shadow overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{formatRecordType(record.type)}</CardTitle>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <CardDescription>Recorded {new Date(record.createdAt).toLocaleString()}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg border border-border bg-background/60">
                    <p className="text-sm font-semibold">Record Summary</p>
                    <p className="text-xs text-muted-foreground mt-1">Easy-to-read details for patients.</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Heart Rate</p>
                        <p className="font-medium">{summary.heartRate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fall Detected</p>
                        <p className="font-medium">{summary.fallDetected}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Activity Level</p>
                        <p className="font-medium">{summary.activity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Record Type</p>
                        <p className="font-medium">{formatRecordType(record.type)}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm">{summary.assessment}</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-muted border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {badge.variant === 'destructive' ? (
                          <ShieldAlert className="h-4 w-4 text-destructive" />
                        ) : (
                          <Shield className="h-4 w-4 text-green-600" />
                        )}
                        <p className="text-sm font-semibold">Record Authenticity</p>
                      </div>
                      {verifiedAt ? <span className="text-xs text-muted-foreground">{new Date(verifiedAt).toLocaleString()}</span> : null}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">{getStatusHelp(String(status))}</p>
                      <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2">
                        <p className="text-xs sm:text-sm">
                          <span className="font-semibold">Current Status:</span> {toTitleWords(String(status))}
                        </p>
                        <Button size="sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : record._id)} className="gap-1">
                          {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          {isExpanded ? 'Hide Technical Details' : 'Show Technical Details'}
                        </Button>
                      </div>
                      {isExpanded ? (
                        <div className="text-xs text-muted-foreground space-y-2">
                          <p className="font-semibold text-foreground">Technical Details</p>
                          <p className="break-all">
                            <span className="font-medium">Record Hash:</span> {record.recordHash}
                          </p>
                          <p className="break-all">
                            <span className="font-medium">Tx ID:</span> {record.blockchain?.txId || 'N/A'}
                          </p>
                          <p>
                            <span className="font-medium">Block:</span> {record.blockchain?.blockNumber ?? 'N/A'}
                          </p>
                          <pre className="text-xs bg-background p-3 rounded overflow-x-auto">{JSON.stringify(record.data ?? {}, null, 2)}</pre>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => verifyRecord(record._id)}>
                      <CheckCircle2 className="h-4 w-4" />
                      Check Authenticity
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => downloadRecord(record)}>
                      <Download className="h-4 w-4" />
                      Download Record
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 sm:col-span-2"
                      onClick={() => requestExtraction(record)}
                      disabled={extracting === record._id}
                    >
                      {extracting === record._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                      Request Blockchain Export (Wallet Fee)
                    </Button>
                  </div>
                  {exportTxByRecord[record._id] ? (
                    <p className="text-xs text-muted-foreground break-all">Export Tx: {exportTxByRecord[record._id]}</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
          {records.length === 0 ? <p className="text-sm text-muted-foreground">No medical records found.</p> : null}
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex gap-3">
              <Lock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-base">Read-Only Access</CardTitle>
                <CardDescription className="mt-2">
                  Patients can review records here and verify their proof history. Self-monitoring vitals may sync from patient tools, while clinical record management and governance actions remain restricted to authorized healthcare and admin roles.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
