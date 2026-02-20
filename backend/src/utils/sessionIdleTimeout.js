import { env } from '../config/env.js';
import { parseDurationMs } from './time.js';

const DEFAULT_SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const MIN_SESSION_IDLE_TIMEOUT_MS = 1000;

function normalizeRole(role) {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (normalized === 'patient') return 'patient';
  if (normalized === 'admin') return 'admin';
  return 'provider';
}

function resolveRawSessionIdleTimeout(role) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'patient') {
    return env.PATIENT_SESSION_IDLE_TIMEOUT || env.SESSION_IDLE_TIMEOUT;
  }
  if (normalizedRole === 'admin') {
    return env.ADMIN_SESSION_IDLE_TIMEOUT || env.SESSION_IDLE_TIMEOUT;
  }
  return env.PROVIDER_SESSION_IDLE_TIMEOUT || env.SESSION_IDLE_TIMEOUT;
}

export function resolveSessionIdleTimeoutMs(role = 'provider') {
  const parsed = parseDurationMs(resolveRawSessionIdleTimeout(role));
  if (parsed <= 0) return DEFAULT_SESSION_IDLE_TIMEOUT_MS;
  return Math.max(parsed, MIN_SESSION_IDLE_TIMEOUT_MS);
}
