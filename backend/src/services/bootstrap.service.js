import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { hashPassword } from './authService.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export async function bootstrapDefaultAdmin() {
  if (!env.DEFAULT_ADMIN_BOOTSTRAP_ENABLED) return;

  const email = normalizeEmail(env.DEFAULT_ADMIN_EMAIL);
  const password = String(env.DEFAULT_ADMIN_PASSWORD ?? '');
  if (!email || !password) {
    throw new Error('Default admin bootstrap is enabled but DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD is missing');
  }

  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.ok) {
    throw new Error(`DEFAULT_ADMIN_PASSWORD does not satisfy policy: ${passwordCheck.message}`);
  }

  const existing = await Admin.findOne({ email }).lean();
  if (existing) {
    console.log(`[bootstrap] Default admin already exists for ${email}`);
    return;
  }

  await Admin.create({
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
    status: 'active',
  });

  console.log(`[bootstrap] Default admin created for ${email}`);
}
