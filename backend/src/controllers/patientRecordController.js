import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { Patient } from '../models/Patient.js';
import { PatientRecord } from '../models/PatientRecord.js';
import { writeAuditLog } from '../services/auditService.js';
import { anchorRecordProof, verifyRecordProof } from '../services/blockchain/recordProof.service.js';
import {
  RECORD_HASH_SCHEMA_VERSION,
  buildRecordHashForRecord,
  buildRecordHashV2,
} from '../services/blockchain/recordHash.js';
import { env } from '../config/env.js';
import { decryptRecordDataForResponse, encryptRecordDataForStorage } from '../services/recordDataEncryption.service.js';

function toRecordResponse(record, context = {}) {
  const source = typeof record?.toObject === 'function' ? record.toObject() : record;
  return {
    ...source,
    data: decryptRecordDataForResponse(source?.data, context),
  };
}

function buildFailedBlockchainState(existing = {}, error) {
  return {
    enabled: Boolean(existing?.enabled),
    network: String(existing?.network ?? '').trim(),
    contractAddress: String(existing?.contractAddress ?? '').trim(),
    txId: String(existing?.txId ?? '').trim(),
    blockNumber: Number.isFinite(Number(existing?.blockNumber)) ? Number(existing.blockNumber) : null,
    proofId: String(existing?.proofId ?? '').trim(),
    anchoredAt: existing?.anchoredAt ? new Date(existing.anchoredAt) : null,
    lastVerifiedAt: existing?.lastVerifiedAt ? new Date(existing.lastVerifiedAt) : null,
    verificationStatus: 'failed',
    errorMessage: String(error?.message ?? 'Blockchain record anchoring failed').trim(),
  };
}

export async function addPatientRecord(req, res) {
  const { healthCenterId, adminId, sessionId, patientId: requesterPatientId, role } = req.context;
  const actorType = adminId ? 'admin' : role === 'patient' ? 'patient' : 'healthcenter';
  const actorId = adminId ?? (role === 'patient' ? requesterPatientId : healthCenterId);
  const { type = 'note', data, capturedAt: capturedAtInput } = req.body ?? {};
  const patientId = req.params.patientId;

  if (!data) return res.status(400).json({ error: { message: 'data is required' } });
  const patient = await Patient.findOne({ _id: patientId, healthCenterId }).lean();
  if (!patient) return res.status(404).json({ error: { message: 'Patient not found' } });

  const sourceClientId = typeof data === 'object' && data !== null
    ? String(data.clientRecordId ?? '').trim().slice(0, 120)
    : '';

  if (sourceClientId) {
    const existingByClientId = await PatientRecord.findOne({
      healthCenterId,
      patientId,
      sourceClientId,
    });
    if (existingByClientId) {
      return res.status(200).json({
        deduplicated: true,
        record: toRecordResponse(existingByClientId, { healthCenterId, patientId }),
      });
    }
  }

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
    sourceClientId,
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
    try {
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
    } catch (error) {
      const failedBlockchain = buildFailedBlockchainState(
        {
          ...rec.blockchain,
          enabled: shouldAnchor,
          contractAddress: String(env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS ?? '').trim(),
        },
        error
      );

      await PatientRecord.updateOne(
        { _id: rec._id },
        {
          $set: {
            blockchain: failedBlockchain,
          },
        }
      );

      rec.blockchain = failedBlockchain;
      throw error;
    }
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

export async function getPatientRecord(req, res) {
  const { healthCenterId } = req.context;
  const { patientId, recordId } = req.params;

  const record = await PatientRecord.findOne({ _id: recordId, patientId, healthCenterId }).lean();
  if (!record) {
    return res.status(404).json({ error: { message: 'Record not found' } });
  }

  return res.json({
    record: toRecordResponse(record, { healthCenterId, patientId }),
  });
}

export async function deletePatientRecord(req, res) {
  const { healthCenterId } = req.context;
  const { patientId, recordId } = req.params;

  const deleted = await PatientRecord.findOneAndDelete({
    _id: recordId,
    patientId,
    healthCenterId,
  });
  if (!deleted) {
    return res.status(404).json({ error: { message: 'Record not found' } });
  }

  await writeAuditLog({
    req,
    action: 'RECORD.DELETE',
    entityType: 'PatientRecord',
    entityId: deleted._id,
    before: {
      patientId: deleted.patientId,
      type: deleted.type,
      recordHash: deleted.recordHash,
    },
  });

  return res.json({
    success: true,
    recordId: deleted._id,
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
