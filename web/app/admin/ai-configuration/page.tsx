'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { fetchRbacSettings, updateRbacSettings, type RbacSettings } from '@/lib/admin-role';

export default function AIConfigPage() {
  const [rbac, setRbac] = useState<RbacSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchRbacSettings();
      if (!active) return;
      if (res.error) setError(res.error);
      else setRbac(res.rbac ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = (section: keyof RbacSettings, key: string) => {
    setRbac((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [key]: !prev[section][key],
        },
      };
    });
  };

  const save = async () => {
    if (!rbac) return;
    setSaving(true);
    setError('');
    setMessage('');
    const res = await updateRbacSettings(rbac);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage('RBAC policies updated.');
  };

  const renderSection = (title: string, section: keyof RbacSettings) => {
    if (!rbac) return null;
    const entries = Object.entries(rbac[section]);
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Permission-level controls for {section}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
              <div>
                <p className="font-medium text-sm">{key}</p>
                <p className="text-xs text-muted-foreground">RBAC policy flag</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(section, key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  value ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Role Management (RBAC)</h1>
          <p className="text-muted-foreground mt-1">Set permission levels and modify access policies</p>
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

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Enforcement Status</CardTitle>
            <CardDescription>What the current RBAC implementation is actively protecting.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="text-sm font-semibold text-emerald-900">Admin capabilities are enforced</p>
              <p className="mt-1 text-sm text-emerald-800">
                The admin routes use capability checks before allowing user management, system monitoring, blockchain supervision, policy updates, and backup actions.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="text-sm font-semibold text-amber-900">Patient and provider toggles are configuration-only for now</p>
              <p className="mt-1 text-sm text-amber-800">
                Those switches are saved successfully, but the current codebase does not yet enforce them on patient/provider routes. They should be treated as planned policy controls, not active blocks.
              </p>
            </div>
          </CardContent>
        </Card>

        {loading ? <p className="text-sm text-muted-foreground">Loading RBAC settings...</p> : null}
        {!loading && rbac ? (
          <>
            {renderSection('Patient Permissions', 'patient')}
            {renderSection('Provider Permissions', 'provider')}
            {renderSection('Admin Permissions', 'admin')}
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save RBAC Policies'}
            </Button>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
