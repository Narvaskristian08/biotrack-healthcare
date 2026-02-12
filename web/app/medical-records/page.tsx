'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff, Lock, Shield, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import {
  downloadTextFile,
  fetchMyPatientRecords,
  type PatientRecord,
  verifyMyPatientRecord,
  type RecordVerificationResult,
} from '@/lib/patient-role';

type VerificationMap = Record<string, RecordVerificationResult | undefined>;

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === 'anchored' || normalized === 'verified') return { label: 'Verified', variant: 'default' as const };
  if (normalized === 'tampered' || normalized === 'anchor_mismatch') return { label: 'Failed', variant: 'destructive' as const };
  return { label: 'Pending', variant: 'secondary' as const };
}

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [verification, setVerification] = useState<VerificationMap>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      return String(status).toLowerCase() === 'verified' || String(status).toLowerCase() === 'anchored';
    }).length;
  }, [records, verification]);

  const verifyRecord = async (recordId: string) => {
    const result = await verifyMyPatientRecord(recordId);
    if (result.error || !result.data) {
      setError(result.error ?? 'Failed to verify record');
      return;
    }
    setVerification((prev) => ({ ...prev, [recordId]: result.data }));
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

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Medical Records</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Historical records, blockchain verification status, and downloadable reports
          </p>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{records.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Read-only records</p>
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

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading records...</div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => {
              const verifyData = verification[record._id];
              const status = verifyData?.status ?? record.blockchain?.verificationStatus ?? 'pending';
              const badge = getStatusBadge(String(status));
              const isExpanded = expanded === record._id;
              const verifiedAt = verifyData?.verifiedAt ?? record.blockchain?.lastVerifiedAt ?? record.blockchain?.anchoredAt ?? null;
              return (
                <Card key={record._id} className="hover:shadow-md transition-shadow overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{record.type}</CardTitle>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        <CardDescription>Created {new Date(record.createdAt).toLocaleString()}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2">Record Payload</p>
                      <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(record.data ?? {}, null, 2)}</pre>
                    </div>

                    <div className="p-3 rounded-lg bg-muted border border-border">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {badge.label === 'Failed' ? (
                            <ShieldAlert className="h-4 w-4 text-destructive" />
                          ) : (
                            <Shield className="h-4 w-4 text-green-600" />
                          )}
                          <p className="text-sm font-semibold">Blockchain Verification</p>
                        </div>
                        {verifiedAt ? <span className="text-xs text-muted-foreground">{new Date(verifiedAt).toLocaleString()}</span> : null}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background p-2 rounded flex-1 overflow-hidden text-ellipsis">
                            {isExpanded ? record.recordHash : `${record.recordHash.slice(0, 24)}...`}
                          </code>
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(isExpanded ? null : record._id)}>
                            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {isExpanded ? (
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Tx ID: {record.blockchain?.txId || 'N/A'}</p>
                            <p>Block: {record.blockchain?.blockNumber ?? 'N/A'}</p>
                            <p>Status: {String(status)}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Button variant="outline" className="gap-2" onClick={() => verifyRecord(record._id)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Verify Authenticity
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => downloadRecord(record)}>
                        <Download className="h-4 w-4" />
                        Download Record
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {records.length === 0 ? <p className="text-sm text-muted-foreground">No medical records found.</p> : null}
          </div>
        )}

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex gap-3">
              <Lock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-base">Read-Only Access</CardTitle>
                <CardDescription className="mt-2">
                  Records are read-only for patient accounts. Record creation, edits, and blockchain anchoring are restricted to authorized healthcare roles.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
