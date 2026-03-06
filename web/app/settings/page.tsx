'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, Save, Settings, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardLayout from '@/components/dashboard-layout';
import LogoutConfirmDialog from '@/components/logout-confirm-dialog';
import { getSession } from '@/lib/auth';
import { useDashboardRole } from '@/hooks/use-dashboard-role';
import { fetchMyPatientProfile, fetchMyPatientRecords, updateMyPatientProfile, downloadTextFile } from '@/lib/patient-role';
import { fetchMyProviderProfile, updateMyProviderProfile } from '@/lib/provider-role';
import { exportAdminJson, fetchGovernanceSettings, updateGovernanceSettings } from '@/lib/admin-role';

type NotificationPrefs = { alerts: boolean; emails: boolean; sms: boolean };
type PatientForm = {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  contactNumber: string;
};
type ProviderForm = {
  name: string;
  holderName: string;
  healthCenterName: string;
  officialContactInfo: string;
  address: string;
  contactNumber: string;
  email: string;
};
type AdminForm = {
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  retentionDays: string;
  backupEnabled: boolean;
  backupSchedule: string;
  maxApiP95Ms: string;
  suspiciousFailuresPerHour: string;
};

const PREFS_KEY = 'biotrack.notification-preferences';
const DEFAULT_PREFS: NotificationPrefs = { alerts: true, emails: true, sms: false };

export default function SettingsPage() {
  const router = useRouter();
  const { role, sessionUser, logout } = useDashboardRole();
  const session = getSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [patientForm, setPatientForm] = useState<PatientForm | null>(null);
  const [providerForm, setProviderForm] = useState<ProviderForm | null>(null);
  const [adminForm, setAdminForm] = useState<AdminForm | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
      setPrefs({
        alerts: Boolean(parsed.alerts),
        emails: Boolean(parsed.emails),
        sms: Boolean(parsed.sms),
      });
    } catch {
      // ignore invalid storage
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setMessage('');

    const load = async () => {
      if (role === 'patient') {
        const res = await fetchMyPatientProfile();
        if (!active) return;
        if (res.error || !res.patient) {
          setError(res.error ?? 'Failed to load patient profile');
        } else {
          setPatientForm({
            firstName: res.patient.firstName ?? '',
            lastName: res.patient.lastName ?? '',
            email: res.patient.email ?? '',
            address: res.patient.address ?? '',
            contactNumber: res.patient.contactNumber ?? '',
          });
        }
        setProviderForm(null);
        setAdminForm(null);
        setLoading(false);
        return;
      }

      if (role === 'provider') {
        const res = await fetchMyProviderProfile();
        if (!active) return;
        if (res.error || !res.healthCenter) {
          setError(res.error ?? 'Failed to load provider profile');
          setProviderForm({
            name: sessionUser?.name ?? '',
            holderName: '',
            healthCenterName: '',
            officialContactInfo: '',
            address: '',
            contactNumber: '',
            email: sessionUser?.email ?? '',
          });
        } else {
          setProviderForm({
            name: res.healthCenter.name ?? '',
            holderName: res.healthCenter.holderName ?? '',
            healthCenterName: res.healthCenter.healthCenterName ?? '',
            officialContactInfo: res.healthCenter.officialContactInfo ?? '',
            address: res.healthCenter.address ?? '',
            contactNumber: res.healthCenter.contactNumber ?? '',
            email: res.healthCenter.email ?? '',
          });
        }
        setPatientForm(null);
        setAdminForm(null);
        setLoading(false);
        return;
      }

      const res = await fetchGovernanceSettings();
      if (!active) return;
      if (res.error || !res.dataGovernance || !res.performanceThresholds) {
        setError(res.error ?? 'Failed to load admin settings');
      } else {
        setAdminForm({
          encryptionAtRest: res.dataGovernance.encryptionAtRest,
          encryptionInTransit: res.dataGovernance.encryptionInTransit,
          retentionDays: String(res.dataGovernance.retentionDays),
          backupEnabled: res.dataGovernance.backupEnabled,
          backupSchedule: res.dataGovernance.backupSchedule,
          maxApiP95Ms: String(res.performanceThresholds.maxApiP95Ms),
          suspiciousFailuresPerHour: String(res.performanceThresholds.suspiciousFailuresPerHour),
        });
      }
      setPatientForm(null);
      setProviderForm(null);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [role, sessionUser?.email, sessionUser?.name]);
  const saveRoleSettings = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    if (role === 'patient' && patientForm) {
      const patientPatch: {
        firstName?: string;
        lastName?: string;
        email?: string;
        address?: string;
        contactNumber?: string;
      } = {};
      if (patientForm.firstName.trim()) patientPatch.firstName = patientForm.firstName.trim();
      if (patientForm.lastName.trim()) patientPatch.lastName = patientForm.lastName.trim();
      if (patientForm.email.trim()) patientPatch.email = patientForm.email.trim().toLowerCase();
      if (patientForm.address.trim()) patientPatch.address = patientForm.address.trim();
      if (patientForm.contactNumber.trim()) patientPatch.contactNumber = patientForm.contactNumber.trim();

      if (Object.keys(patientPatch).length === 0) {
        setError('Provide at least one non-empty field before saving.');
        setSaving(false);
        return;
      }

      const res = await updateMyPatientProfile(patientPatch);
      if (res.error || !res.patient) {
        setError(res.error ?? 'Failed to save patient settings');
      } else {
        setPatientForm({
          firstName: res.patient.firstName ?? '',
          lastName: res.patient.lastName ?? '',
          email: res.patient.email ?? '',
          address: res.patient.address ?? '',
          contactNumber: res.patient.contactNumber ?? '',
        });
        setMessage('Patient settings saved.');
      }
      setSaving(false);
      return;
    }

    if (role === 'provider' && providerForm) {
      const providerPatch: {
        name?: string;
        holderName?: string;
        healthCenterName?: string;
        officialContactInfo?: string;
        address?: string;
        contactNumber?: string;
      } = {};
      if (providerForm.name.trim()) providerPatch.name = providerForm.name.trim();
      if (providerForm.holderName.trim()) providerPatch.holderName = providerForm.holderName.trim();
      if (providerForm.healthCenterName.trim()) providerPatch.healthCenterName = providerForm.healthCenterName.trim();
      if (providerForm.officialContactInfo.trim()) providerPatch.officialContactInfo = providerForm.officialContactInfo.trim();
      if (providerForm.address.trim()) providerPatch.address = providerForm.address.trim();
      if (providerForm.contactNumber.trim()) providerPatch.contactNumber = providerForm.contactNumber.trim();

      if (Object.keys(providerPatch).length === 0) {
        setError('Provide at least one non-empty field before saving.');
        setSaving(false);
        return;
      }

      const res = await updateMyProviderProfile(providerPatch);
      if (res.error || !res.healthCenter) {
        setError(res.error ?? 'Failed to save provider settings');
      } else {
        setProviderForm({
          name: res.healthCenter.name ?? '',
          holderName: res.healthCenter.holderName ?? '',
          healthCenterName: res.healthCenter.healthCenterName ?? '',
          officialContactInfo: res.healthCenter.officialContactInfo ?? '',
          address: res.healthCenter.address ?? '',
          contactNumber: res.healthCenter.contactNumber ?? '',
          email: res.healthCenter.email ?? providerForm.email,
        });
        setMessage('Provider settings saved.');
      }
      setSaving(false);
      return;
    }

    if (role === 'admin' && adminForm) {
      const retentionDays = Number(adminForm.retentionDays);
      const maxApiP95Ms = Number(adminForm.maxApiP95Ms);
      const suspiciousFailuresPerHour = Number(adminForm.suspiciousFailuresPerHour);
      if (!Number.isFinite(retentionDays) || !Number.isFinite(maxApiP95Ms) || !Number.isFinite(suspiciousFailuresPerHour)) {
        setError('Numeric system values are invalid.');
        setSaving(false);
        return;
      }

      const res = await updateGovernanceSettings({
        dataGovernance: {
          encryptionAtRest: adminForm.encryptionAtRest,
          encryptionInTransit: adminForm.encryptionInTransit,
          retentionDays: Math.max(1, Math.floor(retentionDays)),
          backupEnabled: adminForm.backupEnabled,
          backupSchedule: adminForm.backupSchedule.trim(),
        },
        performanceThresholds: {
          maxApiP95Ms: Math.max(1, Math.floor(maxApiP95Ms)),
          suspiciousFailuresPerHour: Math.max(1, Math.floor(suspiciousFailuresPerHour)),
        },
      });

      if (res.error) {
        setError(res.error);
      } else {
        setMessage('Admin system settings saved.');
      }
      setSaving(false);
      return;
    }

    setSaving(false);
  };

  const updatePrefs = (patch: Partial<NotificationPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      if (typeof window !== 'undefined') {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      }
      return next;
    });
    setMessage('Notification preferences updated.');
    setError('');
  };

  const exportRoleData = async () => {
    setError('');
    setMessage('');
    if (role === 'patient') {
      const res = await fetchMyPatientRecords();
      if (res.error) {
        setError(res.error);
        return;
      }
      downloadTextFile(
        `patient-records-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(res.records ?? [], null, 2),
        'application/json;charset=utf-8'
      );
      setMessage('Patient records exported.');
      return;
    }
    if (role === 'admin') {
      exportAdminJson(`admin-settings-${new Date().toISOString().slice(0, 10)}.json`, {
        generatedAt: new Date().toISOString(),
        settings: adminForm,
      });
      setMessage('Admin settings exported.');
      return;
    }

    downloadTextFile(
      `provider-profile-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(providerForm ?? {}, null, 2),
      'application/json;charset=utf-8'
    );
    setMessage('Provider profile exported.');
  };

  const requestLogout = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogout = async () => {
    setLogoutPending(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLogoutPending(false);
      setLogoutDialogOpen(false);
    }
  };

  const saveDisabled = useMemo(() => {
    if (loading || saving) return true;
    if (role === 'patient') return !patientForm;
    if (role === 'provider') return !providerForm;
    return !adminForm;
  }, [adminForm, loading, patientForm, providerForm, role, saving]);

  return (
    <DashboardLayout>
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogout}
        loading={logoutPending}
      />
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Dynamic settings for your active role: <span className="font-semibold capitalize">{role}</span>
          </p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}
        {message ? (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardContent className="pt-6 text-sm text-emerald-700">{message}</CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="glass-sm border-white/10 bg-white/10">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-4">
            <Card className="glass glow-green">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Live profile data sourced from API by role.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {role === 'patient' ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>First Name</Label>
                        <Input value={patientForm?.firstName ?? ''} onChange={(e) => setPatientForm((prev) => (prev ? { ...prev, firstName: e.target.value } : prev))} disabled={!patientForm || loading} />
                      </div>
                      <div className="space-y-2">
                        <Label>Last Name</Label>
                        <Input value={patientForm?.lastName ?? ''} onChange={(e) => setPatientForm((prev) => (prev ? { ...prev, lastName: e.target.value } : prev))} disabled={!patientForm || loading} />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={patientForm?.email ?? ''} onChange={(e) => setPatientForm((prev) => (prev ? { ...prev, email: e.target.value } : prev))} disabled={!patientForm || loading} />
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Number</Label>
                        <Input value={patientForm?.contactNumber ?? ''} onChange={(e) => setPatientForm((prev) => (prev ? { ...prev, contactNumber: e.target.value } : prev))} disabled={!patientForm || loading} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={patientForm?.address ?? ''} onChange={(e) => setPatientForm((prev) => (prev ? { ...prev, address: e.target.value } : prev))} disabled={!patientForm || loading} />
                    </div>
                  </>
                ) : null}

                {role === 'provider' ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Barangay Unit Name</Label><Input value={providerForm?.name ?? ''} onChange={(e) => setProviderForm((prev) => (prev ? { ...prev, name: e.target.value } : prev))} disabled={!providerForm || loading} /></div>
                      <div className="space-y-2"><Label>Holder Name</Label><Input value={providerForm?.holderName ?? ''} onChange={(e) => setProviderForm((prev) => (prev ? { ...prev, holderName: e.target.value } : prev))} disabled={!providerForm || loading} /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Health Center Name</Label><Input value={providerForm?.healthCenterName ?? ''} onChange={(e) => setProviderForm((prev) => (prev ? { ...prev, healthCenterName: e.target.value } : prev))} disabled={!providerForm || loading} /></div>
                      <div className="space-y-2"><Label>Contact Number</Label><Input value={providerForm?.contactNumber ?? ''} onChange={(e) => setProviderForm((prev) => (prev ? { ...prev, contactNumber: e.target.value } : prev))} disabled={!providerForm || loading} /></div>
                    </div>
                  </>
                ) : null}

                {role === 'admin' ? (
                  <p className="text-sm text-muted-foreground">Admin profile identity is session-managed. Use System tab to change governance settings.</p>
                ) : null}

                <Button className="w-full" onClick={saveRoleSettings} disabled={saveDisabled}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save Changes'}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card className="glass glow-cyan">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-secondary" />Session Security</CardTitle>
                <CardDescription>Session identity data from current access token.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Role:</span> <span className="capitalize">{role}</span></p>
                <p><span className="font-semibold">Email:</span> {session?.email ?? 'N/A'}</p>
                <p><span className="font-semibold">User ID:</span> {session?.id ?? 'N/A'}</p>
                <p><span className="font-semibold">Login Time:</span> {session?.loginTime ? new Date(session.loginTime).toLocaleString() : 'N/A'}</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card className="glass glow-green">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Notification Preferences</CardTitle>
                <CardDescription>Stored per browser in local storage.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><p className="font-semibold">Critical Alerts</p><p className="text-sm text-muted-foreground">Urgent health and system alerts.</p></div><Switch checked={prefs.alerts} onCheckedChange={(checked) => updatePrefs({ alerts: checked })} /></div>
                <div className="flex items-center justify-between"><div><p className="font-semibold">Email Notifications</p><p className="text-sm text-muted-foreground">Summaries and account updates.</p></div><Switch checked={prefs.emails} onCheckedChange={(checked) => updatePrefs({ emails: checked })} /></div>
                <div className="flex items-center justify-between"><div><p className="font-semibold">SMS Notifications</p><p className="text-sm text-muted-foreground">Critical events via mobile SMS.</p></div><Switch checked={prefs.sms} onCheckedChange={(checked) => updatePrefs({ sms: checked })} /></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card className="glass glow-cyan">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>{role === 'admin' ? 'Live governance settings from backend.' : 'Read-only for non-admin roles.'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {role === 'admin' ? (
                  <>
                    <div className="flex items-center justify-between"><Label>Encryption At Rest</Label><Switch checked={adminForm?.encryptionAtRest ?? false} onCheckedChange={(checked) => setAdminForm((prev) => (prev ? { ...prev, encryptionAtRest: checked } : prev))} disabled={!adminForm || loading} /></div>
                    <div className="flex items-center justify-between"><Label>Encryption In Transit</Label><Switch checked={adminForm?.encryptionInTransit ?? false} onCheckedChange={(checked) => setAdminForm((prev) => (prev ? { ...prev, encryptionInTransit: checked } : prev))} disabled={!adminForm || loading} /></div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Retention Days</Label><Input value={adminForm?.retentionDays ?? ''} onChange={(e) => setAdminForm((prev) => (prev ? { ...prev, retentionDays: e.target.value } : prev))} disabled={!adminForm || loading} /></div>
                      <div className="space-y-2"><Label>Backup Schedule</Label><Input value={adminForm?.backupSchedule ?? ''} onChange={(e) => setAdminForm((prev) => (prev ? { ...prev, backupSchedule: e.target.value } : prev))} disabled={!adminForm || loading} /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><Label>Max API P95 (ms)</Label><Input value={adminForm?.maxApiP95Ms ?? ''} onChange={(e) => setAdminForm((prev) => (prev ? { ...prev, maxApiP95Ms: e.target.value } : prev))} disabled={!adminForm || loading} /></div>
                      <div className="space-y-2"><Label>Suspicious Failures/Hr</Label><Input value={adminForm?.suspiciousFailuresPerHour ?? ''} onChange={(e) => setAdminForm((prev) => (prev ? { ...prev, suspiciousFailuresPerHour: e.target.value } : prev))} disabled={!adminForm || loading} /></div>
                    </div>
                    <Button className="w-full" onClick={saveRoleSettings} disabled={!adminForm || loading || saving}><Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Save System Settings'}</Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">System governance is managed by administrator accounts only.</p>
                )}
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader><CardTitle>Danger Zone</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" onClick={exportRoleData}>Export Data</Button>
                <Button variant="destructive" className="w-full" onClick={requestLogout}><LogOut className="h-4 w-4 mr-2" />Logout</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
