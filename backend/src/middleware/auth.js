import { env } from '../config/env.js';
import { Session } from '../models/Session.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { sha256Hex } from '../utils/crypto.js';
import { isTokenRevoked } from '../services/tokenRevocation.service.js';
import { verifyJwtToken } from '../services/authService.js';

function getBearerToken(req) {
  const header = req.headers.authorization ?? '';
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return '';
  return token;
}

export function requireHealthCenterAuth(req, res, next) {
  return (async () => {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    if (await isTokenRevoked(token)) return res.status(401).json({ error: { message: 'Token revoked' } });
    const payload = verifyJwtToken(token, env.HEALTHCENTER_JWT_SECRET);
    if (payload?.tokenType !== 'healthcenter') return res.status(401).json({ error: { message: 'Invalid token type' } });
    req.context = {
      ...(req.context ?? {}),
      healthCenterId: payload.healthCenterId,
      healthCenterAccessToken: token,
      role: 'healthcenter',
    };
    return next();
  })().catch(() => {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  });
}

export function requireAdminAuth(req, res, next) {
  return (async () => {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    if (await isTokenRevoked(token)) return res.status(401).json({ error: { message: 'Token revoked' } });
    const payload = verifyJwtToken(token, env.ADMIN_JWT_SECRET);
    if (payload?.tokenType !== 'admin') return res.status(401).json({ error: { message: 'Invalid token type' } });
    req.context = {
      ...(req.context ?? {}),
      adminId: payload.adminId,
      role: 'admin',
    };
    return next();
  })().catch(() => {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  });
}


export async function requireSessionAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    if (await isTokenRevoked(token)) return res.status(401).json({ error: { message: 'Token revoked' } });
    const payload = verifyJwtToken(token, env.SESSION_JWT_SECRET);

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

      req.context = {
        ...(req.context ?? {}),
        patientId: payload.patientId,
        healthCenterId: payload.healthCenterId,
        role: 'patient',
        patientAccessToken: token
      };
      return next();
    }

    if (payload?.tokenType !== 'session') return res.status(401).json({ error: { message: 'Invalid token type' } });

    const session = await Session.findById(payload.sessionId).lean();
    if (!session) return res.status(401).json({ error: { message: 'Session not found' } });
    if (session.revokedAt) return res.status(401).json({ error: { message: 'Session revoked' } });
    if (new Date(session.expiresAt).getTime() < Date.now()) return res.status(401).json({ error: { message: 'Session expired' } });
    if (session.sessionTokenHash && session.sessionTokenHash !== sha256Hex(token)) {
      return res.status(401).json({ error: { message: 'Session token mismatch' } });
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

    req.context = {
      ...(req.context ?? {}),
      sessionId: session._id,
      healthCenterId: session.healthCenterId,
      sessionToken: token,
      role: 'healthcenter',
    };
    return next();
  } catch (e) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
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
