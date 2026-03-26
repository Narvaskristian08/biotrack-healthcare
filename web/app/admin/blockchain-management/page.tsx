'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import {
  archiveBlockchainLogs,
  exportAdminJson,
  fetchBlockchainMetrics,
  fetchBlockchainOverview,
  type BlockchainHistoryScope,
  type BlockchainMetricsResponse,
  type BlockchainOverviewResponse,
} from '@/lib/admin-role';

type MetricsRange = 7 | 14 | 30;

export default function AdminBlockchainPage() {
  const [overview, setOverview] = useState<BlockchainOverviewResponse | null>(null);
  const [metrics, setMetrics] = useState<BlockchainMetricsResponse | null>(null);
  const [rangeDays, setRangeDays] = useState<MetricsRange>(7);
  const [scope, setScope] = useState<BlockchainHistoryScope>('active');
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadBlockchainData = async (nextRangeDays = rangeDays, nextScope = scope) => {
    const [overviewRes, metricsRes] = await Promise.all([
      fetchBlockchainOverview(nextScope),
      fetchBlockchainMetrics(nextRangeDays, nextScope),
    ]);

    const nextError = overviewRes.error || metricsRes.error || '';
    setError(nextError);
    setOverview(overviewRes.data ?? null);
    setMetrics(metricsRes.data ?? null);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [overviewRes, metricsRes] = await Promise.all([
        fetchBlockchainOverview(scope),
        fetchBlockchainMetrics(rangeDays, scope),
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
  }, [rangeDays, scope]);

  const archiveableRecentIds = useMemo(
    () => (overview?.recent ?? []).filter((entry) => !entry.archivedAt).map((entry) => entry._id),
    [overview]
  );

  const handleArchive = async (logIds: string[]) => {
    if (logIds.length === 0) return;
    setArchiving(true);
    setError('');
    setMessage('');
    const res = await archiveBlockchainLogs(logIds);
    if (res.error) {
      setError(res.error);
      setArchiving(false);
      return;
    }

    setMessage(`${res.archivedCount ?? logIds.length} blockchain proof log${(res.archivedCount ?? logIds.length) === 1 ? '' : 's'} archived from active supervision.`);
    await loadBlockchainData();
    setArchiving(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Blockchain Supervision</h1>
            <p className="mt-1 text-muted-foreground">Smart contract status, verification audits, and local proof-log supervision.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={scope === 'active' ? 'default' : 'outline'} size="sm" onClick={() => setScope('active')}>
              Active
            </Button>
            <Button variant={scope === 'archived' ? 'default' : 'outline'} size="sm" onClick={() => setScope('archived')}>
              Archived
            </Button>
            <Button variant={scope === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setScope('all')}>
              All
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}
        {message ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="pt-6 text-sm text-emerald-700">{message}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Proof Logs (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.overview?.proofs24h ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Failed Verifications (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.overview?.failed24h ?? 0}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Success Rate ({rangeDays}d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.metrics?.totals?.successRatePct ?? 0}%</div>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Log Visibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                Active: {overview?.overview?.activeLogCount ?? 0}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">Archived: {overview?.overview?.archivedLogCount ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Proof Metrics</CardTitle>
            <CardDescription>Operational trend for success, failed, and skipped proof logs within the selected visibility scope.</CardDescription>
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
            <CardDescription>
              Local supervision history for blockchain proof operations. Archived entries are hidden from the active view but not deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={archiving || archiveableRecentIds.length === 0 || scope === 'archived'}
                onClick={() => void handleArchive(archiveableRecentIds)}
              >
                {archiving ? 'Archiving...' : 'Archive visible history'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Archive hides local proof logs from active supervision. It does not clear on-chain proofs or immutable medical records.
              </p>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading blockchain logs...</p>
            ) : (
              <div className="space-y-2">
                {(overview?.recent ?? []).map((entry) => (
                  <Card key={entry._id} className="border-slate-200">
                    <CardContent className="space-y-2 pt-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {entry.kind} | {entry.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString()} | tx: {entry.txId || 'N/A'} | block: {entry.blockNumber ?? 'N/A'}
                          </p>
                          {entry.archivedAt ? (
                            <p className="mt-1 text-xs text-muted-foreground">Archived on {new Date(entry.archivedAt).toLocaleString()}</p>
                          ) : null}
                        </div>
                        {!entry.archivedAt ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={archiving}
                            onClick={() => void handleArchive([entry._id])}
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
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
            Admins can supervise logs and node/proof status, and can archive local proof-log entries from the active supervision view. They cannot clear or alter historical blockchain hashes or immutable medical records.
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onClick={() =>
            exportAdminJson(`admin-blockchain-overview-${new Date().toISOString().slice(0, 10)}.json`, {
              generatedAt: new Date().toISOString(),
              rangeDays,
              scope,
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
