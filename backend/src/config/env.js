import dotenv from 'dotenv';
dotenv.config();

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  MONGODB_URI: process.env.MONGODB_URI ?? '',

  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET ?? '',
  HEALTHCENTER_JWT_SECRET: process.env.HEALTHCENTER_JWT_SECRET ?? '',
  SESSION_JWT_SECRET: process.env.SESSION_JWT_SECRET ?? '',

  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? '12h',
  SESSION_TOKEN_TTL: process.env.SESSION_TOKEN_TTL ?? '12h',

  BLOCKCHAIN_ENABLED: toBool(process.env.BLOCKCHAIN_ENABLED, false),
  BLOCKCHAIN_STRICT_MODE: toBool(process.env.BLOCKCHAIN_STRICT_MODE, false),
  BLOCKCHAIN_NETWORK: process.env.BLOCKCHAIN_NETWORK ?? '',
  BLOCKCHAIN_RPC_URL: process.env.BLOCKCHAIN_RPC_URL ?? '',
  BLOCKCHAIN_PRIVATE_KEY: process.env.BLOCKCHAIN_PRIVATE_KEY ?? '',
  BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS: process.env.BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS ?? '',
  BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS: process.env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS ?? '',

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '',
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
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
