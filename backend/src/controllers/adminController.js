import { Admin } from '../models/Admin.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { Patient } from '../models/Patient.js';
import { AuditLog } from '../models/AuditLog.js';
import { BlockchainProofLog } from '../models/BlockchainProofLog.js';
import { Session } from '../models/Session.js';
import { AdminConfig } from '../models/AdminConfig.js';
import { MunicipalOnboardingRequest } from '../models/MunicipalOnboardingRequest.js';
import { env } from '../config/env.js';
import { hashPassword, signAdminToken, verifyPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';
import { ensureBlockchainIdentityForDocument } from '../services/blockchain/identity.service.js';
import { deliverProviderOnboardingNotification } from '../services/verificationDelivery.service.js';
import { invalidateAdminRbacCache } from '../middleware/rbac.js';
import { createEncryptedDatabaseBackup } from '../services/databaseBackup.service.js';
import {
  buildAdminOrProviderEmailConflictMessage,
  findExistingAdminOrProviderByEmail,
} from '../services/accountEmailConflict.service.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';
import { runDetachedTask } from '../utils/backgroundTask.js';
import { resolveSessionIdleTimeoutMs } from '../utils/sessionIdleTimeout.js';
import {
  buildEmailFields,
  buildMrnFields,
  buildPhoneFields,
  encryptPiiValue,
  normalizeText,
  resolvePiiField,
} from '../services/pii.service.js';

const GENERIC_LOGIN_ERROR = 'Invalid credentials';
const QUEUED_PROVIDER_NOTIFICATION = Object.freeze({
  attempted: false,
  delivered: false,
  channel: 'queued',
  message: 'Provider onboarding tasks are processing in the background.',
});

const BARANGAY_STATUSES = ['pending', 'verified', 'active'];
const MUNICIPAL_STARTER_BRGY_LIMIT = 20;
const MUNICIPAL_COVERAGE_TIER_RANK = Object.freeze({
  starter: 0,
  citywide: 1,
  enterprise: 2,
});

function buildSafeRegex(value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

function buildExactMatchRegex(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped}$`, 'i');
}

function normalizeCityKey(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function resolveAdminScopeContext(req) {
  const scope = String(req.context?.adminScope ?? 'global').trim().toLowerCase();
  const cityMunicipality = String(req.context?.adminCityMunicipality ?? '').trim();
  const cityKey = normalizeCityKey(cityMunicipality);
  return {
    scope: scope === 'municipal' ? 'municipal' : 'global',
    cityMunicipality,
    cityKey,
  };
}

function ensureMunicipalScope(scopeContext, res) {
  if (scopeContext.scope === 'municipal' && !scopeContext.cityKey) {
    res.status(403).json({ error: { message: 'Municipal admin scope is missing city/municipality' } });
    return false;
  }
  return true;
}

function isSameCity(left, right) {
  const leftKey = normalizeCityKey(left);
  const rightKey = normalizeCityKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

async function resolveScopeHealthCenters(scopeContext) {
  if (scopeContext.scope !== 'municipal') {
    return { cityRegex: null, healthCenterIds: null };
  }
  const cityRegex = buildExactMatchRegex(scopeContext.cityMunicipality);
  if (!cityRegex) {
    return { cityRegex: null, healthCenterIds: [] };
  }
  const centers = await HealthCenter.find({ cityMunicipality: cityRegex }).select('_id').lean();
  return {
    cityRegex,
    healthCenterIds: centers.map((center) => center._id),
  };
}

function applyScopeFilter(filter, scopeFilter) {
  if (!scopeFilter) return filter;
  return { $and: [filter, scopeFilter] };
}

function normalizeBarangayStatus(value, fallback = 'pending') {
  const normalized = String(value ?? fallback).trim().toLowerCase();
  return BARANGAY_STATUSES.includes(normalized) ? normalized : '';
}

function isStarterTier(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized.includes('starter');
}

function normalizeMunicipalCoverageTier(value) {
  const raw = String(value ?? '').trim();
  const normalized = raw.toLowerCase();
  const collapsed = normalized.replace(/[^a-z]/g, '');

  if (collapsed.includes('enterprise')) {
    return { id: 'enterprise', label: 'Enterprise Coverage', raw };
  }
  if (collapsed.includes('citywide')) {
    return { id: 'citywide', label: 'Citywide Coverage', raw };
  }
  if (collapsed.includes('starter')) {
    return { id: 'starter', label: 'Starter Coverage', raw };
  }

  return {
    id: 'starter',
    label: raw || 'Starter Coverage',
    raw,
  };
}

function resolveMunicipalCoverageTierRank(tierId) {
  const normalized = String(tierId ?? '').trim().toLowerCase();
  if (normalized === 'enterprise') return MUNICIPAL_COVERAGE_TIER_RANK.enterprise;
  if (normalized === 'citywide') return MUNICIPAL_COVERAGE_TIER_RANK.citywide;
  return MUNICIPAL_COVERAGE_TIER_RANK.starter;
}

function isMunicipalCoverageTierAtLeast(currentTierId, requiredTierId) {
  return resolveMunicipalCoverageTierRank(currentTierId) >= resolveMunicipalCoverageTierRank(requiredTierId);
}

async function resolveMunicipalCoverageTier(cityMunicipality) {
  const cityRegex = buildExactMatchRegex(cityMunicipality);
  if (!cityRegex) return normalizeMunicipalCoverageTier('');
  const latestApproved = await MunicipalOnboardingRequest.findOne({
    cityMunicipality: cityRegex,
    status: 'approved',
  })
    .sort({ createdAt: -1 })
    .lean();
  return normalizeMunicipalCoverageTier(latestApproved?.pricingTier ?? '');
}

async function ensureMunicipalCoverageTier(scopeContext, requiredTierId, res, featureLabel) {
  if (scopeContext.scope !== 'municipal') return true;
  const currentTier = await resolveMunicipalCoverageTier(scopeContext.cityMunicipality);
  if (isMunicipalCoverageTierAtLeast(currentTier.id, requiredTierId)) return true;

  const requiredTier = normalizeMunicipalCoverageTier(requiredTierId);
  res.status(403).json({
    error: {
      message: `${featureLabel} requires ${requiredTier.label} or higher. Current tier: ${currentTier.label}.`,
      code: 'TIER_FORBIDDEN',
      requiredTierId: requiredTier.id,
      currentTierId: currentTier.id,
    },
  });
  return false;
}

async function enforceStarterTierLimit(cityMunicipality) {
  const cityRegex = buildExactMatchRegex(cityMunicipality);
  if (!cityRegex) return null;
  const latestApproved = await MunicipalOnboardingRequest.findOne({
    cityMunicipality: cityRegex,
    status: 'approved',
  })
    .sort({ createdAt: -1 })
    .lean();
  if (!latestApproved || !isStarterTier(latestApproved.pricingTier)) return null;

  const count = await HealthCenter.countDocuments({
    cityMunicipality: cityRegex,
    status: { $in: BARANGAY_STATUSES },
  });
  if (count < MUNICIPAL_STARTER_BRGY_LIMIT) return null;
  return {
    limit: MUNICIPAL_STARTER_BRGY_LIMIT,
    count,
    tier: latestApproved.pricingTier || 'Starter Coverage',
    city: latestApproved.cityMunicipality || String(cityMunicipality).trim(),
  };
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

function buildBlockchainArchiveFilter(scope = 'active') {
  const normalized = String(scope ?? 'active').trim().toLowerCase();
  if (normalized === 'archived') {
    return { archivedAt: { $ne: null } };
  }
  if (normalized === 'all') {
    return {};
  }
  return { archivedAt: null };
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

function resolveEmail(doc) {
  return resolvePiiField({ encrypted: doc?.emailEncrypted, fallback: doc?.email, field: 'email' });
}

function resolveContactNumber(doc) {
  return resolvePiiField({ encrypted: doc?.contactNumberEncrypted, fallback: doc?.contactNumber, field: 'contactNumber' });
}

function resolveAddress(doc) {
  return resolvePiiField({ encrypted: doc?.addressEncrypted, fallback: doc?.address, field: 'address' });
}

function resolveOfficialContact(doc) {
  return resolvePiiField({
    encrypted: doc?.officialContactInfoEncrypted,
    fallback: doc?.officialContactInfo,
    field: 'officialContactInfo',
  });
}

function resolveHolderName(doc) {
  return resolvePiiField({ encrypted: doc?.holderNameEncrypted, fallback: doc?.holderName, field: 'holderName' });
}

async function notifyProviderOnboarding({ req, provider, temporaryPassword = '' }) {
  const providerEmail = resolveEmail(provider);
  const notification = await deliverProviderOnboardingNotification({
    email: providerEmail,
    barangayName: provider.barangayName,
    cityMunicipality: provider.cityMunicipality,
    healthCenterName: provider.healthCenterName,
    status: provider.status,
    loginEmail: providerEmail,
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

function buildQueuedBlockchainIdentityPayload() {
  return {
    identityId: '',
    verificationStatus: 'pending',
    txId: '',
  };
}

export async function registerAdmin(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: { message: 'email and password are required' } });
  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.ok) return res.status(400).json({ error: { message: passwordCheck.message } });

  const emailFields = buildEmailFields(email);
  const normalizedEmail = emailFields.normalized;
  let existing = await Admin.findOne({ emailHash: emailFields.hash }).lean();
  if (!existing && normalizedEmail) {
    existing = await Admin.findOne({ email: normalizedEmail }).lean();
  }
  if (existing) return res.status(409).json({ error: { message: 'Admin email already exists' } });

  const admin = await Admin.create({
    email: normalizedEmail,
    emailHash: emailFields.hash,
    emailEncrypted: emailFields.encrypted,
    passwordHash: await hashPassword(String(password)),
    scope: 'global',
    cityMunicipality: '',
  });

  const token = signAdminToken({ adminId: admin._id });
  await writeAuditLog({ req, action: 'ADMIN.REGISTER', entityType: 'Admin', entityId: admin._id });
  return res.status(201).json({
    accessToken: token,
    admin: {
      id: admin._id,
      email: resolveEmail(admin),
      scope: admin.scope ?? 'global',
      cityMunicipality: admin.cityMunicipality ?? '',
    },
  });
}

export async function loginAdmin(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });

  const emailFields = buildEmailFields(email);
  const normalizedEmail = emailFields.normalized;
  let admin = await Admin.findOne({ emailHash: emailFields.hash });
  if (!admin && normalizedEmail) {
    admin = await Admin.findOne({ email: normalizedEmail });
  }
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

  if (!admin.emailHash || !admin.emailEncrypted) {
    admin.emailHash = emailFields.hash;
    admin.emailEncrypted = emailFields.encrypted;
    admin.email = normalizedEmail;
    await admin.save();
  }

  const token = signAdminToken({ adminId: admin._id });
  await writeAuditLog({ req, action: 'ADMIN.LOGIN', entityType: 'Admin', entityId: admin._id });

  const isMunicipal = String(admin.scope ?? '').trim().toLowerCase() === 'municipal';
  const coverageTier = isMunicipal ? await resolveMunicipalCoverageTier(admin.cityMunicipality) : null;
  return res.json({
    accessToken: token,
    admin: {
      id: admin._id,
      email: resolveEmail(admin),
      scope: admin.scope ?? 'global',
      cityMunicipality: admin.cityMunicipality ?? '',
      ...(coverageTier
        ? {
            coverageTierId: coverageTier.id,
            coverageTierLabel: coverageTier.label,
          }
        : {}),
    },
  });
}

export async function updateMyAdminPassword(req, res) {
  const adminId = req.context?.adminId;
  if (!adminId) {
    return res.status(401).json({ error: { message: 'Admin authentication is required' } });
  }

  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: { message: 'currentPassword and newPassword are required' } });
  }

  const admin = await Admin.findById(adminId);
  if (!admin) {
    return res.status(401).json({ error: { message: 'Admin account not found' } });
  }

  const ok = await verifyPassword(String(currentPassword), admin.passwordHash);
  if (!ok) {
    await writeAuditLog({
      req,
      action: 'ADMIN.PASSWORD.UPDATE_SELF',
      entityType: 'Admin',
      entityId: admin._id,
      outcome: 'failure',
      reason: 'Invalid current password',
    });
    return res.status(400).json({ error: { message: 'Current password is incorrect' } });
  }

  const passwordCheck = validatePasswordPolicy(newPassword);
  if (!passwordCheck.ok) {
    return res.status(400).json({ error: { message: passwordCheck.message } });
  }

  admin.passwordHash = await hashPassword(String(newPassword));
  await admin.save();

  await writeAuditLog({
    req,
    action: 'ADMIN.PASSWORD.UPDATE_SELF',
    entityType: 'Admin',
    entityId: admin._id,
    outcome: 'success',
  });

  return res.json({ ok: true });
}

export async function adminCreateHealthCenter(req, res) {
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;

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
    status = 'active',
    // Backward-compatible fields
    name = '',
    holderName = '',
    address = '',
  } = req.body ?? {};

  const onboardingStatus = normalizeBarangayStatus(status, 'active');
  if (!email || !password || !barangayName || !cityMunicipality || !healthCenterName || !officialContactInfo) {
    return res.status(400).json({
      error: {
        message:
          'email, password, barangayName, cityMunicipality, healthCenterName, and officialContactInfo are required',
      },
    });
  }
  if (scopeContext.scope === 'municipal' && !isSameCity(cityMunicipality, scopeContext.cityMunicipality)) {
    return res.status(403).json({
      error: { message: 'Municipal admins can only create providers within their city/municipality' },
    });
  }

  const starterLimit = await enforceStarterTierLimit(String(cityMunicipality).trim());
  if (starterLimit) {
    return res.status(403).json({
      error: {
        message: `${starterLimit.tier} allows up to ${starterLimit.limit} barangay accounts in ${starterLimit.city}. Current count: ${starterLimit.count}.`,
        code: 'TIER_LIMIT_REACHED',
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

  const emailFields = buildEmailFields(email);
  const normalizedEmail = emailFields.normalized;
  const existingAccount = await findExistingAdminOrProviderByEmail(emailFields);
  if (existingAccount) {
    return res.status(409).json({ error: { message: buildAdminOrProviderEmailConflictMessage(existingAccount) } });
  }

  const assignedProviders = sanitizeAssignedProviders(assignedHealthcareProviders);
  const normalizedBarangayName = String(barangayName).trim();
  const normalizedHealthCenterName = String(healthCenterName).trim();
  const displayName = String(name || `${normalizedBarangayName} - ${normalizedHealthCenterName}`).trim();
  const contactFields = buildPhoneFields(contactNumber);
  const normalizedAddress = normalizeText(address || cityMunicipality);
  const normalizedOfficialContact = normalizeText(officialContactInfo);
  const normalizedHolderName = normalizeText(holderName || normalizedBarangayName);

  const hc = await HealthCenter.create({
    email: '',
    emailHash: emailFields.hash,
    emailEncrypted: emailFields.encrypted,
    passwordHash: await hashPassword(String(password)),
    name: displayName,
    barangayName: normalizedBarangayName,
    cityMunicipality: String(cityMunicipality).trim(),
    healthCenterName: normalizedHealthCenterName,
    officialContactInfo: '',
    officialContactInfoEncrypted: encryptPiiValue(normalizedOfficialContact, 'officialContactInfo'),
    geoLocation: {
      latitude: lat,
      longitude: lng,
    },
    assignedHealthcareProviders: assignedProviders,
    holderName: '',
    holderNameEncrypted: encryptPiiValue(normalizedHolderName, 'holderName'),
    address: '',
    addressEncrypted: encryptPiiValue(normalizedAddress, 'address'),
    contactNumber: '',
    contactNumberEncrypted: contactFields.encrypted,
    status: onboardingStatus,
  });

  await writeAuditLog({
    req,
    action: 'HEALTHCENTER.CREATE',
    entityType: 'HealthCenter',
    entityId: hc._id,
    after: {
      email: normalizedEmail,
      name: hc.name,
      barangayName: hc.barangayName,
      cityMunicipality: hc.cityMunicipality,
      healthCenterName: hc.healthCenterName,
      status: hc.status,
      assignedHealthcareProvidersCount: hc.assignedHealthcareProviders?.length ?? 0,
      blockchainIdentityQueued: true,
      onboardingNotificationQueued: true,
    },
  });

  runDetachedTask(`healthcenter-create:blockchain:${hc._id}`, async () => {
    const { identity } = await ensureBlockchainIdentityForDocument({
      doc: hc,
      subjectType: 'healthcenter',
      uniqueSeed: normalizedEmail,
      walletAddress,
    });
    await writeAuditLog({
      req,
      action: 'HEALTHCENTER.IDENTITY.PROVISION',
      entityType: 'HealthCenter',
      entityId: hc._id,
      after: {
        blockchainIdentityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        txId: identity.txId,
      },
    });
  });

  runDetachedTask(`healthcenter-create:notify:${hc._id}`, async () => {
    await notifyProviderOnboarding({ req, provider: hc, temporaryPassword: String(password) });
  });

  return res.status(201).json({
    healthCenter: {
      id: hc._id,
      email: resolveEmail(hc),
      name: hc.name,
      barangayName: hc.barangayName,
      cityMunicipality: hc.cityMunicipality,
      healthCenterName: hc.healthCenterName,
      officialContactInfo: resolveOfficialContact(hc),
      geoLocation: hc.geoLocation,
      assignedHealthcareProviders: hc.assignedHealthcareProviders,
      status: hc.status,
      holderName: resolveHolderName(hc),
      blockchainIdentity: buildQueuedBlockchainIdentityPayload(),
    },
    notification: QUEUED_PROVIDER_NOTIFICATION,
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
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;

  const { cityRegex, healthCenterIds } = await resolveScopeHealthCenters(scopeContext);
  const healthCenterFilter =
    scopeContext.scope === 'municipal' && cityRegex ? { cityMunicipality: cityRegex } : {};
  const healthCenterIdFilter =
    scopeContext.scope === 'municipal' ? { healthCenterId: { $in: healthCenterIds ?? [] } } : {};

  const now = new Date();
  const activeSessionQuery = {
    ...buildActiveSessionQuery(now),
    ...(scopeContext.scope === 'municipal' ? { healthCenterId: { $in: healthCenterIds ?? [] } } : {}),
  };
  const [patients, providers, activeProviders, pendingProviders, admins, sessions, failedEvents, recentProofs] = await Promise.all([
    Patient.countDocuments(healthCenterIdFilter),
    HealthCenter.countDocuments(healthCenterFilter),
    HealthCenter.countDocuments({ ...healthCenterFilter, status: 'active' }),
    HealthCenter.countDocuments({ ...healthCenterFilter, status: { $in: ['pending', 'verified'] } }),
    scopeContext.scope === 'municipal'
      ? Admin.countDocuments({ status: 'active', scope: 'municipal', cityMunicipality: cityRegex })
      : Admin.countDocuments({ status: 'active' }),
    Session.countDocuments(activeSessionQuery),
    AuditLog.countDocuments(
      applyScopeFilter(
        {
          outcome: 'failure',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        scopeContext.scope === 'municipal' ? healthCenterIdFilter : null
      )
    ),
    BlockchainProofLog.countDocuments(
      scopeContext.scope === 'municipal'
        ? { ...healthCenterIdFilter, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
        : { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ),
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
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;
  const { cityRegex, healthCenterIds } = await resolveScopeHealthCenters(scopeContext);

  const q = String(req.query.q ?? '').trim();
  const role = String(req.query.role ?? '').trim().toLowerCase();
  const status = String(req.query.status ?? '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(req.query.limit ?? 200), 1), 500);

  const patientFilter = {};
  const providerFilter = {};
  const adminFilter = {};

  if (q) {
    const re = buildSafeRegex(q);
    const emailFields = buildEmailFields(q);
    const mrnFields = buildMrnFields(q);
    patientFilter.$or = [
      { firstName: re },
      { lastName: re },
      { emailHash: emailFields.hash },
      { mrnHash: mrnFields.hash },
    ];
    providerFilter.$or = [{ name: re }, { holderName: re }, { emailHash: emailFields.hash }];
    adminFilter.$or = [{ emailHash: emailFields.hash }];
  }

  if (status) {
    if (['pending', 'verified', 'active', 'disabled'].includes(status)) providerFilter.status = status;
    if (status === 'active' || status === 'archived') patientFilter.status = status;
  }

  if (scopeContext.scope === 'municipal') {
    if (cityRegex) {
      providerFilter.cityMunicipality = cityRegex;
    }
    patientFilter.healthCenterId = { $in: healthCenterIds ?? [] };
    adminFilter._id = req.context.adminId;
  }

  const [patients, providers, admins] = await Promise.all([
    role && role !== 'patient'
      ? []
      : Patient.find(patientFilter)
          .select('firstName lastName email emailEncrypted mrn mrnEncrypted status healthCenterId role createdAt updatedAt')
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean(),
    role && role !== 'provider'
      ? []
      : HealthCenter.find(providerFilter)
          .select(
            'name holderName holderNameEncrypted email emailEncrypted role status barangayName cityMunicipality healthCenterName officialContactInfo officialContactInfoEncrypted geoLocation assignedHealthcareProviders createdAt updatedAt'
          )
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean(),
    role && role !== 'admin'
      ? []
      : Admin.find(adminFilter)
          .select('email emailEncrypted role status scope cityMunicipality createdAt updatedAt')
          .sort({ updatedAt: -1 })
          .limit(limit)
          .lean(),
  ]);

  const users = [
    ...patients.map((p) => ({
      id: p._id,
      role: 'patient',
      displayName: `${p.firstName} ${p.lastName}`.trim(),
      email: resolveEmail(p),
      status: p.status ?? 'active',
      credentialStatus: 'approved',
      meta: {
        mrn: resolvePiiField({ encrypted: p.mrnEncrypted, fallback: p.mrn, field: 'mrn' }) || '',
        healthCenterId: p.healthCenterId,
      },
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    ...providers.map((p) => ({
      id: p._id,
      role: 'provider',
      displayName: p.barangayName || p.name,
      email: resolveEmail(p),
      status: p.status,
      // Kept for UI compatibility; values now mirror barangay onboarding status.
      credentialStatus: p.status,
      meta: {
        holderName: resolveHolderName(p),
        providerRole: p.role,
        barangayName: p.barangayName ?? '',
        cityMunicipality: p.cityMunicipality ?? '',
        healthCenterName: p.healthCenterName ?? '',
        officialContactInfo: resolveOfficialContact(p) ?? '',
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
      email: resolveEmail(a),
      status: a.status,
      credentialStatus: 'approved',
      meta: {
        adminScope: a.scope ?? 'global',
        cityMunicipality: a.cityMunicipality ?? '',
      },
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  ];

  return res.json({ users });
}

export async function adminUpsertUser(req, res) {
  const actorId = req.context.adminId;
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;

  const {
    role,
    email,
    password,
    status = 'active',
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
    if (scopeContext.scope === 'municipal' && !isSameCity(cityMunicipality, scopeContext.cityMunicipality)) {
      return res.status(403).json({
        error: { message: 'Municipal admins can only create providers within their city/municipality' },
      });
    }

    const starterLimit = await enforceStarterTierLimit(String(cityMunicipality).trim());
    if (starterLimit) {
      return res.status(403).json({
        error: {
          message: `${starterLimit.tier} allows up to ${starterLimit.limit} barangay accounts in ${starterLimit.city}. Current count: ${starterLimit.count}.`,
          code: 'TIER_LIMIT_REACHED',
        },
      });
    }
    const emailFields = buildEmailFields(email);
    const normalizedEmail = emailFields.normalized;
    const existingAccount = await findExistingAdminOrProviderByEmail(emailFields);
    if (existingAccount) {
      return res.status(409).json({ error: { message: buildAdminOrProviderEmailConflictMessage(existingAccount) } });
    }

    const onboardingStatus = normalizeBarangayStatus(status, 'active');
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

    const contactFields = buildPhoneFields(contactNumber);
    const normalizedAddress = normalizeText(address || cityMunicipality);
    const normalizedOfficialContact = normalizeText(officialContactInfo);
    const normalizedHolderName = normalizeText(holderName || normalizedBarangayName);

    const provider = await HealthCenter.create({
      email: '',
      emailHash: emailFields.hash,
      emailEncrypted: emailFields.encrypted,
      passwordHash: await hashPassword(String(password)),
      name: displayName,
      holderName: '',
      holderNameEncrypted: encryptPiiValue(normalizedHolderName, 'holderName'),
      barangayName: normalizedBarangayName,
      cityMunicipality: String(cityMunicipality).trim(),
      healthCenterName: normalizedHealthCenterName,
      officialContactInfo: '',
      officialContactInfoEncrypted: encryptPiiValue(normalizedOfficialContact, 'officialContactInfo'),
      geoLocation: { latitude: lat, longitude: lng },
      assignedHealthcareProviders: assignedProviders,
      address: '',
      addressEncrypted: encryptPiiValue(normalizedAddress, 'address'),
      contactNumber: '',
      contactNumberEncrypted: contactFields.encrypted,
      status: onboardingStatus,
      role: 'staff',
    });
    await writeAuditLog({
      req,
      action: 'ADMIN.USER.CREATE',
      entityType: 'HealthCenter',
      entityId: provider._id,
      after: {
        email: normalizedEmail,
        status: provider.status,
        barangayName: provider.barangayName,
        blockchainIdentityQueued: true,
        onboardingNotificationQueued: true,
      },
    });

    runDetachedTask(`admin-provider-create:blockchain:${provider._id}`, async () => {
      const { identity } = await ensureBlockchainIdentityForDocument({
        doc: provider,
        subjectType: 'healthcenter',
        uniqueSeed: normalizedEmail,
        walletAddress,
      });
      await writeAuditLog({
        req,
        action: 'ADMIN.USER.IDENTITY.PROVISION',
        entityType: 'HealthCenter',
        entityId: provider._id,
        after: {
          blockchainIdentityId: identity.identityId,
          verificationStatus: identity.verificationStatus,
          txId: identity.txId,
        },
      });
    });

    runDetachedTask(`admin-provider-create:notify:${provider._id}`, async () => {
      await notifyProviderOnboarding({ req, provider, temporaryPassword: String(password) });
    });

    return res.status(201).json({
      user: {
        id: provider._id,
        role: 'provider',
        email: resolveEmail(provider),
        blockchainIdentity: buildQueuedBlockchainIdentityPayload(),
      },
      notification: QUEUED_PROVIDER_NOTIFICATION,
    });
  }

  if (normalizedRole === 'patient') {
    if (scopeContext.scope === 'municipal' && healthCenterId) {
      const cityRegex = buildExactMatchRegex(scopeContext.cityMunicipality);
      const allowedCenter = await HealthCenter.findOne({ _id: healthCenterId, cityMunicipality: cityRegex }).select('_id').lean();
      if (!allowedCenter) {
        return res.status(403).json({
          error: { message: 'Municipal admins can only create patients within their city/municipality' },
        });
      }
    }
    if (!healthCenterId || !firstName || !lastName || !middleInitial) {
      return res.status(400).json({ error: { message: 'healthCenterId, firstName, lastName, middleInitial are required for patient' } });
    }
    const hc = await HealthCenter.findById(healthCenterId).lean();
    if (!hc) return res.status(404).json({ error: { message: 'Health center not found' } });

    const emailFields = buildEmailFields(email);
    const normalizedEmail = emailFields.normalized;
    let existing = await Patient.findOne({ healthCenterId, emailHash: emailFields.hash }).lean();
    if (!existing && normalizedEmail) {
      existing = await Patient.findOne({ healthCenterId, email: normalizedEmail }).lean();
    }
    if (existing) return res.status(409).json({ error: { message: 'Patient email already exists in this health center' } });

    const contactFields = buildPhoneFields(contactNumber);
    const mrnFields = buildMrnFields(mrn);
    const normalizedAddress = normalizeText(address);

    const patient = await Patient.create({
      healthCenterId,
      mrn: '',
      mrnHash: mrnFields.hash,
      mrnEncrypted: mrnFields.encrypted,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      middleInitial: String(middleInitial).trim().slice(0, 1),
      email: '',
      emailHash: emailFields.hash,
      emailEncrypted: emailFields.encrypted,
      passwordHash: await hashPassword(String(password)),
      address: '',
      addressEncrypted: encryptPiiValue(normalizedAddress, 'address'),
      contactNumber: '',
      contactNumberHash: contactFields.hash,
      contactNumberEncrypted: contactFields.encrypted,
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
      after: {
        email: normalizedEmail,
        healthCenterId: patient.healthCenterId,
        status: patient.status,
        blockchainIdentityQueued: true,
      },
    });
    runDetachedTask(`admin-patient-create:blockchain:${patient._id}`, async () => {
      const { identity } = await ensureBlockchainIdentityForDocument({
        doc: patient,
        subjectType: 'patient',
        uniqueSeed: normalizedEmail,
        walletAddress,
        healthCenterId: patient.healthCenterId,
      });
      await writeAuditLog({
        req,
        action: 'ADMIN.USER.IDENTITY.PROVISION',
        entityType: 'Patient',
        entityId: patient._id,
        after: {
          blockchainIdentityId: identity.identityId,
          verificationStatus: identity.verificationStatus,
          txId: identity.txId,
        },
      });
    });
    return res.status(201).json({
      user: {
        id: patient._id,
        role: 'patient',
        email: resolveEmail(patient),
        blockchainIdentity: buildQueuedBlockchainIdentityPayload(),
      },
    });
  }

  if (scopeContext.scope === 'municipal') {
    return res.status(403).json({ error: { message: 'Municipal admins cannot create other admin accounts' } });
  }

  const emailFields = buildEmailFields(email);
  const normalizedEmail = emailFields.normalized;
  const existingAccount = await findExistingAdminOrProviderByEmail(emailFields);
  if (existingAccount) {
    return res.status(409).json({ error: { message: buildAdminOrProviderEmailConflictMessage(existingAccount) } });
  }
  const requestedScope = String(req.body?.adminScope ?? req.body?.scope ?? 'global').trim().toLowerCase();
  const adminScope = requestedScope === 'municipal' ? 'municipal' : 'global';
  const adminCityMunicipality =
    adminScope === 'municipal' ? String(req.body?.adminCityMunicipality ?? req.body?.cityMunicipality ?? '').trim() : '';
  if (adminScope === 'municipal' && !adminCityMunicipality) {
    return res.status(400).json({ error: { message: 'cityMunicipality is required for municipal admins' } });
  }

  const admin = await Admin.create({
    email: normalizedEmail,
    emailHash: emailFields.hash,
    emailEncrypted: emailFields.encrypted,
    passwordHash: await hashPassword(String(password)),
    status: status === 'disabled' ? 'disabled' : 'active',
    role: 'admin',
    scope: adminScope,
    cityMunicipality: adminCityMunicipality,
  });
  await writeAuditLog({
    req,
    action: 'ADMIN.USER.CREATE',
    entityType: 'Admin',
    entityId: admin._id,
    after: { email: normalizedEmail, status: admin.status, scope: admin.scope, cityMunicipality: admin.cityMunicipality },
  });
  return res.status(201).json({
    user: {
      id: admin._id,
      role: 'admin',
      email: resolveEmail(admin),
      scope: admin.scope,
      cityMunicipality: admin.cityMunicipality,
    },
  });
}

export async function adminUpdateUser(req, res) {
  const { userRole, userId } = req.params;
  const role = String(userRole ?? '').toLowerCase();
  const patch = req.body ?? {};
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;

  if (!['patient', 'provider', 'admin'].includes(role)) {
    return res.status(400).json({ error: { message: 'userRole must be patient, provider, or admin' } });
  }

  if (role === 'provider') {
    if (scopeContext.scope === 'municipal') {
      const provider = await HealthCenter.findById(userId).select('cityMunicipality').lean();
      if (!provider) return res.status(404).json({ error: { message: 'Provider not found' } });
      if (!isSameCity(provider.cityMunicipality, scopeContext.cityMunicipality)) {
        return res.status(403).json({ error: { message: 'Provider is outside your city/municipality scope' } });
      }
      if ('cityMunicipality' in patch && !isSameCity(patch.cityMunicipality, scopeContext.cityMunicipality)) {
        return res.status(403).json({ error: { message: 'Providers cannot be reassigned outside your city/municipality scope' } });
      }
    }
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
    if ('email' in update) {
      const emailFields = buildEmailFields(update.email);
      const existingAccount = await findExistingAdminOrProviderByEmail(emailFields, { excludeProviderId: userId });
      if (existingAccount) {
        return res.status(409).json({ error: { message: buildAdminOrProviderEmailConflictMessage(existingAccount) } });
      }
      update.email = '';
      update.emailHash = emailFields.hash;
      update.emailEncrypted = emailFields.encrypted;
    }
    if ('contactNumber' in update) {
      const contactFields = buildPhoneFields(update.contactNumber);
      update.contactNumber = '';
      update.contactNumberEncrypted = contactFields.encrypted;
    }
    if ('address' in update) {
      const normalized = normalizeText(update.address);
      update.address = '';
      update.addressEncrypted = encryptPiiValue(normalized, 'address');
    }
    if ('holderName' in update) {
      const normalized = normalizeText(update.holderName);
      update.holderName = '';
      update.holderNameEncrypted = encryptPiiValue(normalized, 'holderName');
    }
    if ('officialContactInfo' in update) {
      const normalized = normalizeText(update.officialContactInfo);
      update.officialContactInfo = '';
      update.officialContactInfoEncrypted = encryptPiiValue(normalized, 'officialContactInfo');
    }
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
    return res.json({
      user: {
        id: doc._id,
        role: 'provider',
        email: resolveEmail(doc),
        status: doc.status,
        credentialStatus: doc.status,
      },
    });
  }

  if (role === 'patient') {
    if (scopeContext.scope === 'municipal') {
      const patient = await Patient.findById(userId).select('healthCenterId').lean();
      if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });
      const cityRegex = buildExactMatchRegex(scopeContext.cityMunicipality);
      const allowedCenter = await HealthCenter.findOne({ _id: patient.healthCenterId, cityMunicipality: cityRegex }).select('_id').lean();
      if (!allowedCenter) {
        return res.status(403).json({ error: { message: 'Patient is outside your city/municipality scope' } });
      }
    }
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
    if ('email' in update) {
      const emailFields = buildEmailFields(update.email);
      update.email = '';
      update.emailHash = emailFields.hash;
      update.emailEncrypted = emailFields.encrypted;
    }
    if ('contactNumber' in update) {
      const contactFields = buildPhoneFields(update.contactNumber);
      update.contactNumber = '';
      update.contactNumberHash = contactFields.hash;
      update.contactNumberEncrypted = contactFields.encrypted;
    }
    if ('address' in update) {
      const normalized = normalizeText(update.address);
      update.address = '';
      update.addressEncrypted = encryptPiiValue(normalized, 'address');
    }
    if ('guardianName' in update) {
      const normalized = normalizeText(update.guardianName);
      update.guardianName = '';
      update.guardianNameEncrypted = encryptPiiValue(normalized, 'guardianName');
    }
    if ('emergencyContactName' in update) {
      const normalized = normalizeText(update.emergencyContactName);
      update.emergencyContactName = '';
      update.emergencyContactNameEncrypted = encryptPiiValue(normalized, 'emergencyContactName');
    }
    if ('emergencyContactPhone' in update) {
      const normalized = normalizeText(update.emergencyContactPhone);
      update.emergencyContactPhone = '';
      update.emergencyContactPhoneEncrypted = encryptPiiValue(normalized, 'emergencyContactPhone');
    }
    const doc = await Patient.findByIdAndUpdate(
      userId,
      { $set: { ...update, updatedByActorType: 'admin', updatedByActorId: req.context.adminId } },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) return res.status(404).json({ error: { message: 'Patient not found' } });
    await writeAuditLog({ req, action: 'ADMIN.USER.UPDATE', entityType: 'Patient', entityId: doc._id, after: update });
    return res.json({ user: { id: doc._id, role: 'patient', email: resolveEmail(doc), status: doc.status } });
  }

  if (scopeContext.scope === 'municipal') {
    return res.status(403).json({ error: { message: 'Municipal admins cannot update other admin accounts' } });
  }

  const allowed = ['email', 'status'];
  const update = {};
  for (const k of allowed) if (k in patch) update[k] = patch[k];
  if ('scope' in patch || 'adminScope' in patch || 'cityMunicipality' in patch || 'adminCityMunicipality' in patch) {
    const requestedScope = String(patch.adminScope ?? patch.scope ?? '').trim().toLowerCase();
    if (requestedScope) {
      update.scope = requestedScope === 'municipal' ? 'municipal' : 'global';
      update.cityMunicipality =
        update.scope === 'municipal'
          ? String(patch.adminCityMunicipality ?? patch.cityMunicipality ?? '').trim()
          : '';
      if (update.scope === 'municipal' && !update.cityMunicipality) {
        return res.status(400).json({ error: { message: 'cityMunicipality is required for municipal admins' } });
      }
    }
  }
  if ('email' in update) {
    const emailFields = buildEmailFields(update.email);
    const existingAccount = await findExistingAdminOrProviderByEmail(emailFields, { excludeAdminId: userId });
    if (existingAccount) {
      return res.status(409).json({ error: { message: buildAdminOrProviderEmailConflictMessage(existingAccount) } });
    }
    update.email = emailFields.normalized;
    update.emailHash = emailFields.hash;
    update.emailEncrypted = emailFields.encrypted;
  }
  const doc = await Admin.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true }).lean();
  if (!doc) return res.status(404).json({ error: { message: 'Admin not found' } });
  await writeAuditLog({ req, action: 'ADMIN.USER.UPDATE', entityType: 'Admin', entityId: doc._id, after: update });
  return res.json({ user: { id: doc._id, role: 'admin', email: resolveEmail(doc), status: doc.status } });
}

export async function approveProviderCredentials(req, res) {
  const { providerId } = req.params;
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;

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
  if (scopeContext.scope === 'municipal') {
    const providerSnapshot = await HealthCenter.findById(providerId).select('cityMunicipality').lean();
    if (!providerSnapshot) return res.status(404).json({ error: { message: 'Provider not found' } });
    if (!isSameCity(providerSnapshot.cityMunicipality, scopeContext.cityMunicipality)) {
      return res.status(403).json({ error: { message: 'Provider is outside your city/municipality scope' } });
    }
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
      email: resolveEmail(provider),
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
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;
  if (!(await ensureMunicipalCoverageTier(scopeContext, 'citywide', res, 'System logs'))) return;
  const { healthCenterIds } = await resolveScopeHealthCenters(scopeContext);

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

  const scopeFilter =
    scopeContext.scope === 'municipal'
      ? {
          $or: [
            { healthCenterId: { $in: healthCenterIds ?? [] } },
            { actorType: 'admin', actorId: req.context.adminId },
          ],
        }
      : null;
  const scopedFilter = applyScopeFilter(filter, scopeFilter);

  const total = await AuditLog.countDocuments(scopedFilter);
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;

  const [logs, suspiciousCount] = await Promise.all([
    AuditLog.find(scopedFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments({
      $and: [
        scopedFilter,
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
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;
  if (!(await ensureMunicipalCoverageTier(scopeContext, 'citywide', res, 'System monitoring'))) return;
  const { healthCenterIds } = await resolveScopeHealthCenters(scopeContext);

  const now = new Date();
  const activeSessionQuery = {
    ...buildActiveSessionQuery(now),
    ...(scopeContext.scope === 'municipal' ? { healthCenterId: { $in: healthCenterIds ?? [] } } : {}),
  };
  const auditScopeFilter =
    scopeContext.scope === 'municipal'
      ? {
          $or: [
            { healthCenterId: { $in: healthCenterIds ?? [] } },
            { actorType: 'admin', actorId: req.context.adminId },
          ],
        }
      : null;
  const [activeSessions, totalSessions24h, failed24h, alerts24h, recentAudit, cfg] = await Promise.all([
    Session.countDocuments(activeSessionQuery),
    Session.countDocuments(
      scopeContext.scope === 'municipal'
        ? { startedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, healthCenterId: { $in: healthCenterIds ?? [] } }
        : { startedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    ),
    AuditLog.countDocuments(
      applyScopeFilter(
        { outcome: 'failure', createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        auditScopeFilter
      )
    ),
    AuditLog.countDocuments(
      applyScopeFilter(
        { action: { $in: ['ALERT.GENERATED', 'RECORD.VERIFY'] }, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        auditScopeFilter
      )
    ),
    AuditLog.find(applyScopeFilter({}, auditScopeFilter)).sort({ createdAt: -1 }).limit(20).lean(),
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
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;
  if (!(await ensureMunicipalCoverageTier(scopeContext, 'enterprise', res, 'Blockchain supervision'))) return;
  const { healthCenterIds } = await resolveScopeHealthCenters(scopeContext);

  const scope = String(req.query?.scope ?? 'active').trim().toLowerCase() || 'active';
  const limit = Math.min(Math.max(Number(req.query?.limit ?? 50), 1), 200);
  const archiveFilter = buildBlockchainArchiveFilter(scope);
  const healthCenterFilter =
    scopeContext.scope === 'municipal' ? { healthCenterId: { $in: healthCenterIds ?? [] } } : {};
  const recentWindow = { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } };

  const [proofs24h, failed24h, byKind, byStatus, recent, activeLogCount, archivedLogCount] = await Promise.all([
    BlockchainProofLog.countDocuments({ ...archiveFilter, ...healthCenterFilter, ...recentWindow }),
    BlockchainProofLog.countDocuments({ ...archiveFilter, ...healthCenterFilter, status: 'failed', ...recentWindow }),
    BlockchainProofLog.aggregate([
      { $match: { ...archiveFilter, ...healthCenterFilter } },
      { $group: { _id: '$kind', count: { $sum: 1 } } },
    ]),
    BlockchainProofLog.aggregate([
      { $match: { ...archiveFilter, ...healthCenterFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    BlockchainProofLog.find({ ...archiveFilter, ...healthCenterFilter }).sort({ createdAt: -1 }).limit(limit).lean(),
    BlockchainProofLog.countDocuments({ ...healthCenterFilter, archivedAt: null }),
    BlockchainProofLog.countDocuments({ ...healthCenterFilter, archivedAt: { $ne: null } }),
  ]);

  return res.json({
    overview: {
      scope,
      proofs24h,
      failed24h,
      activeLogCount,
      archivedLogCount,
      byKind,
      byStatus,
    },
    recent,
  });
}

export async function getBlockchainMetrics(req, res) {
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;
  if (!(await ensureMunicipalCoverageTier(scopeContext, 'enterprise', res, 'Blockchain supervision'))) return;
  const { healthCenterIds } = await resolveScopeHealthCenters(scopeContext);

  const days = Math.min(Math.max(Number(req.query?.days ?? 7), 1), 30);
  const scope = String(req.query?.scope ?? 'active').trim().toLowerCase() || 'active';
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const archiveFilter = buildBlockchainArchiveFilter(scope);
  const healthCenterFilter =
    scopeContext.scope === 'municipal' ? { healthCenterId: { $in: healthCenterIds ?? [] } } : {};

  const [byStatus, byKind, dailyRaw] = await Promise.all([
    BlockchainProofLog.aggregate([
      { $match: { ...archiveFilter, ...healthCenterFilter, createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    BlockchainProofLog.aggregate([
      { $match: { ...archiveFilter, ...healthCenterFilter, createdAt: { $gte: since } } },
      { $group: { _id: '$kind', count: { $sum: 1 } } },
    ]),
    BlockchainProofLog.aggregate([
      { $match: { ...archiveFilter, ...healthCenterFilter, createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            day: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'UTC',
              },
            },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]),
  ]);

  const statusCounts = { success: 0, failed: 0, skipped: 0 };
  byStatus.forEach((entry) => {
    const key = String(entry?._id ?? '').trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(statusCounts, key)) return;
    statusCounts[key] = Number(entry?.count ?? 0);
  });

  const totalProofs = statusCounts.success + statusCounts.failed + statusCounts.skipped;
  const successRatePct = totalProofs > 0 ? Math.round((statusCounts.success / totalProofs) * 1000) / 10 : 0;

  const dayMap = new Map();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(Date.now() - offset * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    dayMap.set(day, {
      day,
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
    });
  }

  dailyRaw.forEach((entry) => {
    const day = String(entry?._id?.day ?? '').trim();
    const status = String(entry?._id?.status ?? '').trim().toLowerCase();
    const count = Number(entry?.count ?? 0);
    const bucket = dayMap.get(day);
    if (!bucket) return;

    bucket.total += count;
    if (status === 'success' || status === 'failed' || status === 'skipped') {
      bucket[status] += count;
    }
  });

  const daily = Array.from(dayMap.values());
  const avgProofsPerDay = daily.length > 0
    ? Math.round((daily.reduce((sum, row) => sum + row.total, 0) / daily.length) * 10) / 10
    : 0;

  return res.json({
    metrics: {
      days,
      scope,
      totals: {
        proofs: totalProofs,
        byStatus: statusCounts,
        successRatePct,
      },
      byKind,
      daily,
      avgProofsPerDay,
    },
  });
}

export async function archiveBlockchainLogs(req, res) {
  const scopeContext = resolveAdminScopeContext(req);
  if (!ensureMunicipalScope(scopeContext, res)) return;
  if (!(await ensureMunicipalCoverageTier(scopeContext, 'enterprise', res, 'Blockchain supervision'))) return;
  const { healthCenterIds } = await resolveScopeHealthCenters(scopeContext);

  const requestedIds = Array.from(new Set((req.body?.logIds ?? []).map((value) => String(value).trim()).filter(Boolean)));
  if (requestedIds.length === 0) {
    return res.status(400).json({ error: { message: 'At least one blockchain log is required' } });
  }

  if (scopeContext.scope === 'municipal') {
    const allowedCount = await BlockchainProofLog.countDocuments({
      _id: { $in: requestedIds },
      healthCenterId: { $in: healthCenterIds ?? [] },
    });
    if (allowedCount !== requestedIds.length) {
      return res.status(403).json({ error: { message: 'Some blockchain logs are outside your city/municipality scope' } });
    }
  }

  const archivableLogs = await BlockchainProofLog.find({
    _id: { $in: requestedIds },
    archivedAt: null,
  })
    .select('_id')
    .lean();

  if (archivableLogs.length === 0) {
    return res.json({ archivedCount: 0 });
  }

  const archiveIds = archivableLogs.map((entry) => entry._id);
  const archivedAt = new Date();
  await BlockchainProofLog.updateMany(
    { _id: { $in: archiveIds }, archivedAt: null },
    {
      $set: {
        archivedAt,
        archivedByAdminId: req.context.adminId,
      },
    }
  );

  await writeAuditLog({
    req,
    action: 'ADMIN.BLOCKCHAIN.LOGS.ARCHIVE',
    entityType: 'BlockchainProofLog',
    entityId: null,
    after: {
      count: archiveIds.length,
      archivedAt,
    },
  });

  return res.json({
    archivedCount: archiveIds.length,
    archivedAt,
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
