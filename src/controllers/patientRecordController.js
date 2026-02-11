import { Patient } from '../models/Patient.js';
import { PatientRecord } from '../models/PatientRecord.js';
import { canonicalJsonStringify, sha256Hex } from '../utils/crypto.js';
import { writeAuditLog } from '../services/auditService.js';
import { anchorRecordProof, verifyRecordProof } from '../services/blockchain/recordProof.service.js';
import { env } from '../config/env.js';

function buildRecordHash({ healthCenterId, patientId, type, data }) {
  return sha256Hex(
    canonicalJsonStringify({
      healthCenterId: String(healthCenterId),
      patientId: String(patientId),
      type,
      data,
    })
  );
}

export async function addPatientRecord(req, res) {
  const { healthCenterId, adminId, sessionId } = req.context;
  const actorType = adminId ? 'admin' : 'healthcenter';
  const actorId = adminId ?? healthCenterId;
  const { type = 'note', data, blockchain = { enabled: false } } = req.body ?? {};
  const patientId = req.params.patientId;

  if (!data) return res.status(400).json({ error: { message: 'data is required' } });
  const patient = await Patient.findOne({ _id: patientId, healthCenterId }).lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });

  const recordHash = buildRecordHash({ healthCenterId, patientId, type, data });

  const rec = await PatientRecord.create({
    healthCenterId,
    patientId,
    type,
    data,
    recordHash,
    blockchain: {
      enabled: Boolean(blockchain?.enabled),
      network: blockchain?.network ?? '',
      contractAddress: blockchain?.contractAddress ?? '',
      txId: blockchain?.txId ?? '',
      blockNumber: blockchain?.blockNumber ?? null,
      proofId: blockchain?.proofId ?? '',
      anchoredAt: blockchain?.anchoredAt ? new Date(blockchain.anchoredAt) : null,
      lastVerifiedAt: null,
      verificationStatus: blockchain?.verificationStatus ?? 'unanchored',
      errorMessage: '',
    },
    createdByActorType: actorType,
    createdByActorId: actorId,
    sessionId,
  });

  const shouldAnchor = Boolean(blockchain?.enabled ?? env.BLOCKCHAIN_ENABLED);
  if (shouldAnchor) {
    const anchored = await anchorRecordProof({
      healthCenterId,
      patientId,
      recordId: rec._id,
      identityId: patient?.blockchainIdentity?.identityId ?? '',
      recordHash: rec.recordHash,
    });

    await PatientRecord.updateOne(
      { _id: rec._id },
      {
        $set: {
          blockchain: {
            enabled: anchored.enabled,
            network: anchored.network,
            contractAddress: anchored.contractAddress,
            txId: anchored.txId,
            blockNumber: anchored.blockNumber,
            proofId: anchored.proofId,
            anchoredAt: anchored.anchoredAt,
            lastVerifiedAt: null,
            verificationStatus: anchored.verificationStatus,
            errorMessage: anchored.errorMessage,
          },
        },
      }
    );

    rec.blockchain = {
      ...rec.blockchain,
      enabled: anchored.enabled,
      network: anchored.network,
      contractAddress: anchored.contractAddress,
      txId: anchored.txId,
      blockNumber: anchored.blockNumber,
      proofId: anchored.proofId,
      anchoredAt: anchored.anchoredAt,
      verificationStatus: anchored.verificationStatus,
      errorMessage: anchored.errorMessage,
    };
  }

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

export async function verifyPatientRecordIntegrity(req, res) {
  const { healthCenterId } = req.context;
  const { patientId, recordId } = req.params;

  const patient = await Patient.findOne({ _id: patientId, healthCenterId }).lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });

  const record = await PatientRecord.findOne({ _id: recordId, patientId, healthCenterId });
  if (!record) return res.status(404).json({ error: { message: 'Record not found' } });

  const recomputedHash = buildRecordHash({
    healthCenterId: record.healthCenterId,
    patientId: record.patientId,
    type: record.type,
    data: record.data,
  });

  const dbHashMatch = recomputedHash === record.recordHash;

  const chainVerification = await verifyRecordProof({
    healthCenterId,
    patientId,
    recordId: record._id,
    identityId: patient?.blockchainIdentity?.identityId ?? '',
    recordHash: record.recordHash,
  });

  const status = !dbHashMatch
    ? 'tampered'
    : chainVerification.available && chainVerification.verified
      ? 'verified'
      : chainVerification.available && chainVerification.verified === false
        ? 'anchor_mismatch'
        : 'local_hash_only';

  record.blockchain = {
    ...record.blockchain,
    lastVerifiedAt: new Date(),
    verificationStatus: status === 'verified' ? 'anchored' : status === 'tampered' ? 'tampered' : record.blockchain?.verificationStatus ?? 'unanchored',
  };
  await record.save();

  await writeAuditLog({
    req,
    action: 'RECORD.VERIFY',
    entityType: 'PatientRecord',
    entityId: record._id,
    after: {
      recordHash: record.recordHash,
      recomputedHash,
      dbHashMatch,
      onChainVerified: chainVerification.verified,
      status,
    },
  });

  return res.json({
    recordId: record._id,
    patientId: record.patientId,
    status,
    dbIntegrity: {
      storedHash: record.recordHash,
      recomputedHash,
      match: dbHashMatch,
    },
    blockchain: chainVerification,
    verifiedAt: record.blockchain.lastVerifiedAt,
  });
}

