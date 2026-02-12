'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, Search, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import {
  extractHeartRate,
  fetchAssignedPatients,
  fetchPatientSummary,
  fetchPatientRecords,
  patientDisplayName,
  type ProviderPatient,
} from '@/lib/provider-role';

type UserRow = {
  patient: ProviderPatient;
  heartRate: number | null;
  risk: string;
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<UserRow[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const patientsRes = await fetchAssignedPatients();
      if (!active) return;
      if (patientsRes.error) {
        setError(patientsRes.error);
        setLoading(false);
        return;
      }
      const patients = patientsRes.patients ?? [];
      const data = await Promise.all(
        patients.map(async (patient) => {
          const [summaryRes, recordsRes] = await Promise.all([fetchPatientSummary(patient._id, 7), fetchPatientRecords(patient._id)]);
          return {
            patient,
            heartRate: extractHeartRate((recordsRes.records ?? [])[0]),
            risk: summaryRes.summaryData?.overallRisk ?? 'LOW',
          } satisfies UserRow;
        })
      );
      if (!active) return;
      setRows(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = patientDisplayName(row.patient).toLowerCase();
      return name.includes(q) || row.patient.email.toLowerCase().includes(q);
    });
  }, [rows, search]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Assigned Users
          </h1>
          <p className="text-muted-foreground">Users under your healthcare provider scope</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading users...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((row) => (
              <Link key={row.patient._id} href={`/users/${row.patient._id}`}>
                <Card className="hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-foreground">{patientDisplayName(row.patient)}</p>
                          <p className="text-sm text-muted-foreground">{row.patient.email}</p>
                        </div>
                        <Badge variant={row.risk === 'HIGH' || row.risk === 'CRITICAL' ? 'destructive' : 'secondary'}>{row.risk}</Badge>
                      </div>
                      <div className="pt-2 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-primary" />
                          <span className="text-sm">Heart rate</span>
                        </div>
                        <span className="text-sm font-semibold">{row.heartRate ?? 'N/A'}{row.heartRate !== null ? ' bpm' : ''}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No users found.</p> : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
