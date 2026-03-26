import { Admin } from '../models/Admin.js';
import { HealthCenter } from '../models/HealthCenter.js';

function normalizeId(value) {
  return String(value ?? '').trim();
}

async function findAdminByEmail(emailFields, normalizedEmail) {
  let admin = await Admin.findOne({ emailHash: emailFields.hash }).select('_id').lean();
  if (!admin && normalizedEmail) {
    admin = await Admin.findOne({ email: normalizedEmail }).select('_id').lean();
  }
  return admin;
}

async function findProviderByEmail(emailFields, normalizedEmail) {
  let provider = await HealthCenter.findOne({ emailHash: emailFields.hash }).select('_id').lean();
  if (!provider && normalizedEmail) {
    provider = await HealthCenter.findOne({ email: normalizedEmail }).select('_id').lean();
  }
  return provider;
}

export async function findExistingAdminOrProviderByEmail(emailFields, options = {}) {
  const normalizedEmail = String(emailFields?.normalized ?? '').trim();
  const excludeAdminId = normalizeId(options.excludeAdminId);
  const excludeProviderId = normalizeId(options.excludeProviderId);

  const admin = await findAdminByEmail(emailFields, normalizedEmail);
  if (admin && normalizeId(admin._id) !== excludeAdminId) {
    return { role: 'admin', id: admin._id };
  }

  const provider = await findProviderByEmail(emailFields, normalizedEmail);
  if (provider && normalizeId(provider._id) !== excludeProviderId) {
    return { role: 'provider', id: provider._id };
  }

  return null;
}

export function buildAdminOrProviderEmailConflictMessage(conflict) {
  if (!conflict) {
    return 'Email already exists for another admin or provider account';
  }

  return conflict.role === 'admin'
    ? 'Email is already used by an admin account'
    : 'Email is already used by a healthcare provider account';
}
