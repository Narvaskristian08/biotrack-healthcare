import crypto from 'crypto';
import { env } from '../config/env.js';

function readHeader(req, name) {
  const key = String(name ?? '').toLowerCase();
  return String(req.headers[key] ?? '').trim();
}

function isBrowserLikeRequest(req) {
  return Boolean(req.headers.origin);
}

export function issueCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(env.CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.CSRF_COOKIE_SECURE,
    path: '/',
  });
  return token;
}

export function csrfProtection(req, res, next) {
  if (!env.CSRF_ENABLED) return next();

  const method = String(req.method ?? '').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  if (!isBrowserLikeRequest(req)) return next();

  const cookieToken = String(req.cookies?.[env.CSRF_COOKIE_NAME] ?? '').trim();
  const headerToken = readHeader(req, env.CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      error: {
        message: 'Invalid CSRF token',
        code: 'CSRF_INVALID',
      },
    });
  }
  return next();
}

