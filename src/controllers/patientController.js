import { Patient } from '../models/Patient.js';
import { writeAuditLog } from '../services/auditService.js';
import { hashPassword } from '../services/authService.js';

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
    birthDate = null,
    sex = 'unknown',
    address,
    contactNumber,
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

  const existingEmail = await Patient.findOne({ healthCenterId, email: String(email).toLowerCase().trim() }).lean();
  if (existingEmail) return res.status(409).json({ error: { message: 'Email already exists in this health center' } });

  const existingMrn = await Patient.findOne({ healthCenterId, mrn: String(mrn).trim() }).lean();
  if (existingMrn) return res.status(409).json({ error: { message: 'MRN already exists in this health center' } });

  const passwordHash = await hashPassword(String(password));

  const doc = await Patient.create({
    healthCenterId,
    mrn: String(mrn).trim(),
    lastName: String(lastName).trim(),
    firstName: String(firstName).trim(),
    middleInitial: String(middleInitial).trim(),
    nameExtension: String(nameExtension ?? '').trim(),
    email: String(email).toLowerCase().trim(),
    passwordHash,
    birthDate: birthDate ? new Date(birthDate) : null,
    sex,
    address: String(address).trim(),
    contactNumber: String(contactNumber).trim(),
    createdByActorType: actorType,
    createdByActorId: actorId,
    updatedByActorType: actorType,
    updatedByActorId: actorId,
  });

  await writeAuditLog({
    req,
    action: 'PATIENT.CREATE',
    entityType: 'Patient',
    entityId: doc._id,
    after: {
      mrn: doc.mrn,
      lastName: doc.lastName,
      firstName: doc.firstName,
      email: doc.email,
    },
  });

  // Don't return passwordHash
  const { passwordHash: _, ...patientData } = doc.toObject();
  return res.status(201).json({ patient: patientData });
}

export async function listPatients(req, res) {
  const { healthCenterId } = req.context;
  const search = String(req.query.search ?? '').trim();
  const q = { healthCenterId, status: 'active' };

  if (search) {
    const r = new RegExp(search, 'i');
    q.$or = [
      { lastName: r },
      { firstName: r },
      { email: r },
      { mrn: r }
    ];
  }

  const patients = await Patient.find(q)
    .select('-passwordHash') // Exclude hash
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  return res.json({ patients });
}

export async function getPatient(req, res) {
  const { healthCenterId } = req.context;
  const patient = await Patient.findOne({ _id: req.params.id, healthCenterId }).select('-passwordHash').lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });
  return res.json({ patient });
}

export async function updatePatient(req, res) {
  const { healthCenterId, adminId } = req.context;
  const actorType = adminId ? 'admin' : 'healthcenter';
  const actorId = adminId ?? healthCenterId;
  const before = await Patient.findOne({ _id: req.params.id, healthCenterId }).lean();
  if (!before) return res.status(404).json({ error: { message: 'Patient not found' } });

  const allowed = [
    'lastName', 'firstName', 'middleInitial', 'nameExtension',
    'email', 'birthDate', 'sex', 'address', 'contactNumber',
    'guardianName', 'tags', 'status'
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
  if ('email' in patch) patch.email = String(patch.email).toLowerCase().trim();

  // Basic validation for required fields if they are being updated to empty?
  // Schema handles 'required' on save, but optimal to check here if setting to empty.
  // Mongoose default validators run on update? Only if runValidators: true.

  if ('address' in patch) patch.address = String(patch.address).trim();
  if ('contactNumber' in patch) patch.contactNumber = String(patch.contactNumber).trim();
  if ('birthDate' in patch) patch.birthDate = patch.birthDate ? new Date(patch.birthDate) : null;

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
    before: { lastName: before.lastName, email: before.email },
    after: { lastName: after.lastName, email: after.email },
  });

  return res.json({ patient: after });
}

