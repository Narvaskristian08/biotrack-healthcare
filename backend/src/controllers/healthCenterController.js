import { HealthCenter } from '../models/HealthCenter.js';
import { signHealthCenterToken, verifyPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';
import { ensureBlockchainIdentityForDocument, verifyBlockchainIdentity } from '../services/blockchain/identity.service.js';
import { blockchainEnabled, blockchainStrictMode } from '../services/blockchain/client.js';
import {
  buildEmailFields,
  buildPhoneFields,
  encryptPiiValue,
  normalizeText,
  resolvePiiField,
} from '../services/pii.service.js';

const GENERIC_LOGIN_ERROR = 'Invalid credentials';
const PROVIDER_PROFILE_SELECT = [
  'email',
  'emailEncrypted',
  'name',
  'holderName',
  'holderNameEncrypted',
  'status',
  'barangayName',
  'cityMunicipality',
  'healthCenterName',
  'officialContactInfo',
  'officialContactInfoEncrypted',
  'address',
  'addressEncrypted',
  'contactNumber',
  'contactNumberEncrypted',
  'updatedAt',
].join(' ');

function resolveEmail(doc) {
  return resolvePiiField({ encrypted: doc?.emailEncrypted, fallback: doc?.email, field: 'email' });
}

function resolveHolderName(doc) {
  return resolvePiiField({ encrypted: doc?.holderNameEncrypted, fallback: doc?.holderName, field: 'holderName' });
}

function resolveOfficialContact(doc) {
  return resolvePiiField({
    encrypted: doc?.officialContactInfoEncrypted,
    fallback: doc?.officialContactInfo,
    field: 'officialContactInfo',
  });
}

function resolveAddress(doc) {
  return resolvePiiField({ encrypted: doc?.addressEncrypted, fallback: doc?.address, field: 'address' });
}

function resolveContactNumber(doc) {
  return resolvePiiField({ encrypted: doc?.contactNumberEncrypted, fallback: doc?.contactNumber, field: 'contactNumber' });
}

function buildProviderProfilePayload(doc) {
  if (!doc) return null;
  return {
    id: doc._id,
    email: resolveEmail(doc),
    name: String(doc.name ?? '').trim(),
    holderName: resolveHolderName(doc),
    status: String(doc.status ?? '').trim(),
    barangayName: String(doc.barangayName ?? '').trim(),
    cityMunicipality: String(doc.cityMunicipality ?? '').trim(),
    healthCenterName: String(doc.healthCenterName ?? '').trim(),
    officialContactInfo: resolveOfficialContact(doc),
    address: resolveAddress(doc),
    contactNumber: resolveContactNumber(doc),
    updatedAt: doc.updatedAt ?? null,
  };
}

export async function registerHealthCenter(req, res) {
  await writeAuditLog({
    req,
    action: 'HEALTHCENTER.SELF_REGISTER.BLOCKED',
    entityType: 'HealthCenter',
    outcome: 'failure',
    reason: 'Self registration is disabled; admin onboarding is required.',
  });
  return res.status(403).json({
    error: {
      message:
        'Official barangay onboarding is admin-managed. Please contact your system administrator.',
      code: 'BARANGAY_SELF_REGISTRATION_DISABLED',
    },
  });
}

export async function loginHealthCenter(req, res) {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });

  const emailFields = buildEmailFields(email);
  const normalizedEmail = emailFields.normalized;
  let hc = await HealthCenter.findOne({ emailHash: emailFields.hash });
  if (!hc && normalizedEmail) {
    hc = await HealthCenter.findOne({ email: normalizedEmail });
  }
  if (!hc) return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });

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
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  if (hc.status !== 'active') {
    await writeAuditLog({
      req,
      action: 'HEALTHCENTER.LOGIN',
      entityType: 'HealthCenter',
      entityId: hc._id,
      outcome: 'failure',
      reason: `Inactive status: ${hc.status}`,
    });
    return res.status(401).json({ error: { message: GENERIC_LOGIN_ERROR } });
  }

  if (!hc.emailHash || !hc.emailEncrypted) {
    hc.emailHash = emailFields.hash;
    hc.emailEncrypted = emailFields.encrypted;
    hc.email = '';
    await hc.save();
  }

  const resolvedEmail = resolveEmail(hc) || normalizedEmail;

  const { identity } = await ensureBlockchainIdentityForDocument({
    doc: hc,
    subjectType: 'healthcenter',
    uniqueSeed: resolvedEmail,
  });
  const identityVerification = await verifyBlockchainIdentity(identity, {
    subjectType: 'healthcenter',
    subjectId: hc._id,
  });

  if (blockchainEnabled() && blockchainStrictMode() && identityVerification.onChain && !identityVerification.verified) {
    await writeAuditLog({
      req,
      action: 'HEALTHCENTER.LOGIN',
      entityType: 'HealthCenter',
      entityId: hc._id,
      outcome: 'failure',
      reason: 'Blockchain identity verification failed',
      after: {
        identityId: identity.identityId,
        verificationReason: identityVerification.reason,
      },
    });
    return res.status(403).json({
      error: {
        message: 'Blockchain identity verification failed for this account.',
        code: 'BLOCKCHAIN_IDENTITY_NOT_VERIFIED',
      },
    });
  }

  const token = signHealthCenterToken({ healthCenterId: hc._id });
  await writeAuditLog({
    req,
    action: 'HEALTHCENTER.LOGIN',
    entityType: 'HealthCenter',
    entityId: hc._id,
    outcome: 'success',
  });

  return res.json({
    accessToken: token,
    healthCenter: {
      id: hc._id,
      email: resolvedEmail,
      name: hc.name,
      barangayName: hc.barangayName,
      cityMunicipality: hc.cityMunicipality,
      healthCenterName: hc.healthCenterName,
      officialContactInfo: resolveOfficialContact(hc),
      status: hc.status,
      holderName: resolveHolderName(hc),
      blockchainIdentity: {
        identityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        verified: identityVerification.verified,
        onChain: identityVerification.onChain,
      },
    },
  });
}

export async function getMyHealthCenterProfile(req, res) {
  const healthCenterId = String(req.context?.healthCenterId ?? '').trim();
  if (!healthCenterId) {
    return res.status(401).json({ error: { message: 'Provider session is required' } });
  }

  const doc = await HealthCenter.findById(healthCenterId).select(PROVIDER_PROFILE_SELECT).lean();
  if (!doc) {
    return res.status(404).json({ error: { message: 'Provider not found' } });
  }

  return res.json({
    healthCenter: buildProviderProfilePayload(doc),
  });
}

export async function updateMyHealthCenterProfile(req, res) {
  const healthCenterId = String(req.context?.healthCenterId ?? '').trim();
  if (!healthCenterId) {
    return res.status(401).json({ error: { message: 'Provider session is required' } });
  }

  const patch = req.body ?? {};
  const allowed = ['name', 'holderName', 'healthCenterName', 'officialContactInfo', 'address', 'contactNumber'];
  const update = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      update[key] = String(patch[key] ?? '').trim();
    }
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: { message: 'At least one profile field is required' } });
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
  if ('address' in update) {
    const normalized = normalizeText(update.address);
    update.address = '';
    update.addressEncrypted = encryptPiiValue(normalized, 'address');
  }
  if ('contactNumber' in update) {
    const contactFields = buildPhoneFields(update.contactNumber);
    update.contactNumber = '';
    update.contactNumberEncrypted = contactFields.encrypted;
  }

  const doc = await HealthCenter.findByIdAndUpdate(
    healthCenterId,
    { $set: update },
    { new: true, runValidators: true }
  )
    .select(PROVIDER_PROFILE_SELECT)
    .lean();

  if (!doc) {
    return res.status(404).json({ error: { message: 'Provider not found' } });
  }

  await writeAuditLog({
    req,
    action: 'HEALTHCENTER.SELF.UPDATE_PROFILE',
    entityType: 'HealthCenter',
    entityId: doc._id,
    after: update,
  });

  return res.json({
    healthCenter: buildProviderProfilePayload(doc),
  });
}

export async function listHealthCentersPublic(req, res) {
  console.log('listHealthCentersPublic controller executing');
  const hcs = await HealthCenter.find({ status: 'active' })
    .select(
      'name barangayName cityMunicipality healthCenterName officialContactInfo officialContactInfoEncrypted geoLocation address addressEncrypted contactNumber contactNumberEncrypted assignedHealthcareProviders'
    )
    .sort({ name: 1 })
    .lean();

  const healthCenters = hcs.map((center) => {
    const barangayName = String(center.barangayName ?? '').trim();
    const cityMunicipality = String(center.cityMunicipality ?? '').trim();
    const fallbackLocation = [barangayName, cityMunicipality]
      .filter(Boolean)
      .join(', ');

    const normalizedName = String(
      center.name ||
        center.healthCenterName ||
        (fallbackLocation ? `Barangay Unit - ${fallbackLocation}` : '')
    ).trim();

    const resolvedAddress = resolveAddress(center);
    const resolvedContact = resolveContactNumber(center) || resolveOfficialContact(center);
    const resolvedOfficial = resolveOfficialContact(center);

    const normalizedAddress = String(
      resolvedAddress || center.healthCenterName || fallbackLocation
    ).trim();

    const normalizedContact = String(
      resolvedContact || resolvedOfficial || ''
    ).trim();

    return {
      _id: center._id,
      name: normalizedName,
      barangayName: center.barangayName ?? '',
      cityMunicipality: center.cityMunicipality ?? '',
      healthCenterName: center.healthCenterName ?? '',
      officialContactInfo: resolvedOfficial,
      geoLocation: center.geoLocation ?? null,
      assignedHealthcareProviders: center.assignedHealthcareProviders ?? [],
      address: normalizedAddress,
      contactNumber: normalizedContact,
    };
  });

  return res.json({ healthCenters });
}
