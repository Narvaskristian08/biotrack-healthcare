import { Patient } from '../models/Patient.js';
import { HealthCenter } from '../models/HealthCenter.js';
import { PatientLoginHistory } from '../models/PatientLoginHistory.js';
import { writeAuditLog } from '../services/auditService.js';
import { hashPassword } from '../services/authService.js';
import { ensureBlockchainIdentityForDocument } from '../services/blockchain/identity.service.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';
import {
  buildEmailFields,
  buildMrnFields,
  buildPhoneFields,
  encryptPiiValue,
  normalizeText,
  resolvePiiField,
} from '../services/pii.service.js';

function buildSafeRegex(value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, 'i');
}

function buildHealthCenterSummary(center) {
  if (!center) return null;
  return {
    id: center._id,
    name: String(center.name ?? '').trim(),
    barangayName: String(center.barangayName ?? '').trim(),
    cityMunicipality: String(center.cityMunicipality ?? '').trim(),
    healthCenterName: String(center.healthCenterName ?? '').trim(),
    address: resolvePiiField({ encrypted: center.addressEncrypted, fallback: center.address, field: 'address' }),
    contactNumber: resolvePiiField({
      encrypted: center.contactNumberEncrypted,
      fallback: center.contactNumber || center.officialContactInfo,
      field: 'contactNumber',
    }),
    officialContactInfo: resolvePiiField({
      encrypted: center.officialContactInfoEncrypted,
      fallback: center.officialContactInfo,
      field: 'officialContactInfo',
    }),
  };
}

function buildPatientResponse(doc) {
  if (!doc) return null;
  const {
    emailEncrypted,
    emailHash,
    contactNumberEncrypted,
    contactNumberHash,
    addressEncrypted,
    mrnEncrypted,
    mrnHash,
    guardianNameEncrypted,
    emergencyContactNameEncrypted,
    emergencyContactPhoneEncrypted,
    ...rest
  } = doc;

  return {
    ...rest,
    mrn: resolvePiiField({ encrypted: mrnEncrypted, fallback: doc.mrn, field: 'mrn' }),
    email: resolvePiiField({ encrypted: emailEncrypted, fallback: doc.email, field: 'email' }),
    address: resolvePiiField({ encrypted: addressEncrypted, fallback: doc.address, field: 'address' }),
    contactNumber: resolvePiiField({ encrypted: contactNumberEncrypted, fallback: doc.contactNumber, field: 'contactNumber' }),
    guardianName: resolvePiiField({ encrypted: guardianNameEncrypted, fallback: doc.guardianName, field: 'guardianName' }),
    emergencyContactName: resolvePiiField({ encrypted: emergencyContactNameEncrypted, fallback: doc.emergencyContactName, field: 'emergencyContactName' }),
    emergencyContactPhone: resolvePiiField({ encrypted: emergencyContactPhoneEncrypted, fallback: doc.emergencyContactPhone, field: 'emergencyContactPhone' }),
  };
}

export async function createPatient(req, res) {
  const { healthCenterId, adminId } = req.context;
  const actorType = adminId ? 'admin' : 'healthcenter';
  const actorId = adminId ?? healthCenterId;
  const {
    mrn,
    lastName,
    firstName,
    middleInitial,
    nameExtension,
    email,
    password,
    walletAddress,
    birthDate = null,
    sex = 'unknown',
    address,
    contactNumber,
    emergencyContactName = '',
    emergencyContactPhone = '',
  } = req.body ?? {};

  // Validation
  const errors = [];
  if (!mrn) errors.push('mrn is required');
  if (!lastName) errors.push('lastName is required');
  if (!firstName) errors.push('firstName is required');
  if (!middleInitial) errors.push('middleInitial is required');
  if (!email) errors.push('email is required');
  if (!password) errors.push('password is required');
  if (!address) errors.push('address is required');
  if (!contactNumber) errors.push('contactNumber is required');

  if (errors.length > 0) {
    return res.status(400).json({ error: { message: errors.join(', ') } });
  }
  const passwordCheck = validatePasswordPolicy(password);
  if (!passwordCheck.ok) {
    return res.status(400).json({ error: { message: passwordCheck.message } });
  }

  const emailFields = buildEmailFields(email);
  const mrnFields = buildMrnFields(mrn);
  const contactFields = buildPhoneFields(contactNumber);
  const normalizedAddress = normalizeText(address);
  const normalizedEmergencyName = normalizeText(emergencyContactName);
  const normalizedEmergencyPhone = normalizeText(emergencyContactPhone);

  const existingEmail = await Patient.findOne({ healthCenterId, emailHash: emailFields.hash }).lean();
  if (existingEmail) return res.status(409).json({ error: { message: 'Email already exists in this health center' } });

  const existingMrn = await Patient.findOne({ healthCenterId, mrnHash: mrnFields.hash }).lean();
  if (existingMrn) return res.status(409).json({ error: { message: 'MRN already exists in this health center' } });

  const passwordHash = await hashPassword(String(password));

  const doc = await Patient.create({
    healthCenterId,
    mrn: '',
    mrnHash: mrnFields.hash,
    mrnEncrypted: mrnFields.encrypted,
    lastName: String(lastName).trim(),
    firstName: String(firstName).trim(),
    middleInitial: String(middleInitial).trim(),
    nameExtension: String(nameExtension ?? '').trim(),
    email: '',
    emailHash: emailFields.hash,
    emailEncrypted: emailFields.encrypted,
    passwordHash,
    birthDate: birthDate ? new Date(birthDate) : null,
    sex,
    address: '',
    addressEncrypted: encryptPiiValue(normalizedAddress, 'address'),
    contactNumber: '',
    contactNumberHash: contactFields.hash,
    contactNumberEncrypted: contactFields.encrypted,
    emergencyContactName: '',
    emergencyContactNameEncrypted: encryptPiiValue(normalizedEmergencyName, 'emergencyContactName'),
    emergencyContactPhone: '',
    emergencyContactPhoneEncrypted: encryptPiiValue(normalizedEmergencyPhone, 'emergencyContactPhone'),
    accountVerification: {
      status: 'verified',
      verifiedAt: new Date(),
    },
    createdByActorType: actorType,
    createdByActorId: actorId,
    updatedByActorType: actorType,
    updatedByActorId: actorId,
  });
  const { identity } = await ensureBlockchainIdentityForDocument({
    doc,
    subjectType: 'patient',
    uniqueSeed: emailFields.normalized,
    walletAddress,
    healthCenterId,
  });

  await writeAuditLog({
    req,
    action: 'PATIENT.CREATE',
    entityType: 'Patient',
    entityId: doc._id,
    after: {
      mrn: mrnFields.normalized,
      lastName: doc.lastName,
      firstName: doc.firstName,
      email: emailFields.normalized,
      blockchainIdentityId: identity.identityId,
    },
  });

  // Don't return passwordHash
  const { passwordHash: _, ...patientData } = doc.toObject();
  return res.status(201).json({ patient: buildPatientResponse(patientData) });
}

export async function listPatients(req, res) {
  const { healthCenterId } = req.context;
  const search = String(req.query.search ?? '').trim();
  const q = { healthCenterId, status: 'active' };

  if (search) {
    const r = buildSafeRegex(search);
    const emailFields = buildEmailFields(search);
    const mrnFields = buildMrnFields(search);
    q.$or = [
      { lastName: r },
      { firstName: r },
      { emailHash: emailFields.hash },
      { mrnHash: mrnFields.hash },
    ];
  }

  const patients = await Patient.find(q)
    .select('-passwordHash') // Exclude hash
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  return res.json({ patients: patients.map(buildPatientResponse) });
}

export async function getPatient(req, res) {
  const { healthCenterId } = req.context;
  const patient = await Patient.findOne({ _id: req.params.id, healthCenterId }).select('-passwordHash').lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });
  const healthCenter = await HealthCenter.findById(patient.healthCenterId)
    .select('name barangayName cityMunicipality healthCenterName address addressEncrypted contactNumber contactNumberEncrypted officialContactInfo officialContactInfoEncrypted')
    .lean();
  return res.json({
    patient: {
      ...buildPatientResponse(patient),
      assignedHealthCenter: buildHealthCenterSummary(healthCenter),
    },
  });
}

export async function updatePatient(req, res) {
  const { healthCenterId, adminId } = req.context;
  const role = req.context?.role;
  const actorType = adminId ? 'admin' : role === 'healthcenter' ? 'healthcenter' : 'unknown';
  const actorId = adminId ?? healthCenterId ?? null;

  if (role === 'patient') {
    const requestedId = String(req.params.id ?? '').trim();
    const patientId = String(req.context?.patientId ?? '').trim();
    if (!patientId || requestedId !== patientId) {
      return res.status(403).json({ error: { message: 'Patients can only update their own profile' } });
    }
  }

  const before = await Patient.findOne({ _id: req.params.id, healthCenterId }).lean();
  if (!before) return res.status(404).json({ error: { message: 'Patient not found' } });

  const allowed = role === 'patient'
    ? [
      'lastName',
      'firstName',
      'middleInitial',
      'nameExtension',
      'email',
      'birthDate',
      'sex',
      'address',
      'contactNumber',
      'guardianName',
      'emergencyContactName',
      'emergencyContactPhone',
    ]
    : [
      'lastName',
      'firstName',
      'middleInitial',
      'nameExtension',
      'email',
      'birthDate',
      'sex',
      'address',
      'contactNumber',
      'guardianName',
      'emergencyContactName',
      'emergencyContactPhone',
      'tags',
      'status',
    ];

  // Note: Password update usually separate endpoint, but if needed here, require separate logic.
  // For now, sticking to profile fields.

  const patch = {};
  for (const k of allowed) {
    if (k in (req.body ?? {})) patch[k] = req.body[k];
  }

  if ('lastName' in patch) patch.lastName = String(patch.lastName).trim();
  if ('firstName' in patch) patch.firstName = String(patch.firstName).trim();
  if ('middleInitial' in patch) patch.middleInitial = String(patch.middleInitial).trim();
  if ('email' in patch) {
    const emailFields = buildEmailFields(patch.email);
    patch.email = '';
    patch.emailHash = emailFields.hash;
    patch.emailEncrypted = emailFields.encrypted;
  }
  if ('nameExtension' in patch) patch.nameExtension = String(patch.nameExtension).trim();
  if ('guardianName' in patch) {
    const normalized = normalizeText(patch.guardianName);
    patch.guardianName = '';
    patch.guardianNameEncrypted = encryptPiiValue(normalized, 'guardianName');
  }
  if ('emergencyContactName' in patch) {
    const normalized = normalizeText(patch.emergencyContactName);
    patch.emergencyContactName = '';
    patch.emergencyContactNameEncrypted = encryptPiiValue(normalized, 'emergencyContactName');
  }
  if ('emergencyContactPhone' in patch) {
    const normalized = normalizeText(patch.emergencyContactPhone);
    patch.emergencyContactPhone = '';
    patch.emergencyContactPhoneEncrypted = encryptPiiValue(normalized, 'emergencyContactPhone');
  }

  // Basic validation for required fields if they are being updated to empty?
  // Schema handles 'required' on save, but optimal to check here if setting to empty.
  // Mongoose default validators run on update? Only if runValidators: true.

  if ('address' in patch) {
    const normalized = normalizeText(patch.address);
    patch.address = '';
    patch.addressEncrypted = encryptPiiValue(normalized, 'address');
  }
  if ('contactNumber' in patch) {
    const contactFields = buildPhoneFields(patch.contactNumber);
    patch.contactNumber = '';
    patch.contactNumberHash = contactFields.hash;
    patch.contactNumberEncrypted = contactFields.encrypted;
  }
  if ('birthDate' in patch) patch.birthDate = patch.birthDate ? new Date(patch.birthDate) : null;

  if (patch.emailHash && patch.emailHash !== before.emailHash) {
    const existingEmail = await Patient.findOne({
      _id: { $ne: before._id },
      healthCenterId,
      emailHash: patch.emailHash,
    }).lean();
    if (existingEmail) {
      return res.status(409).json({ error: { message: 'Email already exists in this health center' } });
    }
  }

  patch.updatedByActorType = actorType;
  patch.updatedByActorId = actorId;

  const after = await Patient.findOneAndUpdate(
    { _id: req.params.id, healthCenterId },
    { $set: patch },
    { new: true, runValidators: true }
  ).select('-passwordHash').lean();

  await writeAuditLog({
    req,
    action: 'PATIENT.UPDATE',
    entityType: 'Patient',
    entityId: after._id,
    before: {
      lastName: before.lastName,
      email: resolvePiiField({ encrypted: before.emailEncrypted, fallback: before.email, field: 'email' }),
    },
    after: {
      lastName: after.lastName,
      email: resolvePiiField({ encrypted: after.emailEncrypted, fallback: after.email, field: 'email' }),
    },
  });

  return res.json({ patient: buildPatientResponse(after) });
}

export async function listPatientLoginHistory(req, res) {
  const { healthCenterId } = req.context;
  const patientId = req.params.id;
  const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);

  const history = await PatientLoginHistory.find({ healthCenterId, patientId })
    .sort({ loginAt: -1 })
    .limit(limit)
    .lean();

  await writeAuditLog({
    req,
    action: 'PATIENT.LOGIN_HISTORY.VIEW',
    entityType: 'Patient',
    entityId: patientId,
    after: { limit },
  });

  return res.json({
    history: history.map((entry) => ({
      id: entry._id,
      loginAt: entry.loginAt,
      expiresAt: entry.expiresAt,
      ip: entry.ip,
      userAgent: entry.userAgent,
      createdAt: entry.createdAt,
    })),
  });
}
