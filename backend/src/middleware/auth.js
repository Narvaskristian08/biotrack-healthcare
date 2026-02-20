import { Session } from '../models/Session.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { PatientLoginHistory } from '../models/PatientLoginHistory.js';
import { env } from '../config/env.js';
import { sha256Hex } from '../utils/crypto.js';
import { isTokenRevoked } from '../services/tokenRevocation.service.js';
import { verifyAdminToken, verifyHealthCenterToken, verifySessionToken } from '../services/authService.js';
import { parseDurationMs } from '../utils/time.js';
import { resolveSessionIdleTimeoutMs } from '../utils/sessionIdleTimeout.js';

const DEFAULT_SESSION_TOUCH_INTERVAL_MS = 60 * 1000;
const MIN_SESSION_TOUCH_INTERVAL_MS = 5 * 1000;
const SESSION_IDLE_TIMEOUT_COUNTDOWN_SECONDS = 10;

function getBearerToken(req) {
  const header = req.headers.authorization ?? '';
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return '';
  return token;
}

function resolveSessionTouchIntervalMs(idleTimeoutMs) {
  const parsed = parseDurationMs(env.SESSION_ACTIVITY_TOUCH_INTERVAL);
  const normalized = parsed > 0
    ? Math.max(parsed, MIN_SESSION_TOUCH_INTERVAL_MS)
    : DEFAULT_SESSION_TOUCH_INTERVAL_MS;
  // Keep heartbeat updates frequent enough to avoid hitting the idle edge.
  return Math.min(normalized, Math.max(MIN_SESSION_TOUCH_INTERVAL_MS, Math.floor(idleTimeoutMs / 2)));
}

function resolveLastActivityMs(session) {
  const raw = session?.lastActivityAt ?? session?.startedAt ?? session?.createdAt;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function buildSessionIdleTimeoutError() {
  return {
    error: {
      message: 'Session expired due to inactivity',
      code: 'SESSION_IDLE_TIMEOUT',
      countdownSeconds: SESSION_IDLE_TIMEOUT_COUNTDOWN_SECONDS,
    },
  };
}

function resolvePayloadTimestampMs(secondsValue, fallbackMs = Date.now()) {
  const seconds = Number(secondsValue);
  if (!Number.isFinite(seconds) || seconds <= 0) return fallbackMs;
  return seconds * 1000;
}

function isBackgroundRequest(req) {
  const header = String(req.headers['x-biotrack-background'] ?? '').trim().toLowerCase();
  return header === '1' || header === 'true' || header === 'yes';
}

function isUserActivityHeartbeat(req) {
  const header = String(req.headers['x-biotrack-user-activity'] ?? '').trim().toLowerCase();
  return header === '1' || header === 'true' || header === 'yes';
}

export async function requireHealthCenterAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    if (await isTokenRevoked(token)) {
      return res.status(401).json({ error: { message: 'Token revoked', code: 'TOKEN_REVOKED', countdownSeconds: SESSION_IDLE_TIMEOUT_COUNTDOWN_SECONDS } });
    }
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
    if (await isTokenRevoked(token)) {
      return res.status(401).json({ error: { message: 'Token revoked', code: 'TOKEN_REVOKED', countdownSeconds: SESSION_IDLE_TIMEOUT_COUNTDOWN_SECONDS } });
    }
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
    if (await isTokenRevoked(token)) {
      return res.status(401).json({ error: { message: 'Token revoked', code: 'TOKEN_REVOKED', countdownSeconds: SESSION_IDLE_TIMEOUT_COUNTDOWN_SECONDS } });
    }
    const payload = verifySessionToken(token);

    // Support Patient Login (Stateless for now? Or check if payload has patientId)
    if (payload.tokenType === 'patient') {
      const nowMs = Date.now();
      const idleTimeoutMs = resolveSessionIdleTimeoutMs('patient');
      const touchIntervalMs = resolveSessionTouchIntervalMs(idleTimeoutMs);
      const shouldTouchActivity = !isBackgroundRequest(req);
      const isExplicitActivity = isUserActivityHeartbeat(req);
      const tokenHash = sha256Hex(token);

      const loginHistory = await PatientLoginHistory.findOne({
        patientId: payload.patientId,
        tokenHash,
      })
        .select('_id loginAt lastActivityAt createdAt expiresAt')
        .lean();

      const issuedAtMs = resolvePayloadTimestampMs(payload?.iat, nowMs);
      const lastActivityMs = resolveLastActivityMs({
        lastActivityAt: loginHistory?.lastActivityAt ?? loginHistory?.loginAt ?? loginHistory?.createdAt ?? new Date(issuedAtMs),
      });
      const idleElapsedMs = nowMs - lastActivityMs;

      if (idleElapsedMs >= idleTimeoutMs) {
        if (shouldTouchActivity && isExplicitActivity) {
          if (loginHistory?._id) {
            await PatientLoginHistory.updateOne(
              { _id: loginHistory._id },
              { $set: { lastActivityAt: new Date(nowMs) } }
            );
          } else {
            await PatientLoginHistory.create({
              healthCenterId: payload.healthCenterId,
              patientId: payload.patientId,
              tokenHash,
              loginAt: new Date(issuedAtMs),
              lastActivityAt: new Date(nowMs),
              expiresAt: new Date(resolvePayloadTimestampMs(payload?.exp, nowMs + 12 * 60 * 60 * 1000)),
              ip: String(req.ip ?? '').trim(),
              userAgent: String(req.headers['user-agent'] ?? '').trim(),
            });
          }
        } else {
          return res.status(401).json(buildSessionIdleTimeoutError());
        }
      } else if (loginHistory?._id) {
        if (shouldTouchActivity && (isExplicitActivity || nowMs - lastActivityMs >= touchIntervalMs)) {
          await PatientLoginHistory.updateOne(
            { _id: loginHistory._id },
            { $set: { lastActivityAt: new Date(nowMs) } }
          );
        }
      } else {
        await PatientLoginHistory.create({
          healthCenterId: payload.healthCenterId,
          patientId: payload.patientId,
          tokenHash,
          loginAt: new Date(issuedAtMs),
          lastActivityAt: new Date(nowMs),
          expiresAt: new Date(resolvePayloadTimestampMs(payload?.exp, nowMs + 12 * 60 * 60 * 1000)),
          ip: String(req.ip ?? '').trim(),
          userAgent: String(req.headers['user-agent'] ?? '').trim(),
        });
      }

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
      if (session.revokedAt) {
        return res.status(401).json({ error: { message: 'Session revoked', code: 'SESSION_REVOKED', countdownSeconds: SESSION_IDLE_TIMEOUT_COUNTDOWN_SECONDS } });
      }
      const nowMs = Date.now();
      if (new Date(session.expiresAt).getTime() < nowMs) return res.status(401).json({ error: { message: 'Session expired' } });
      if (session.sessionTokenHash && session.sessionTokenHash !== sha256Hex(token)) {
        return res.status(401).json({ error: { message: 'Session token mismatch' } });
      }

      const idleTimeoutMs = resolveSessionIdleTimeoutMs('provider');
      const lastActivityMs = resolveLastActivityMs(session);
      const shouldTouchActivity = !isBackgroundRequest(req);
      const isExplicitActivity = isUserActivityHeartbeat(req);
      const idleElapsedMs = nowMs - lastActivityMs;
      if (idleElapsedMs >= idleTimeoutMs) {
        if (shouldTouchActivity && isExplicitActivity) {
          await Session.updateOne(
            { _id: session._id, revokedAt: null },
            { $set: { lastActivityAt: new Date(nowMs) } }
          );
        } else {
          return res.status(401).json(buildSessionIdleTimeoutError());
        }
      } else {
        const touchIntervalMs = resolveSessionTouchIntervalMs(idleTimeoutMs);
        if (shouldTouchActivity && (isExplicitActivity || nowMs - lastActivityMs >= touchIntervalMs)) {
          await Session.updateOne(
            { _id: session._id, revokedAt: null },
            { $set: { lastActivityAt: new Date(nowMs) } }
          );
        }
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
