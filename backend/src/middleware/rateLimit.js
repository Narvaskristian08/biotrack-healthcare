import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const authLoginLimiter = rateLimit({
  windowMs: Math.max(60_000, Number(env.LOGIN_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000)),
  max: Math.max(3, Number(env.LOGIN_RATE_LIMIT_MAX ?? 10)),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many login attempts. Please try again later.',
      code: 'RATE_LIMITED',
    },
  },
});

