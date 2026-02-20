import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient.js';
import { PatientRecord } from '../models/PatientRecord.js';
import { canonicalJsonStringify, sha256Hex } from '../utils/crypto.js';
import { writeAuditLog } from '../services/auditService.js';
import { anchorRecordProof, verifyRecordProof } from '../services/blockchain/recordProof.service.js';
import { env } from '../config/env.js';
import { decryptRecordDataForResponse, encryptRecordDataForStorage } from '../services/recordDataEncryption.service.js';

const RECORD_HASH_SCHEMA_VERSION = 2;
const RECORD_HASH_SCHEMA_NAME = 'biotrack.record.v2';

function buildRecordHashLegacy({ healthCenterId, patientId, type, data }) {
  return sha256Hex(
    canonicalJsonStringify({
      healthCenterId: String(healthCenterId),
      patientId: String(patientId),
      type,
      data,
    })
  );
}

function buildRecordHashV2({ healthCenterId, patientId, recordId, type, data, capturedAt, recordNonce }) {
  return sha256Hex(
    canonicalJsonStringify({
      schema: RECORD_HASH_SCHEMA_NAME,
      schemaVersion: RECORD_HASH_SCHEMA_VERSION,
      healthCenterId: String(healthCenterId),
      patientId: String(patientId),
      recordId: String(recordId),
      type: String(type),
      capturedAt: new Date(capturedAt).toISOString(),
      nonce: String(recordNonce),
      data,
    })
  );
}

function buildRecordHashForRecord(record) {
  const hasV2Material =
    Number(record?.hashSchemaVersion) === RECORD_HASH_SCHEMA_VERSION &&
    String(record?.recordNonce ?? '').trim() &&
    record?.capturedAt;

  if (hasV2Material) {
    return buildRecordHashV2({
      healthCenterId: record.healthCenterId,
      patientId: record.patientId,
      recordId: record._id,
      type: record.type,
      data: record.data,
      capturedAt: record.capturedAt,
      recordNonce: record.recordNonce,
    });
  }

  return buildRecordHashLegacy({
    healthCenterId: record.healthCenterId,
    patientId: record.patientId,
    type: record.type,
    data: record.data,
  });
}

function toRecordResponse(record, context = {}) {
  const source = typeof record?.toObject === 'function' ? record.toObject() : record;
  return {
    ...source,
    data: decryptRecordDataForResponse(source?.data, context),
  };
}

export async function addPatientRecord(req, res) {
  const { healthCenterId, adminId, sessionId } = req.context;
  const actorType = adminId ? 'admin' : 'healthcenter';
  const actorId = adminId ?? healthCenterId;
  const { type = 'note', data, capturedAt: capturedAtInput } = req.body ?? {};
  const patientId = req.params.patientId;

  if (!data) return res.status(400).json({ error: { message: 'data is required' } });
  const patient = await Patient.findOne({ _id: patientId, healthCenterId }).lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });

  const recordId = new mongoose.Types.ObjectId();
  let capturedAt = new Date();
  if (capturedAtInput !== undefined && capturedAtInput !== null && String(capturedAtInput).trim() !== '') {
    const parsed = new Date(capturedAtInput);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: { message: 'capturedAt must be a valid date' } });
    }
    capturedAt = parsed;
  }

  const recordNonce = randomBytes(16).toString('hex');
  const storedData = encryptRecordDataForStorage(data, { healthCenterId, patientId });
  const recordHash = buildRecordHashV2({
    healthCenterId,
    patientId,
    recordId,
    type,
    data: storedData,
    capturedAt,
    recordNonce,
  });
  // Anchoring policy is controlled server-side only.
  const shouldAnchor = Boolean(env.BLOCKCHAIN_ENABLED);

  const duplicateRecord = await PatientRecord.findOne({ recordHash }).select('_id').lean();
  if (duplicateRecord) {
    return res.status(409).json({ error: { message: 'Duplicate record hash rejected' } });
  }

  const rec = await PatientRecord.create({
    _id: recordId,
    healthCenterId,
    patientId,
    type,
    data: storedData,
    recordHash,
    hashSchemaVersion: RECORD_HASH_SCHEMA_VERSION,
    recordNonce,
    capturedAt,
    blockchain: {
      enabled: shouldAnchor,
      network: '',
      contractAddress: '',
      txId: '',
      blockNumber: null,
      proofId: '',
      anchoredAt: null,
      lastVerifiedAt: null,
      verificationStatus: shouldAnchor ? 'pending' : 'unanchored',
      errorMessage: '',
    },
    createdByActorType: actorType,
    createdByActorId: actorId,
    sessionId,
  });

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

  return res.status(201).json({ record: toRecordResponse(rec, { healthCenterId, patientId }) });
}

export async function listPatientRecords(req, res) {
  const { healthCenterId } = req.context;
  const patientId = req.params.patientId;
  const records = await PatientRecord.find({ healthCenterId, patientId }).sort({ createdAt: -1 }).limit(200).lean();
  return res.json({
    records: records.map((record) => toRecordResponse(record, { healthCenterId, patientId })),
  });
}

export async function validatePatientRecordUpload(req, res) {
  const { healthCenterId, adminId } = req.context;
  const actorType = adminId ? 'admin' : 'healthcenter';
  const actorId = adminId ?? healthCenterId;
  const patientId = req.params.patientId;
  const uploadMeta = req.uploadMeta ?? null;

  if (!uploadMeta) {
    return res.status(400).json({ error: { message: 'Upload metadata is missing' } });
  }

  const patient = await Patient.findOne({ _id: patientId, healthCenterId }).select('_id').lean();
  if (!patient) {
    return res.status(404).json({ error: { message: 'Patient not found' } });
  }

  await writeAuditLog({
    req,
    action: 'RECORD.UPLOAD.VALIDATE',
    entityType: 'Patient',
    entityId: patientId,
    after: {
      fileName: uploadMeta.fileName,
      mimeType: uploadMeta.mimeType,
      sizeBytes: uploadMeta.sizeBytes,
      actorType,
      actorId,
    },
  });

  return res.status(201).json({
    accepted: true,
    upload: uploadMeta,
  });
}

export async function verifyPatientRecordIntegrity(req, res) {
  const { healthCenterId } = req.context;
  const { patientId, recordId } = req.params;

  const patient = await Patient.findOne({ _id: patientId, healthCenterId }).lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });

  const record = await PatientRecord.findOne({ _id: recordId, patientId, healthCenterId });
  if (!record) return res.status(404).json({ error: { message: 'Record not found' } });

  const recomputedHash = buildRecordHashForRecord(record);

  const dbHashMatch = recomputedHash === record.recordHash;

  const chainVerification = await verifyRecordProof({
    healthCenterId,
    patientId,
    recordId: record._id,
    identityId: patient?.blockchainIdentity?.identityId ?? '',
    recordHash: record.recordHash,
  });
  const expectedIdentityId = String(patient?.blockchainIdentity?.identityId ?? '').trim();
  const chainIdentityId = String(chainVerification?.identityId ?? '').trim();
  const identityMatch =
    chainVerification.available && chainVerification.verified === true
      ? Boolean(chainIdentityId && expectedIdentityId && chainIdentityId === expectedIdentityId)
      : null;

  const status = !dbHashMatch
    ? 'tampered'
    : chainVerification.available && chainVerification.verified && identityMatch === true
      ? 'verified'
      : chainVerification.available && (chainVerification.verified === false || identityMatch === false)
        ? 'anchor_mismatch'
        : 'local_hash_only';

  record.blockchain = {
    ...record.blockchain,
    lastVerifiedAt: new Date(),
    verificationStatus:
      status === 'verified'
        ? 'anchored'
        : status === 'tampered'
          ? 'tampered'
          : status === 'anchor_mismatch'
            ? 'failed'
            : record.blockchain?.verificationStatus ?? 'unanchored',
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
      chainIdentityId,
      expectedIdentityId,
      identityMatch,
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
    blockchain: {
      ...chainVerification,
      expectedIdentityId,
      identityMatch,
    },
    verifiedAt: record.blockchain.lastVerifiedAt,
  });
}

