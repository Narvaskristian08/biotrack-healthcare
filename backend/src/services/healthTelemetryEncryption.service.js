import { env } from '../config/env.js';
import { decryptJsonAesGcm, deriveAes256Key, encryptJsonAesGcm, resolveAes256Key } from '../utils/encryption.js';

const TELEMETRY_ENCRYPTION_VERSION = 'biotrack-health-telemetry-aesgcm-v1';

let cachedKey = null;

function getTelemetryKey() {
  if (cachedKey) return cachedKey;

  const configuredKey = String(env.DATA_ENCRYPTION_KEY ?? '').trim();
  if (configuredKey) {
    cachedKey = resolveAes256Key(configuredKey, 'DATA_ENCRYPTION_KEY');
    return cachedKey;
  }

  if (env.NODE_ENV !== 'production') {
    cachedKey = deriveAes256Key(`biotrack-dev-health-telemetry:${env.SESSION_JWT_SECRET}`);
    return cachedKey;
  }

  throw new Error('DATA_ENCRYPTION_KEY is required when DATA_ENCRYPTION_ENABLED is true in production');
}

function buildAad({ healthCenterId, userId }) {
  return `health-telemetry:${String(healthCenterId ?? '')}:${String(userId ?? '')}`;
}

export function isTelemetryEncrypted(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return String(value?.__enc ?? '') === TELEMETRY_ENCRYPTION_VERSION;
}

export function encryptHealthTelemetryForStorage(value, context = {}) {
  if (!env.DATA_ENCRYPTION_ENABLED) return value;
  const key = getTelemetryKey();
  const aad = buildAad(context);
  const encrypted = encryptJsonAesGcm(value, key, aad);
  return {
    __enc: TELEMETRY_ENCRYPTION_VERSION,
    ...encrypted,
  };
}

export function decryptHealthTelemetryFromStorage(value, context = {}) {
  if (!isTelemetryEncrypted(value)) return value;
  const key = getTelemetryKey();
  const aad = buildAad(context);
  return decryptJsonAesGcm(value, key, aad);
}

export function resolveHealthTelemetry(record, context = {}) {
  const fallback = {
    heartRate: record?.heartRate,
    activityLevel: record?.activityLevel,
    fallDetected: record?.fallDetected,
  };

  if (!record || record.telemetry === undefined) return fallback;

  try {
    const decrypted = decryptHealthTelemetryFromStorage(record.telemetry, context);
    if (decrypted && typeof decrypted === 'object' && !Array.isArray(decrypted)) {
      return {
        heartRate: decrypted.heartRate,
        activityLevel: decrypted.activityLevel,
        fallDetected: decrypted.fallDetected,
      };
    }
  } catch {
    // Keep fallback behavior for resilience during key rotation/misaligned env.
  }
  return fallback;
}
