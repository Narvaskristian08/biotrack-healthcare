'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { fetchAdminOverview, fetchSystemMonitoring, exportAdminJson } from '@/lib/admin-role';

export default function AdminDashboardPage() {
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
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [overviewRes, monitoringRes] = await Promise.all([fetchAdminOverview(), fetchSystemMonitoring()]);
      if (!active) return;
      if (overviewRes.error) {
        setError(overviewRes.error);
      } else {
        setOverview(overviewRes.overview ?? null);
      }
      if (!monitoringRes.error) {
        setMonitoring(monitoringRes.monitoring ?? null);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const exportSnapshot = () => {
    exportAdminJson(`admin-overview-${new Date().toISOString().slice(0, 10)}.json`, {
      generatedAt: new Date().toISOString(),
      overview,
      monitoring,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">System governance, stability, and security oversight</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Overall platform stability</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    Active sessions: {monitoring?.activeSessions ?? 0} | Suspicious: {monitoring?.suspicious ? 'Yes' : 'No'}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="ghost">View services</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Accounts and role access</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <div className="text-3xl font-bold">{overview?.users?.patients ?? 0}</div>
                  <div className="text-sm text-muted-foreground">
                    Patients | Providers: {overview?.users?.providers ?? 0} | Admins: {overview?.users?.admins ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Barangays pending activation (pending/verified): {overview?.providers?.pendingApproval ?? 0}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Blockchain & Security</CardTitle>
              <CardDescription>Proof and suspicious activity monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">Proof logs (24h): {overview?.blockchain?.proofs24h ?? 0}</div>
                  <div className="text-sm text-muted-foreground">Failed events (24h): {overview?.security?.failedEvents24h ?? 0}</div>
                  <div className="mt-4">
                    <Button variant="outline" onClick={exportSnapshot}>
                      Export Snapshot
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
