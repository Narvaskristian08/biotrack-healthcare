import { Admin } from '../models/Admin.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { hashPassword, signAdminToken, verifyPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';

export async function registerAdmin(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: { message: 'email and password are required' } });

  const existing = await Admin.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (existing) return res.status(409).json({ error: { message: 'Admin email already exists' } });

  const admin = await Admin.create({
    email: String(email).toLowerCase().trim(),
    passwordHash: await hashPassword(String(password)),
  });

  const token = signAdminToken({ adminId: admin._id });
  await writeAuditLog({ req, action: 'ADMIN.REGISTER', entityType: 'Admin', entityId: admin._id });
  return res.status(201).json({ accessToken: token, admin: { id: admin._id, email: admin.email } });
}

export async function loginAdmin(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: { message: 'email and password are required' } });

  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() });
  if (!admin) return res.status(401).json({ error: { message: 'Invalid credentials' } });
  if (admin.status !== 'active') return res.status(403).json({ error: { message: 'Admin disabled' } });

  const ok = await verifyPassword(String(password), admin.passwordHash);
  if (!ok) {
    await writeAuditLog({ req, action: 'ADMIN.LOGIN', entityType: 'Admin', entityId: admin._id, outcome: 'failure', reason: 'Invalid credentials' });
    return res.status(401).json({ error: { message: 'Invalid credentials' } });
  }

  const token = signAdminToken({ adminId: admin._id });
  await writeAuditLog({ req, action: 'ADMIN.LOGIN', entityType: 'Admin', entityId: admin._id });
  return res.json({ accessToken: token, admin: { id: admin._id, email: admin.email } });
}

export async function adminCreateHealthCenter(req, res) {
  const { email, password, name, address = '', contactNumber = '' } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: { message: 'email, password, name are required' } });
  }

  const existing = await HealthCenter.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (existing) return res.status(409).json({ error: { message: 'Health center email already exists' } });

  const hc = await HealthCenter.create({
    email: String(email).toLowerCase().trim(),
    passwordHash: await hashPassword(String(password)),
    name: String(name).trim(),
    address: String(address ?? '').trim(),
    contactNumber: String(contactNumber ?? '').trim(),
  });

  await writeAuditLog({
    req,
    action: 'HEALTHCENTER.CREATE',
    entityType: 'HealthCenter',
    entityId: hc._id,
    after: { email: hc.email, name: hc.name },
  });

  return res.status(201).json({ healthCenter: { id: hc._id, email: hc.email, name: hc.name } });
}

