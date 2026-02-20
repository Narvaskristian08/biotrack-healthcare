import { env } from '../config/env.js';

const HTML_TAG_REGEX = /<\s*\/?\s*[a-z][^>]*>/i;
const SCRIPT_PROTOCOL_REGEX = /javascript\s*:/i;
const EVENT_HANDLER_REGEX = /\bon[a-z]+\s*=/i;

function hasSuspiciousHtml(value) {
  const text = String(value ?? '');
  return HTML_TAG_REGEX.test(text) || SCRIPT_PROTOCOL_REGEX.test(text) || EVENT_HANDLER_REGEX.test(text);
}

function scanValue(value, path = '$') {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    return hasSuspiciousHtml(value) ? path : null;
  }
  if (Buffer.isBuffer(value)) return null;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = scanValue(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const hit = scanValue(nested, `${path}.${key}`);
      if (hit) return hit;
    }
  }
  return null;
}

export function xssInputGuard(req, res, next) {
  if (!env.XSS_INPUT_PROTECTION_ENABLED) return next();

  const bodyHit = scanValue(req.body, 'body');
  if (bodyHit) {
    return res.status(400).json({
      error: {
        message: `Rejected potentially unsafe HTML/script input at ${bodyHit}`,
        code: 'XSS_INPUT_REJECTED',
      },
    });
  }

  const queryHit = scanValue(req.query, 'query');
  if (queryHit) {
    return res.status(400).json({
      error: {
        message: `Rejected potentially unsafe HTML/script input at ${queryHit}`,
        code: 'XSS_INPUT_REJECTED',
      },
    });
  }

  const paramsHit = scanValue(req.params, 'params');
  if (paramsHit) {
    return res.status(400).json({
      error: {
        message: `Rejected potentially unsafe HTML/script input at ${paramsHit}`,
        code: 'XSS_INPUT_REJECTED',
      },
    });
  }

  return next();
}
