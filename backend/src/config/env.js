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

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  MONGODB_URI: process.env.MONGODB_URI ?? '',
  TRUST_PROXY: toBool(process.env.TRUST_PROXY, false),

  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET ?? '',
  HEALTHCENTER_JWT_SECRET: process.env.HEALTHCENTER_JWT_SECRET ?? '',
  SESSION_JWT_SECRET: process.env.SESSION_JWT_SECRET ?? '',
  JWT_ISSUER: process.env.JWT_ISSUER ?? 'biotrack-healthcare',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? 'biotrack-app',

  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? '12h',
  SESSION_TOKEN_TTL: process.env.SESSION_TOKEN_TTL ?? '12h',
  OTP_TTL_MINUTES: Number(process.env.OTP_TTL_MINUTES ?? 10),
  OTP_RESEND_COOLDOWN_SECONDS: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 30),
  PASSWORD_MIN_LENGTH: toNumber(process.env.PASSWORD_MIN_LENGTH, 12),

  LOGIN_RATE_LIMIT_WINDOW_MS: toNumber(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  LOGIN_RATE_LIMIT_MAX: toNumber(process.env.LOGIN_RATE_LIMIT_MAX, 10),

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
};

export function assertRequiredEnv() {
  const missing = [];

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

  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}
