import { Patient } from '../models/Patient.js';
import { PatientRecord } from '../models/PatientRecord.js';
import { canonicalJsonStringify, sha256Hex } from '../utils/crypto.js';
import { writeAuditLog } from '../services/auditService.js';

export async function addPatientRecord(req, res) {
  const { healthCenterId, adminId, sessionId } = req.context;
  const actorType = adminId ? 'admin' : 'healthcenter';
  const actorId = adminId ?? healthCenterId;
  const { type = 'note', data, blockchain = { enabled: false } } = req.body ?? {};
  const patientId = req.params.patientId;

  if (!data) return res.status(400).json({ error: { message: 'data is required' } });
  const patient = await Patient.findOne({ _id: patientId, healthCenterId }).lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });

  const recordHash = sha256Hex(
    canonicalJsonStringify({
      healthCenterId: String(healthCenterId),
      patientId: String(patientId),
      type,
      data,
    })
  );

  const rec = await PatientRecord.create({
    healthCenterId,
    patientId,
    type,
    data,
    recordHash,
    blockchain: {
      enabled: Boolean(blockchain?.enabled),
      network: blockchain?.network ?? '',
      txId: blockchain?.txId ?? '',
      anchoredAt: blockchain?.anchoredAt ? new Date(blockchain.anchoredAt) : null,
    },
    createdByActorType: actorType,
    createdByActorId: actorId,
    sessionId,
  });

  await writeAuditLog({
    req,
    action: 'RECORD.ADD',
    entityType: 'PatientRecord',
    entityId: rec._id,
    after: { patientId, type: rec.type, recordHash: rec.recordHash, blockchain: rec.blockchain },
  });

  return res.status(201).json({ record: rec });
}

export async function listPatientRecords(req, res) {
  const { healthCenterId } = req.context;
  const patientId = req.params.patientId;
  const records = await PatientRecord.find({ healthCenterId, patientId }).sort({ createdAt: -1 }).limit(200).lean();
  return res.json({ records });
}

