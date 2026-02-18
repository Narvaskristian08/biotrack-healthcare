import jwt from 'jsonwebtoken';
import { RevokedToken } from '../models/RevokedToken.js';
import { sha256Hex } from '../utils/crypto.js';

export function getTokenPayloadUnsafe(token) {
  try {
    return jwt.decode(token) ?? null;
  } catch {
    return null;
  }
}

export async function revokeToken(token, fallbackTtlMs = 12 * 60 * 60 * 1000) {
  const payload = getTokenPayloadUnsafe(token);
  const tokenType = String(payload?.tokenType ?? 'unknown');
  const expiresAt = payload?.exp
    ? new Date(Number(payload.exp) * 1000)
    : new Date(Date.now() + fallbackTtlMs);

  await RevokedToken.updateOne(
    { tokenHash: sha256Hex(token) },
    { $setOnInsert: { tokenHash: sha256Hex(token), tokenType, revokedAt: new Date(), expiresAt } },
    { upsert: true }
  );
}

export async function isTokenRevoked(token) {
  if (!token) return false;
  const tokenHash = sha256Hex(token);
  const revoked = await RevokedToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } }).select('_id').lean();
  return Boolean(revoked);
}

