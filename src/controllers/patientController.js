import { Patient } from '../models/Patient.js';
import { writeAuditLog } from '../services/auditService.js';

export async function createPatient(req, res) {
  const { healthCenterId, adminId } = req.context;
  const actorType = adminId ? 'admin' : 'healthcenter';
  const actorId = adminId ?? healthCenterId;
  const { mrn, fullName, birthDate = null, sex = 'unknown', address = '', contactNumber = '' } = req.body ?? {};
  if (!mrn || !fullName) return res.status(400).json({ error: { message: 'mrn and fullName are required' } });

  const doc = await Patient.create({
    healthCenterId,
    mrn: String(mrn).trim(),
    fullName: String(fullName).trim(),
    birthDate: birthDate ? new Date(birthDate) : null,
    sex,
    address: String(address ?? '').trim(),
    contactNumber: String(contactNumber ?? '').trim(),
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
    after: { mrn: doc.mrn, fullName: doc.fullName, sex: doc.sex },
  });

  return res.status(201).json({ patient: doc });
}

export async function listPatients(req, res) {
  const { healthCenterId } = req.context;
  const search = String(req.query.search ?? '').trim();
  const q = { healthCenterId, status: 'active' };
  if (search) q.$or = [{ fullName: new RegExp(search, 'i') }, { mrn: new RegExp(search, 'i') }];
  const patients = await Patient.find(q).sort({ updatedAt: -1 }).limit(100).lean();
  return res.json({ patients });
}

export async function getPatient(req, res) {
  const { healthCenterId } = req.context;
  const patient = await Patient.findOne({ _id: req.params.id, healthCenterId }).lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });
  return res.json({ patient });
}

export async function updatePatient(req, res) {
  const { healthCenterId, adminId } = req.context;
  const actorType = adminId ? 'admin' : 'healthcenter';
  const actorId = adminId ?? healthCenterId;
  const before = await Patient.findOne({ _id: req.params.id, healthCenterId }).lean();
  if (!before) return res.status(404).json({ error: { message: 'Patient not found' } });

  const allowed = ['fullName', 'birthDate', 'sex', 'address', 'contactNumber', 'guardianName', 'tags', 'status'];
  const patch = {};
  for (const k of allowed) {
    if (k in (req.body ?? {})) patch[k] = req.body[k];
  }
  if ('fullName' in patch) patch.fullName = String(patch.fullName).trim();
  if ('address' in patch) patch.address = String(patch.address ?? '').trim();
  if ('contactNumber' in patch) patch.contactNumber = String(patch.contactNumber ?? '').trim();
  if ('birthDate' in patch) patch.birthDate = patch.birthDate ? new Date(patch.birthDate) : null;
  patch.updatedByActorType = actorType;
  patch.updatedByActorId = actorId;

  const after = await Patient.findOneAndUpdate({ _id: req.params.id, healthCenterId }, { $set: patch }, { new: true }).lean();

  await writeAuditLog({
    req,
    action: 'PATIENT.UPDATE',
    entityType: 'Patient',
    entityId: after._id,
    before: { fullName: before.fullName, birthDate: before.birthDate, sex: before.sex, address: before.address, contactNumber: before.contactNumber },
    after: { fullName: after.fullName, birthDate: after.birthDate, sex: after.sex, address: after.address, contactNumber: after.contactNumber },
  });

  return res.json({ patient: after });
}

