import { BlockchainProofLog } from '../../models/BlockchainProofLog.js';
import { canonicalJsonStringify, sha256Hex } from '../../utils/crypto.js';
import {
  assertContractWriteAccess,
  blockchainEnabled,
  blockchainWriteDisabled,
  getBlockchainNetwork,
  getRecordContractAddress,
  getRecordProofContract,
  getSignerMetadata,
  toBytes32Hex,
} from './client.js';

const GOVERNANCE_ANCHOR_ACTIONS = new Set([
  'ADMIN.ONBOARDING.REVIEW',
  'ADMIN.RBAC.UPDATE',
  'ADMIN.GOVERNANCE.UPDATE',
  'ADMIN.BACKUP.RUN',
  'ADMIN.BACKUP.RESTORE',
  'ADMIN.BLOCKCHAIN.LOGS.ARCHIVE',
  'ADMIN.USER.CREATE',
  'ADMIN.USER.UPDATE',
  'ADMIN.USER.IDENTITY.PROVISION',
  'HEALTHCENTER.CREATE',
  'HEALTHCENTER.IDENTITY.PROVISION',
  'PATIENT.CREATE',
  'PATIENT.UPDATE',
  'PATIENT.IDENTITY.PROVISION',
  'PATIENT.MONITORING_HISTORY.CLEAR',
  'RECORD.ADD',
  'RECORD.DELETE',
  'RECORD.UPLOAD.VALIDATE',
  'RECORD.VERIFY',
]);

const GOVERNANCE_ANCHOR_SCHEMA = 'biotrack.auditlog.v1';
const GOVERNANCE_ANCHOR_SCHEMA_VERSION = 1;
const GOVERNANCE_IDENTITY_ID = 'did:biotrack:audit:v1';
const GOVERNANCE_PATIENT_ID = 'AUDIT';

function safeErrorMessage(err) {
  return err?.message ?? 'Unknown blockchain error';
}

function isBsonObjectId(value) {
  if (!value || typeof value !== 'object') return false;
  if (value._bsontype === 'ObjectId' || value._bsontype === 'ObjectID') return true;
  return typeof value.toHexString === 'function';
}

function sanitizeForCanonicalJson(value, depth = 0) {
  if (value === null || value === undefined) return null;
  if (depth > 8) return '[MaxDepth]';

  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return value;
  if (type === 'bigint') return value.toString();

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForCanonicalJson(entry, depth + 1));
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('base64');
  }

  if (isBsonObjectId(value)) {
    try {
      return value.toHexString ? value.toHexString() : String(value);
    } catch {
      return String(value);
    }
  }

  if (type === 'object') {
    const out = {};
    Object.entries(value).forEach(([key, entryValue]) => {
      const sanitized = sanitizeForCanonicalJson(entryValue, depth + 1);
      if (sanitized === undefined) return;
      out[key] = sanitized;
    });
    return out;
  }

  return String(value);
}

function buildGovernanceAnchorPayload(auditLogDoc) {
  const auditLog = typeof auditLogDoc?.toObject === 'function'
    ? auditLogDoc.toObject({ depopulate: true })
    : auditLogDoc;

  return sanitizeForCanonicalJson({
    schema: GOVERNANCE_ANCHOR_SCHEMA,
    schemaVersion: GOVERNANCE_ANCHOR_SCHEMA_VERSION,
    auditLogId: String(auditLog?._id ?? ''),
    createdAt: auditLog?.createdAt ? new Date(auditLog.createdAt).toISOString() : '',
    action: String(auditLog?.action ?? ''),
    entityType: String(auditLog?.entityType ?? ''),
    entityId: auditLog?.entityId ? String(auditLog.entityId) : '',
    outcome: String(auditLog?.outcome ?? ''),
    reason: String(auditLog?.reason ?? ''),
    actorType: String(auditLog?.actorType ?? ''),
    actorId: auditLog?.actorId ? String(auditLog.actorId) : '',
    actorName: String(auditLog?.actorName ?? ''),
    healthCenterId: auditLog?.healthCenterId ? String(auditLog.healthCenterId) : '',
    barangay: String(auditLog?.barangay ?? ''),
    ip: String(auditLog?.ip ?? ''),
    userAgent: String(auditLog?.userAgent ?? ''),
    before: auditLog?.before ?? null,
    after: auditLog?.after ?? null,
  });
}

async function writeProofLog(payload) {
  try {
    await BlockchainProofLog.create(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('BLOCKCHAIN_PROOF_LOG_WRITE_ERROR(governance):', err?.message ?? err);
  }
}

export function shouldAnchorGovernanceAction(action) {
  const normalized = String(action ?? '').trim();
  if (!normalized) return false;
  return GOVERNANCE_ANCHOR_ACTIONS.has(normalized);
}

export async function anchorGovernanceAuditLog(auditLogDoc) {
  const auditLog = typeof auditLogDoc?.toObject === 'function'
    ? auditLogDoc.toObject({ depopulate: true })
    : auditLogDoc;

  const auditLogId = auditLog?._id ?? null;
  const recordId = String(auditLogId ?? '').trim();
  if (!recordId) return;

  const payload = buildGovernanceAnchorPayload(auditLog);
  const recordHash = sha256Hex(canonicalJsonStringify(payload));

  const baseLog = {
    kind: 'audit',
    healthCenterId: auditLog?.healthCenterId ?? null,
    subjectType: 'auditlog',
    subjectId: auditLogId,
    recordId: auditLogId,
    identityId: GOVERNANCE_IDENTITY_ID,
    hash: recordHash,
    details: {
      action: String(auditLog?.action ?? ''),
      entityType: String(auditLog?.entityType ?? ''),
      entityId: auditLog?.entityId ? String(auditLog.entityId) : '',
      outcome: String(auditLog?.outcome ?? ''),
    },
  };

  if (!blockchainEnabled()) {
    await writeProofLog({
      ...baseLog,
      status: 'skipped',
      reason: 'BLOCKCHAIN_DISABLED',
    });
    return;
  }

  if (blockchainWriteDisabled()) {
    await writeProofLog({
      ...baseLog,
      status: 'skipped',
      reason: 'BLOCKCHAIN_WRITES_DISABLED',
    });
    return;
  }

  try {
    const contract = await getRecordProofContract();
    if (!contract || typeof contract.anchorRecord !== 'function') {
      await writeProofLog({
        ...baseLog,
        status: 'skipped',
        reason: 'RECORD_CONTRACT_UNAVAILABLE',
      });
      return;
    }

    await assertContractWriteAccess(contract);
    const hash32 = toBytes32Hex(recordHash);

    if (typeof contract.isRecordHashAnchored === 'function') {
      const duplicate = Boolean(await contract.isRecordHashAnchored(hash32));
      if (duplicate) {
        await writeProofLog({
          ...baseLog,
          status: 'failed',
          reason: 'RECORD_HASH_ALREADY_ANCHORED',
        });
        return;
      }
    }

    const tx = await contract.anchorRecord(
      recordId,
      GOVERNANCE_PATIENT_ID,
      hash32,
      GOVERNANCE_IDENTITY_ID
    );

    const receipt = await tx.wait();
    const network = await getBlockchainNetwork();
    const anchoredAt = new Date();
    const proofId = sha256Hex(`${tx.hash}:${recordId}:${recordHash}`);
    const signer = await getSignerMetadata();

    await writeProofLog({
      ...baseLog,
      status: 'success',
      network,
      contractAddress: getRecordContractAddress(),
      txId: tx.hash,
      blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : null,
      proofId,
      anchoredAt,
      details: {
        ...baseLog.details,
        signerAddress: signer.address,
        signerKeyIndex: signer.keyIndex,
      },
    });
  } catch (err) {
    await writeProofLog({
      ...baseLog,
      status: 'failed',
      reason: safeErrorMessage(err),
      details: {
        ...baseLog.details,
        code: err?.code ?? '',
      },
    });
  }
}

