import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

function authBucketKey(req) {
  const ip = String(req.ip ?? req.socket?.remoteAddress ?? 'unknown');
  const route = `${String(req.baseUrl ?? '')}${String(req.path ?? '')}`;
  return `${ip}:${route}`;
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
