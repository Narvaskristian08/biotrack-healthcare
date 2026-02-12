import { apiGet, apiPatch } from './api';
import { getSession } from './auth';

export interface PatientProfile {
  _id: string;
  healthCenterId: string;
  lastName: string;
  firstName: string;
  middleInitial: string;
  nameExtension?: string;
  email: string;
  birthDate?: string | null;
  sex?: 'male' | 'female' | 'other' | 'unknown';
  address: string;
  contactNumber: string;
  guardianName?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  blockchainIdentity?: {
    identityId?: string;
    verificationStatus?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientRecord {
  _id: string;
  patientId: string;
  type: string;
  data: Record<string, unknown>;
  recordHash: string;
  blockchain?: {
    enabled?: boolean;
    network?: string;
    contractAddress?: string;
    txId?: string;
    blockNumber?: number | null;
    proofId?: string;
    anchoredAt?: string | null;
    lastVerifiedAt?: string | null;
    verificationStatus?: string;
    errorMessage?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RecordVerificationResult {
  recordId: string;
  patientId: string;
  status: 'tampered' | 'verified' | 'anchor_mismatch' | 'local_hash_only';
  dbIntegrity: {
    storedHash: string;
    recomputedHash: string;
    match: boolean;
  };
  blockchain: {
    available: boolean;
    verified: boolean | null;
    txId?: string;
    blockNumber?: number | null;
    verifiedAt?: string | null;
    reason?: string;
  };
  verifiedAt?: string;
}

export interface LoginHistoryEntry {
  id: string;
  loginAt: string;
  expiresAt?: string | null;
  ip?: string;
  userAgent?: string;
  createdAt?: string;
}

export interface AlertEntry {
  _id: string;
  userId: string;
  type: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface TrendInsightResponse {
  success: boolean;
  trendData: {
    trend: string;
    baseline: number | null;
    recentHeartRates: number[];
  };
  insight?: string;
}

export interface SummaryInsightResponse {
  success: boolean;
  summaryData: {
    period: string;
    overallRisk: string;
    observations: string[];
    trend: string;
    fallEvents: number;
  };
  insight?: string;
}

function getPatientIdFromSession(): string {
  const session = getSession();
  if (!session || session.role !== 'patient' || !session.id) {
    throw new Error('Patient session is required');
  }
  return session.id;
}

export async function fetchMyPatientProfile(): Promise<{ patient?: PatientProfile; error?: string }> {
  try {
    const patientId = getPatientIdFromSession();
    const result = await apiGet<{ patient: PatientProfile }>(`/patients/${patientId}`);
    if (result.error) return { error: result.error.message };
    return { patient: result.data?.patient };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch patient profile' };
  }
}

export async function updateMyPatientProfile(
  patch: Partial<PatientProfile>
): Promise<{ patient?: PatientProfile; error?: string }> {
  try {
    const patientId = getPatientIdFromSession();
    const result = await apiPatch<{ patient: PatientProfile }>(`/patients/${patientId}`, patch);
    if (result.error) return { error: result.error.message };
    return { patient: result.data?.patient };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update profile' };
  }
}

export async function fetchMyPatientRecords(): Promise<{ records?: PatientRecord[]; error?: string }> {
  try {
    const patientId = getPatientIdFromSession();
    const result = await apiGet<{ records: PatientRecord[] }>(`/patients/${patientId}/records`);
    if (result.error) return { error: result.error.message };
    return { records: result.data?.records ?? [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch patient records' };
  }
}

export async function verifyMyPatientRecord(recordId: string): Promise<{ data?: RecordVerificationResult; error?: string }> {
  try {
    const patientId = getPatientIdFromSession();
    const result = await apiGet<RecordVerificationResult>(`/patients/${patientId}/records/${recordId}/verify`);
    if (result.error) return { error: result.error.message };
    return { data: result.data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to verify record' };
  }
}

export async function fetchMyTrendInsight(): Promise<{ data?: TrendInsightResponse; error?: string }> {
  const result = await apiGet<TrendInsightResponse>('/ai/trend-insight');
  if (result.error) return { error: result.error.message };
  return { data: result.data };
}

export async function fetchMyHealthSummary(days = 7): Promise<{ data?: SummaryInsightResponse; error?: string }> {
  const result = await apiGet<SummaryInsightResponse>(`/ai/summary?days=${days}`);
  if (result.error) return { error: result.error.message };
  return { data: result.data };
}

export async function fetchMyAlerts(limit = 20): Promise<{ alerts?: AlertEntry[]; error?: string }> {
  const result = await apiGet<{ success: boolean; alerts: AlertEntry[] }>(`/ai/alerts?limit=${limit}`);
  if (result.error) return { error: result.error.message };
  return { alerts: result.data?.alerts ?? [] };
}

export async function fetchMyLoginHistory(limit = 20): Promise<{ history?: LoginHistoryEntry[]; error?: string }> {
  try {
    const patientId = getPatientIdFromSession();
    const result = await apiGet<{ history: LoginHistoryEntry[] }>(`/patients/${patientId}/login-history?limit=${limit}`);
    if (result.error) return { error: result.error.message };
    return { history: result.data?.history ?? [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch login history' };
  }
}

export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
