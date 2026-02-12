'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import { useDashboardRole } from '@/hooks/use-dashboard-role';
import { fetchMyPatientRecords, verifyMyPatientRecord, type PatientRecord } from '@/lib/patient-role';

export default function BlockchainPage() {
  const { role } = useDashboardRole();
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string>('');
  const [status, setStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      if (role !== 'patient') {
        setLoading(false);
        return;
      }
      const result = await fetchMyPatientRecords();
      if (!active) return;
      setLoading(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      const data = result.records ?? [];
      setRecords(data);
      const initialStatus: Record<string, string> = {};
      data.forEach((record) => {
        initialStatus[record._id] = String(record.blockchain?.verificationStatus ?? 'pending');
      });
      setStatus(initialStatus);
    })();
    return () => {
      active = false;
    };
  }, [role]);

  const verify = async (id: string) => {
    setVerifying(id);
    const result = await verifyMyPatientRecord(id);
    setVerifying('');
    if (result.error || !result.data) {
      setError(result.error ?? 'Verification failed');
      return;
    }
    setStatus((prev) => ({ ...prev, [id]: result.data?.status ?? 'pending' }));
  };

  if (role !== 'patient') {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Blockchain Management</h1>
          <p className="text-muted-foreground">Provider/Admin blockchain tooling can be managed from this area.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Lock className="h-8 w-8 text-primary" />
            Blockchain Verification
          </h1>
          <p className="text-muted-foreground">Confirm record authenticity, hash integrity, and blockchain timestamps</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading blockchain records...</p>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <Card key={record._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{record.type}</CardTitle>
                      <CardDescription>{new Date(record.createdAt).toLocaleString()}</CardDescription>
                    </div>
                    <Badge variant={status[record._id]?.toLowerCase() === 'anchored' || status[record._id]?.toLowerCase() === 'verified' ? 'default' : 'secondary'}>
                      {status[record._id] ?? 'pending'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm break-all">
                    <span className="font-semibold">Record Hash: </span>
                    {record.recordHash}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Tx ID: </span>
                    {record.blockchain?.txId || 'N/A'}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Timestamp: </span>
                    {record.blockchain?.anchoredAt ? new Date(record.blockchain.anchoredAt).toLocaleString() : 'N/A'}
                  </p>
                  <Button variant="outline" className="gap-2" onClick={() => verify(record._id)} disabled={verifying === record._id}>
                    {verifying === record._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Verify Authenticity
                  </Button>
                </CardContent>
              </Card>
            ))}
            {records.length === 0 ? <p className="text-sm text-muted-foreground">No records found.</p> : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
