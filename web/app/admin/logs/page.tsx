'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/dashboard-layout';
import { exportAdminJson, fetchSystemLogs, type AuditLogItem, type AuditLogPagination } from '@/lib/admin-role';

function shortId(value?: string) {
  if (!value) return 'n/a';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function AdminLogsPage() {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [suspiciousCount, setSuspiciousCount] = useState(0);
  const [pagination, setPagination] = useState<AuditLogPagination>({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = useCallback(async (params?: { q?: string; action?: string; outcome?: string; page?: number; limit?: number }) => {
    const next = {
      q: params?.q ?? query,
      action: params?.action ?? action,
      outcome: params?.outcome ?? outcome,
      page: params?.page ?? page,
      limit: params?.limit ?? limit,
    };
    const res = await fetchSystemLogs(next);
    if (res.error) {
      setError(res.error);
      return;
    }
    setError('');
    setLogs(res.logs ?? []);
    setSuspiciousCount(res.suspiciousCount ?? 0);
    if (res.pagination) {
      setPagination(res.pagination);
      setPage(res.pagination.page);
      setLimit(res.pagination.limit);
    }
  }, [query, action, outcome, page, limit]);

  const applyFilters = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await loadLogs({ page: 1 });
    setRefreshing(false);
  }, [loadLogs]);

  const resetFilters = useCallback(async () => {
    setQuery('');
    setAction('');
    setOutcome('');
    setPage(1);
    setLimit(100);
    setRefreshing(true);
    await loadLogs({ q: '', action: '', outcome: '', page: 1, limit: 100 });
    setRefreshing(false);
  }, [loadLogs]);

  const refreshNow = useCallback(async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  }, [loadLogs]);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchSystemLogs({ page: 1, limit: 100 });
      if (!active) return;
      if (res.error) {
        setError(res.error);
      } else {
        setError('');
        setLogs(res.logs ?? []);
        setSuspiciousCount(res.suspiciousCount ?? 0);
        if (res.pagination) {
          setPagination(res.pagination);
          setPage(res.pagination.page);
          setLimit(res.pagination.limit);
        }
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      void loadLogs();
    }, 10000);
    return () => window.clearInterval(id);
  }, [autoRefresh, loadLogs]);

  const rangeLabel = useMemo(() => {
    if (pagination.total === 0 || logs.length === 0) return '0 of 0';
    const start = (pagination.page - 1) * pagination.limit + 1;
    const end = start + logs.length - 1;
    return `${start}-${end} of ${pagination.total}`;
  }, [logs.length, pagination.page, pagination.limit, pagination.total]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">System Logs & Activity</h1>
          <p className="text-muted-foreground mt-1">Complete activity stream across admin, provider, and patient actions</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Search, paginate, refresh, and export activity logs</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <Input
              placeholder="Search action, reason, actor, user-agent..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Input placeholder="Action (exact match)" value={action} onChange={(e) => setAction(e.target.value)} />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            >
              <option value="">All outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={String(limit)}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
              <option value="200">200 per page</option>
              <option value="500">500 per page</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void applyFilters()} disabled={refreshing}>
                Apply
              </Button>
              <Button variant="outline" onClick={() => void resetFilters()} disabled={refreshing}>
                Reset
              </Button>
            </div>
          </CardContent>
          <CardContent className="pt-0 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void refreshNow()} disabled={refreshing || loading}>
              {refreshing ? 'Refreshing...' : 'Refresh now'}
            </Button>
            <Button variant={autoRefresh ? 'default' : 'outline'} onClick={() => setAutoRefresh((prev) => !prev)}>
              Auto refresh: {autoRefresh ? 'On (10s)' : 'Off'}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                exportAdminJson(`admin-logs-${new Date().toISOString().slice(0, 10)}.json`, {
                  generatedAt: new Date().toISOString(),
                  filters: { query, action, outcome, page, limit },
                  suspiciousCount,
                  pagination,
                  logs,
                })
              }
            >
              Export current view
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Activities</CardTitle>
            <CardDescription>
              Showing {rangeLabel} | Suspicious (filtered): {suspiciousCount}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading logs...</p>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Actor</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log._id}>
                          <TableCell className="whitespace-nowrap text-xs">{new Date(log.createdAt).toLocaleString()}</TableCell>
                          <TableCell className="font-medium text-xs">{log.action}</TableCell>
                          <TableCell className="text-xs">
                            <div>{log.actorType || 'unknown'}{log.actorName ? ` (${log.actorName})` : ''}</div>
                            <div className="text-muted-foreground">{shortId(log.actorId)}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div>{log.entityType || 'n/a'}</div>
                            <div className="text-muted-foreground">{shortId(log.entityId)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.outcome === 'failure' ? 'destructive' : 'secondary'}>{log.outcome}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[320px] text-xs">
                            {log.reason ? <div className="truncate">{log.reason}</div> : <div className="text-muted-foreground">No reason</div>}
                            {(log.ip || log.userAgent) ? (
                              <div className="text-muted-foreground mt-1 truncate">
                                {log.ip ? `${log.ip} | ` : ''}{log.userAgent || ''}
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {logs.length === 0 ? <p className="text-sm text-muted-foreground">No logs found for current filters.</p> : null}

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} / {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={!pagination.hasPrev || refreshing}
                      onClick={() => {
                        const nextPage = Math.max(pagination.page - 1, 1);
                        setPage(nextPage);
                        setRefreshing(true);
                        void loadLogs({ page: nextPage }).finally(() => setRefreshing(false));
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!pagination.hasNext || refreshing}
                      onClick={() => {
                        const nextPage = pagination.page + 1;
                        setPage(nextPage);
                        setRefreshing(true);
                        void loadLogs({ page: nextPage }).finally(() => setRefreshing(false));
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
