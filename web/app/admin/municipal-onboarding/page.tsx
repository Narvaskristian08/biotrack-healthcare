'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import DashboardLayout from '@/components/dashboard-layout';
import {
  downloadMunicipalOnboardingFile,
  fetchMunicipalOnboardingRequests,
  updateMunicipalOnboardingRequest,
  type MunicipalOnboardingRequest,
} from '@/lib/admin-role';

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
}

function statusBadge(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'rejected':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export default function MunicipalOnboardingAdminPage() {
  const [requests, setRequests] = useState<MunicipalOnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [query, setQuery] = useState('');
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<MunicipalOnboardingRequest | null>(null);
  const [decisionStatus, setDecisionStatus] = useState<'approved' | 'rejected'>('approved');
  const [decisionNote, setDecisionNote] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    const res = await fetchMunicipalOnboardingRequests({
      status: (statusFilter as 'submitted' | 'approved' | 'rejected' | '') || '',
      q: query.trim(),
    });
    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setError('');
    setRequests(res.requests ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const statusCounts = useMemo(() => {
    return requests.reduce(
      (acc, req) => {
        acc.total += 1;
        acc[req.status] += 1;
        return acc;
      },
      { total: 0, submitted: 0, approved: 0, rejected: 0 }
    );
  }, [requests]);

  const openDecisionModal = (request: MunicipalOnboardingRequest, status: 'approved' | 'rejected') => {
    setDecisionTarget(request);
    setDecisionStatus(status);
    setDecisionNote(request.decision?.note ?? '');
    setDecisionOpen(true);
  };

  const handleDecisionConfirm = async () => {
    if (!decisionTarget) return;
    setSaving(decisionTarget._id);
    const res = await updateMunicipalOnboardingRequest(decisionTarget._id, {
      status: decisionStatus,
      decisionNote: decisionNote.trim(),
    });
    if (res.error) {
      setError(res.error);
      setSaving(null);
      return;
    }
    await loadRequests();
    setSaving(null);
    setDecisionOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Municipal Applications</h1>
            <p className="mt-1 text-muted-foreground">Review municipal onboarding requests and verify submitted credentials.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadRequests()} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-4">
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Total requests</p>
              <p className="mt-2 text-3xl font-bold">{statusCounts.total}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="pt-5">
              <p className="text-sm text-muted-foreground">Submitted</p>
              <p className="mt-2 text-3xl font-bold">{statusCounts.submitted}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-200 bg-emerald-50/70">
            <CardContent className="pt-5">
              <p className="text-sm text-emerald-700">Approved</p>
              <p className="mt-2 text-3xl font-bold text-emerald-950">{statusCounts.approved}</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200 bg-rose-50/70">
            <CardContent className="pt-5">
              <p className="text-sm text-rose-700">Rejected</p>
              <p className="mt-2 text-3xl font-bold text-rose-900">{statusCounts.rejected}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle>Filter Requests</CardTitle>
            <CardDescription>Search by city, office name, contact, or email.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input placeholder="Search city, office, contact..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <Button onClick={() => void loadRequests()} disabled={loading}>
              Apply
            </Button>
          </CardContent>
        </Card>

        {loading ? <p className="text-sm text-muted-foreground">Loading applications...</p> : null}

        <div className="space-y-4">
          {!loading && requests.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-slate-50">
              <CardContent className="pt-6 text-sm text-muted-foreground">No onboarding requests match the current filters.</CardContent>
            </Card>
          ) : null}

          {requests.map((request) => (
            <Card key={request._id} className="border-slate-200 shadow-sm">
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold">{request.cityMunicipality}</h3>
                      {request.province ? <span className="text-sm text-muted-foreground">({request.province})</span> : null}
                      <Badge className={`border ${statusBadge(request.status)}`}>{request.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{request.officeName}</p>
                    <p className="text-sm text-slate-700 mt-2">
                      Contact: {request.contactName} • {request.contactRole}
                    </p>
                    <p className="text-sm text-slate-700">
                      {request.email} • {request.phone}
                    </p>
                    {request.pricingTier ? (
                      <p className="text-xs text-muted-foreground mt-2">Requested coverage: {request.pricingTier}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">Submitted: {formatDate(request.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving === request._id || request.status === 'approved'}
                      onClick={() => openDecisionModal(request, 'approved')}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving === request._id || request.status === 'rejected'}
                      onClick={() => openDecisionModal(request, 'rejected')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                {request.message ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-700">
                    {request.message}
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Coverage</p>
                    <p className="mt-2 text-sm text-slate-700">
                      Barangays: {request.estimatedBarangays ?? 'N/A'} • Population: {request.estimatedPopulation ?? 'N/A'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Desired start: {formatDate(request.desiredStartDate)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Decision</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {request.decision?.status ? `Status: ${request.decision.status}` : 'Pending review'}
                    </p>
                    {request.decision?.note ? (
                      <p className="mt-1 text-xs text-muted-foreground">{request.decision.note}</p>
                    ) : null}
                    {request.decision?.decidedAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">Decided: {formatDate(request.decision.decidedAt)}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Attachments</p>
                  {request.attachments?.length ? (
                    <div className="mt-2 flex flex-col gap-2">
                      {request.attachments.map((file) => (
                        <div key={file.fileId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.label || 'Document'} • {Math.round((file.sizeBytes || 0) / 1024)} KB
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void downloadMunicipalOnboardingFile(file.fileId, file.fileName)}
                          >
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No attachments submitted.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {decisionStatus === 'approved' ? 'Approve municipal request' : 'Reject municipal request'}
            </DialogTitle>
            <DialogDescription>
              {decisionTarget
                ? `${decisionTarget.cityMunicipality} | ${decisionTarget.officeName}`
                : 'Review and confirm the decision.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="decision-note">Decision note (optional)</Label>
            <textarea
              id="decision-note"
              className="min-h-27.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              placeholder="Add a brief note for the applicant (optional)."
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This note is included in the email notification sent to the applicant.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDecisionOpen(false)}
              disabled={saving !== null}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDecisionConfirm}
              disabled={saving !== null}
              className={decisionStatus === 'approved' ? '' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {decisionStatus === 'approved' ? 'Approve request' : 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
