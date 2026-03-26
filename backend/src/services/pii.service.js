import crypto from 'crypto';
import { env } from '../config/env.js';
import { decryptJsonAesGcm, deriveAes256Key, encryptJsonAesGcm, resolveAes256Key } from '../utils/encryption.js';

const PII_ENCRYPTION_VERSION = 'biotrack-pii-aesgcm-v1';
const PII_PLAINTEXT_VERSION = 'plain';

let cachedPiiKey = null;
let cachedPiiHashKey = null;

function resolvePiiKey() {
  if (cachedPiiKey) return cachedPiiKey;
  const configuredKey = String(env.DATA_ENCRYPTION_KEY ?? '').trim();
  if (configuredKey) {
    cachedPiiKey = resolveAes256Key(configuredKey, 'DATA_ENCRYPTION_KEY');
    return cachedPiiKey;
  }
  cachedPiiKey = deriveAes256Key(`biotrack-dev-pii:${env.SESSION_JWT_SECRET}`);
  return cachedPiiKey;
}

function resolvePiiHashKey() {
  if (cachedPiiHashKey) return cachedPiiHashKey;
  const configuredKey = String(env.DATA_ENCRYPTION_KEY ?? '').trim();
  if (configuredKey) {
    cachedPiiHashKey = resolveAes256Key(configuredKey, 'DATA_ENCRYPTION_KEY');
    return cachedPiiHashKey;
  }
  cachedPiiHashKey = deriveAes256Key(`biotrack-dev-pii-hash:${env.SESSION_JWT_SECRET}`);
  return cachedPiiHashKey;
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizePhone(value) {
  return String(value ?? '').replace(/\s+/g, '').trim();
}

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function hashPii(value, purpose = 'generic') {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return '';
  const key = resolvePiiHashKey();
  return crypto
    .createHmac('sha256', key)
    .update(`${purpose}:${normalized}`)
    .digest('hex');
}

export function encryptPiiValue(value, field = 'generic') {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (!env.DATA_ENCRYPTION_ENABLED) {
    return { __enc: PII_PLAINTEXT_VERSION, value: normalized };
  }
  const key = resolvePiiKey();
  const encrypted = encryptJsonAesGcm({ value: normalized }, key, `pii:${field}`);
  return { __enc: PII_ENCRYPTION_VERSION, ...encrypted };
}

export function decryptPiiValue(payload, field = 'generic', fallback = '') {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  const marker = String(payload.__enc ?? '');
  if (marker === PII_PLAINTEXT_VERSION) {
    return String(payload.value ?? fallback);
  }
  if (marker === PII_ENCRYPTION_VERSION) {
    const key = resolvePiiKey();
    const decoded = decryptJsonAesGcm(payload, key, `pii:${field}`);
    return String(decoded?.value ?? fallback);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'value')) {
    return String(payload.value ?? fallback);
  }
  return fallback;
}

export function buildEncryptedField(value, field, normalizeFn = normalizeText, hashPurpose = field) {
  const normalized = normalizeFn(value);
  if (!normalized) {
    return { normalized: '', encrypted: null, hash: '' };
  }
  return {
    normalized,
    encrypted: encryptPiiValue(normalized, field),
    hash: hashPii(normalized, hashPurpose),
  };
}

export function resolvePiiField({ encrypted, fallback, field }) {
  if (encrypted) {
    return decryptPiiValue(encrypted, field, fallback ?? '');
  }
  if (fallback) return String(fallback);
  return '';
}

export function buildEmailFields(email) {
  return buildEncryptedField(email, 'email', normalizeEmail, 'email');
}

export function buildPhoneFields(phone) {
  return buildEncryptedField(phone, 'contactNumber', normalizePhone, 'contactNumber');
}

export function buildMrnFields(mrn) {
  return buildEncryptedField(mrn, 'mrn', normalizeText, 'mrn');
}
