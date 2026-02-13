import { HealthCenter } from '../models/HealthCenter.js';
import { signHealthCenterToken, verifyPassword } from '../services/authService.js';
import { writeAuditLog } from '../services/auditService.js';
import { ensureBlockchainIdentityForDocument, verifyBlockchainIdentity } from '../services/blockchain/identity.service.js';

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
  if (!email || !password) return res.status(400).json({ error: { message: 'email and password are required' } });

  const hc = await HealthCenter.findOne({ email: String(email).toLowerCase().trim() });
  if (!hc) return res.status(401).json({ error: { message: 'Invalid credentials' } });
  if (hc.status !== 'active') {
    return res.status(403).json({
      error: { message: `Barangay unit status is '${hc.status}'. Only 'active' barangays can access BioTrack services.` },
    });
  }

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

  const { identity } = await ensureBlockchainIdentityForDocument({
    doc: hc,
    subjectType: 'healthcenter',
    uniqueSeed: hc.email,
  });
  const identityVerification = await verifyBlockchainIdentity(identity, {
    subjectType: 'healthcenter',
    subjectId: hc._id,
  });

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
      email: hc.email,
      name: hc.name,
      barangayName: hc.barangayName,
      cityMunicipality: hc.cityMunicipality,
      healthCenterName: hc.healthCenterName,
      officialContactInfo: hc.officialContactInfo,
      status: hc.status,
      holderName: hc.holderName,
      blockchainIdentity: {
        identityId: identity.identityId,
        verificationStatus: identity.verificationStatus,
        verified: identityVerification.verified,
        onChain: identityVerification.onChain,
      },
    },
  });
}

export async function listHealthCentersPublic(req, res) {
  console.log('listHealthCentersPublic controller executing');
  const hcs = await HealthCenter.find({ status: 'active' })
    .select(
      'name barangayName cityMunicipality healthCenterName officialContactInfo geoLocation address contactNumber assignedHealthcareProviders'
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

    const normalizedAddress = String(
      center.address || center.healthCenterName || fallbackLocation
    ).trim();

    const normalizedContact = String(
      center.contactNumber || center.officialContactInfo || ''
    ).trim();

    return {
      ...center,
      name: normalizedName,
      address: normalizedAddress,
      contactNumber: normalizedContact,
    };
  });

  return res.json({ healthCenters });
}

