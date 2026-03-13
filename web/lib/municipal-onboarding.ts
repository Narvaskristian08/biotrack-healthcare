import { API_BASE_URL, apiPost, getCsrfToken } from './api';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export interface MunicipalOnboardingAttachmentDraft {
  fileId: string;
  label?: string;
}

export interface MunicipalOnboardingApplicationPayload {
  cityMunicipality: string;
  province?: string;
  officeName: string;
  contactName: string;
  contactRole: string;
  email: string;
  phone: string;
  pricingTier?: string;
  estimatedBarangays?: number;
  estimatedPopulation?: number;
  desiredStartDate?: string;
  message?: string;
  attachments?: MunicipalOnboardingAttachmentDraft[];
}

export interface MunicipalOnboardingUpload {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

function sanitizeFileName(value: string): string {
  const raw = String(value ?? '').trim();
  if (!raw) return 'unnamed-file';
  const sanitized = raw.replace(/[^a-zA-Z0-9._ -]+/g, '_').slice(0, 120);
  return sanitized || 'unnamed-file';
}

export async function uploadMunicipalOnboardingFile(
  file: File,
  fileNameOverride?: string
): Promise<{ file?: MunicipalOnboardingUpload; error?: string }> {
  if (!file) return { error: 'File is required' };
  if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: 'Unsupported file type. Please upload PDF, JPG, or PNG files only.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: 'File exceeds the 5 MB size limit.' };
  }

  const csrfToken = await getCsrfToken();
  const safeName = sanitizeFileName(fileNameOverride ?? file.name);

  const response = await fetch(`${API_BASE_URL}/onboarding/uploads`, {
    method: 'POST',
    headers: {
      'Content-Type': file.type,
      'x-file-name': safeName,
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: file,
    credentials: 'include',
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: String(json?.error?.message ?? 'Upload failed') };
  }

  const payload = json?.file ?? {};
  return {
    file: {
      fileId: String(payload.id ?? ''),
      fileName: String(payload.fileName ?? safeName),
      mimeType: String(payload.mimeType ?? file.type),
      sizeBytes: Number(payload.sizeBytes ?? file.size),
    },
  };
}

export async function createMunicipalOnboardingApplication(
  payload: MunicipalOnboardingApplicationPayload
): Promise<{ request?: { id: string; status: string }; error?: string }> {
  const result = await apiPost<{ request: { id: string; status: string } }>('/onboarding/applications', payload);
  if (result.error) return { error: result.error.message };
  return { request: result.data?.request };
}
