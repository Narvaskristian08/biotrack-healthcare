import { Session } from '../models/Session.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { env } from '../config/env.js';
import { sha256Hex } from '../utils/crypto.js';
import { isTokenRevoked } from '../services/tokenRevocation.service.js';
import { verifyAdminToken, verifyHealthCenterToken, verifySessionToken } from '../services/authService.js';
import { parseDurationMs } from '../utils/time.js';

const DEFAULT_SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const DEFAULT_SESSION_TOUCH_INTERVAL_MS = 60 * 1000;
const MIN_SESSION_IDLE_TIMEOUT_MS = 60 * 1000;
const MIN_SESSION_TOUCH_INTERVAL_MS = 5 * 1000;

function getBearerToken(req) {
  const header = req.headers.authorization ?? '';
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return '';
  return token;
}

function resolveSessionIdleTimeoutMs() {
  const parsed = parseDurationMs(env.SESSION_IDLE_TIMEOUT);
  if (parsed <= 0) return DEFAULT_SESSION_IDLE_TIMEOUT_MS;
  return Math.max(parsed, MIN_SESSION_IDLE_TIMEOUT_MS);
}

function resolveSessionTouchIntervalMs(idleTimeoutMs) {
  const parsed = parseDurationMs(env.SESSION_ACTIVITY_TOUCH_INTERVAL);
  const normalized = parsed > 0
    ? Math.max(parsed, MIN_SESSION_TOUCH_INTERVAL_MS)
    : DEFAULT_SESSION_TOUCH_INTERVAL_MS;
  return Math.min(normalized, Math.max(MIN_SESSION_TOUCH_INTERVAL_MS, idleTimeoutMs - 1000));
}

function resolveLastActivityMs(session) {
  const raw = session?.lastActivityAt ?? session?.startedAt ?? session?.createdAt;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export async function requireHealthCenterAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    if (await isTokenRevoked(token)) return res.status(401).json({ error: { message: 'Token revoked' } });
    const payload = verifyHealthCenterToken(token);
    if (payload?.tokenType !== 'healthcenter') return res.status(401).json({ error: { message: 'Invalid token type' } });
    req.context = {
      ...(req.context ?? {}),
      healthCenterId: payload.healthCenterId,
      healthCenterAccessToken: token,
      role: 'healthcenter',
    };
  } catch (err) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        ...(process.env.NODE_ENV !== 'production' ? { detail: String(err?.message ?? '') } : {}),
      },
    });
  }

  return next();
}

export async function requireAdminAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    if (await isTokenRevoked(token)) return res.status(401).json({ error: { message: 'Token revoked' } });
    const payload = verifyAdminToken(token);
    if (payload?.tokenType !== 'admin') return res.status(401).json({ error: { message: 'Invalid token type' } });
    req.context = {
      ...(req.context ?? {}),
      adminId: payload.adminId,
      role: 'admin',
    };
  } catch (err) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        ...(process.env.NODE_ENV !== 'production' ? { detail: String(err?.message ?? '') } : {}),
      },
    });
  }

  return next();
}


export async function requireSessionAuth(req, res, next) {
  let contextPatch = null;

  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    if (await isTokenRevoked(token)) return res.status(401).json({ error: { message: 'Token revoked' } });
    const payload = verifySessionToken(token);

    // Support Patient Login (Stateless for now? Or check if payload has patientId)
    if (payload.tokenType === 'patient') {
      const healthCenter = await HealthCenter.findById(payload.healthCenterId).select('status').lean();
      if (!healthCenter) {
        return res.status(401).json({ error: { message: 'Health center account not found' } });
      }
      if (healthCenter.status !== 'active') {
        return res.status(403).json({
          error: {
            message: `Barangay unit status is '${healthCenter.status}'. Only 'active' barangays can use BioTrack services.`,
          },
        });
      }

      contextPatch = {
        patientId: payload.patientId,
        healthCenterId: payload.healthCenterId,
        role: 'patient',
        patientAccessToken: token
      };
    } else {
      if (payload?.tokenType !== 'session') return res.status(401).json({ error: { message: 'Invalid token type' } });

      const session = await Session.findById(payload.sessionId).lean();
      if (!session) return res.status(401).json({ error: { message: 'Session not found' } });
      if (session.revokedAt) return res.status(401).json({ error: { message: 'Session revoked' } });
      const nowMs = Date.now();
      if (new Date(session.expiresAt).getTime() < nowMs) return res.status(401).json({ error: { message: 'Session expired' } });
      if (session.sessionTokenHash && session.sessionTokenHash !== sha256Hex(token)) {
        return res.status(401).json({ error: { message: 'Session token mismatch' } });
      }

      const idleTimeoutMs = resolveSessionIdleTimeoutMs();
      const lastActivityMs = resolveLastActivityMs(session);
      if (nowMs - lastActivityMs > idleTimeoutMs) {
        await Session.updateOne(
          { _id: session._id, revokedAt: null },
          { $set: { revokedAt: new Date(nowMs), lastActivityAt: new Date(lastActivityMs) } }
        );
        return res.status(401).json({ error: { message: 'Session expired due to inactivity' } });
      }

      const touchIntervalMs = resolveSessionTouchIntervalMs(idleTimeoutMs);
      if (nowMs - lastActivityMs >= touchIntervalMs) {
        await Session.updateOne(
          { _id: session._id, revokedAt: null },
          { $set: { lastActivityAt: new Date(nowMs) } }
        );
      }

      const healthCenter = await HealthCenter.findById(session.healthCenterId).select('status').lean();
      if (!healthCenter) {
        return res.status(401).json({ error: { message: 'Health center account not found' } });
      }
      if (healthCenter.status !== 'active') {
        return res.status(403).json({
          error: {
            message: `Barangay unit status is '${healthCenter.status}'. Only 'active' barangays can use BioTrack services.`,
          },
        });
      }

      contextPatch = {
        sessionId: session._id,
        healthCenterId: session.healthCenterId,
        sessionToken: token,
        role: 'healthcenter',
      };
    }
  } catch (e) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        ...(process.env.NODE_ENV !== 'production' ? { detail: String(e?.message ?? '') } : {}),
      },
    });
  }

  req.context = {
    ...(req.context ?? {}),
    ...(contextPatch ?? {}),
  };
  return next();
}

export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    const role = req.context?.role;
    if (!role) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: {
          message: `Forbidden for role '${role}'`,
        },
      });
    }

    return next();
  };
}

export function requirePatientSelf(paramName = 'id') {
  return (req, res, next) => {
    if (req.context?.role !== 'patient') return next();

    const requestedId = String(req.params?.[paramName] ?? '').trim();
    const patientId = String(req.context?.patientId ?? '').trim();

    if (!requestedId) {
      return res.status(400).json({
        error: {
          message: `${paramName} path parameter is required`,
        },
      });
    }

    if (!patientId || requestedId !== patientId) {
      return res.status(403).json({
        error: {
          message: 'Patients can only access their own resource',
        },
      });
    }

    return next();
  };
}
