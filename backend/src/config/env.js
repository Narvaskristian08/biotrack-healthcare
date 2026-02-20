import dotenv from 'dotenv';
dotenv.config();

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toCsvList(value, fallback = []) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return Array.isArray(fallback) ? fallback : [];
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isLocalMongoUri(value) {
  const mongoUri = String(value ?? '').trim();
  if (!mongoUri || mongoUri.startsWith('mongodb+srv://')) return false;
  const normalized = mongoUri.replace(/^mongodb:\/\//i, '');
  const hostSection = normalized.split('/')[0] ?? '';
  if (!hostSection) return false;
  const hosts = hostSection.split('@').pop()?.split(',') ?? [];
  if (hosts.length === 0) return false;

  return hosts.every((hostEntry) => {
    const host = String(hostEntry).split(':')[0].trim().toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  });
}

function looksLikePlaceholderSecret(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return true;
  return [
    'change_me',
    'placeholder',
    'example',
    'your-project-id',
    'xxxxxxxx',
  ].some((pattern) => normalized.includes(pattern));
}

function isStrongSecret(value, minLength = 32) {
  const normalized = String(value ?? '').trim();
  return normalized.length >= minLength && !looksLikePlaceholderSecret(normalized);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  MONGODB_URI: process.env.MONGODB_URI ?? '',
  MONGODB_APP_NAME: process.env.MONGODB_APP_NAME ?? 'biotrack-backend',
  MONGODB_REQUIRE_TLS: toBool(
    process.env.MONGODB_REQUIRE_TLS,
    process.env.NODE_ENV === 'production' || !isLocalMongoUri(process.env.MONGODB_URI ?? '')
  ),
  MONGODB_TLS_ENABLED: toBool(
    process.env.MONGODB_TLS_ENABLED,
    process.env.NODE_ENV === 'production' || !isLocalMongoUri(process.env.MONGODB_URI ?? '')
  ),
  MONGODB_TLS_CA_FILE: process.env.MONGODB_TLS_CA_FILE ?? '',
  MONGODB_TLS_CERT_KEY_FILE: process.env.MONGODB_TLS_CERT_KEY_FILE ?? '',
  MONGODB_TLS_ALLOW_INVALID_CERTS: toBool(process.env.MONGODB_TLS_ALLOW_INVALID_CERTS, false),
  MONGODB_MAX_POOL_SIZE: toNumber(process.env.MONGODB_MAX_POOL_SIZE, 20),
  MONGODB_MIN_POOL_SIZE: toNumber(process.env.MONGODB_MIN_POOL_SIZE, 0),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: toNumber(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 10000),
  MONGODB_SOCKET_TIMEOUT_MS: toNumber(process.env.MONGODB_SOCKET_TIMEOUT_MS, 45000),
  MONGODB_MAX_IDLE_TIME_MS: toNumber(process.env.MONGODB_MAX_IDLE_TIME_MS, 30000),
  MONGODB_HEARTBEAT_FREQUENCY_MS: toNumber(process.env.MONGODB_HEARTBEAT_FREQUENCY_MS, 10000),
  MONGODB_AUTO_INDEX: toBool(process.env.MONGODB_AUTO_INDEX, process.env.NODE_ENV !== 'production'),
  TRUST_PROXY: toBool(process.env.TRUST_PROXY, false),
  ENFORCE_STRONG_SECRETS: toBool(process.env.ENFORCE_STRONG_SECRETS, process.env.NODE_ENV === 'production'),

  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET ?? '',
  HEALTHCENTER_JWT_SECRET: process.env.HEALTHCENTER_JWT_SECRET ?? '',
  SESSION_JWT_SECRET: process.env.SESSION_JWT_SECRET ?? '',
  JWT_ISSUER: process.env.JWT_ISSUER ?? 'biotrack-healthcare',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? 'biotrack-app',

  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? '12h',
  SESSION_TOKEN_TTL: process.env.SESSION_TOKEN_TTL ?? '12h',
  SESSION_IDLE_TIMEOUT: process.env.SESSION_IDLE_TIMEOUT ?? '5s',
  PROVIDER_SESSION_IDLE_TIMEOUT: process.env.PROVIDER_SESSION_IDLE_TIMEOUT ?? process.env.SESSION_IDLE_TIMEOUT ?? '5s',
  PATIENT_SESSION_IDLE_TIMEOUT: process.env.PATIENT_SESSION_IDLE_TIMEOUT ?? process.env.SESSION_IDLE_TIMEOUT ?? '5s',
  ADMIN_SESSION_IDLE_TIMEOUT: process.env.ADMIN_SESSION_IDLE_TIMEOUT ?? process.env.SESSION_IDLE_TIMEOUT ?? '5s',
  SESSION_ACTIVITY_TOUCH_INTERVAL: process.env.SESSION_ACTIVITY_TOUCH_INTERVAL ?? '60s',
  OTP_TTL_MINUTES: Number(process.env.OTP_TTL_MINUTES ?? 10),
  OTP_RESEND_COOLDOWN_SECONDS: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 30),
  PATIENT_LOGIN_MFA_REQUIRED: toBool(process.env.PATIENT_LOGIN_MFA_REQUIRED, true),
  MFA_LOGIN_MAX_ATTEMPTS: toNumber(process.env.MFA_LOGIN_MAX_ATTEMPTS, 5),
  PASSWORD_MIN_LENGTH: toNumber(process.env.PASSWORD_MIN_LENGTH, 12),
  DEFAULT_ADMIN_BOOTSTRAP_ENABLED: toBool(process.env.DEFAULT_ADMIN_BOOTSTRAP_ENABLED, false),
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL ?? '',
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD ?? '',

  LOGIN_RATE_LIMIT_WINDOW_MS: toNumber(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
  LOGIN_RATE_LIMIT_MAX: toNumber(process.env.LOGIN_RATE_LIMIT_MAX, 10), // max 10 attempts per window
  MFA_VERIFY_RATE_LIMIT_WINDOW_MS: toNumber(process.env.MFA_VERIFY_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  MFA_VERIFY_RATE_LIMIT_MAX: toNumber(process.env.MFA_VERIFY_RATE_LIMIT_MAX, 10),
  XSS_INPUT_PROTECTION_ENABLED: toBool(process.env.XSS_INPUT_PROTECTION_ENABLED, true),
  UPLOAD_MAX_BYTES: toNumber(process.env.UPLOAD_MAX_BYTES, 5 * 1024 * 1024),
  UPLOAD_ALLOWED_MIME_TYPES: toCsvList(process.env.UPLOAD_ALLOWED_MIME_TYPES, [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ]),

  CSRF_ENABLED: toBool(process.env.CSRF_ENABLED, true),
  CSRF_COOKIE_NAME: process.env.CSRF_COOKIE_NAME ?? 'biotrack_csrf',
  CSRF_HEADER_NAME: process.env.CSRF_HEADER_NAME ?? 'x-csrf-token',
  CSRF_COOKIE_SECURE: toBool(process.env.CSRF_COOKIE_SECURE, false),

  BLOCKCHAIN_ENABLED: toBool(process.env.BLOCKCHAIN_ENABLED, false),
  BLOCKCHAIN_STRICT_MODE: toBool(process.env.BLOCKCHAIN_STRICT_MODE, false),
  BLOCKCHAIN_WRITE_DISABLED: toBool(process.env.BLOCKCHAIN_WRITE_DISABLED, false),
  BLOCKCHAIN_NETWORK: process.env.BLOCKCHAIN_NETWORK ?? '',
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL ?? '',
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY ?? '',
  BLOCKCHAIN_EXPECTED_SIGNER: process.env.BLOCKCHAIN_EXPECTED_SIGNER ?? '',
  BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS: process.env.BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS ?? '',
  BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS: process.env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS ?? '',

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',

  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: Number(process.env.SMTP_PORT ?? 587),
  SMTP_SECURE: toBool(process.env.SMTP_SECURE, false),
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? '',
  SMTP_FROM: process.env.SMTP_FROM ?? '',

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? '',
  TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER ?? '',
  SMS_DEFAULT_COUNTRY_CODE: process.env.SMS_DEFAULT_COUNTRY_CODE ?? '+63',

  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',

  DATA_ENCRYPTION_ENABLED: toBool(process.env.DATA_ENCRYPTION_ENABLED, process.env.NODE_ENV !== 'test'),
  DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY ?? '',
  BACKUP_OUTPUT_DIR: process.env.BACKUP_OUTPUT_DIR ?? '../backups',
  BACKUP_ENCRYPTION_KEY: process.env.BACKUP_ENCRYPTION_KEY ?? '',
  BACKUP_ENCRYPTION_REQUIRED: toBool(process.env.BACKUP_ENCRYPTION_REQUIRED, true),
  BACKUP_MAX_DOCUMENTS_PER_COLLECTION: toNumber(process.env.BACKUP_MAX_DOCUMENTS_PER_COLLECTION, 5000),
};

export function assertRequiredEnv() {
  const missing = [];
  const weakSecrets = [];

  if (!env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!env.ADMIN_JWT_SECRET) missing.push('ADMIN_JWT_SECRET');
  if (!env.HEALTHCENTER_JWT_SECRET) missing.push('HEALTHCENTER_JWT_SECRET');
  if (!env.SESSION_JWT_SECRET) missing.push('SESSION_JWT_SECRET');
  if (!env.OPENROUTER_API_KEY) missing.push('OPENROUTER_API_KEY');

  if (env.BLOCKCHAIN_ENABLED) {
    if (!env.BLOCKCHAIN_RPC_URL) missing.push('BLOCKCHAIN_RPC_URL');
    if (!env.BLOCKCHAIN_PRIVATE_KEY) missing.push('BLOCKCHAIN_PRIVATE_KEY');
    if (!env.BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS) missing.push('BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS');
    if (!env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS) missing.push('BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS');
  }

  if (env.NODE_ENV === 'production' && env.DATA_ENCRYPTION_ENABLED && !env.DATA_ENCRYPTION_KEY) {
    missing.push('DATA_ENCRYPTION_KEY');
  }

  if (env.NODE_ENV === 'production' && env.BACKUP_ENCRYPTION_REQUIRED && !env.BACKUP_ENCRYPTION_KEY) {
    missing.push('BACKUP_ENCRYPTION_KEY');
  }

  if (env.DEFAULT_ADMIN_BOOTSTRAP_ENABLED) {
    if (!String(env.DEFAULT_ADMIN_EMAIL).trim()) missing.push('DEFAULT_ADMIN_EMAIL');
    if (!String(env.DEFAULT_ADMIN_PASSWORD).trim()) missing.push('DEFAULT_ADMIN_PASSWORD');
  }

  if (env.NODE_ENV === 'production' && !env.MONGODB_REQUIRE_TLS) {
    console.error('MONGODB_REQUIRE_TLS must remain enabled in production');
    process.exit(1);
  }

  if (env.ENFORCE_STRONG_SECRETS) {
    if (!isStrongSecret(env.ADMIN_JWT_SECRET)) weakSecrets.push('ADMIN_JWT_SECRET');
    if (!isStrongSecret(env.HEALTHCENTER_JWT_SECRET)) weakSecrets.push('HEALTHCENTER_JWT_SECRET');
    if (!isStrongSecret(env.SESSION_JWT_SECRET)) weakSecrets.push('SESSION_JWT_SECRET');
  }

  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (weakSecrets.length) {
    console.error(`Weak secret values detected: ${weakSecrets.join(', ')}`);
    process.exit(1);
  }
}
