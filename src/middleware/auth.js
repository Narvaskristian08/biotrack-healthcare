import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Session } from '../models/Session.js';
import { sha256Hex } from '../utils/crypto.js';

function getBearerToken(req) {
  const header = req.headers.authorization ?? '';
  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) return '';
  return token;
}

export function requireHealthCenterAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    const payload = jwt.verify(token, env.HEALTHCENTER_JWT_SECRET);
    if (payload?.tokenType !== 'healthcenter') return res.status(401).json({ error: { message: 'Invalid token type' } });
    req.context = {
      ...(req.context ?? {}),
      healthCenterId: payload.healthCenterId,
      healthCenterAccessToken: token,
    };
    return next();
  } catch (e) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

export function requireAdminAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    const payload = jwt.verify(token, env.ADMIN_JWT_SECRET);
    if (payload?.tokenType !== 'admin') return res.status(401).json({ error: { message: 'Invalid token type' } });
    req.context = {
      ...(req.context ?? {}),
      adminId: payload.adminId,
    };
    return next();
  } catch (e) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

export async function requireSessionAuth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: { message: 'Missing Bearer token' } });
    const payload = jwt.verify(token, env.SESSION_JWT_SECRET);
    if (payload?.tokenType !== 'session') return res.status(401).json({ error: { message: 'Invalid token type' } });

    const session = await Session.findById(payload.sessionId).lean();
    if (!session) return res.status(401).json({ error: { message: 'Session not found' } });
    if (session.revokedAt) return res.status(401).json({ error: { message: 'Session revoked' } });
    if (new Date(session.expiresAt).getTime() < Date.now()) return res.status(401).json({ error: { message: 'Session expired' } });
    if (session.sessionTokenHash && session.sessionTokenHash !== sha256Hex(token)) {
      return res.status(401).json({ error: { message: 'Session token mismatch' } });
    }

    req.context = {
      ...(req.context ?? {}),
      sessionId: session._id,
      healthCenterId: session.healthCenterId,
      sessionToken: token,
    };
    return next();
  } catch (e) {
    return res.status(401).json({ error: { message: 'Invalid or expired token' } });
  }
}

