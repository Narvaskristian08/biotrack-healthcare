import mongoose from 'mongoose';

// “No-login” mode support:
// - X-Barangay: which barangay/clinic is using the API
// - X-Actor-Name: optional staff display name for audit readability
// - X-HealthCenter-Id: optional ObjectId if you still want multi-tenant separation without auth
export function attachContext(req, res, next) {
  const barangay = String(req.headers['x-barangay'] ?? '').trim();
  const actorName = String(req.headers['x-actor-name'] ?? '').trim();
  const healthCenterIdRaw = String(req.headers['x-healthcenter-id'] ?? '').trim();

  let healthCenterId = null;
  if (healthCenterIdRaw && mongoose.isValidObjectId(healthCenterIdRaw)) {
    healthCenterId = healthCenterIdRaw;
  }

  req.context = {
    ...(req.context ?? {}),
    barangay,
    actorName,
    healthCenterId,
  };
  next();
}

