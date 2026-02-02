import { HealthCenter } from '../models/HealthCenter.js';
import { hashPassword, signHealthCenterToken, verifyPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';

export async function registerHealthCenter(req, res) {
  const { email, password, name, address = '', contactNumber = '' } = req.body ?? {};
  if (!email || !password || !name) {
    return res.status(400).json({ error: { message: 'email, password, name are required' } });
  }

  const existing = await HealthCenter.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (existing) return res.status(409).json({ error: { message: 'Health center email already exists' } });

  const passwordHash = await hashPassword(String(password));
  const hc = await HealthCenter.create({
    email: String(email).toLowerCase().trim(),
    passwordHash,
    name: String(name).trim(),
    address: String(address ?? '').trim(),
    contactNumber: String(contactNumber ?? '').trim(),
  });

  const token = signHealthCenterToken({ healthCenterId: hc._id });
  await writeAuditLog({
    req,
    action: 'HEALTHCENTER.REGISTER',
    entityType: 'HealthCenter',
    entityId: hc._id,
    after: { email: hc.email, name: hc.name },
  });

  return res.status(201).json({
    healthCenter: { id: hc._id, email: hc.email, name: hc.name, address: hc.address, contactNumber: hc.contactNumber },
    accessToken: token,
  });
}

export async function loginHealthCenter(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: { message: 'email and password are required' } });

  const hc = await HealthCenter.findOne({ email: String(email).toLowerCase().trim() });
  if (!hc) return res.status(401).json({ error: { message: 'Invalid credentials' } });
  if (hc.status !== 'active') return res.status(403).json({ error: { message: 'Health center disabled' } });

  const ok = await verifyPassword(String(password), hc.passwordHash);
  if (!ok) {
    await writeAuditLog({
      req,
      action: 'HEALTHCENTER.LOGIN',
      entityType: 'HealthCenter',
      entityId: hc._id,
      outcome: 'failure',
      reason: 'Invalid credentials',
    });
    return res.status(401).json({ error: { message: 'Invalid credentials' } });
  }

  const token = signHealthCenterToken({ healthCenterId: hc._id });
  await writeAuditLog({
    req,
    action: 'HEALTHCENTER.LOGIN',
    entityType: 'HealthCenter',
    entityId: hc._id,
    outcome: 'success',
  });

  return res.json({ accessToken: token, healthCenter: { id: hc._id, email: hc.email, name: hc.name } });
}

