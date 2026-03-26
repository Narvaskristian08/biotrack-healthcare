import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { hashPassword } from './authService.js';
import { findExistingAdminOrProviderByEmail } from './accountEmailConflict.service.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';
import { buildEmailFields, normalizeEmail } from './pii.service.js';

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

  const emailFields = buildEmailFields(email);
  const existingAccount = await findExistingAdminOrProviderByEmail(emailFields);
  if (existingAccount) {
    console.log(`[bootstrap] Default admin email is already used by a ${existingAccount.role} account for ${email}`);
    return;
  }

  await Admin.create({
    email: emailFields.normalized,
    emailHash: emailFields.hash,
    emailEncrypted: emailFields.encrypted,
    passwordHash: await hashPassword(password),
    role: 'admin',
    status: 'active',
    scope: 'global',
    cityMunicipality: '',
  });

  console.log(`[bootstrap] Default admin created for ${email}`);
}
