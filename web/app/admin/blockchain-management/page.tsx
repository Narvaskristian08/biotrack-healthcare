'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { exportAdminJson, fetchBlockchainOverview, type BlockchainOverviewResponse } from '@/lib/admin-role';

export default function AdminBlockchainPage() {
  const [data, setData] = useState<BlockchainOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchBlockchainOverview();
      if (!active) return;
      if (res.error) setError(res.error);
      else setData(res.data ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Blockchain Supervision</h1>
          <p className="text-muted-foreground mt-1">Smart contract status, verification audits, and submission history</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Proof Logs (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.overview?.proofs24h ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Failed Verifications (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.overview?.failed24h ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Entries Loaded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.recent?.length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Verification History</CardTitle>
            <CardDescription>Immutable audit stream for blockchain proof operations</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading blockchain logs...</p>
            ) : (
              <div className="space-y-2">
                {(data?.recent ?? []).map((entry) => (
                  <Card key={entry._id}>
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium">
                        {entry.kind} | {entry.status}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()} | tx: {entry.txId || 'N/A'} | block: {entry.blockNumber ?? 'N/A'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {(data?.recent?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No blockchain history available.</p> : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restriction Notice</CardTitle>
            <CardDescription>Immutable blockchain safety controls</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Admins can supervise logs and node/proof status but cannot alter historical blockchain hashes or immutable medical records.
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={() =>
            exportAdminJson(`admin-blockchain-overview-${new Date().toISOString().slice(0, 10)}.json`, {
              generatedAt: new Date().toISOString(),
              data,
            })
          }
        >
          Export Blockchain Audit
        </Button>
      </div>
    </DashboardLayout>
  );
}
