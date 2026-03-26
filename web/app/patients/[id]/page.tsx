'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Download, FilePlus2, RefreshCw, Shield, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DashboardLayout from '@/components/dashboard-layout';
import { cn } from '@/lib/utils';
import {
  createPatientRecord,
  exportJson,
  extractActivityLevel,
  extractFallDetected,
  extractHeartRate,
  fetchPatientAlerts,
  fetchPatientById,
  fetchPatientRecords,
  fetchPatientSummary,
  fetchPatientTrend,
  patientDisplayName,
  verifyPatientRecord,
  type ProviderPatient,
  type ProviderPatientRecord,
  type ProviderPatientRecordCreateInput,
  type ProviderRecordVerification,
} from '@/lib/provider-role';

type ClinicalRecordType = NonNullable<ProviderPatientRecordCreateInput['type']>;

type ClinicalRecordFormState = {
  type: ClinicalRecordType;
  capturedAt: string;
  title: string;
  details: string;
  heartRate: string;
  activityLevel: string;
  fallDetected: '' | 'yes' | 'no';
  medicationName: string;
  dosage: string;
  labName: string;
  resultSummary: string;
  referralDestination: string;
  followUpAt: string;
  gestationalWeek: string;
  vaccineName: string;
  vaccineDose: string;
};

type ClinicalRecordMeta = {
  label: string;
  description: string;
  titleLabel: string;
  titlePlaceholder: string;
  detailsLabel: string;
  detailsPlaceholder: string;
};

const textareaClassName =
  'min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';

const clinicalRecordMeta: Record<ClinicalRecordType, ClinicalRecordMeta> = {
  consultation: {
    label: 'Consultation',
    description: 'Capture the visit reason, clinical assessment, and next-step plan for this patient.',
    titleLabel: 'Visit reason',
    titlePlaceholder: 'Follow-up for elevated heart rate',
    detailsLabel: 'Assessment and plan',
    detailsPlaceholder: 'Summarize findings, advice, and any immediate care instructions.',
  },
  vitals: {
    label: 'Vitals',
    description: 'Enter provider-observed vitals or triage readings that should be part of the medical record.',
    titleLabel: 'Vitals context',
    titlePlaceholder: 'In-clinic recheck after home monitoring alert',
    detailsLabel: 'Clinical notes',
    detailsPlaceholder: 'Add context for the recorded vitals, symptoms, or observations.',
  },
  immunization: {
    label: 'Immunization',
    description: 'Document vaccines, dose series, and any provider notes linked to the visit.',
    titleLabel: 'Immunization summary',
    titlePlaceholder: 'Routine immunization update',
    detailsLabel: 'Administration notes',
    detailsPlaceholder: 'Document counseling, adverse reactions, or follow-up instructions.',
  },
  prenatal: {
    label: 'Prenatal',
    description: 'Record prenatal check-ins, gestational progress, and care guidance for the next visit.',
    titleLabel: 'Visit focus',
    titlePlaceholder: 'Routine prenatal follow-up',
    detailsLabel: 'Prenatal notes',
    detailsPlaceholder: 'Add maternal observations, concerns, and recommendations.',
  },
  lab: {
    label: 'Laboratory',
    description: 'Store lab-oriented findings or summaries that need to stay with the patient timeline.',
    titleLabel: 'Lab summary',
    titlePlaceholder: 'Fasting blood sugar review',
    detailsLabel: 'Interpretation notes',
    detailsPlaceholder: 'Describe key results, interpretation, and what should happen next.',
  },
  medication: {
    label: 'Medication',
    description: 'Track medication starts, refills, dose changes, and provider instructions.',
    titleLabel: 'Medication update',
    titlePlaceholder: 'Adjusted maintenance therapy',
    detailsLabel: 'Medication instructions',
    detailsPlaceholder: 'Add counseling notes, adherence guidance, or warning signs to monitor.',
  },
  referral: {
    label: 'Referral',
    description: 'Document where the patient is being referred and why the referral was made.',
    titleLabel: 'Referral reason',
    titlePlaceholder: 'Needs cardiology review',
    detailsLabel: 'Referral notes',
    detailsPlaceholder: 'Share the reason, urgency, and relevant context for the receiving team.',
  },
  note: {
    label: 'Clinical note',
    description: 'Use a concise note for observations, follow-ups, or quick care-team documentation.',
    titleLabel: 'Note title',
    titlePlaceholder: 'Post-visit follow-up note',
    detailsLabel: 'Clinical note',
    detailsPlaceholder: 'Write the note that should be saved to the patient record.',
  },
  other: {
    label: 'Other record',
    description: 'Save a custom clinical entry when the visit does not fit the standard record categories.',
    titleLabel: 'Record title',
    titlePlaceholder: 'Community screening update',
    detailsLabel: 'Record details',
    detailsPlaceholder: 'Describe the activity, findings, and anything the next reviewer should know.',
  },
};

const clinicalRecordTypes = (Object.keys(clinicalRecordMeta) as ClinicalRecordType[]).map((value) => ({
  value,
  label: clinicalRecordMeta[value].label,
}));

function toDateTimeLocalValue(date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromLocalInput(value: string): string | undefined {
  const normalized = String(value ?? '').trim();
  if (!normalized) return undefined;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

function cleanOptionalText(value: string): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function cleanOptionalNumber(value: string): number | undefined {
  const normalized = String(value ?? '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createEmptyClinicalForm(type: ClinicalRecordType = 'consultation'): ClinicalRecordFormState {
  return {
    type,
    capturedAt: toDateTimeLocalValue(),
    title: '',
    details: '',
    heartRate: '',
    activityLevel: '',
    fallDetected: '',
    medicationName: '',
    dosage: '',
    labName: '',
    resultSummary: '',
    referralDestination: '',
    followUpAt: '',
    gestationalWeek: '',
    vaccineName: '',
    vaccineDose: '',
  };
}

function sortRecordsNewestFirst(records: ProviderPatientRecord[]): ProviderPatientRecord[] {
  return [...records].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function buildClinicalRecordPayload(form: ClinicalRecordFormState): { payload?: ProviderPatientRecordCreateInput; error?: string } {
  const capturedAt = toIsoFromLocalInput(form.capturedAt);
  const followUpAt = toIsoFromLocalInput(form.followUpAt);
  const title = cleanOptionalText(form.title);
  const details = cleanOptionalText(form.details);

  const data: Record<string, unknown> = {
    source: 'provider_web_entry',
    entryMode: 'clinical',
    enteredByRole: 'healthcenter',
  };

  if (title) data.summary = title;
  if (details) {
    data.note = details;
    data.assessment = details;
  }

  switch (form.type) {
    case 'consultation':
      if (title) data.visitReason = title;
      if (followUpAt) data.followUpAt = followUpAt;
      break;
    case 'vitals': {
      const heartRate = cleanOptionalNumber(form.heartRate);
      if (heartRate !== undefined) data.heartRate = heartRate;
      const activityLevel = cleanOptionalText(form.activityLevel);
      if (activityLevel) data.activityLevel = activityLevel;
      if (form.fallDetected === 'yes') data.fallDetected = true;
      if (form.fallDetected === 'no') data.fallDetected = false;
      break;
    }
    case 'immunization':
      if (cleanOptionalText(form.vaccineName)) data.vaccineName = cleanOptionalText(form.vaccineName);
      if (cleanOptionalText(form.vaccineDose)) data.vaccineDose = cleanOptionalText(form.vaccineDose);
      break;
    case 'prenatal': {
      const gestationalWeek = cleanOptionalNumber(form.gestationalWeek);
      if (gestationalWeek !== undefined) data.gestationalWeek = gestationalWeek;
      if (followUpAt) data.followUpAt = followUpAt;
      break;
    }
    case 'lab':
      if (cleanOptionalText(form.labName)) data.labName = cleanOptionalText(form.labName);
      if (cleanOptionalText(form.resultSummary)) data.resultSummary = cleanOptionalText(form.resultSummary);
      break;
    case 'medication':
      if (cleanOptionalText(form.medicationName)) data.medicationName = cleanOptionalText(form.medicationName);
      if (cleanOptionalText(form.dosage)) data.dosage = cleanOptionalText(form.dosage);
      break;
    case 'referral':
      if (cleanOptionalText(form.referralDestination)) data.referralDestination = cleanOptionalText(form.referralDestination);
      break;
    case 'note':
    case 'other':
      break;
    default:
      break;
  }

  const meaningfulKeys = Object.keys(data).filter((key) => !['source', 'entryMode', 'enteredByRole'].includes(key));
  if (meaningfulKeys.length === 0) {
    return { error: 'Add at least one clinical detail before saving this record.' };
  }

  return {
    payload: {
      type: form.type,
      data,
      ...(capturedAt ? { capturedAt } : {}),
    },
  };
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const patientId = typeof params?.id === 'string' ? params.id : params?.id?.[0] ?? '';
  const [patient, setPatient] = useState<ProviderPatient | null>(null);
  const [records, setRecords] = useState<ProviderPatientRecord[]>([]);
  const [alerts, setAlerts] = useState<Array<{ id: string; severity: string; message: string; type: string }>>([]);
  const [summary, setSummary] = useState<{ risk: string; fallEvents: number; insight: string }>({ risk: 'LOW', fallEvents: 0, insight: '' });
  const [trend, setTrend] = useState<number[]>([]);
  const [verification, setVerification] = useState<Record<string, ProviderRecordVerification | undefined>>({});
  const [recordForm, setRecordForm] = useState<ClinicalRecordFormState>(() => createEmptyClinicalForm());
  const [loading, setLoading] = useState(true);
  const [savingRecord, setSavingRecord] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!patientId) {
      setError('Patient id is missing');
      setLoading(false);
      return;
    }

    let active = true;
    (async () => {
      const [patientRes, recordsRes, alertsRes, summaryRes, trendRes] = await Promise.all([
        fetchPatientById(patientId),
        fetchPatientRecords(patientId),
        fetchPatientAlerts(patientId, 20),
        fetchPatientSummary(patientId, 7),
        fetchPatientTrend(patientId),
      ]);
      if (!active) return;
      if (patientRes.error) {
        setError(patientRes.error);
        setLoading(false);
        return;
      }
      setPatient(patientRes.patient ?? null);
      setRecords(sortRecordsNewestFirst(recordsRes.records ?? []));
      setAlerts((alertsRes.alerts ?? []).map((alert) => ({
        id: alert._id,
        severity: alert.severity,
        message: alert.message,
        type: alert.type,
      })));
      setSummary({
        risk: summaryRes.summaryData?.overallRisk ?? 'LOW',
        fallEvents: Number(summaryRes.summaryData?.fallEvents ?? 0),
        insight: summaryRes.insight ?? '',
      });
      setTrend(trendRes.trendData?.recentHeartRates ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  const latest = records[0] ?? null;
  const latestHeartRate = extractHeartRate(latest);
  const latestActivity = extractActivityLevel(latest);
  const latestFall = extractFallDetected(latest);
  const activeRecordMeta = clinicalRecordMeta[recordForm.type];

  const verifiedCount = useMemo(() => {
    return records.filter((record) => {
      const status = verification[record._id]?.status ?? record.blockchain?.verificationStatus ?? '';
      return String(status).toLowerCase() === 'anchored' || String(status).toLowerCase() === 'verified';
    }).length;
  }, [records, verification]);

  const updateRecordForm = <Key extends keyof ClinicalRecordFormState>(key: Key, value: ClinicalRecordFormState[Key]) => {
    setRecordForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleRecordTypeChange = (value: string) => {
    const nextType = value as ClinicalRecordType;
    setRecordForm((prev) => ({
      ...createEmptyClinicalForm(nextType),
      capturedAt: prev.capturedAt,
      title: prev.title,
      details: prev.details,
    }));
  };

  const resetRecordForm = () => {
    setRecordForm(createEmptyClinicalForm(recordForm.type));
  };

  const verifyRecordIntegrity = async (recordId: string) => {
    const result = await verifyPatientRecord(patientId, recordId);
    if (result.error || !result.data) {
      setNotice('');
      setError(result.error ?? 'Verification failed');
      return;
    }
    setError('');
    setVerification((prev) => ({ ...prev, [recordId]: result.data }));
  };

  const submitClinicalRecord = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const built = buildClinicalRecordPayload(recordForm);
    if (built.error || !built.payload) {
      setNotice('');
      setError(built.error ?? 'Unable to build patient record');
      return;
    }

    setSavingRecord(true);
    const result = await createPatientRecord(patientId, built.payload);
    setSavingRecord(false);

    if (result.error || !result.record) {
      setNotice('');
      setError(result.error ?? 'Failed to save clinical record');
      return;
    }

    setError('');
    setNotice(
      `Clinical record saved. Blockchain status: ${String(result.record.blockchain?.verificationStatus ?? 'pending').toLowerCase()}.`
    );
    setRecords((prev) => sortRecordsNewestFirst([result.record!, ...prev.filter((record) => record._id !== result.record!._id)]));
    setVerification((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, result.record!._id)) return prev;
      const next = { ...prev };
      delete next[result.record!._id];
      return next;
    });
    setRecordForm(createEmptyClinicalForm(recordForm.type));
  };

  const exportPatientSummary = () => {
    exportJson(`provider-patient-summary-${patientId}.json`, {
      generatedAt: new Date().toISOString(),
      patient,
      summary,
      alerts,
      trend,
      recordCount: records.length,
      verifiedRecordCount: verifiedCount,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Link href="/patients" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to assigned patients
        </Link>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        {notice ? (
          <Card className="border-emerald-300/60 bg-emerald-50">
            <CardContent className="pt-6 text-sm text-emerald-700">{notice}</CardContent>
          </Card>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading patient oversight view...</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <CardTitle>{patient ? patientDisplayName(patient) : 'Patient'}</CardTitle>
                    <CardDescription>{patient?.email ?? ''}</CardDescription>
                  </div>
                  <Badge variant={summary.risk === 'HIGH' || summary.risk === 'CRITICAL' ? 'destructive' : 'secondary'}>{summary.risk}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Current heart rate</p>
                  <p className="text-xl font-bold">{latestHeartRate ?? 'N/A'}{latestHeartRate !== null ? ' bpm' : ''}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Activity level</p>
                  <p className="text-xl font-bold">{latestActivity ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fall detected</p>
                  <p className="text-xl font-bold">{latestFall ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verified records</p>
                  <p className="text-xl font-bold">{verifiedCount}/{records.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/15 bg-primary/5">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-full border border-primary/15 bg-background p-2 text-primary">
                    <FilePlus2 className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle>Add Clinical Record</CardTitle>
                    <CardDescription>
                      Save provider-entered care notes, lab summaries, medication updates, referrals, or vitals. BioTrack hashes the
                      full record payload and handles blockchain anchoring after save.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={submitClinicalRecord}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="recordType">Record type</Label>
                      <Select value={recordForm.type} onValueChange={handleRecordTypeChange}>
                        <SelectTrigger id="recordType">
                          <SelectValue placeholder="Select a record type" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinicalRecordTypes.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="capturedAt">Recorded at</Label>
                      <Input
                        id="capturedAt"
                        type="datetime-local"
                        value={recordForm.capturedAt}
                        onChange={(event) => updateRecordForm('capturedAt', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/70 bg-background/80 p-4">
                    <p className="text-sm font-semibold">{activeRecordMeta.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{activeRecordMeta.description}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="recordTitle">{activeRecordMeta.titleLabel}</Label>
                      <Input
                        id="recordTitle"
                        placeholder={activeRecordMeta.titlePlaceholder}
                        value={recordForm.title}
                        onChange={(event) => updateRecordForm('title', event.target.value)}
                      />
                    </div>

                    {recordForm.type === 'vitals' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="heartRate">Heart rate (bpm)</Label>
                          <Input
                            id="heartRate"
                            type="number"
                            min="0"
                            placeholder="72"
                            value={recordForm.heartRate}
                            onChange={(event) => updateRecordForm('heartRate', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="activityLevel">Activity level</Label>
                          <Select value={recordForm.activityLevel || 'unset'} onValueChange={(value) => updateRecordForm('activityLevel', value === 'unset' ? '' : value)}>
                            <SelectTrigger id="activityLevel">
                              <SelectValue placeholder="Select activity level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">Not specified</SelectItem>
                              <SelectItem value="resting">Resting</SelectItem>
                              <SelectItem value="light">Light activity</SelectItem>
                              <SelectItem value="moderate">Moderate activity</SelectItem>
                              <SelectItem value="high">High activity</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="fallDetected">Fall detected</Label>
                          <Select value={recordForm.fallDetected || 'unset'} onValueChange={(value) => updateRecordForm('fallDetected', value === 'unset' ? '' : (value as ClinicalRecordFormState['fallDetected']))}>
                            <SelectTrigger id="fallDetected">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unset">Not specified</SelectItem>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : null}

                    {recordForm.type === 'lab' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="labName">Lab or test</Label>
                          <Input
                            id="labName"
                            placeholder="CBC, glucose, urinalysis"
                            value={recordForm.labName}
                            onChange={(event) => updateRecordForm('labName', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="resultSummary">Result summary</Label>
                          <Input
                            id="resultSummary"
                            placeholder="Normal, elevated, requires follow-up"
                            value={recordForm.resultSummary}
                            onChange={(event) => updateRecordForm('resultSummary', event.target.value)}
                          />
                        </div>
                      </>
                    ) : null}

                    {recordForm.type === 'medication' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="medicationName">Medication</Label>
                          <Input
                            id="medicationName"
                            placeholder="Amlodipine"
                            value={recordForm.medicationName}
                            onChange={(event) => updateRecordForm('medicationName', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dosage">Dosage or instructions</Label>
                          <Input
                            id="dosage"
                            placeholder="5 mg once daily"
                            value={recordForm.dosage}
                            onChange={(event) => updateRecordForm('dosage', event.target.value)}
                          />
                        </div>
                      </>
                    ) : null}

                    {recordForm.type === 'referral' ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="referralDestination">Referral destination</Label>
                        <Input
                          id="referralDestination"
                          placeholder="Provincial hospital cardiology clinic"
                          value={recordForm.referralDestination}
                          onChange={(event) => updateRecordForm('referralDestination', event.target.value)}
                        />
                      </div>
                    ) : null}

                    {recordForm.type === 'immunization' ? (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="vaccineName">Vaccine</Label>
                          <Input
                            id="vaccineName"
                            placeholder="Influenza vaccine"
                            value={recordForm.vaccineName}
                            onChange={(event) => updateRecordForm('vaccineName', event.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vaccineDose">Dose or series</Label>
                          <Input
                            id="vaccineDose"
                            placeholder="Dose 1"
                            value={recordForm.vaccineDose}
                            onChange={(event) => updateRecordForm('vaccineDose', event.target.value)}
                          />
                        </div>
                      </>
                    ) : null}

                    {recordForm.type === 'consultation' || recordForm.type === 'prenatal' ? (
                      <>
                        {recordForm.type === 'prenatal' ? (
                          <div className="space-y-2">
                            <Label htmlFor="gestationalWeek">Gestational week</Label>
                            <Input
                              id="gestationalWeek"
                              type="number"
                              min="0"
                              placeholder="28"
                              value={recordForm.gestationalWeek}
                              onChange={(event) => updateRecordForm('gestationalWeek', event.target.value)}
                            />
                          </div>
                        ) : null}
                        <div className={cn('space-y-2', recordForm.type === 'consultation' ? 'md:col-span-2' : '')}>
                          <Label htmlFor="followUpAt">Follow-up schedule</Label>
                          <Input
                            id="followUpAt"
                            type="datetime-local"
                            value={recordForm.followUpAt}
                            onChange={(event) => updateRecordForm('followUpAt', event.target.value)}
                          />
                        </div>
                      </>
                    ) : null}

                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="recordDetails">{activeRecordMeta.detailsLabel}</Label>
                      <textarea
                        id="recordDetails"
                        className={textareaClassName}
                        placeholder={activeRecordMeta.detailsPlaceholder}
                        value={recordForm.details}
                        onChange={(event) => updateRecordForm('details', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>Clinical entries are hashed with their metadata, then the proof status appears in the record list below.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={resetRecordForm} disabled={savingRecord}>
                        Reset
                      </Button>
                      <Button type="submit" disabled={savingRecord}>
                        {savingRecord ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                        Save Clinical Record
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Risk Flags and Advisory</CardTitle>
                <CardDescription>Generated warnings and intervention signals (read-only output)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{summary.insight || 'No AI advisory available.'}</p>
                <p className="text-sm text-muted-foreground">Fall incidents requiring intervention: {summary.fallEvents}</p>
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>{alert.severity}</Badge>
                        <p className="text-sm font-medium">{alert.type.replaceAll('_', ' ')}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{alert.message || 'No message.'}</p>
                    </div>
                  ))}
                  {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No alert notifications.</p> : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verified Medical Records</CardTitle>
                <CardDescription>Health history, authenticity checks, and tamper validation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {records.map((record) => {
                  const verify = verification[record._id];
                  const status = verify?.status ?? record.blockchain?.verificationStatus ?? 'pending';
                  const tampered = String(status).toLowerCase() === 'tampered' || String(status).toLowerCase() === 'anchor_mismatch';
                  return (
                    <div key={record._id} className="p-3 rounded-lg border border-border">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-sm">{record.type}</p>
                          <p className="text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleString()}</p>
                        </div>
                        <Badge variant={tampered ? 'destructive' : 'secondary'}>{status}</Badge>
                      </div>
                      <p className="text-xs font-mono break-all mt-2">{record.recordHash}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => verifyRecordIntegrity(record._id)}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Verify
                        </Button>
                        <span className="text-xs text-muted-foreground self-center">Tx: {record.blockchain?.txId || 'N/A'}</span>
                        {tampered ? <ShieldAlert className="h-4 w-4 text-destructive self-center" /> : <Shield className="h-4 w-4 text-green-600 self-center" />}
                      </div>
                    </div>
                  );
                })}
                {records.length === 0 ? <p className="text-sm text-muted-foreground">No medical records available.</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generate Provider Report</CardTitle>
                <CardDescription>Export clinical summary for medical review documentation</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={exportPatientSummary}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Patient Summary
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
