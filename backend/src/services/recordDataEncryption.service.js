import { env } from '../config/env.js';
import { decryptJsonAesGcm, deriveAes256Key, encryptJsonAesGcm, resolveAes256Key } from '../utils/encryption.js';

const RECORD_DATA_ENCRYPTION_VERSION = 'biotrack-record-aesgcm-v1';

let cachedKey = null;

function getRecordDataKey() {
  if (cachedKey) return cachedKey;

  const configuredKey = String(env.DATA_ENCRYPTION_KEY ?? '').trim();
  if (configuredKey) {
    cachedKey = resolveAes256Key(configuredKey, 'DATA_ENCRYPTION_KEY');
    return cachedKey;
  }

  if (env.NODE_ENV !== 'production') {
    cachedKey = deriveAes256Key(`biotrack-dev-record-data:${env.SESSION_JWT_SECRET}`);
    return cachedKey;
  }

  throw new Error('DATA_ENCRYPTION_KEY is required when DATA_ENCRYPTION_ENABLED is true in production');
}

function buildAad({ healthCenterId, patientId }) {
  return `record:${String(healthCenterId ?? '')}:${String(patientId ?? '')}`;
}

export function isRecordDataEncrypted(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return String(value?.__enc ?? '') === RECORD_DATA_ENCRYPTION_VERSION;
}

export function encryptRecordDataForStorage(value, context = {}) {
  if (!env.DATA_ENCRYPTION_ENABLED) return value;
  const key = getRecordDataKey();
  const aad = buildAad(context);
  const encrypted = encryptJsonAesGcm(value, key, aad);
  return {
    __enc: RECORD_DATA_ENCRYPTION_VERSION,
    ...encrypted,
  };
}

export function decryptRecordDataFromStorage(value, context = {}) {
  if (!isRecordDataEncrypted(value)) return value;
  const key = getRecordDataKey();
  const aad = buildAad(context);
  return decryptJsonAesGcm(value, key, aad);
}

export function decryptRecordDataForResponse(value, context = {}) {
  try {
    return decryptRecordDataFromStorage(value, context);
  } catch {
    return {
      _encrypted: true,
      _unavailable: true,
      message: 'Record data is encrypted and cannot be decrypted in this environment',
    };
  }
}
