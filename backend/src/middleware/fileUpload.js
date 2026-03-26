import express from 'express';
import { env } from '../config/env.js';

const uploadMaxBytes = Math.max(1024, Number(env.UPLOAD_MAX_BYTES ?? 5 * 1024 * 1024));
const allowedMimeTypes = new Set(
  (Array.isArray(env.UPLOAD_ALLOWED_MIME_TYPES) ? env.UPLOAD_ALLOWED_MIME_TYPES : [])
    .map((entry) => String(entry).trim().toLowerCase())
    .filter(Boolean)
);

function normalizeMimeType(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '';
  return raw.split(';')[0].trim();
}

function isSafeFileName(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return true;
  if (trimmed.length > 120) return false;
  return /^[a-zA-Z0-9._ -]+$/.test(trimmed);
}

export const rawUploadParser = express.raw({
  limit: uploadMaxBytes,
  type: () => true,
});

export function validateRawUpload(req, res, next) {
  const mimeType = normalizeMimeType(req.headers['content-type']);
  if (!mimeType || !allowedMimeTypes.has(mimeType)) {
    return res.status(415).json({
      error: {
        message: `Unsupported file type. Allowed types: ${Array.from(allowedMimeTypes).join(', ')}`,
        code: 'UPLOAD_TYPE_INVALID',
      },
    });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({
      error: {
        message: 'Upload payload is required',
        code: 'UPLOAD_EMPTY',
      },
    });
  }

  if (req.body.length > uploadMaxBytes) {
    return res.status(413).json({
      error: {
        message: `Upload exceeds ${uploadMaxBytes} bytes`,
        code: 'UPLOAD_TOO_LARGE',
      },
    });
  }

  const fileName = String(req.headers['x-file-name'] ?? '').trim();
  if (!isSafeFileName(fileName)) {
    return res.status(400).json({
      error: {
        message: 'x-file-name contains invalid characters',
        code: 'UPLOAD_FILENAME_INVALID',
      },
    });
  }

  req.uploadMeta = {
    fileName: fileName || 'unnamed-file',
    mimeType,
    sizeBytes: req.body.length,
  };
  return next();
}
