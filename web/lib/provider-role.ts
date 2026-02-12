import { apiGet } from './api';
import { getSession } from './auth';
import { downloadTextFile } from './patient-role';

export interface ProviderPatient {
  _id: string;
  healthCenterId: string;
  mrn?: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  email: string;
  address?: string;
  contactNumber?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProviderPatientRecord {
  _id: string;
  patientId: string;
  type: string;
  data: Record<string, unknown>;
  recordHash: string;
  blockchain?: {
    txId?: string;
    blockNumber?: number | null;
    anchoredAt?: string | null;
    verificationStatus?: string;
  };
  createdAt: string;
}

export interface ProviderAlert {
  _id: string;
  userId: string;
  type: string;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | string;
  message: string;
  createdAt: string;
}

export interface ProviderTrendData {
  trend: string;
  baseline: number | null;
  recentHeartRates: number[];
}

export interface ProviderSummaryData {
  period: string;
  overallRisk: string;
  observations: string[];
  trend: string;
  fallEvents: number;
}

export interface ProviderRecordVerification {
  recordId: string;
  patientId: string;
  status: string;
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
  };
  verifiedAt?: string;
}

function assertProviderSession() {
  const session = getSession();
  if (!session || session.role !== 'provider' || !session.accessToken) {
    throw new Error('Provider session is required');
  }
}

export function patientDisplayName(patient: ProviderPatient): string {
  return `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || patient.email || 'Unknown Patient';
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function extractHeartRate(record?: ProviderPatientRecord): number | null {
  if (!record) return null;
  const data = record.data ?? {};
  const hr = parseNumber((data as Record<string, unknown>).heartRate);
  if (hr !== null) return hr;
  return parseNumber((data as Record<string, unknown>).bpm);
}

export function extractActivityLevel(record?: ProviderPatientRecord): number | null {
  if (!record) return null;
  const data = record.data ?? {};
  const level = parseNumber((data as Record<string, unknown>).activityLevel);
  if (level !== null) return level;
  const steps = parseNumber((data as Record<string, unknown>).steps);
  if (steps !== null) return Math.min(100, Math.round(steps / 120));
  return null;
}

export function extractFallDetected(record?: ProviderPatientRecord): boolean {
  if (!record) return false;
  const value = (record.data ?? {}) as Record<string, unknown>;
  return Boolean(value.fallDetected ?? value.fall ?? false);
}

export async function fetchAssignedPatients(): Promise<{ patients?: ProviderPatient[]; error?: string }> {
  try {
    assertProviderSession();
    const result = await apiGet<{ patients: ProviderPatient[] }>('/patients');
    if (result.error) return { error: result.error.message };
    return { patients: result.data?.patients ?? [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch patients' };
  }
}

export async function fetchPatientById(patientId: string): Promise<{ patient?: ProviderPatient; error?: string }> {
  const result = await apiGet<{ patient: ProviderPatient }>(`/patients/${patientId}`);
  if (result.error) return { error: result.error.message };
  return { patient: result.data?.patient };
}

export async function fetchPatientRecords(patientId: string): Promise<{ records?: ProviderPatientRecord[]; error?: string }> {
  const result = await apiGet<{ records: ProviderPatientRecord[] }>(`/patients/${patientId}/records`);
  if (result.error) return { error: result.error.message };
  return { records: result.data?.records ?? [] };
}

export async function verifyPatientRecord(
  patientId: string,
  recordId: string
): Promise<{ data?: ProviderRecordVerification; error?: string }> {
  const result = await apiGet<ProviderRecordVerification>(`/patients/${patientId}/records/${recordId}/verify`);
  if (result.error) return { error: result.error.message };
  return { data: result.data };
}

export async function fetchPatientAlerts(
  patientId: string,
  limit = 20
): Promise<{ alerts?: ProviderAlert[]; error?: string }> {
  const result = await apiGet<{ success: boolean; alerts: ProviderAlert[] }>(
    `/ai/alerts?patientId=${encodeURIComponent(patientId)}&limit=${limit}`
  );
  if (result.error) return { error: result.error.message };
  return { alerts: result.data?.alerts ?? [] };
}

export async function fetchPatientTrend(
  patientId: string
): Promise<{ trendData?: ProviderTrendData; insight?: string; error?: string }> {
  const result = await apiGet<{ success: boolean; trendData: ProviderTrendData; insight?: string }>(
    `/ai/trend-insight?patientId=${encodeURIComponent(patientId)}`
  );
  if (result.error) return { error: result.error.message };
  return { trendData: result.data?.trendData, insight: result.data?.insight };
}

export async function fetchPatientSummary(
  patientId: string,
  days = 7
): Promise<{ summaryData?: ProviderSummaryData; insight?: string; error?: string }> {
  const result = await apiGet<{ success: boolean; summaryData: ProviderSummaryData; insight?: string }>(
    `/ai/summary?patientId=${encodeURIComponent(patientId)}&days=${days}`
  );
  if (result.error) return { error: result.error.message };
  return { summaryData: result.data?.summaryData, insight: result.data?.insight };
}

export function exportPatientsCsv(
  filename: string,
  rows: Array<{
    patientId: string;
    patientName: string;
    email: string;
    riskLevel: string;
    alertCount: number;
    latestHeartRate: number | null;
    latestActivity: number | null;
  }>
) {
  const header = ['patientId', 'patientName', 'email', 'riskLevel', 'alertCount', 'latestHeartRate', 'latestActivity'];
  const lines = rows.map((row) =>
    [
      row.patientId,
      row.patientName,
      row.email,
      row.riskLevel,
      row.alertCount,
      row.latestHeartRate ?? '',
      row.latestActivity ?? '',
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(',')
  );
  downloadTextFile(filename, [header.join(','), ...lines].join('\n'), 'text/csv;charset=utf-8');
}

export function exportJson(filename: string, payload: unknown) {
  downloadTextFile(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}
