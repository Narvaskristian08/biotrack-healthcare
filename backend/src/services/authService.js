import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { parseDurationMs } from '../utils/time.js';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPin(pin) {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin, pinHash) {
  return bcrypt.compare(pin, pinHash);
}

export function signAdminToken({ adminId }) {
  return jwt.sign({ tokenType: 'admin', adminId }, env.ADMIN_JWT_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL });
}

export function signHealthCenterToken({ healthCenterId }) {
  return jwt.sign(
    { tokenType: 'healthcenter', healthCenterId },
    env.HEALTHCENTER_JWT_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

export function signSessionToken({ sessionId, healthCenterId, staffId, deviceId }) {
  return jwt.sign(
    { tokenType: 'session', sessionId, healthCenterId, staffId: staffId ?? null, deviceId: deviceId ?? null },
    env.SESSION_JWT_SECRET,
    { expiresIn: env.SESSION_TOKEN_TTL }
  );
}

export function sessionExpiryDateFromNow() {
  const ms = parseDurationMs(env.SESSION_TOKEN_TTL);
  const now = Date.now();
  // jwt will enforce expiry; this is for DB lookup / revocation checks
  return new Date(now + (ms || 12 * 60 * 60 * 1000));
}

