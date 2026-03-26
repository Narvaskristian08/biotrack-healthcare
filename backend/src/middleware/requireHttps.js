import { env } from '../config/env.js';

function isRequestSecure(req) {
  if (req.secure) return true;
  const forwarded = req.headers['x-forwarded-proto'];
  if (!forwarded) return false;
  const proto = String(forwarded).split(',')[0]?.trim().toLowerCase();
  return proto === 'https';
}

export function requireHttps(req, res, next) {
  if (!env.ENFORCE_HTTPS) return next();
  if (isRequestSecure(req)) return next();
  return res.status(400).json({
    error: {
      message: 'HTTPS is required for this service',
      code: 'HTTPS_REQUIRED',
    },
  });
}
