'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { useDashboardRole } from '@/hooks/use-dashboard-role';
import { fetchAdminOverview, fetchSystemMonitoring, exportAdminJson } from '@/lib/admin-role';

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

function isHighlightedAction(value: string) {
  return /SECURITY|AUTH|RBAC/i.test(value);
}

export default function AdminDashboardPage() {
  const { sessionUser } = useDashboardRole();
  const isMunicipalAdmin = sessionUser?.adminScope === 'municipal';
  const municipalTierId = sessionUser?.adminCoverageTierId ?? 'starter';
  const canAccessCitywideFeatures = !isMunicipalAdmin || municipalTierId === 'citywide' || municipalTierId === 'enterprise';
  const canAccessEnterpriseFeatures = !isMunicipalAdmin || municipalTierId === 'enterprise';

  const [overview, setOverview] = useState<{
    users: { patients: number; providers: number; admins: number };
    providers: { total: number; active: number; pendingApproval: number };
    sessions: { active: number };
    security: { failedEvents24h: number };
    blockchain: { proofs24h: number };
  } | null>(null);
  const [monitoring, setMonitoring] = useState<{
    activeSessions: number;
    totalSessions24h: number;
    failed24h: number;
    alerts24h: number;
    suspiciousThreshold: number;
    suspicious: boolean;
    recentAudit: Array<{
      _id: string;
      action: string;
      outcome: string;
      reason?: string;
      actorType?: string;
      actorName?: string;
      createdAt: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monitoringLocked, setMonitoringLocked] = useState(false);

  const totals = useMemo(() => {
    const patients = overview?.users?.patients ?? 0;
    const providers = overview?.users?.providers ?? 0;
    const admins = overview?.users?.admins ?? 0;
    const totalUsers = patients + providers + admins;
    const activeProviders = overview?.providers?.active ?? 0;
    const pendingProviders = overview?.providers?.pendingApproval ?? 0;
    const providerActivationRate = providers > 0 ? Math.round((activeProviders / providers) * 100) : 0;
    const failedEvents = overview?.security?.failedEvents24h ?? 0;
    const suspiciousThreshold = monitoring?.suspiciousThreshold ?? 0;
    const suspicious = monitoring?.suspicious ?? false;
    return {
      patients,
      providers,
      admins,
      totalUsers,
      activeProviders,
      pendingProviders,
      providerActivationRate,
      failedEvents,
      suspiciousThreshold,
      suspicious,
    };
  }, [overview, monitoring]);

  const recentSecurity = useMemo(() => {
    const items = monitoring?.recentAudit ?? [];
    return items.filter((log) => log.outcome === 'failure' || isHighlightedAction(log.action)).slice(0, 6);
  }, [monitoring?.recentAudit]);

  useEffect(() => {
    let active = true;
    (async () => {
      setMonitoringLocked(false);
      const [overviewRes, monitoringRes] = await Promise.all([
        fetchAdminOverview(),
        canAccessCitywideFeatures ? fetchSystemMonitoring() : Promise.resolve({ error: 'Monitoring locked', monitoring: undefined }),
      ]);
      if (!active) return;
      if (overviewRes.error) {
        setError(overviewRes.error);
      } else {
        setOverview(overviewRes.overview ?? null);
      }
      if (!monitoringRes.error) {
        setMonitoring(monitoringRes.monitoring ?? null);
      } else {
        setMonitoring(null);
        if (!canAccessCitywideFeatures) {
          setMonitoringLocked(true);
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [canAccessCitywideFeatures]);

  const exportSnapshot = () => {
    exportAdminJson(`admin-overview-${new Date().toISOString().slice(0, 10)}.json`, {
      generatedAt: new Date().toISOString(),
      overview,
      monitoring,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">System governance, stability, and security oversight.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canAccessCitywideFeatures ? (
              <Button asChild variant="outline">
                <Link href="/admin/system-monitoring">Open Monitoring</Link>
              </Button>
            ) : null}
            <Button variant="outline" onClick={exportSnapshot}>
              Export Snapshot
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}
        {monitoringLocked ? (
          <Card className="border-amber-200 bg-amber-50/60">
            <CardContent className="pt-6 text-sm text-amber-800">
              Monitoring and system logs are available on Citywide Coverage or higher.
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.5fr_0.5fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Currently connected users</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : (
                    <div className="text-3xl font-bold">{monitoring?.activeSessions ?? overview?.sessions?.active ?? 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Sessions (24h)</CardTitle>
                  <CardDescription>Daily access volume</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : monitoringLocked ? (
                    <p className="text-sm text-muted-foreground">Locked</p>
                  ) : (
                    <div className="text-3xl font-bold">{monitoring?.totalSessions24h ?? 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/60">
                <CardHeader>
                  <CardTitle>Failed Events (24h)</CardTitle>
                  <CardDescription>Login or policy failures</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : (
                    <div className="text-3xl font-bold text-amber-950">{totals.failedEvents}</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Alerts (24h)</CardTitle>
                  <CardDescription>Monitoring triggers</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : monitoringLocked ? (
                    <p className="text-sm text-muted-foreground">Locked</p>
                  ) : (
                    <div className="text-3xl font-bold">{monitoring?.alerts24h ?? 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Proof Logs (24h)</CardTitle>
                  <CardDescription>Blockchain activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : (
                    <div className="text-3xl font-bold">{overview?.blockchain?.proofs24h ?? 0}</div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>Providers Pending</CardTitle>
                  <CardDescription>Need activation or verification</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : (
                    <div className="text-3xl font-bold">{totals.pendingProviders}</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Account Mix</CardTitle>
                  <CardDescription>Distribution of active accounts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
                  {!loading ? (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Patients</span>
                          <span>{totals.patients}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-emerald-500/70"
                            style={{ width: totals.totalUsers ? `${Math.round((totals.patients / totals.totalUsers) * 100)}%` : '0%' }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Providers</span>
                          <span>{totals.providers}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-sky-500/70"
                            style={{ width: totals.totalUsers ? `${Math.round((totals.providers / totals.totalUsers) * 100)}%` : '0%' }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Admins</span>
                          <span>{totals.admins}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-indigo-500/70"
                            style={{ width: totals.totalUsers ? `${Math.round((totals.admins / totals.totalUsers) * 100)}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Provider Activation</CardTitle>
                  <CardDescription>Readiness of healthcare units</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
                  {!loading ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Activation rate</span>
                        <span className="text-sm font-semibold">{totals.providerActivationRate}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-emerald-500/70" style={{ width: `${totals.providerActivationRate}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Active: {totals.activeProviders} • Pending: {totals.pendingProviders}
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Security Watch</CardTitle>
                <CardDescription>Suspicious threshold status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
                {!loading && monitoringLocked ? (
                  <p className="text-sm text-muted-foreground">Locked on Starter Coverage.</p>
                ) : null}
                {!loading && !monitoringLocked ? (
                  <div className={`rounded-xl border px-3 py-2 text-sm ${totals.suspicious ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    {totals.suspicious ? 'Attention needed' : 'Within expected range'} • Threshold {totals.suspiciousThreshold}/24h
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
                <CardDescription>Common operational entry points.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button asChild variant="outline">
                  <Link href="/admin/users">Manage Users</Link>
                </Button>
                {canAccessCitywideFeatures ? (
                  <Button asChild variant="outline">
                    <Link href="/admin/logs">Review System Logs</Link>
                  </Button>
                ) : null}
                {canAccessEnterpriseFeatures ? (
                  <Button asChild variant="outline">
                    <Link href="/admin/blockchain-management">Blockchain Supervision</Link>
                  </Button>
                ) : null}
                {!isMunicipalAdmin ? (
                  <Button asChild variant="outline">
                    <Link href="/admin/ai-configuration">RBAC Policies</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Security Activity</CardTitle>
            <CardDescription>Failures, auth events, and RBAC-related actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-muted-foreground">Loading...</p> : null}
            {!loading && monitoringLocked ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
                Recent security activity is available on Citywide Coverage or higher.
              </div>
            ) : null}
            {!loading && !monitoringLocked && recentSecurity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-muted-foreground">
                No recent high-priority activity in the latest audit batch.
              </div>
            ) : null}
            {!loading && !monitoringLocked
              ? recentSecurity.map((log) => (
                  <div key={log._id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{log.action}</p>
                      <span className={`text-xs font-semibold uppercase ${log.outcome === 'failure' ? 'text-red-600' : 'text-emerald-600'}`}>
                        {log.outcome}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(log.createdAt)}</p>
                    <p className="mt-2 text-sm text-slate-700">{log.reason || 'No reason provided.'}</p>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
