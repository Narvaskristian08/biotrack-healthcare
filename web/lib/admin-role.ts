import { apiGet, apiPatch, apiPost } from './api';
import { getSession } from './auth';
import { downloadTextFile } from './patient-role';

function assertAdminSession() {
  const session = getSession();
  if (!session || session.role !== 'admin' || !session.accessToken) {
    throw new Error('Admin session is required');
  }
}

export interface AdminUser {
  id: string;
  role: 'patient' | 'provider' | 'admin';
  displayName: string;
  email: string;
  status: string;
  onboardingStatus?: string;
  credentialStatus: string;
  meta: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUserNotification {
  attempted: boolean;
  delivered: boolean;
  channel: string;
  recipientMasked?: string;
  message?: string;
}

export interface AdminOverview {
  users: { patients: number; providers: number; admins: number };
  providers: { total: number; active: number; pendingApproval: number };
  sessions: { active: number };
  security: { failedEvents24h: number };
  blockchain: { proofs24h: number };
}

export interface RbacSettings {
  patient: Record<string, boolean>;
  provider: Record<string, boolean>;
  admin: Record<string, boolean>;
}

export interface GovernanceSettings {
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  privacyComplianceMode: 'strict' | 'standard';
  retentionDays: number;
  backupEnabled: boolean;
  backupSchedule: string;
  lastBackupAt?: string | null;
  lastRestoreAt?: string | null;
}

export interface PerformanceThresholds {
  maxAlertLatencyMs: number;
  maxApiP95Ms: number;
  suspiciousFailuresPerHour: number;
}

export interface AuditLogItem {
  _id: string;
  action: string;
  outcome: string;
  reason?: string;
  actorType?: string;
  actorName?: string;
  actorId?: string;
  createdAt: string;
  healthCenterId?: string;
  entityType?: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface BlockchainOverviewResponse {
  overview: {
    proofs24h: number;
    failed24h: number;
    byKind: Array<{ _id: string; count: number }>;
    byStatus: Array<{ _id: string; count: number }>;
  };
  recent: Array<{
    _id: string;
    kind: string;
    status: string;
    txId?: string;
    blockNumber?: number;
    identityId?: string;
    createdAt: string;
  }>;
}

export async function fetchAdminOverview(): Promise<{ overview?: AdminOverview; error?: string }> {
  try {
    assertAdminSession();
    const result = await apiGet<{ overview: AdminOverview }>('/admin/overview');
    if (result.error) return { error: result.error.message };
    return { overview: result.data?.overview };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to load admin overview' };
  }
}

export async function fetchAdminUsers(params?: {
  q?: string;
  role?: 'patient' | 'provider' | 'admin' | '';
  status?: string;
}): Promise<{ users?: AdminUser[]; error?: string }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.role) qs.set('role', params.role);
  if (params?.status) qs.set('status', params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const result = await apiGet<{ users: AdminUser[] }>(`/admin/users${suffix}`);
  if (result.error) return { error: result.error.message };
  return { users: result.data?.users ?? [] };
}

export async function createAdminUser(payload: Record<string, unknown>): Promise<{
  user?: AdminUser;
  notification?: AdminUserNotification;
  error?: string;
}> {
  const result = await apiPost<{ user: AdminUser; notification?: AdminUserNotification }>('/admin/users', payload);
  if (result.error) return { error: result.error.message };
  return { user: result.data?.user, notification: result.data?.notification };
}

export async function updateAdminUser(
  role: 'patient' | 'provider' | 'admin',
  id: string,
  patch: Record<string, unknown>
): Promise<{ user?: AdminUser; error?: string }> {
  const result = await apiPatch<{ user: AdminUser }>(`/admin/users/${role}/${id}`, patch);
  if (result.error) return { error: result.error.message };
  return { user: result.data?.user };
}

export async function updateProviderCredentialStatus(
  providerId: string,
  onboardingStatus: 'pending' | 'verified' | 'active'
): Promise<{ provider?: { id: string; email: string; onboardingStatus?: string; credentialStatus: string; status: string }; error?: string }> {
  const result = await apiPost<{ provider: { id: string; email: string; onboardingStatus?: string; credentialStatus: string; status: string } }>(
    `/admin/providers/${providerId}/credential-status`,
    { status: onboardingStatus }
  );
  if (result.error) return { error: result.error.message };
  return { provider: result.data?.provider };
}

export async function fetchRbacSettings(): Promise<{ rbac?: RbacSettings; error?: string }> {
  const result = await apiGet<{ rbac: RbacSettings }>('/admin/rbac');
  if (result.error) return { error: result.error.message };
  return { rbac: result.data?.rbac };
}

export async function updateRbacSettings(rbac: RbacSettings): Promise<{ rbac?: RbacSettings; error?: string }> {
  const result = await apiPatch<{ rbac: RbacSettings }>('/admin/rbac', { rbac });
  if (result.error) return { error: result.error.message };
  return { rbac: result.data?.rbac };
}

export async function fetchSystemLogs(params?: {
  q?: string;
  action?: string;
  outcome?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs?: AuditLogItem[]; suspiciousCount?: number; pagination?: AuditLogPagination; error?: string }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.action) qs.set('action', params.action);
  if (params?.outcome) qs.set('outcome', params.outcome);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const result = await apiGet<{ logs: AuditLogItem[]; suspiciousCount: number; pagination: AuditLogPagination }>(`/admin/logs${suffix}`);
  if (result.error) return { error: result.error.message };
  return {
    logs: result.data?.logs ?? [],
    suspiciousCount: result.data?.suspiciousCount ?? 0,
    pagination: result.data?.pagination,
  };
}

export async function fetchSystemMonitoring(): Promise<{
  monitoring?: {
    activeSessions: number;
    totalSessions24h: number;
    failed24h: number;
    alerts24h: number;
    suspiciousThreshold: number;
    suspicious: boolean;
    recentAudit: AuditLogItem[];
  };
  error?: string;
}> {
  const result = await apiGet<{
    monitoring: {
      activeSessions: number;
      totalSessions24h: number;
      failed24h: number;
      alerts24h: number;
      suspiciousThreshold: number;
      suspicious: boolean;
      recentAudit: AuditLogItem[];
    };
  }>('/admin/monitoring');
  if (result.error) return { error: result.error.message };
  return { monitoring: result.data?.monitoring };
}

export async function fetchBlockchainOverview(): Promise<{ data?: BlockchainOverviewResponse; error?: string }> {
  const result = await apiGet<BlockchainOverviewResponse>('/admin/blockchain/overview');
  if (result.error) return { error: result.error.message };
  return { data: result.data };
}

export async function fetchGovernanceSettings(): Promise<{
  dataGovernance?: GovernanceSettings;
  performanceThresholds?: PerformanceThresholds;
  error?: string;
}> {
  const result = await apiGet<{ dataGovernance: GovernanceSettings; performanceThresholds: PerformanceThresholds }>('/admin/governance');
  if (result.error) return { error: result.error.message };
  return {
    dataGovernance: result.data?.dataGovernance,
    performanceThresholds: result.data?.performanceThresholds,
  };
}

export async function updateGovernanceSettings(payload: {
  dataGovernance?: Partial<GovernanceSettings>;
  performanceThresholds?: Partial<PerformanceThresholds>;
}): Promise<{ error?: string }> {
  const result = await apiPatch('/admin/governance', payload);
  if (result.error) return { error: result.error.message };
  return {};
}

export async function runBackup(): Promise<{ lastBackupAt?: string; error?: string }> {
  const result = await apiPost<{ lastBackupAt: string }>('/admin/governance/backup', {});
  if (result.error) return { error: result.error.message };
  return { lastBackupAt: result.data?.lastBackupAt };
}

export async function markRestore(): Promise<{ lastRestoreAt?: string; error?: string }> {
  const result = await apiPost<{ lastRestoreAt: string }>('/admin/governance/restore', {});
  if (result.error) return { error: result.error.message };
  return { lastRestoreAt: result.data?.lastRestoreAt };
}

export function exportAdminJson(filename: string, payload: unknown) {
  downloadTextFile(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
}
