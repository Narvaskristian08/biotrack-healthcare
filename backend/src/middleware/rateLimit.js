import rateLimit from 'express-rate-limit';
import { createHash } from 'node:crypto';
import { env } from '../config/env.js';

function normalizeBucketPart(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function hashBucketPart(value) {
  return createHash('sha256').update(value).digest('hex');
}

function authBucketKey(req) {
  const route = `${String(req.baseUrl ?? '')}${String(req.path ?? '')}`;

  const email = normalizeBucketPart(req?.body?.email);
  if (email) {
    return `email:${email}:${route}`;
  }

  const patientId = normalizeBucketPart(req?.body?.patientId);
  if (patientId) {
    return `patient:${patientId}:${route}`;
  }

  const challengeId = normalizeBucketPart(req?.body?.challengeId);
  if (challengeId) {
    return `challenge:${challengeId}:${route}`;
  }

  const googleIdToken = normalizeBucketPart(req?.body?.idToken);
  if (googleIdToken) {
    return `google-id-token:${hashBucketPart(googleIdToken)}:${route}`;
  }

  return `anonymous:${route}`;
}

export const authLoginLimiter = rateLimit({
  windowMs: Math.max(60_000, Number(env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000)),
  max: Math.max(3, Number(env.LOGIN_RATE_LIMIT_MAX ?? 10)),
  keyGenerator: authBucketKey,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many login attempts. Please try again later.',
      code: 'RATE_LIMITED',
    },
  },
});

export const authMfaVerifyLimiter = rateLimit({
  windowMs: Math.max(60_000, Number(env.MFA_VERIFY_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000)),
  max: Math.max(3, Number(env.MFA_VERIFY_RATE_LIMIT_MAX ?? 10)),
  keyGenerator: authBucketKey,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many MFA verification attempts. Please try again later.',
      code: 'MFA_RATE_LIMITED',
    },
  },
});
