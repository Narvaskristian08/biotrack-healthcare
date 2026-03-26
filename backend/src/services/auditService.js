import { AuditLog } from '../models/AuditLog.js';
import { runDetachedTask } from '../utils/backgroundTask.js';
import { anchorGovernanceAuditLog, shouldAnchorGovernanceAction } from './blockchain/governanceProof.service.js';

export async function writeAuditLog({
  req,
  action,
  entityType,
  entityId = null,
  before = null,
  after = null,
  outcome = 'success',
  reason = '',
}) {
  const ctx = req?.context ?? {};
  const ip = req?.ip ?? req?.headers?.['x-forwarded-for'] ?? '';
  const userAgent = req?.headers?.['user-agent'] ?? '';
  const barangay = String(req?.headers?.['x-barangay'] ?? ctx.barangay ?? '').trim();
  const actorName = String(req?.headers?.['x-actor-name'] ?? ctx.actorName ?? '').trim();
  const actorType = ctx?.adminId ? 'admin' : ctx?.patientId ? 'patient' : ctx?.healthCenterId ? 'healthcenter' : 'unknown';
  const actorId = ctx?.adminId ?? ctx?.patientId ?? ctx?.healthCenterId ?? null;

  const auditLog = await AuditLog.create({
    healthCenterId: ctx.healthCenterId ?? null,
    barangay,
    actorName,
    actorType,
    actorId,
    actorSessionId: ctx.sessionId ?? null,
    action,
    entityType,
    entityId,
    outcome,
    reason,
    before,
    after,
    ip,
    userAgent,
  });

  if (shouldAnchorGovernanceAction(action)) {
    runDetachedTask(`audit-governance-anchor:${String(auditLog?._id ?? 'unknown')}`, async () => {
      await anchorGovernanceAuditLog(auditLog);
    });
  }

  return auditLog;
}
