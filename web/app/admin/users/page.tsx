'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import {
  createAdminUser,
  fetchAdminUsers,
  updateAdminUser,
  updateProviderCredentialStatus,
  type AdminUser,
} from '@/lib/admin-role';

type NewUserForm = {
  role: 'patient' | 'provider' | 'admin';
  email: string;
  password: string;
  status: string;
  name: string;
  holderName: string;
  healthCenterId: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
};

const emptyForm: NewUserForm = {
  role: 'provider',
  email: '',
  password: '',
  status: 'active',
  name: '',
  holderName: '',
  healthCenterId: '',
  firstName: '',
  lastName: '',
  middleInitial: '',
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [form, setForm] = useState<NewUserForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadUsers = async (q = query, role = roleFilter) => {
    const res = await fetchAdminUsers({ q, role: (role as 'patient' | 'provider' | 'admin' | '') || '' });
    if (res.error) {
      setError(res.error);
      return;
    }
    setUsers(res.users ?? []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await fetchAdminUsers();
      if (!active) return;
      if (res.error) {
        setError(res.error);
      } else {
        setUsers(res.users ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return users;
  }, [users]);

  const submitCreate = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    const payload: Record<string, unknown> = {
      role: form.role,
      email: form.email.trim(),
      password: form.password,
      status: form.status,
    };
    if (form.role === 'provider') {
      payload.name = form.name.trim();
      payload.holderName = form.holderName.trim();
      payload.credentialStatus = 'pending';
    } else if (form.role === 'patient') {
      payload.healthCenterId = form.healthCenterId.trim();
      payload.firstName = form.firstName.trim();
      payload.lastName = form.lastName.trim();
      payload.middleInitial = form.middleInitial.trim();
    }
    const res = await createAdminUser(payload);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setMessage('User created successfully.');
    setForm(emptyForm);
    await loadUsers();
  };

  const toggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    const res = await updateAdminUser(user.role, user.id, { status: nextStatus });
    if (res.error) {
      setError(res.error);
      return;
    }
    await loadUsers();
  };

  const setProviderCredential = async (provider: AdminUser, credentialStatus: 'approved' | 'pending' | 'rejected') => {
    const res = await updateProviderCredentialStatus(provider.id, credentialStatus);
    if (res.error) {
      setError(res.error);
      return;
    }
    await loadUsers();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Create, update, deactivate accounts and assign role access</p>
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

        <Card>
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Admin-controlled account creation and role assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={form.role}
                onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as 'patient' | 'provider' | 'admin' }))}
              >
                <option value="patient">Patient</option>
                <option value="provider">Healthcare Provider</option>
                <option value="admin">Admin</option>
              </select>
              <Input placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              <Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {form.role === 'provider' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input placeholder="Healthcare provider name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                <Input placeholder="Holder name" value={form.holderName} onChange={(e) => setForm((prev) => ({ ...prev, holderName: e.target.value }))} />
              </div>
            ) : null}

            {form.role === 'patient' ? (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Input
                  placeholder="Health Center ID"
                  value={form.healthCenterId}
                  onChange={(e) => setForm((prev) => ({ ...prev, healthCenterId: e.target.value }))}
                />
                <Input placeholder="First name" value={form.firstName} onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))} />
                <Input placeholder="Last name" value={form.lastName} onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))} />
                <Input
                  placeholder="Middle initial"
                  value={form.middleInitial}
                  onChange={(e) => setForm((prev) => ({ ...prev, middleInitial: e.target.value }))}
                />
              </div>
            ) : null}

            <Button onClick={submitCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create User'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Accounts</CardTitle>
            <CardDescription>Manage role state and provider credential approvals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="Search users by name/email..."
                value={query}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  loadUsers(val, roleFilter);
                }}
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm sm:w-48"
                value={roleFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setRoleFilter(val);
                  loadUsers(query, val);
                }}
              >
                <option value="">All roles</option>
                <option value="patient">Patient</option>
                <option value="provider">Provider</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : (
              <div className="space-y-2">
                {filtered.map((user) => (
                  <Card key={`${user.role}-${user.id}`}>
                    <CardContent className="pt-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{user.role}</Badge>
                            <Badge variant={user.status === 'active' ? 'secondary' : 'destructive'}>{user.status}</Badge>
                            {user.role === 'provider' ? <Badge variant="outline">credentials: {user.credentialStatus}</Badge> : null}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(user)}>
                            {user.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          {user.role === 'provider' ? (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setProviderCredential(user, 'approved')}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setProviderCredential(user, 'rejected')}>
                                Reject
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No users found.</p> : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
