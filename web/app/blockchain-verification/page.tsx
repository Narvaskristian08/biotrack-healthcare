'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Eye, EyeOff, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { fetchMyPatientRecords, verifyMyPatientRecord, type PatientRecord, type RecordVerificationResult } from '@/lib/patient-role';

export default function BlockchainVerificationPage() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [verification, setVerification] = useState<Record<string, RecordVerificationResult | undefined>>({});
  const [expandedHash, setExpandedHash] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

  const verifiedCount = useMemo(() => {
    return records.filter((record) => {
      const status = verification[record._id]?.status ?? record.blockchain?.verificationStatus ?? '';
      return String(status).toLowerCase() === 'anchored' || String(status).toLowerCase() === 'verified';
    }).length;
  }, [records, verification]);

  const verify = async (recordId: string) => {
    const result = await verifyMyPatientRecord(recordId);
    if (result.error || !result.data) {
      setError(result.error ?? 'Verification failed');
      return;
    }
    setVerification((prev) => ({ ...prev, [recordId]: result.data }));
  };

  const copyHash = async (hash: string, id: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(id);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch {
      setError('Failed to copy hash');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold">Blockchain Verification</h1>
          <p className="text-muted-foreground mt-1">Verify record authenticity with hash and timestamp confirmations</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{verifiedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending / Other</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{Math.max(0, records.length - verifiedCount)}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-base text-green-900">Immutable and Tamper-Resistant</CardTitle>
                <CardDescription className="text-green-800 mt-2">
                  Each record has a hash proof. Verification compares the stored hash and blockchain state to confirm authenticity.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading blockchain records...</p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => {
              const isExpanded = expandedHash === record._id;
              const verifyData = verification[record._id];
              const status = String(verifyData?.status ?? record.blockchain?.verificationStatus ?? 'pending');
              const verifiedAt = verifyData?.verifiedAt ?? record.blockchain?.lastVerifiedAt ?? record.blockchain?.anchoredAt;
              const txId = verifyData?.blockchain?.txId ?? record.blockchain?.txId ?? '';
              const blockNumber = verifyData?.blockchain?.blockNumber ?? record.blockchain?.blockNumber;
              return (
                <Card key={record._id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{record.type}</CardTitle>
                          <Badge variant={status.toLowerCase() === 'anchored' || status.toLowerCase() === 'verified' ? 'default' : 'secondary'}>
                            {status}
                          </Badge>
                        </div>
                        <CardDescription>Created {new Date(record.createdAt).toLocaleString()}</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => verify(record._id)}>
                        <CheckCircle2 className="h-4 w-4" />
                        Verify
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted p-2 rounded flex-1 overflow-hidden text-ellipsis font-mono">
                        {isExpanded ? record.recordHash : `${record.recordHash.substring(0, 24)}...`}
                      </code>
                      <Button size="sm" variant="ghost" onClick={() => setExpandedHash(isExpanded ? null : record._id)}>
                        {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copyHash(record.recordHash, record._id)}>
                        <Copy className={`h-4 w-4 ${copiedHash === record._id ? 'text-green-600' : ''}`} />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <p>Timestamp: {verifiedAt ? new Date(verifiedAt).toLocaleString() : 'Not yet verified'}</p>
                      <p>Block Number: {blockNumber ?? 'N/A'}</p>
                      <p className="sm:col-span-2">Transaction: {txId || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {records.length === 0 ? <p className="text-sm text-muted-foreground">No records available for verification.</p> : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
