'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import { exportAdminJson, fetchSystemLogs, type AuditLogItem } from '@/lib/admin-role';

export default function AdminLogsPage() {
  const [query, setQuery] = useState('');
  const [outcome, setOutcome] = useState('');
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (q = query, out = outcome) => {
    const res = await fetchSystemLogs({ q, outcome: out, limit: 200 });
    if (res.error) {
      setError(res.error);
      return;
    }
    setLogs(res.logs ?? []);
    setSuspiciousCount(res.suspiciousCount ?? 0);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchSystemLogs({ limit: 200 });
      if (!active) return;
      if (res.error) {
        setError(res.error);
      } else {
        setLogs(res.logs ?? []);
        setSuspiciousCount(res.suspiciousCount ?? 0);
      }
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
          <h1 className="text-3xl font-bold">System Logs & Activity</h1>
          <p className="text-muted-foreground mt-1">Security events, access logs, and suspicious activity tracking</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search and export audit logs</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by action, reason, actor..."
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                load(v, outcome);
              }}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm sm:w-48"
              value={outcome}
              onChange={(e) => {
                const v = e.target.value;
                setOutcome(v);
                load(query, v);
              }}
            >
              <option value="">All outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
            <Button
              variant="outline"
              onClick={() =>
                exportAdminJson(`admin-logs-${new Date().toISOString().slice(0, 10)}.json`, {
                  generatedAt: new Date().toISOString(),
                  suspiciousCount,
                  logs,
                })
              }
            >
              Export
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
            <CardDescription>Suspicious count: {suspiciousCount}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading logs...</p>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <Card key={log._id}>
                    <CardContent className="pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()} | {log.actorType || 'unknown'} {log.actorName ? `(${log.actorName})` : ''}
                          </p>
                          {log.reason ? <p className="text-xs text-muted-foreground mt-1">{log.reason}</p> : null}
                        </div>
                        <Badge variant={log.outcome === 'failure' ? 'destructive' : 'secondary'}>{log.outcome}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {logs.length === 0 ? <p className="text-sm text-muted-foreground">No logs found.</p> : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
