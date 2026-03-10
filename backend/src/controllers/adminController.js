import { Admin } from '../models/Admin.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { Patient } from '../models/Patient.js';
import { AuditLog } from '../models/AuditLog.js';
import { BlockchainProofLog } from '../models/BlockchainProofLog.js';
import { Session } from '../models/Session.js';
import { AdminConfig } from '../models/AdminConfig.js';
import { env } from '../config/env.js';
import { hashPassword, signAdminToken, verifyPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';
import { ensureBlockchainIdentityForDocument } from '../services/blockchain/identity.service.js';
import { deliverProviderOnboardingNotification } from '../services/verificationDelivery.service.js';
import { invalidateAdminRbacCache } from '../middleware/rbac.js';
import { createEncryptedDatabaseBackup } from '../services/databaseBackup.service.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';
import { resolveSessionIdleTimeoutMs } from '../utils/sessionIdleTimeout.js';

const GENERIC_LOGIN_ERROR = 'Invalid credentials';

const BARANGAY_STATUSES = ['pending', 'verified', 'active'];

function buildSafeRegex(value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

function normalizeBarangayStatus(value, fallback = 'pending') {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  return BARANGAY_STATUSES.includes(normalized) ? normalized : '';
}

function parseCoordinate(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function buildActiveSessionQuery(now = new Date()) {
  const idleCutoff = new Date(now.getTime() - resolveSessionIdleTimeoutMs('provider'));
  return {
    revokedAt: null,
    expiresAt: { $gt: now },
    $or: [
      { lastActivityAt: { $gte: idleCutoff } },
      { lastActivityAt: { $exists: false }, startedAt: { $gte: idleCutoff } },
      { lastActivityAt: null, startedAt: { $gte: idleCutoff } },
    ],
  };
}

function sanitizeAssignedProviders(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        return {
          name: String(entry.name ?? '').trim(),
          email: String(entry.email ?? '').trim().toLowerCase(),
          contactNumber: String(entry.contactNumber ?? '').trim(),
        };
      }
      const name = String(entry ?? '').trim();
      return { name, email: '', contactNumber: '' };
    })
    .filter((entry) => entry.name || entry.email || entry.contactNumber);
}

async function notifyProviderOnboarding({ req, provider, temporaryPassword = '' }) {
  const notification = await deliverProviderOnboardingNotification({
    email: provider.email,
    barangayName: provider.barangayName,
    cityMunicipality: provider.cityMunicipality,
    healthCenterName: provider.healthCenterName,
    status: provider.status,
    loginEmail: provider.email,
    temporaryPassword,
  });

  await writeAuditLog({
    req,
    action: 'ADMIN.PROVIDER.NOTIFY',
    entityType: 'HealthCenter',
    entityId: provider._id,
    outcome: notification.delivered ? 'success' : 'failure',
    reason: notification.message || '',
    after: {
      channel: notification.channel,
      delivered: notification.delivered,
      recipientMasked: notification.recipientMasked,
      status: provider.status,
      credentialsIncluded: Boolean(temporaryPassword),
    },
  });

  return notification;
}

export async function registerAdmin(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: { message: 'email and password are required' } });
  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.ok) return res.status(400).json({ error: { message: passwordCheck.message } });

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
  if (!email || !password) return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });

  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() });
  if (!admin) return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });

  const ok = await verifyPassword(String(password), admin.passwordHash);
  if (!ok) {
    await writeAuditLog({ req, action: 'ADMIN.LOGIN', entityType: 'Admin', entityId: admin._id, outcome: 'failure', reason: 'Invalid credentials' });
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }
  if (admin.status !== 'active') {
    await writeAuditLog({ req, action: 'ADMIN.LOGIN', entityType: 'Admin', entityId: admin._id, outcome: 'failure', reason: 'Admin disabled' });
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  const token = signAdminToken({ adminId: admin._id });
  await writeAuditLog({ req, action: 'ADMIN.LOGIN', entityType: 'Admin', entityId: admin._id });
  return res.json({ accessToken: token, admin: { id: admin._id, email: admin.email } });
}

export async function adminCreateHealthCenter(req, res) {
  const {
    email,
    password,
    walletAddress = '',
    contactNumber = '',
    // Barangay onboarding fields
    barangayName = '',
    cityMunicipality = '',
    healthCenterName = '',
    officialContactInfo = '',
    latitude = null,
    longitude = null,
    assignedHealthcareProviders = [],
    status = 'pending',
    // Backward-compatible fields
    name = '',
    holderName = '',
    address = '',
  } = req.body ?? {};

  const onboardingStatus = normalizeBarangayStatus(status, 'pending');
  if (!email || !password || !barangayName || !cityMunicipality || !healthCenterName || !officialContactInfo) {
    return res.status(400).json({
      error: {
        message:
          'email, password, barangayName, cityMunicipality, healthCenterName, and officialContactInfo are required',
      },
    });
  }
  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.ok) return res.status(400).json({ error: { message: passwordCheck.message } });
  if (!onboardingStatus) {
    return res.status(400).json({ error: { message: "status must be one of: pending, verified, active" } });
  }

  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  if (lat === null || lng === null) {
    return res.status(400).json({ error: { message: 'latitude and longitude are required numeric coordinates' } });
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: { message: 'latitude/longitude are out of valid range' } });
  }

  const existing = await HealthCenter.findOne({ email: String(email).toLowerCase().trim() }).lean();
  if (existing) return res.status(409).json({ error: { message: 'Health center email already exists' } });

  const assignedProviders = sanitizeAssignedProviders(assignedHealthcareProviders);
  const normalizedBarangayName = String(barangayName).trim();
  const normalizedHealthCenterName = String(healthCenterName).trim();
  const displayName = String(name || `${normalizedBarangayName} - ${normalizedHealthCenterName}`).trim();

  const hc = await HealthCenter.create({
    email: String(email).toLowerCase().trim(),
    passwordHash: await hashPassword(String(password)),
    name: displayName,
    barangayName: normalizedBarangayName,
    cityMunicipality: String(cityMunicipality).trim(),
    healthCenterName: normalizedHealthCenterName,
    officialContactInfo: String(officialContactInfo).trim(),
    geoLocation: {
      latitude: lat,
      longitude: lng,
    },
    assignedHealthcareProviders: assignedProviders,
    holderName: String(holderName || normalizedBarangayName).trim(),
    address: String(address || cityMunicipality).trim(),
    contactNumber: String(contactNumber ?? '').trim(),
    status: onboardingStatus,
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
      barangayName: hc.barangayName,
      cityMunicipality: hc.cityMunicipality,
      healthCenterName: hc.healthCenterName,
      status: hc.status,
      assignedHealthcareProvidersCount: hc.assignedHealthcareProviders?.length ?? 0,
      blockchainIdentityId: identity.identityId,
    },
  });

  const notification = await notifyProviderOnboarding({ req, provider: hc, temporaryPassword: String(password) });

  return res.status(201).json({
    healthCenter: {
      id: hc._id,
      email: hc.email,
      name: hc.name,
      barangayName: hc.barangayName,
      cityMunicipality: hc.cityMunicipality,
      healthCenterName: hc.healthCenterName,
      officialContactInfo: hc.officialContactInfo,
      geoLocation: hc.geoLocation,
      assignedHealthcareProviders: hc.assignedHealthcareProviders,
      status: hc.status,
      holderName: hc.holderName,
      blockchainIdentity: {
        identityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        txId: identity.txId,
      },
    },
    notification,
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
  const now = new Date();
  const activeSessionQuery = buildActiveSessionQuery(now);
  const [patients, providers, activeProviders, pendingProviders, admins, sessions, failedEvents, recentProofs] = await Promise.all([
    Patient.countDocuments({}),
    HealthCenter.countDocuments({}),
    HealthCenter.countDocuments({ status: 'active' }),
    HealthCenter.countDocuments({ status: { $in: ['pending', 'verified'] } }),
    Admin.countDocuments({ status: 'active' }),
    Session.countDocuments(activeSessionQuery),
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
    const re = buildSafeRegex(q);
    patientFilter.$or = [{ firstName: re }, { lastName: re }, { email: re }, { mrn: re }];
    providerFilter.$or = [{ name: re }, { holderName: re }, { email: re }];
    adminFilter.$or = [{ email: re }];
  }

  if (status) {
    if (['pending', 'verified', 'active', 'disabled'].includes(status)) providerFilter.status = status;
    if (status === 'active' || status === 'archived') patientFilter.status = status;
  }

  const [patients, providers, admins] = await Promise.all([
    role && role !== 'patient'
      ? []
      : Patient.find(patientFilter).select('firstName lastName email mrn status healthCenterId role createdAt updatedAt').sort({ updatedAt: -1 }).limit(limit).lean(),
    role && role !== 'provider'
      ? []
      : HealthCenter.find(providerFilter)
          .select(
            'name holderName email role status barangayName cityMunicipality healthCenterName officialContactInfo geoLocation assignedHealthcareProviders createdAt updatedAt'
          )
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean(),
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
      displayName: p.barangayName || p.name,
      email: p.email,
      status: p.status,
      // Kept for UI compatibility; values now mirror barangay onboarding status.
      credentialStatus: p.status,
      meta: {
        holderName: p.holderName,
        providerRole: p.role,
        barangayName: p.barangayName ?? '',
        cityMunicipality: p.cityMunicipality ?? '',
        healthCenterName: p.healthCenterName ?? '',
        officialContactInfo: p.officialContactInfo ?? '',
        geoLocation: p.geoLocation ?? null,
        assignedHealthcareProviders: p.assignedHealthcareProviders ?? [],
      },
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
    status = 'pending',
    walletAddress = '',
    // provider fields
    name = '',
    holderName = '',
    address = '',
    contactNumber = '',
    barangayName = '',
    cityMunicipality = '',
    healthCenterName = '',
    officialContactInfo = '',
    latitude = null,
    longitude = null,
    assignedHealthcareProviders = [],
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
  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.ok) return res.status(400).json({ error: { message: passwordCheck.message } });

  if (normalizedRole === 'provider') {
    if (!barangayName || !cityMunicipality || !healthCenterName || !officialContactInfo) {
      return res.status(400).json({
        error: {
          message:
            'barangayName, cityMunicipality, healthCenterName, and officialContactInfo are required for provider',
        },
      });
    }
    const existing = await HealthCenter.findOne({ email: String(email).toLowerCase().trim() }).lean();
    if (existing) return res.status(409).json({ error: { message: 'Provider email already exists' } });

    const onboardingStatus = normalizeBarangayStatus(status, 'pending');
    if (!onboardingStatus) {
      return res.status(400).json({ error: { message: "status must be one of: pending, verified, active" } });
    }

    const lat = parseCoordinate(latitude);
    const lng = parseCoordinate(longitude);
    if (lat === null || lng === null) {
      return res.status(400).json({ error: { message: 'latitude and longitude are required numeric coordinates' } });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: { message: 'latitude/longitude are out of valid range' } });
    }

    const assignedProviders = sanitizeAssignedProviders(assignedHealthcareProviders);
    const normalizedBarangayName = String(barangayName).trim();
    const normalizedHealthCenterName = String(healthCenterName).trim();
    const displayName = String(name || `${normalizedBarangayName} - ${normalizedHealthCenterName}`).trim();

    const provider = await HealthCenter.create({
      email: String(email).toLowerCase().trim(),
      passwordHash: await hashPassword(String(password)),
      name: displayName,
      holderName: String(holderName || normalizedBarangayName).trim(),
      barangayName: normalizedBarangayName,
      cityMunicipality: String(cityMunicipality).trim(),
      healthCenterName: normalizedHealthCenterName,
      officialContactInfo: String(officialContactInfo).trim(),
      geoLocation: { latitude: lat, longitude: lng },
      assignedHealthcareProviders: assignedProviders,
      address: String(address || cityMunicipality).trim(),
      contactNumber: String(contactNumber ?? '').trim(),
      status: onboardingStatus,
      role: 'staff',
    });
    const { identity } = await ensureBlockchainIdentityForDocument({
      doc: provider,
      subjectType: 'healthcenter',
      uniqueSeed: provider.email,
      walletAddress,
    });
    await writeAuditLog({
      req,
      action: 'ADMIN.USER.CREATE',
      entityType: 'HealthCenter',
      entityId: provider._id,
      after: {
        email: provider.email,
        status: provider.status,
        barangayName: provider.barangayName,
        blockchainIdentityId: identity.identityId,
      },
    });
    const notification = await notifyProviderOnboarding({ req, provider, temporaryPassword: String(password) });
    return res.status(201).json({
      user: {
        id: provider._id,
        role: 'provider',
        email: provider.email,
        blockchainIdentity: {
          identityId: identity.identityId,
          verificationStatus: identity.verificationStatus,
          txId: identity.txId,
        },
      },
      notification,
    });
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
    const { identity } = await ensureBlockchainIdentityForDocument({
      doc: patient,
      subjectType: 'patient',
      uniqueSeed: patient.email,
      walletAddress,
      healthCenterId: patient.healthCenterId,
    });
    await writeAuditLog({
      req,
      action: 'ADMIN.USER.CREATE',
      entityType: 'Patient',
      entityId: patient._id,
      after: {
        email: patient.email,
        healthCenterId: patient.healthCenterId,
        status: patient.status,
        blockchainIdentityId: identity.identityId,
      },
    });
    return res.status(201).json({
      user: {
        id: patient._id,
        role: 'patient',
        email: patient.email,
        blockchainIdentity: {
          identityId: identity.identityId,
          verificationStatus: identity.verificationStatus,
          txId: identity.txId,
        },
      },
    });
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
    const allowed = [
      'name',
      'holderName',
      'address',
      'contactNumber',
      'status',
      'role',
      'email',
      'barangayName',
      'cityMunicipality',
      'healthCenterName',
      'officialContactInfo',
      'latitude',
      'longitude',
      'assignedHealthcareProviders',
    ];
    const update = {};
    for (const k of allowed) if (k in patch) update[k] = patch[k];
    if ('email' in update) update.email = String(update.email).toLowerCase().trim();
    if ('status' in update) {
      const normalizedStatus = normalizeBarangayStatus(update.status);
      if (!normalizedStatus) {
        return res.status(400).json({ error: { message: "status must be one of: pending, verified, active" } });
      }
      update.status = normalizedStatus;
    }
    if ('latitude' in update || 'longitude' in update) {
      const lat = parseCoordinate(update.latitude);
      const lng = parseCoordinate(update.longitude);
      if (lat === null || lng === null) {
        return res.status(400).json({ error: { message: 'latitude and longitude are required numeric coordinates' } });
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: { message: 'latitude/longitude are out of valid range' } });
      }
      update.geoLocation = { latitude: lat, longitude: lng };
      delete update.latitude;
      delete update.longitude;
    }
    if ('assignedHealthcareProviders' in update) {
      update.assignedHealthcareProviders = sanitizeAssignedProviders(update.assignedHealthcareProviders);
    }
    const doc = await HealthCenter.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).lean();
    if (!doc) return res.status(404).json({ error: { message: 'Provider not found' } });
    await writeAuditLog({ req, action: 'ADMIN.USER.UPDATE', entityType: 'HealthCenter', entityId: doc._id, after: update });
    return res.json({ user: { id: doc._id, role: 'provider', email: doc.email, status: doc.status, credentialStatus: doc.status } });
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
  const requested =
    req.body?.status ??
    req.body?.onboardingStatus ??
    (() => {
      const legacy = String(req.body?.credentialStatus ?? '').toLowerCase();
      if (legacy === 'approved') return 'active';
      if (legacy === 'rejected') return 'verified';
      if (legacy === 'pending') return 'pending';
      return '';
    })();
  const status = normalizeBarangayStatus(requested);
  if (!status) {
    return res.status(400).json({ error: { message: 'status must be pending, verified, or active' } });
  }
  const provider = await HealthCenter.findByIdAndUpdate(
    providerId,
    { $set: { status } },
    { new: true, runValidators: true }
  ).lean();
  if (!provider) return res.status(404).json({ error: { message: 'Provider not found' } });

  await writeAuditLog({
    req,
    action: 'ADMIN.BARANGAY.STATUS.UPDATE',
    entityType: 'HealthCenter',
    entityId: provider._id,
    after: { status: provider.status },
  });

  return res.json({
    provider: {
      id: provider._id,
      email: provider.email,
      onboardingStatus: provider.status,
      credentialStatus: provider.status,
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

  const currentRbac = typeof cfg.rbac?.toObject === 'function' ? cfg.rbac.toObject() : cfg.rbac;
  const nextRbac = {
    ...currentRbac,
  };

  if (patch.patient && typeof patch.patient === 'object') {
    nextRbac.patient = { ...(currentRbac?.patient ?? {}), ...patch.patient };
  }
  if (patch.provider && typeof patch.provider === 'object') {
    nextRbac.provider = { ...(currentRbac?.provider ?? {}), ...patch.provider };
  }
  if (patch.admin && typeof patch.admin === 'object') {
    nextRbac.admin = { ...(currentRbac?.admin ?? {}), ...patch.admin };
  }

  cfg.rbac = nextRbac;
  cfg.updatedByAdminId = req.context.adminId;
  await cfg.save();
  invalidateAdminRbacCache();
  await writeAuditLog({ req, action: 'ADMIN.RBAC.UPDATE', entityType: 'AdminConfig', entityId: cfg._id });
  return res.json({ rbac: cfg.rbac, updatedAt: cfg.updatedAt });
}

export async function listSystemLogs(req, res) {
  const q = String(req.query.q ?? '').trim();
  const action = String(req.query.action ?? '').trim();
  const outcome = String(req.query.outcome ?? '').trim();
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 200), 1), 500);

  const filter = {};
  if (action) filter.action = action;
  if (outcome) filter.outcome = outcome;
  if (q) {
    const re = buildSafeRegex(q);
    filter.$or = [{ action: re }, { reason: re }, { actorName: re }, { userAgent: re }];
  }

  const total = await AuditLog.countDocuments(filter);
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;

  const [logs, suspiciousCount] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments({
      $and: [
        filter,
        {
          $or: [{ outcome: 'failure' }, { action: /SECURITY/i }],
        },
      ],
    }),
  ]);

  return res.json({
    logs,
    suspiciousCount,
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
      hasPrev: safePage > 1,
      hasNext: safePage < totalPages,
    },
  });
}

export async function getSystemMonitoring(req, res) {
  const now = new Date();
  const activeSessionQuery = buildActiveSessionQuery(now);
  const [activeSessions, totalSessions24h, failed24h, alerts24h, recentAudit, cfg] = await Promise.all([
    Session.countDocuments(activeSessionQuery),
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
  if (cfg?.dataGovernance?.backupEnabled === false) {
    return res.status(403).json({
      error: {
        message: 'Backups are currently disabled by governance policy',
        code: 'BACKUP_DISABLED',
      },
    });
  }

  const backup = await createEncryptedDatabaseBackup({
    initiatedBy: String(req.context.adminId ?? 'admin'),
  });

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
    after: {
      backupFile: backup.fileName,
      generatedAt: backup.generatedAt,
      checksum: backup.checksum,
      counts: backup.counts,
    },
  });
  return res.json({
    message: 'Encrypted backup created',
    lastBackupAt: cfg.dataGovernance.lastBackupAt,
    backup: {
      fileName: backup.fileName,
      filePath: backup.filePath,
      generatedAt: backup.generatedAt,
      checksum: backup.checksum,
      counts: backup.counts,
      totalCollections: backup.totalCollections,
    },
  });
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
