'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Search, ShieldAlert, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/dashboard-layout';
import {
  fetchAssignedPatients,
  fetchPatientRecords,
  patientDisplayName,
  verifyPatientRecord,
  type ProviderPatient,
  type ProviderPatientRecord,
} from '@/lib/provider-role';

type FlatRecord = {
  patient: ProviderPatient;
  record: ProviderPatientRecord;
  status: string;
};

export default function RecordsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<FlatRecord[]>([]);

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
      const recordsByPatient = await Promise.all(
        patients.map(async (patient) => {
          const recRes = await fetchPatientRecords(patient._id);
          return (recRes.records ?? []).map((record) => ({
            patient,
            record,
            status: String(record.blockchain?.verificationStatus ?? 'pending'),
          }));
        })
      );
      if (!active) return;
      setRows(recordsByPatient.flat());
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const patientName = patientDisplayName(row.patient).toLowerCase();
      return (
        row.record._id.toLowerCase().includes(q) ||
        patientName.includes(q) ||
        row.record.type.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  const verifiedCount = rows.filter((row) => row.status.toLowerCase() === 'anchored' || row.status.toLowerCase() === 'verified').length;

  const verify = async (patientId: string, recordId: string) => {
    const result = await verifyPatientRecord(patientId, recordId);
    if (result.error || !result.data) {
      setError(result.error ?? 'Verification failed');
      return;
    }
    setRows((prev) =>
      prev.map((row) => (row.record._id === recordId ? { ...row, status: String(result.data?.status ?? row.status) } : row))
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Verified Medical Records</h1>
          <p className="text-muted-foreground">Access health history and validate blockchain authenticity</p>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by record ID, patient name, or type..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clinical Records</CardTitle>
            <CardDescription>Provider access scoped to assigned patients only</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading records...</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Record ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => {
                      const tampered = row.status.toLowerCase() === 'tampered' || row.status.toLowerCase() === 'anchor_mismatch';
                      const verified = row.status.toLowerCase() === 'anchored' || row.status.toLowerCase() === 'verified';
                      return (
                        <TableRow key={row.record._id}>
                          <TableCell className="font-mono text-xs">{row.record._id}</TableCell>
                          <TableCell>{new Date(row.record.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{row.record.type}</TableCell>
                          <TableCell>{patientDisplayName(row.patient)}</TableCell>
                          <TableCell>
                            <Badge variant={tampered ? 'destructive' : verified ? 'default' : 'secondary'}>
                              {tampered ? <ShieldAlert className="h-3 w-3 mr-1" /> : verified ? <Check className="h-3 w-3 mr-1" /> : null}
                              {row.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => verify(row.patient._id, row.record._id)}>
                                Verify
                              </Button>
                              <Button size="sm" variant="ghost" asChild>
                                <a href={`/patients/${row.patient._id}`}>
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {filtered.length === 0 ? <p className="text-sm text-muted-foreground mt-4">No records found.</p> : null}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-3xl font-bold">{rows.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Verified Records</p>
              <p className="text-3xl font-bold text-green-600">{verifiedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Tamper Flags</p>
              <p className="text-3xl font-bold text-destructive">
                {rows.filter((row) => row.status.toLowerCase() === 'tampered' || row.status.toLowerCase() === 'anchor_mismatch').length}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
