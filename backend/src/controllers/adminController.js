import { Admin } from '../models/Admin.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { Patient } from '../models/Patient.js';
import { AuditLog } from '../models/AuditLog.js';
import { BlockchainProofLog } from '../models/BlockchainProofLog.js';
import { Session } from '../models/Session.js';
import { AdminConfig } from '../models/AdminConfig.js';
import { hashPassword, signAdminToken, verifyPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';
import { ensureBlockchainIdentityForDocument } from '../services/blockchain/identity.service.js';

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
  const { email, password, name, holderName, walletAddress = '', address = '', contactNumber = '' } = req.body ?? {};
  if (!email || !password || !name || !holderName) {
    return res.status(400).json({ error: { message: 'email, password, name, holderName are required' } });
  }

  const existing = await HealthCenter.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (existing) return res.status(409).json({ error: { message: 'Health center email already exists' } });

  const hc = await HealthCenter.create({
    email: String(email).toLowerCase().trim(),
    passwordHash: await hashPassword(String(password)),
    name: String(name).trim(),
    holderName: String(holderName).trim(),
    address: String(address ?? '').trim(),
    contactNumber: String(contactNumber ?? '').trim(),
  });

  const { identity } = await ensureBlockchainIdentityForDocument({
    doc: hc,
    subjectType: 'healthcenter',
    uniqueSeed: hc.email,
    walletAddress,
  });

  await writeAuditLog({
    req,
    action: 'HEALTHCENTER.CREATE',
    entityType: 'HealthCenter',
    entityId: hc._id,
    after: {
      email: hc.email,
      name: hc.name,
      holderName: hc.holderName,
      blockchainIdentityId: identity.identityId,
    },
  });

  return res.status(201).json({
    healthCenter: {
      id: hc._id,
      email: hc.email,
      name: hc.name,
      holderName: hc.holderName,
      blockchainIdentity: {
        identityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        txId: identity.txId,
      },
    },
  });
}

async function getOrCreateAdminConfig(adminId = null) {
  let cfg = await AdminConfig.findOne({ key: 'global' });
  if (!cfg) {
    cfg = await AdminConfig.create({ key: 'global', updatedByAdminId: adminId });
  }
  return cfg;
}

export async function getAdminOverview(req, res) {
  const [patients, providers, activeProviders, pendingProviders, admins, sessions, failedEvents, recentProofs] = await Promise.all([
    Patient.countDocuments({}),
    HealthCenter.countDocuments({}),
    HealthCenter.countDocuments({ status: 'active' }),
    HealthCenter.countDocuments({ credentialStatus: 'pending' }),
    Admin.countDocuments({ status: 'active' }),
    Session.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }),
    AuditLog.countDocuments({
      outcome: 'failure',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    BlockchainProofLog.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
  ]);

  return res.json({
    overview: {
      users: { patients, providers, admins },
      providers: { total: providers, active: activeProviders, pendingApproval: pendingProviders },
      sessions: { active: sessions },
      security: { failedEvents24h: failedEvents },
      blockchain: { proofs24h: recentProofs },
    },
  });
}

export async function listAdminUsers(req, res) {
  const q = String(req.query.q ?? '').trim();
  const role = String(req.query.role ?? '').trim().toLowerCase();
  const status = String(req.query.status ?? '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit ?? 200), 1), 500);

  const patientFilter = {};
  const providerFilter = {};
  const adminFilter = {};

  if (q) {
    const re = new RegExp(q, 'i');
    patientFilter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { mrn: re }];
    providerFilter.$or = [{ name: re }, { holderName: re }, { email: re }];
    adminFilter.$or = [{ email: re }];
  }

  if (status) {
    if (status === 'active' || status === 'disabled') providerFilter.status = status;
    if (status === 'active' || status === 'archived') patientFilter.status = status;
  }

  const [patients, providers, admins] = await Promise.all([
    role && role !== 'patient'
      ? []
      : Patient.find(patientFilter).select('firstName lastName email mrn status healthCenterId role createdAt updatedAt').sort({ updatedAt: -1 }).limit(limit).lean(),
    role && role !== 'provider'
      ? []
      : HealthCenter.find(providerFilter).select('name holderName email role status credentialStatus createdAt updatedAt').sort({ updatedAt: -1 }).limit(limit).lean(),
    role && role !== 'admin'
      ? []
      : Admin.find(adminFilter).select('email role status createdAt updatedAt').sort({ updatedAt: -1 }).limit(limit).lean(),
  ]);

  const users = [
    ...patients.map((p) => ({
      id: p._id,
      role: 'patient',
      displayName: `${p.firstName} ${p.lastName}`.trim(),
      email: p.email,
      status: p.status ?? 'active',
      credentialStatus: 'approved',
      meta: { mrn: p.mrn ?? '', healthCenterId: p.healthCenterId },
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    ...providers.map((p) => ({
      id: p._id,
      role: 'provider',
      displayName: p.name,
      email: p.email,
      status: p.status,
      credentialStatus: p.credentialStatus ?? 'approved',
      meta: { holderName: p.holderName, providerRole: p.role },
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    ...admins.map((a) => ({
      id: a._id,
      role: 'admin',
      displayName: 'Admin',
      email: a.email,
      status: a.status,
      credentialStatus: 'approved',
      meta: {},
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  ];

  return res.json({ users });
}

export async function adminUpsertUser(req, res) {
  const actorId = req.context.adminId;
  const {
    role,
    email,
    password,
    status = 'active',
    credentialStatus = 'approved',
    // provider fields
    name = '',
    holderName = '',
    address = '',
    contactNumber = '',
    // patient fields
    healthCenterId = '',
    firstName = '',
    lastName = '',
    middleInitial = '',
    mrn = '',
  } = req.body ?? {};

  const normalizedRole = String(role ?? '').trim().toLowerCase();
  if (!['patient', 'provider', 'admin'].includes(normalizedRole)) {
    return res.status(400).json({ error: { message: 'role must be patient, provider, or admin' } });
  }
  if (!email || !password) return res.status(400).json({ error: { message: 'email and password are required' } });

  if (normalizedRole === 'provider') {
    if (!name || !holderName) {
      return res.status(400).json({ error: { message: 'name and holderName are required for provider' } });
    }
    const existing = await HealthCenter.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (existing) return res.status(409).json({ error: { message: 'Provider email already exists' } });

    const provider = await HealthCenter.create({
      email: String(email).toLowerCase().trim(),
      passwordHash: await hashPassword(String(password)),
      name: String(name).trim(),
      holderName: String(holderName).trim(),
      address: String(address ?? '').trim(),
      contactNumber: String(contactNumber ?? '').trim(),
      status: status === 'disabled' ? 'disabled' : 'active',
      credentialStatus: ['pending', 'approved', 'rejected'].includes(String(credentialStatus)) ? credentialStatus : 'approved',
      role: 'staff',
    });
    await writeAuditLog({
      req,
      action: 'ADMIN.USER.CREATE',
      entityType: 'HealthCenter',
      entityId: provider._id,
      after: { email: provider.email, status: provider.status, credentialStatus: provider.credentialStatus },
    });
    return res.status(201).json({ user: { id: provider._id, role: 'provider', email: provider.email } });
  }

  if (normalizedRole === 'patient') {
    if (!healthCenterId || !firstName || !lastName || !middleInitial) {
      return res.status(400).json({ error: { message: 'healthCenterId, firstName, lastName, middleInitial are required for patient' } });
    }
    const hc = await HealthCenter.findById(healthCenterId).lean();
    if (!hc) return res.status(404).json({ error: { message: 'Health center not found' } });

    const existing = await Patient.findOne({ healthCenterId, email: String(email).toLowerCase().trim() }).lean();
    if (existing) return res.status(409).json({ error: { message: 'Patient email already exists in this health center' } });

    const patient = await Patient.create({
      healthCenterId,
      mrn: String(mrn ?? '').trim() || undefined,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      middleInitial: String(middleInitial).trim().slice(0, 1),
      email: String(email).toLowerCase().trim(),
      passwordHash: await hashPassword(String(password)),
      address: String(address ?? '').trim(),
      contactNumber: String(contactNumber ?? '').trim(),
      status: status === 'archived' ? 'archived' : 'active',
      accountVerification: {
        status: 'verified',
        verifiedAt: new Date(),
      },
      createdByActorType: 'admin',
      createdByActorId: actorId,
      updatedByActorType: 'admin',
      updatedByActorId: actorId,
    });
    await writeAuditLog({
      req,
      action: 'ADMIN.USER.CREATE',
      entityType: 'Patient',
      entityId: patient._id,
      after: { email: patient.email, healthCenterId: patient.healthCenterId, status: patient.status },
    });
    return res.status(201).json({ user: { id: patient._id, role: 'patient', email: patient.email } });
  }

  const existingAdmin = await Admin.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (existingAdmin) return res.status(409).json({ error: { message: 'Admin email already exists' } });
  const admin = await Admin.create({
    email: String(email).toLowerCase().trim(),
    passwordHash: await hashPassword(String(password)),
    status: status === 'disabled' ? 'disabled' : 'active',
    role: 'admin',
  });
  await writeAuditLog({
    req,
    action: 'ADMIN.USER.CREATE',
    entityType: 'Admin',
    entityId: admin._id,
    after: { email: admin.email, status: admin.status },
  });
  return res.status(201).json({ user: { id: admin._id, role: 'admin', email: admin.email } });
}

export async function adminUpdateUser(req, res) {
  const { userRole, userId } = req.params;
  const role = String(userRole ?? '').toLowerCase();
  const patch = req.body ?? {};

  if (!['patient', 'provider', 'admin'].includes(role)) {
    return res.status(400).json({ error: { message: 'userRole must be patient, provider, or admin' } });
  }

  if (role === 'provider') {
    const allowed = ['name', 'holderName', 'address', 'contactNumber', 'status', 'credentialStatus', 'role', 'email'];
    const update = {};
    for (const k of allowed) if (k in patch) update[k] = patch[k];
    if ('email' in update) update.email = String(update.email).toLowerCase().trim();
    const doc = await HealthCenter.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).lean();
    if (!doc) return res.status(404).json({ error: { message: 'Provider not found' } });
    await writeAuditLog({ req, action: 'ADMIN.USER.UPDATE', entityType: 'HealthCenter', entityId: doc._id, after: update });
    return res.json({ user: { id: doc._id, role: 'provider', email: doc.email, status: doc.status, credentialStatus: doc.credentialStatus } });
  }

  if (role === 'patient') {
    const allowed = [
      'firstName',
      'lastName',
      'middleInitial',
      'nameExtension',
      'email',
      'address',
      'contactNumber',
      'status',
      'guardianName',
      'emergencyContactName',
      'emergencyContactPhone',
      'sex',
      'birthDate',
    ];
    const update = {};
    for (const k of allowed) if (k in patch) update[k] = patch[k];
    if ('email' in update) update.email = String(update.email).toLowerCase().trim();
    const doc = await Patient.findByIdAndUpdate(
      userId,
      { $set: { ...update, updatedByActorType: 'admin', updatedByActorId: req.context.adminId } },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: { message: 'Patient not found' } });
    await writeAuditLog({ req, action: 'ADMIN.USER.UPDATE', entityType: 'Patient', entityId: doc._id, after: update });
    return res.json({ user: { id: doc._id, role: 'patient', email: doc.email, status: doc.status } });
  }

  const allowed = ['email', 'status'];
  const update = {};
  for (const k of allowed) if (k in patch) update[k] = patch[k];
  if ('email' in update) update.email = String(update.email).toLowerCase().trim();
  const doc = await Admin.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).lean();
  if (!doc) return res.status(404).json({ error: { message: 'Admin not found' } });
  await writeAuditLog({ req, action: 'ADMIN.USER.UPDATE', entityType: 'Admin', entityId: doc._id, after: update });
  return res.json({ user: { id: doc._id, role: 'admin', email: doc.email, status: doc.status } });
}

export async function approveProviderCredentials(req, res) {
  const { providerId } = req.params;
  const status = String(req.body?.credentialStatus ?? 'approved').toLowerCase();
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: { message: 'credentialStatus must be approved, rejected, or pending' } });
  }
  const provider = await HealthCenter.findByIdAndUpdate(
    providerId,
    { $set: { credentialStatus: status } },
    { new: true, runValidators: true }
  ).lean();
  if (!provider) return res.status(404).json({ error: { message: 'Provider not found' } });

  await writeAuditLog({
    req,
    action: 'ADMIN.PROVIDER.CREDENTIALS',
    entityType: 'HealthCenter',
    entityId: provider._id,
    after: { credentialStatus: provider.credentialStatus },
  });

  return res.json({
    provider: {
      id: provider._id,
      email: provider.email,
      credentialStatus: provider.credentialStatus,
      status: provider.status,
    },
  });
}

export async function getRbacSettings(req, res) {
  const cfg = await getOrCreateAdminConfig(req.context.adminId);
  return res.json({ rbac: cfg.rbac, updatedAt: cfg.updatedAt });
}

export async function updateRbacSettings(req, res) {
  const cfg = await getOrCreateAdminConfig(req.context.adminId);
  const patch = req.body?.rbac;
  if (!patch || typeof patch !== 'object') {
    return res.status(400).json({ error: { message: 'rbac object is required' } });
  }
  cfg.rbac = {
    ...cfg.rbac,
    ...patch,
  };
  cfg.updatedByAdminId = req.context.adminId;
  await cfg.save();
  await writeAuditLog({ req, action: 'ADMIN.RBAC.UPDATE', entityType: 'AdminConfig', entityId: cfg._id });
  return res.json({ rbac: cfg.rbac, updatedAt: cfg.updatedAt });
}

export async function listSystemLogs(req, res) {
  const q = String(req.query.q ?? '').trim();
  const action = String(req.query.action ?? '').trim();
  const outcome = String(req.query.outcome ?? '').trim();
  const limit = Math.min(Math.max(Number(req.query.limit ?? 200), 1), 500);

  const filter = {};
  if (action) filter.action = action;
  if (outcome) filter.outcome = outcome;
  if (q) {
    const re = new RegExp(q, 'i');
    filter.$or = [{ action: re }, { reason: re }, { actorName: re }, { userAgent: re }];
  }

  const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  const suspicious = logs.filter((log) => log.outcome === 'failure' || String(log.action ?? '').includes('SECURITY'));
  return res.json({ logs, suspiciousCount: suspicious.length });
}

export async function getSystemMonitoring(req, res) {
  const [activeSessions, totalSessions24h, failed24h, alerts24h, recentAudit, cfg] = await Promise.all([
    Session.countDocuments({ revokedAt: null, expiresAt: { $gt: new Date() } }),
    Session.countDocuments({ startedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    AuditLog.countDocuments({ outcome: 'failure', createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    AuditLog.countDocuments({ action: { $in: ['ALERT.GENERATED', 'RECORD.VERIFY'] }, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(20).lean(),
    getOrCreateAdminConfig(req.context.adminId),
  ]);

  const suspiciousThreshold = Number(cfg.performanceThresholds?.suspiciousFailuresPerHour ?? 10);
  return res.json({
    monitoring: {
      activeSessions,
      totalSessions24h,
      failed24h,
      alerts24h,
      suspiciousThreshold,
      suspicious: failed24h > suspiciousThreshold,
      recentAudit,
    },
  });
}

export async function getBlockchainOverview(req, res) {
  const [proofs24h, failed24h, byKind, byStatus, recent] = await Promise.all([
    BlockchainProofLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    BlockchainProofLog.countDocuments({ status: 'failed', createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    BlockchainProofLog.aggregate([
      { $group: { _id: '$kind', count: { $sum: 1 } } },
    ]),
    BlockchainProofLog.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    BlockchainProofLog.find({}).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  return res.json({
    overview: {
      proofs24h,
      failed24h,
      byKind,
      byStatus,
    },
    recent,
  });
}

export async function getDataGovernanceSettings(req, res) {
  const cfg = await getOrCreateAdminConfig(req.context.adminId);
  return res.json({ dataGovernance: cfg.dataGovernance, performanceThresholds: cfg.performanceThresholds });
}

export async function updateDataGovernanceSettings(req, res) {
  const cfg = await getOrCreateAdminConfig(req.context.adminId);
  const governancePatch = req.body?.dataGovernance ?? {};
  const perfPatch = req.body?.performanceThresholds ?? {};

  cfg.dataGovernance = {
    ...cfg.dataGovernance,
    ...governancePatch,
  };
  cfg.performanceThresholds = {
    ...cfg.performanceThresholds,
    ...perfPatch,
  };
  cfg.updatedByAdminId = req.context.adminId;
  await cfg.save();

  await writeAuditLog({
    req,
    action: 'ADMIN.GOVERNANCE.UPDATE',
    entityType: 'AdminConfig',
    entityId: cfg._id,
  });

  return res.json({ dataGovernance: cfg.dataGovernance, performanceThresholds: cfg.performanceThresholds, updatedAt: cfg.updatedAt });
}

export async function runDatabaseBackup(req, res) {
  const cfg = await getOrCreateAdminConfig(req.context.adminId);
  cfg.dataGovernance = {
    ...cfg.dataGovernance,
    lastBackupAt: new Date(),
  };
  cfg.updatedByAdminId = req.context.adminId;
  await cfg.save();
  await writeAuditLog({
    req,
    action: 'ADMIN.BACKUP.RUN',
    entityType: 'AdminConfig',
    entityId: cfg._id,
  });
  return res.json({ message: 'Backup metadata updated', lastBackupAt: cfg.dataGovernance.lastBackupAt });
}

export async function markRestoreOperation(req, res) {
  const cfg = await getOrCreateAdminConfig(req.context.adminId);
  cfg.dataGovernance = {
    ...cfg.dataGovernance,
    lastRestoreAt: new Date(),
  };
  cfg.updatedByAdminId = req.context.adminId;
  await cfg.save();
  await writeAuditLog({
    req,
    action: 'ADMIN.BACKUP.RESTORE',
    entityType: 'AdminConfig',
    entityId: cfg._id,
  });
  return res.json({ message: 'Restore metadata updated', lastRestoreAt: cfg.dataGovernance.lastRestoreAt });
}

