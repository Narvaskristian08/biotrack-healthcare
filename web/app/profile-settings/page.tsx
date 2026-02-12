'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DashboardLayout from '@/components/dashboard-layout';
import {
  fetchMyLoginHistory,
  fetchMyPatientProfile,
  updateMyPatientProfile,
  type LoginHistoryEntry,
  type PatientProfile,
} from '@/lib/patient-role';

type FormState = {
  firstName: string;
  lastName: string;
  middleInitial: string;
  email: string;
  address: string;
  contactNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

function toForm(patient: PatientProfile): FormState {
  return {
    firstName: patient.firstName ?? '',
    lastName: patient.lastName ?? '',
    middleInitial: patient.middleInitial ?? '',
    email: patient.email ?? '',
    address: patient.address ?? '',
    contactNumber: patient.contactNumber ?? '',
    emergencyContactName: patient.emergencyContactName ?? '',
    emergencyContactPhone: patient.emergencyContactPhone ?? '',
  };
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [history, setHistory] = useState<LoginHistoryEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [profileRes, historyRes] = await Promise.all([fetchMyPatientProfile(), fetchMyLoginHistory(20)]);
      if (!active) return;
      setLoading(false);
      if (profileRes.error) {
        setError(profileRes.error);
        return;
      }
      if (profileRes.patient) {
        setProfile(profileRes.patient);
        setForm(toForm(profileRes.patient));
      }
      if (!historyRes.error) setHistory(historyRes.history ?? []);
    })();
    return () => {
      active = false;
    };
  }, []);

  const onChange = (field: keyof FormState, value: string) => {
    if (!form) return;
    setForm((prev) => ({ ...(prev as FormState), [field]: value }));
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const result = await updateMyPatientProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      middleInitial: form.middleInitial.trim(),
      email: form.email.trim().toLowerCase(),
      address: form.address.trim(),
      contactNumber: form.contactNumber.trim(),
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactPhone: form.emergencyContactPhone.trim(),
    });
    setSaving(false);
    if (result.error || !result.patient) {
      setError(result.error ?? 'Failed to save profile');
      return;
    }
    setProfile(result.patient);
    setForm(toForm(result.patient));
    setIsEditing(false);
    setSuccess('Profile updated successfully.');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Update personal details, manage emergency contacts, and review login history
          </p>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}
        {success ? (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-6 text-sm text-green-700">{success}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Patient role can update only allowed profile fields</CardDescription>
              </div>
              <Button variant={isEditing ? 'secondary' : 'default'} onClick={() => setIsEditing((v) => !v)} disabled={loading || !form}>
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || !form ? (
              <p className="text-sm text-muted-foreground">Loading profile...</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={form.firstName} onChange={(e) => onChange('firstName', e.target.value)} disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={form.lastName} onChange={(e) => onChange('lastName', e.target.value)} disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleInitial">Middle Initial</Label>
                    <Input id="middleInitial" value={form.middleInitial} onChange={(e) => onChange('middleInitial', e.target.value)} disabled={!isEditing} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => onChange('email', e.target.value)} disabled={!isEditing} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">Contact Number</Label>
                    <Input id="contactNumber" value={form.contactNumber} onChange={(e) => onChange('contactNumber', e.target.value)} disabled={!isEditing} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={form.address} onChange={(e) => onChange('address', e.target.value)} disabled={!isEditing} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
                    <Input
                      id="emergencyContactName"
                      value={form.emergencyContactName}
                      onChange={(e) => onChange('emergencyContactName', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                    <Input
                      id="emergencyContactPhone"
                      value={form.emergencyContactPhone}
                      onChange={(e) => onChange('emergencyContactPhone', e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {isEditing ? (
                  <Button onClick={save} disabled={saving} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </Button>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Login History</CardTitle>
            <CardDescription>Recent account sign-ins and session metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="p-3 rounded-lg border border-border">
                <p className="text-sm font-medium">{new Date(entry.loginAt).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">IP: {entry.ip || 'N/A'}</p>
                <p className="text-xs text-muted-foreground break-all">User Agent: {entry.userAgent || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">
                  Expires: {entry.expiresAt ? new Date(entry.expiresAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            ))}
            {history.length === 0 ? <p className="text-sm text-muted-foreground">No login history available.</p> : null}
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Restrictions Enforced</CardTitle>
            <CardDescription>
              Patient accounts cannot access other patient data, cannot modify blockchain records, and cannot change system configuration.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Current profile: {profile ? `${profile.firstName} ${profile.lastName}` : 'N/A'} ({profile?.email ?? 'N/A'})
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
