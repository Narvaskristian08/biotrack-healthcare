'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Clock3, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { exportAdminJson, fetchSystemMonitoring, type AuditLogItem } from '@/lib/admin-role';

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

function isHighlighted(log: AuditLogItem) {
  return log.outcome === 'failure' || /SECURITY|AUTH|RBAC/i.test(log.action);
}

export default function AdminSystemMonitoringPage() {
  const [monitoring, setMonitoring] = useState<{
    activeSessions: number;
    totalSessions24h: number;
    failed24h: number;
    alerts24h: number;
    suspiciousThreshold: number;
    suspicious: boolean;
    recentAudit: AuditLogItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadMonitoring = async () => {
    const res = await fetchSystemMonitoring();
    if (res.error) {
      setError(res.error);
      return;
    }
    setError('');
    setMonitoring(res.monitoring ?? null);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchSystemMonitoring();
      if (!active) return;
      if (res.error) {
        setError(res.error);
      } else {
        setError('');
        setMonitoring(res.monitoring ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const highlightedAudit = useMemo(
    () => (monitoring?.recentAudit ?? []).filter(isHighlighted).slice(0, 6),
    [monitoring?.recentAudit]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-700">
              Admin Operations
            </Badge>
            <div>
              <h1 className="text-3xl font-bold">System Monitoring</h1>
              <p className="mt-1 text-muted-foreground">Operational health, suspicious activity, and the most recent security-relevant events.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRefreshing(true);
                void loadMonitoring().finally(() => setRefreshing(false));
              }}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                exportAdminJson(`admin-system-monitoring-${new Date().toISOString().slice(0, 10)}.json`, {
                  generatedAt: new Date().toISOString(),
                  monitoring,
                })
              }
              disabled={loading}
            >
              Export snapshot
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-slate-200">
            <CardContent className="flex items-start justify-between gap-3 pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Active sessions</p>
                <p className="mt-2 text-3xl font-bold">{monitoring?.activeSessions ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="flex items-start justify-between gap-3 pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Sessions in last 24h</p>
                <p className="mt-2 text-3xl font-bold">{monitoring?.totalSessions24h ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                <Clock3 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="flex items-start justify-between gap-3 pt-6">
              <div>
                <p className="text-sm text-amber-700/80">Failed events in last 24h</p>
                <p className="mt-2 text-3xl font-bold text-amber-950">{monitoring?.failed24h ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className={monitoring?.suspicious ? 'border-destructive/30 bg-destructive/5' : 'border-emerald-200 bg-emerald-50/60'}>
            <CardContent className="flex items-start justify-between gap-3 pt-6">
              <div>
                <p className="text-sm text-muted-foreground">Suspicious threshold status</p>
                <p className="mt-2 text-2xl font-bold">{monitoring?.suspicious ? 'Attention needed' : 'Within range'}</p>
                <p className="mt-1 text-xs text-muted-foreground">Threshold: {monitoring?.suspiciousThreshold ?? 0} failures / 24h</p>
              </div>
              <div className={`rounded-2xl p-3 ${monitoring?.suspicious ? 'bg-destructive/10 text-destructive' : 'bg-emerald-100 text-emerald-700'}`}>
                <ShieldAlert className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Priorities</CardTitle>
              <CardDescription>Failures, security actions, and RBAC-related events from the latest activity stream.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? <p className="text-sm text-muted-foreground">Loading monitoring data...</p> : null}
              {!loading && highlightedAudit.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-muted-foreground">
                  No recent high-priority events were found in the current monitoring window.
                </div>
              ) : null}
              {!loading
                ? highlightedAudit.map((log) => (
                    <div key={log._id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{log.action}</p>
                            <Badge variant={log.outcome === 'failure' ? 'destructive' : 'secondary'}>{log.outcome}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {log.actorType || 'unknown'}{log.actorName ? ` • ${log.actorName}` : ''} • {formatTimestamp(log.createdAt)}
                          </p>
                          <p className="text-sm text-slate-700">{log.reason || 'No reason recorded.'}</p>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link href="/admin/logs">
                            Open logs
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
            <CardHeader>
              <CardTitle>Operator Checklist</CardTitle>
              <CardDescription>Recommended next actions when activity starts drifting outside expected ranges.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium">1. Investigate failed events</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review authentication failures and repeated denied actions first. They are the strongest indicators of session misuse or policy gaps.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium">2. Verify blockchain operations separately</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Blockchain proof logs are supervised on the blockchain page and can now be archived locally without deleting immutable proof history.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium">3. Confirm RBAC policy impact</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Admin capabilities are enforced at the API layer. Review the RBAC page before changing monitoring, user-management, or backup access.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href="/admin/logs">Open System Logs</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/admin/blockchain-management">Open Blockchain Supervision</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/admin/ai-configuration">Open RBAC Policies</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
