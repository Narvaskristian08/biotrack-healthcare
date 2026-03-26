'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import {
  fetchGovernanceSettings,
  markRestore,
  runBackup,
  updateGovernanceSettings,
  type GovernanceSettings,
  type PerformanceThresholds,
} from '@/lib/admin-role';

export default function BackupRecoveryPage() {
  const [governance, setGovernance] = useState<GovernanceSettings | null>(null);
  const [performance, setPerformance] = useState<PerformanceThresholds | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    const res = await fetchGovernanceSettings();
    if (res.error) {
      setError(res.error);
      return;
    }
    setGovernance(res.dataGovernance ?? null);
    setPerformance(res.performanceThresholds ?? null);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    if (!governance || !performance) return;
    setSaving(true);
    setError('');
    setMessage('');
    const res = await updateGovernanceSettings({
      dataGovernance: governance,
      performanceThresholds: performance,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage('Governance settings updated.');
  };

  const triggerBackup = async () => {
    setError('');
    setMessage('');
    const res = await runBackup();
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage(`Backup marker updated at ${res.lastBackupAt ? new Date(res.lastBackupAt).toLocaleString() : 'N/A'}.`);
    await load();
  };

  const triggerRestore = async () => {
    setError('');
    setMessage('');
    const res = await markRestore();
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage(`Restore marker updated at ${res.lastRestoreAt ? new Date(res.lastRestoreAt).toLocaleString() : 'N/A'}.`);
    await load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Governance & Backup</h1>
          <p className="text-muted-foreground mt-1">Privacy compliance, encryption controls, and backup/restore governance</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}
        {message ? (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-6 text-sm text-green-700">{message}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading governance settings...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Encryption</CardTitle>
                <CardDescription>Ensure privacy compliance and encryption enforcement</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-sm flex items-center justify-between p-3 rounded-lg border border-border">
                  Encryption at rest
                  <input
                    type="checkbox"
                    checked={Boolean(governance?.encryptionAtRest)}
                    onChange={(e) => setGovernance((prev) => (prev ? { ...prev, encryptionAtRest: e.target.checked } : prev))}
                  />
                </label>
                <label className="text-sm flex items-center justify-between p-3 rounded-lg border border-border">
                  Encryption in transit
                  <input
                    type="checkbox"
                    checked={Boolean(governance?.encryptionInTransit)}
                    onChange={(e) => setGovernance((prev) => (prev ? { ...prev, encryptionInTransit: e.target.checked } : prev))}
                  />
                </label>
                <label className="text-sm flex items-center justify-between p-3 rounded-lg border border-border">
                  Backup enabled
                  <input
                    type="checkbox"
                    checked={Boolean(governance?.backupEnabled)}
                    onChange={(e) => setGovernance((prev) => (prev ? { ...prev, backupEnabled: e.target.checked } : prev))}
                  />
                </label>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Compliance mode</p>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={governance?.privacyComplianceMode ?? 'strict'}
                    onChange={(e) =>
                      setGovernance((prev) =>
                        prev ? { ...prev, privacyComplianceMode: e.target.value as 'strict' | 'standard' } : prev
                      )
                    }
                  >
                    <option value="strict">strict</option>
                    <option value="standard">standard</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Retention days</p>
                  <input
                    type="number"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={governance?.retentionDays ?? 365}
                    onChange={(e) => setGovernance((prev) => (prev ? { ...prev, retentionDays: Number(e.target.value || 0) } : prev))}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Backup schedule</p>
                  <input
                    type="text"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={governance?.backupSchedule ?? ''}
                    onChange={(e) => setGovernance((prev) => (prev ? { ...prev, backupSchedule: e.target.value } : prev))}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance & Security Thresholds</CardTitle>
                <CardDescription>System monitoring control limits</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Max Alert Latency (ms)</p>
                  <input
                    type="number"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={performance?.maxAlertLatencyMs ?? 1500}
                    onChange={(e) =>
                      setPerformance((prev) => (prev ? { ...prev, maxAlertLatencyMs: Number(e.target.value || 0) } : prev))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Max API P95 (ms)</p>
                  <input
                    type="number"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={performance?.maxApiP95Ms ?? 1200}
                    onChange={(e) =>
                      setPerformance((prev) => (prev ? { ...prev, maxApiP95Ms: Number(e.target.value || 0) } : prev))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Suspicious Failures / hr</p>
                  <input
                    type="number"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    value={performance?.suspiciousFailuresPerHour ?? 10}
                    onChange={(e) =>
                      setPerformance((prev) =>
                        prev ? { ...prev, suspiciousFailuresPerHour: Number(e.target.value || 0) } : prev
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup / Restore Operations</CardTitle>
                <CardDescription>Operational metadata for backup governance controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Last backup: {governance?.lastBackupAt ? new Date(governance.lastBackupAt).toLocaleString() : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Last restore: {governance?.lastRestoreAt ? new Date(governance.lastRestoreAt).toLocaleString() : 'N/A'}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={triggerBackup}>Run Backup Marker</Button>
                  <Button variant="outline" onClick={triggerRestore}>
                    Mark Restore Event
                  </Button>
                  <Button variant="secondary" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Governance Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
