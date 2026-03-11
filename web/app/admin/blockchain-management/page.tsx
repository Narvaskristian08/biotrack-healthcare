'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import {
  exportAdminJson,
  fetchBlockchainMetrics,
  fetchBlockchainOverview,
  type BlockchainMetricsResponse,
  type BlockchainOverviewResponse,
} from '@/lib/admin-role';

type MetricsRange = 7 | 14 | 30;

export default function AdminBlockchainPage() {
  const [overview, setOverview] = useState<BlockchainOverviewResponse | null>(null);
  const [metrics, setMetrics] = useState<BlockchainMetricsResponse | null>(null);
  const [rangeDays, setRangeDays] = useState<MetricsRange>(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [overviewRes, metricsRes] = await Promise.all([
        fetchBlockchainOverview(),
        fetchBlockchainMetrics(rangeDays),
      ]);
      if (!active) return;

      const nextError = overviewRes.error || metricsRes.error || '';
      setError(nextError);
      setOverview(overviewRes.data ?? null);
      setMetrics(metricsRes.data ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [rangeDays]);

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Proof Logs (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.overview?.proofs24h ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Failed Verifications (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.overview?.failed24h ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Success Rate ({rangeDays}d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.metrics?.totals?.successRatePct ?? 0}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Avg Proofs / Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.metrics?.avgProofsPerDay ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Proof Metrics</CardTitle>
            <CardDescription>Operational trend for success/failed/skipped logs</CardDescription>
            <div className="flex flex-wrap gap-2">
              <Button variant={rangeDays === 7 ? 'default' : 'outline'} size="sm" onClick={() => setRangeDays(7)}>
                7 Days
              </Button>
              <Button variant={rangeDays === 14 ? 'default' : 'outline'} size="sm" onClick={() => setRangeDays(14)}>
                14 Days
              </Button>
              <Button variant={rangeDays === 30 ? 'default' : 'outline'} size="sm" onClick={() => setRangeDays(30)}>
                30 Days
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading blockchain metrics...</p>
            ) : (
              <div className="space-y-2">
                {(metrics?.metrics?.daily ?? []).map((entry) => (
                  <div key={entry.day} className="rounded-md border p-3 text-sm">
                    <div className="font-medium">{entry.day}</div>
                    <div className="text-muted-foreground">
                      Total: {entry.total} | Success: {entry.success} | Failed: {entry.failed} | Skipped: {entry.skipped}
                    </div>
                  </div>
                ))}
                {(metrics?.metrics?.daily?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">No metrics available for this range.</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

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
                {(overview?.recent ?? []).map((entry) => (
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
                {(overview?.recent?.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No blockchain history available.</p> : null}
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
              rangeDays,
              overview,
              metrics,
            })
          }
        >
          Export Blockchain Audit
        </Button>
      </div>
    </DashboardLayout>
  );
}
