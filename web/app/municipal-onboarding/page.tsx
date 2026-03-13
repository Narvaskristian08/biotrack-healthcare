/* eslint-disable react/no-unescaped-entities */
'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  Landmark,
  PhoneCall,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createMunicipalOnboardingApplication,
  uploadMunicipalOnboardingFile,
  type MunicipalOnboardingUpload,
} from '@/lib/municipal-onboarding';

const TIERS = [
  {
    id: 'starter',
    name: 'Starter Coverage',
    price: 'PHP 65k - 120k / year',
    description: 'Pilot for 10-20 barangays with core monitoring and patient registry.',
    bullets: ['Barangay dashboards', 'Patient records + basic analytics', 'Email support within 2 business days'],
  },
  {
    id: 'citywide',
    name: 'Citywide Coverage',
    price: 'PHP 150k - 280k / year',
    description: 'Expanded access for city-wide clinics and municipal health offices.',
    bullets: ['Multi-barangay management', 'System monitoring + logs', 'Priority onboarding assistance'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Coverage',
    price: 'Custom quote',
    description: 'Full coverage with extended compliance workflows and dedicated support.',
    bullets: ['Custom RBAC + governance', 'Dedicated onboarding lead', 'SLA-backed support'],
  },
];

const REQUIRED_DOCUMENTS = [
  {
    id: 'gov-id',
    label: 'Valid Government ID',
    helper: 'Upload a clear front and back scan of the mayor or authorized secretary ID. Accepted: passport, UMID, drivers license.',
    required: true,
  },
  {
    id: 'authority-letter',
    label: 'Authorization Letter',
    helper: 'Signed endorsement from the mayor or city administrator, on LGU letterhead.',
    required: true,
  },
  {
    id: 'appointment-proof',
    label: 'Proof of Appointment',
    helper: 'Appointment or designation certificate showing the health office role.',
    required: true,
  },
  {
    id: 'supporting-docs',
    label: 'Supporting Document (optional)',
    helper: 'Optional: additional permits, council resolution, or endorsement memo.',
    required: false,
  },
];

const DOCUMENT_INSTRUCTIONS = [
  'IDs must be valid and unexpired. Upload both front and back if applicable.',
  'Letters should include LGU letterhead, a signature, and date.',
  'Files must be readable. Blurry or cropped scans may delay approval.',
];

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type AttachmentState = {
  id: string;
  label: string;
  helper?: string;
  required?: boolean;
  file?: File | null;
  upload?: MunicipalOnboardingUpload | null;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  error?: string;
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = Math.round(bytes / 1024);
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function MunicipalOnboardingLandingPage() {
  const formRef = useRef<HTMLDivElement | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ id: string; status: string } | null>(null);
  const [authorized, setAuthorized] = useState(false);

  const [formData, setFormData] = useState({
    cityMunicipality: '',
    province: '',
    officeName: '',
    contactName: '',
    contactRole: '',
    email: '',
    phone: '',
    pricingTier: '',
    estimatedBarangays: '',
    estimatedPopulation: '',
    desiredStartDate: '',
    message: '',
  });

  const [attachments, setAttachments] = useState<AttachmentState[]>(
    REQUIRED_DOCUMENTS.map((doc) => ({
      id: doc.id,
      label: doc.label,
      helper: doc.helper,
      required: doc.required,
      file: null,
      upload: null,
      status: 'idle',
    }))
  );

  const pricingHint = useMemo(() => {
    if (!selectedTier) return 'Choose a tier to lock an indicative range.';
    const tier = TIERS.find((entry) => entry.id === selectedTier);
    return tier ? `${tier.name}: ${tier.price}` : 'Choose a tier to lock an indicative range.';
  }, [selectedTier]);

  const handleTierSelect = (tierId: string) => {
    setSelectedTier(tierId);
    const tier = TIERS.find((entry) => entry.id === tierId);
    setFormData((prev) => ({ ...prev, pricingTier: tier?.name ?? prev.pricingTier }));
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const updateForm = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateFile = (file: File) => {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return 'Upload PDF, JPG, or PNG files only.';
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return 'File exceeds 5 MB limit.';
    }
    return '';
  };

  const handleFileChange = (index: number, file: File | null) => {
    setAttachments((prev) => {
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      if (!file) {
        next[index] = { ...target, file: null, upload: null, status: 'idle', error: '' };
        return next;
      }
      const validation = validateFile(file);
      next[index] = {
        ...target,
        file,
        upload: null,
        status: validation ? 'error' : 'idle',
        error: validation,
      };
      return next;
    });
  };

  const uploadAttachments = async () => {
    let nextAttachments = [...attachments];
    for (let i = 0; i < nextAttachments.length; i += 1) {
      const entry = nextAttachments[i];
      if (!entry?.file || entry.upload?.fileId) continue;
      if (entry.status === 'error') {
        throw new Error(entry.error || 'Fix document uploads before submitting.');
      }
      nextAttachments[i] = { ...entry, status: 'uploading', error: '' };
      setAttachments([...nextAttachments]);
      const result = await uploadMunicipalOnboardingFile(entry.file, entry.file.name);
      if (result.error || !result.file) {
        nextAttachments[i] = { ...entry, status: 'error', error: result.error || 'Upload failed' };
        setAttachments([...nextAttachments]);
        throw new Error(result.error || 'Upload failed');
      }
      nextAttachments[i] = { ...entry, status: 'uploaded', upload: result.file, error: '' };
      setAttachments([...nextAttachments]);
    }
    return nextAttachments;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess(null);

    if (!formData.cityMunicipality.trim() || !formData.officeName.trim() || !formData.contactName.trim()) {
      setError('Please complete the required city, office, and contact fields.');
      return;
    }
    if (!formData.contactRole.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setError('Please include contact role, email, and phone number.');
      return;
    }
    if (!authorized) {
      setError('Please confirm you are authorized to submit this request.');
      return;
    }

    const missingDocs = attachments.filter((doc) => doc.required && !doc.file);
    if (missingDocs.length > 0) {
      setError('Please upload all required credentials before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await uploadAttachments();
      const attachmentPayload = uploaded
        .filter((entry) => entry.upload?.fileId)
        .map((entry) => ({
          fileId: entry.upload?.fileId ?? '',
          label: entry.label,
        }))
        .filter((entry) => entry.fileId);

      const payload = {
        cityMunicipality: formData.cityMunicipality.trim(),
        province: formData.province.trim() || undefined,
        officeName: formData.officeName.trim(),
        contactName: formData.contactName.trim(),
        contactRole: formData.contactRole.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        pricingTier: formData.pricingTier.trim() || undefined,
        estimatedBarangays: formData.estimatedBarangays ? Number(formData.estimatedBarangays) : undefined,
        estimatedPopulation: formData.estimatedPopulation ? Number(formData.estimatedPopulation) : undefined,
        desiredStartDate: formData.desiredStartDate || undefined,
        message: formData.message.trim() || undefined,
        attachments: attachmentPayload.length ? attachmentPayload : undefined,
      };

      const result = await createMunicipalOnboardingApplication(payload);
      if (result.error || !result.request) {
        setError(result.error || 'Submission failed. Please try again.');
        setSubmitting(false);
        return;
      }

      setSuccess({ id: result.request.id, status: result.request.status });
      setSubmitting(false);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Submission failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden border-b border-slate-200/70 bg-gradient-to-br from-[#0c6c45] via-[#13935f] to-[#1bb376] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.15),transparent_46%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
              <Landmark className="h-3.5 w-3.5" />
              Government Onboarding
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Bring BioTrack to your city with a verified municipal onboarding flow.
            </h1>
            <p className="text-base text-white/85">
              Built for mayors, city health officers, and authorized secretaries. Submit credentials once, and we will
              verify everything before activation.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="bg-white text-[#0c6c45] hover:bg-white/90"
                onClick={() => handleTierSelect(TIERS[0].id)}
              >
                Start application
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Link href="/login" className="text-sm font-semibold text-white/90 hover:text-white">
                Existing admin? Sign in
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-white/80">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Verified credentials
              </span>
              <span className="inline-flex items-center gap-2">
                <FileCheck2 className="h-4 w-4" />
                Secure document handling
              </span>
            </div>
          </div>

          <Card className="w-full max-w-md border-white/20 bg-white/10 text-white shadow-lg backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl">What to prepare</CardTitle>
              <CardDescription className="text-white/70">We review these before approval.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {REQUIRED_DOCUMENTS.filter((doc) => doc.required).map((doc) => (
                <div key={doc.id} className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-3">
                  <div className="mt-1 rounded-lg bg-white/20 p-2">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{doc.label}</p>
                    <p className="text-xs text-white/70">{doc.helper}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-16 px-6 py-12">
        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg">1. Choose a coverage tier</CardTitle>
              <CardDescription>Get an indicative range based on coverage size.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Compare coverage tiers and pick the one that matches your city scale. Pricing is finalized after review.
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg">2. Submit credentials</CardTitle>
              <CardDescription>Upload proof of authority and office designation.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              We only need a few documents to validate the request. Files are stored securely and logged.
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white">
            <CardHeader>
              <CardTitle className="text-lg">3. Verification + activation</CardTitle>
              <CardDescription>Our team confirms legitimacy before access.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-600">
              Once approved, we create the municipal admin account and schedule onboarding.
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pricing range</p>
            <h2 className="text-3xl font-semibold">Coverage tiers</h2>
            <p className="text-sm text-muted-foreground">
              Pricing ranges are indicative and finalized after verifying your request and coverage size.
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <Card
                key={tier.id}
                className={`border-slate-200 bg-white ${selectedTier === tier.id ? 'ring-2 ring-[#1bb376]/60' : ''}`}
              >
                <CardHeader>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-2xl font-semibold text-[#0c6c45]">{tier.price}</div>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {tier.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#1bb376]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full" onClick={() => handleTierSelect(tier.id)}>
                    Apply with this tier
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {pricingHint} We will confirm pricing after reviewing the documentation.
          </p>
        </section>

        <section ref={formRef} className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Application form</p>
            <h2 className="text-3xl font-semibold">Municipal onboarding request</h2>
            <p className="text-sm text-muted-foreground">
              Please submit official details for the city/municipality. We will contact you after verification.
            </p>
          </div>

          {error ? (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
            </Card>
          ) : null}

          {success ? (
            <Card className="border-emerald-200 bg-emerald-50/70">
              <CardContent className="pt-6 text-sm text-emerald-900">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-emerald-100 p-2">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Application submitted successfully.</p>
                    <p className="mt-1 text-sm text-emerald-800">
                      Tracking ID: {success.id} | Status: {success.status}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                      Our team will contact you once verification is complete.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-slate-200 bg-white">
            <CardContent className="pt-6">
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cityMunicipality">City / Municipality</Label>
                    <Input
                      id="cityMunicipality"
                      placeholder="Dagupan City"
                      value={formData.cityMunicipality}
                      onChange={(event) => updateForm('cityMunicipality', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="province">Province (optional)</Label>
                    <Input
                      id="province"
                      placeholder="Pangasinan"
                      value={formData.province}
                      onChange={(event) => updateForm('province', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="officeName">Office / Department</Label>
                    <Input
                      id="officeName"
                      placeholder="City Health Office"
                      value={formData.officeName}
                      onChange={(event) => updateForm('officeName', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact person</Label>
                    <Input
                      id="contactName"
                      placeholder="Juan Dela Cruz"
                      value={formData.contactName}
                      onChange={(event) => updateForm('contactName', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactRole">Role / Title</Label>
                    <Input
                      id="contactRole"
                      placeholder="Mayor's Secretary"
                      value={formData.contactRole}
                      onChange={(event) => updateForm('contactRole', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="mayor.office@example.gov.ph"
                      value={formData.email}
                      onChange={(event) => updateForm('email', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input
                      id="phone"
                      placeholder="+63 912 345 6789"
                      value={formData.phone}
                      onChange={(event) => updateForm('phone', event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pricingTier">Preferred coverage tier</Label>
                    <select
                      id="pricingTier"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={formData.pricingTier}
                      onChange={(event) => updateForm('pricingTier', event.target.value)}
                    >
                      <option value="">Select a tier</option>
                      {TIERS.map((tier) => (
                        <option key={tier.id} value={tier.name}>
                          {tier.name} ({tier.price})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedBarangays">Estimated barangays</Label>
                    <Input
                      id="estimatedBarangays"
                      type="number"
                      min="1"
                      placeholder="35"
                      value={formData.estimatedBarangays}
                      onChange={(event) => updateForm('estimatedBarangays', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedPopulation">Estimated population</Label>
                    <Input
                      id="estimatedPopulation"
                      type="number"
                      min="1"
                      placeholder="180000"
                      value={formData.estimatedPopulation}
                      onChange={(event) => updateForm('estimatedPopulation', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desiredStartDate">Desired start date</Label>
                    <Input
                      id="desiredStartDate"
                      type="date"
                      value={formData.desiredStartDate}
                      onChange={(event) => updateForm('desiredStartDate', event.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Short message (optional)</Label>
                  <textarea
                    id="message"
                    className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    placeholder="Share any notes about your timeline, contacts, or city requirements."
                    value={formData.message}
                    onChange={(event) => updateForm('message', event.target.value)}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white p-2 shadow-sm">
                      <UploadCloud className="h-5 w-5 text-[#0c6c45]" />
                    </div>
                    <div>
                      <p className="font-semibold">Upload credentials</p>
                      <p className="text-xs text-muted-foreground">
                        Supported files: PDF, JPG, PNG. Maximum size: 5 MB each.
                      </p>
                    </div>
                  </div>
                  <ul className="mt-4 space-y-1 text-xs text-slate-600">
                    {DOCUMENT_INSTRUCTIONS.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#0c6c45]" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {attachments.map((entry, index) => (
                      <div key={entry.id} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                        <div>
                          <p className="text-sm font-semibold">
                            {entry.label}
                            {entry.required ? <span className="text-destructive"> *</span> : null}
                          </p>
                          <p className="text-xs text-muted-foreground">{entry.helper}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            id={`file-${entry.id}`}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(event) => handleFileChange(index, event.target.files?.[0] ?? null)}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`file-${entry.id}`)?.click()}
                          >
                            {entry.file ? 'Replace file' : 'Upload file'}
                          </Button>
                          {entry.file ? (
                            <span className="text-xs text-slate-600">
                              {entry.file.name} | {formatBytes(entry.file.size)}
                            </span>
                          ) : null}
                        </div>
                        {entry.file ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{entry.file.name} | {formatBytes(entry.file.size)}</span>
                            <button
                              type="button"
                              className="text-[#0c6c45] underline underline-offset-2"
                              onClick={() => {
                                const url = URL.createObjectURL(entry.file as File);
                                window.open(url, '_blank', 'noopener,noreferrer');
                                setTimeout(() => URL.revokeObjectURL(url), 8000);
                              }}
                            >
                              View file
                            </button>
                          </div>
                        ) : null}
                        {entry.status === 'uploading' ? (
                          <p className="text-xs text-amber-600">Uploading...</p>
                        ) : null}
                        {entry.status === 'uploaded' ? (
                          <p className="text-xs text-emerald-700">Uploaded</p>
                        ) : null}
                        {entry.status === 'error' ? (
                          <p className="text-xs text-destructive">{entry.error}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <Checkbox
                    id="authorized"
                    checked={authorized}
                    onCheckedChange={(checked) => setAuthorized(Boolean(checked))}
                  />
                  <Label htmlFor="authorized" className="text-sm text-muted-foreground">
                    I confirm that I am authorized to submit this request on behalf of the city/municipality and that the
                    attached documents are valid.
                  </Label>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit onboarding request'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    You will receive a confirmation email once verification begins.
                  </span>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="border-slate-200 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <Building2 className="h-5 w-5 text-[#0c6c45]" />
                </div>
                <div>
                  <p className="font-semibold">Municipal coordination</p>
                  <p className="text-xs text-muted-foreground">We align with the city health office for rollout.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <PhoneCall className="h-5 w-5 text-[#0c6c45]" />
                </div>
                <div>
                  <p className="font-semibold">Onboarding call</p>
                  <p className="text-xs text-muted-foreground">We schedule a walkthrough once approved.</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <ShieldCheck className="h-5 w-5 text-[#0c6c45]" />
                </div>
                <div>
                  <p className="font-semibold">Compliance-ready</p>
                  <p className="text-xs text-muted-foreground">We verify access before provisioning admins.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
