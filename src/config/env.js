import dotenv from 'dotenv';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 3000),
  MONGODB_URI: process.env.MONGODB_URI ?? '',
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET ?? '',
  HEALTHCENTER_JWT_SECRET: process.env.HEALTHCENTER_JWT_SECRET ?? '',
  SESSION_JWT_SECRET: process.env.SESSION_JWT_SECRET ?? '',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL ?? '12h',
  SESSION_TOKEN_TTL: process.env.SESSION_TOKEN_TTL ?? '12h',
};

export function assertRequiredEnv() {
  const missing = [];
  if (!env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!env.ADMIN_JWT_SECRET) missing.push('ADMIN_JWT_SECRET');
  if (!env.HEALTHCENTER_JWT_SECRET) missing.push('HEALTHCENTER_JWT_SECRET');
  if (!env.SESSION_JWT_SECRET) missing.push('SESSION_JWT_SECRET');
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

