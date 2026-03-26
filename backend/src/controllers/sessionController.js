import { Session } from '../models/Session.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { signSessionToken, sessionExpiryDateFromNow } from '../services/authService.js';
import { sha256Hex } from '../utils/crypto.js';
import { writeAuditLog } from '../services/auditService.js';

export async function startSession(req, res) {
  const { healthCenterId } = req.context;
  // Shared-session mode: no staff/device identity.

  const healthCenter = await HealthCenter.findById(healthCenterId).select('status').lean();
  if (!healthCenter) {
    return res.status(401).json({ error: { message: 'Health center account not found' } });
  }
  if (healthCenter.status !== 'active') {
    return res.status(403).json({
      error: {
        message: `Barangay unit status is '${healthCenter.status}'. Only 'active' barangays can start sessions.`,
      },
    });
  }

  const expiresAt = sessionExpiryDateFromNow();
  const now = new Date();
  const session = await Session.create({
    healthCenterId,
    sessionTokenHash: 'pending',
    startedAt: now,
    lastActivityAt: now,
    expiresAt,
    ip: req.ip ?? '',
    userAgent: req.headers['user-agent'] ?? '',
  });

  const token = signSessionToken({
    sessionId: session._id,
    healthCenterId,
  });

  await Session.updateOne({ _id: session._id }, { $set: { sessionTokenHash: sha256Hex(token) } });

  await writeAuditLog({
    req,
    action: 'SESSION.START',
    entityType: 'Session',
    entityId: session._id,
    after: { expiresAt },
  });

  return res.status(201).json({
    sessionToken: token,
    session: { id: session._id, expiresAt },
  });
}

export async function logoutSession(req, res) {
  const { sessionId } = req.context;
  await Session.updateOne({ _id: sessionId }, { $set: { revokedAt: new Date() } });
  await writeAuditLog({ req, action: 'SESSION.LOGOUT', entityType: 'Session', entityId: sessionId });
  return res.json({ ok: true });
}

