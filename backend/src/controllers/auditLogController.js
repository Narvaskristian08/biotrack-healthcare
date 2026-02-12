import { AuditLog } from '../models/AuditLog.js';

export async function listAuditLogs(req, res) {
  const { healthCenterId } = req.context;
  const { entityType = '', entityId = '', action = '' } = req.query ?? {};
  const q = { healthCenterId };
  if (entityType) q.entityType = String(entityType);
  if (entityId) q.entityId = entityId;
  if (action) q.action = String(action);

  const logs = await AuditLog.find(q).sort({ createdAt: -1 }).limit(200).lean();
  return res.json({ logs });
}

