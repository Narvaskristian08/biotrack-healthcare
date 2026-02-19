import crypto from 'crypto';

const ENC_ALGORITHM = 'aes-256-gcm';
const ENC_IV_BYTES = 12;
const KEY_BYTE_LENGTH = 32;

function isHexKey(value) {
  return /^[a-fA-F0-9]{64}$/.test(value);
}

function isBase64Like(value) {
  return /^[A-Za-z0-9+/=]+$/.test(value) && value.length % 4 === 0;
}

function decodeKeyMaterial(raw) {
  const input = String(raw ?? '').trim();
  if (!input) return null;

  if (isHexKey(input)) {
    return Buffer.from(input, 'hex');
  }

  if (isBase64Like(input)) {
    try {
      const decoded = Buffer.from(input, 'base64');
      if (decoded.length === KEY_BYTE_LENGTH) return decoded;
    } catch {
      // fall through to UTF-8 parsing
    }
  }

  const utf8 = Buffer.from(input, 'utf8');
  if (utf8.length === KEY_BYTE_LENGTH) return utf8;
  return null;
}

export function resolveAes256Key(raw, keyName = 'encryption key') {
  const key = decodeKeyMaterial(raw);
  if (key && key.length === KEY_BYTE_LENGTH) return key;
  throw new Error(`${keyName} must be 32 bytes (hex, base64, or UTF-8).`);
}

export function deriveAes256Key(seed) {
  const normalized = String(seed ?? '').trim();
  if (!normalized) {
    throw new Error('Cannot derive encryption key from an empty seed');
  }
  return crypto.createHash('sha256').update(normalized).digest();
}

export function encryptBufferAesGcm(plainBuffer, keyBuffer, aad = '') {
  if (!Buffer.isBuffer(plainBuffer)) {
    throw new Error('plainBuffer must be a Buffer');
  }

  const iv = crypto.randomBytes(ENC_IV_BYTES);
  const cipher = crypto.createCipheriv(ENC_ALGORITHM, keyBuffer, iv);
  if (aad) cipher.setAAD(Buffer.from(String(aad), 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    alg: ENC_ALGORITHM,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

export function decryptBufferAesGcm(payload, keyBuffer, aad = '') {
  const iv = Buffer.from(String(payload?.iv ?? ''), 'base64');
  const tag = Buffer.from(String(payload?.tag ?? ''), 'base64');
  const ciphertext = Buffer.from(String(payload?.ciphertext ?? ''), 'base64');

  if (!iv.length || !tag.length || !ciphertext.length) {
    throw new Error('Encrypted payload is missing iv, tag, or ciphertext');
  }

  const decipher = crypto.createDecipheriv(ENC_ALGORITHM, keyBuffer, iv);
  if (aad) decipher.setAAD(Buffer.from(String(aad), 'utf8'));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptJsonAesGcm(value, keyBuffer, aad = '') {
  const plain = Buffer.from(JSON.stringify(value), 'utf8');
  return encryptBufferAesGcm(plain, keyBuffer, aad);
}

export function decryptJsonAesGcm(payload, keyBuffer, aad = '') {
  const plain = decryptBufferAesGcm(payload, keyBuffer, aad);
  return JSON.parse(plain.toString('utf8'));
}
