import { apiDelete, apiGet, apiPatch } from './api';
import { getSession } from './auth';

const RECORD_EXPORT_REQUEST_ABI = [
  'function requestRecordExport(string recordId, bytes32 recordHash, string identityId) returns (bytes32 exportId)',
];

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
  assignedHealthCenter?: {
    id?: string;
    name?: string;
    barangayName?: string;
    cityMunicipality?: string;
    healthCenterName?: string;
    address?: string;
    contactNumber?: string;
    officialContactInfo?: string;
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

export interface TrendCompareResponse {
  success: boolean;
  comparison: {
    currentWindow: {
      days: number;
      sampleCount: number;
      averageHeartRate: number | null;
      minHeartRate: number | null;
      maxHeartRate: number | null;
      trend: string;
    };
    previousWindow: {
      days: number;
      sampleCount: number;
      averageHeartRate: number | null;
      minHeartRate: number | null;
      maxHeartRate: number | null;
      trend: string;
    };
    deltaBpm: number | null;
    deltaPercent: number | null;
    direction: 'higher' | 'lower' | 'flat' | 'insufficient_data';
  };
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

export interface ClearMonitoringHistoryResponse {
  success: boolean;
  message?: string;
  deleted?: {
    healthRecords: number;
    alerts: number;
  };
}

function getPatientIdFromSession(): string {
  const session = getSession();
  if (!session || session.role !== 'patient' || !session.id || !session.accessToken) {
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

export async function fetchMyPatientRecords(requestOptions: RequestInit = {}): Promise<{ records?: PatientRecord[]; error?: string }> {
  try {
    const patientId = getPatientIdFromSession();
    const result = await apiGet<{ records: PatientRecord[] }>(`/patients/${patientId}/records`, requestOptions);
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

function toBytes32Hex(hashValue: string): string {
  const normalized = String(hashValue ?? '').trim().replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error('Record hash must be a 32-byte hex string before requesting on-chain export');
  }
  return `0x${normalized}`;
}

export async function requestMyRecordExtractionOnChain(
  record: Pick<PatientRecord, '_id' | 'recordHash' | 'blockchain'>,
  identityId = ''
): Promise<{ txHash?: string; blockNumber?: number; error?: string }> {
  try {
    const status = String(record.blockchain?.verificationStatus ?? '').trim().toLowerCase();
    if (status !== 'anchored' && status !== 'verified') {
      return { error: 'Record is not anchored yet. Please verify first.' };
    }

    if (typeof window === 'undefined') {
      return { error: 'Wallet-based extraction is only available in browser mode' };
    }

    const ethereum = (window as Window & { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!ethereum) {
      return { error: 'No EVM wallet found. Install MetaMask or another wallet extension.' };
    }

    const contractAddress = String(
      record.blockchain?.contractAddress ?? process.env.NEXT_PUBLIC_BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS ?? ''
    ).trim();
    if (!contractAddress) {
      return { error: 'Blockchain records contract address is unavailable for this record.' };
    }

    await ethereum.request({ method: 'eth_requestAccounts' });

    const { BrowserProvider, Contract } = await import('ethers');
    const provider = new BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const contract = new Contract(contractAddress, RECORD_EXPORT_REQUEST_ABI, signer);

    const tx = await contract.requestRecordExport(
      String(record._id),
      toBytes32Hex(record.recordHash),
      String(identityId ?? '')
    );
    const receipt = await tx.wait();

    return {
      txHash: String(tx.hash ?? '').trim(),
      blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : undefined,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to submit extraction request on-chain' };
  }
}

export async function fetchMyTrendInsight(
  requestOptions: RequestInit = {},
  language = 'en'
): Promise<{ data?: TrendInsightResponse; error?: string }> {
  try {
    // Ensure bearer token is present before calling protected endpoints.
    getPatientIdFromSession();
    const endpoint = `/ai/trend-insight?language=${encodeURIComponent(language)}`;
    const result = await apiGet<TrendInsightResponse>(endpoint, requestOptions);
    if (result.error) return { error: result.error.message };
    return { data: result.data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch trend insight' };
  }
}

export async function fetchMyHealthSummary(
  days = 7,
  requestOptions: RequestInit = {},
  language = 'en'
): Promise<{ data?: SummaryInsightResponse; error?: string }> {
  try {
    getPatientIdFromSession();
    const endpoint = `/ai/summary?days=${days}&language=${encodeURIComponent(language)}`;
    const result = await apiGet<SummaryInsightResponse>(endpoint, requestOptions);
    if (result.error) return { error: result.error.message };
    return { data: result.data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch health summary' };
  }
}

export async function fetchMyTrendCompare(
  currentDays = 7,
  previousDays = 7
): Promise<{ data?: TrendCompareResponse; error?: string }> {
  try {
    getPatientIdFromSession();
    const result = await apiGet<TrendCompareResponse>(
      `/ai/trend-compare?currentDays=${currentDays}&previousDays=${previousDays}`
    );
    if (result.error) return { error: result.error.message };
    return { data: result.data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch trend comparison' };
  }
}

export async function fetchMyAlerts(limit = 20, requestOptions: RequestInit = {}): Promise<{ alerts?: AlertEntry[]; error?: string }> {
  try {
    getPatientIdFromSession();
    const result = await apiGet<{ success: boolean; alerts: AlertEntry[] }>(`/ai/alerts?limit=${limit}`, requestOptions);
    if (result.error) return { error: result.error.message };
    return { alerts: result.data?.alerts ?? [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch alerts' };
  }
}

export async function clearMyMonitoringHistory(): Promise<{ data?: ClearMonitoringHistoryResponse; error?: string }> {
  try {
    getPatientIdFromSession();
    const result = await apiDelete<ClearMonitoringHistoryResponse>('/ai/history');
    if (result.error) return { error: result.error.message };
    return { data: result.data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to clear monitoring history' };
  }
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
