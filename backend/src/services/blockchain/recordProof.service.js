import { BlockchainProofLog } from '../../models/BlockchainProofLog.js';
import { sha256Hex } from '../../utils/crypto.js';
import {
  assertContractWriteAccess,
  blockchainEnabled,
  blockchainStrictMode,
  blockchainWriteDisabled,
  getBlockchainNetwork,
  getRecordContractAddress,
  getRecordProofContract,
  toBytes32Hex,
} from './client.js';

async function writeProofLog(payload) {
  try {
    await BlockchainProofLog.create(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('BLOCKCHAIN_PROOF_LOG_WRITE_ERROR(record):', err?.message ?? err);
  }
}

function safeErrorMessage(err) {
  return err?.message ?? 'Unknown blockchain error';
}

export async function anchorRecordProof({
  healthCenterId = null,
  patientId,
  recordId,
  identityId = '',
  recordHash,
}) {
  const base = {
    enabled: blockchainEnabled(),
    network: '',
    contractAddress: getRecordContractAddress(),
    txId: '',
    blockNumber: null,
    proofId: '',
    anchoredAt: null,
    verificationStatus: blockchainEnabled() ? 'pending' : 'unanchored',
    errorMessage: '',
  };

  if (!blockchainEnabled()) {
    await writeProofLog({
      kind: 'record',
      status: 'skipped',
      healthCenterId,
      subjectType: 'patientrecord',
      subjectId: recordId,
      recordId,
      identityId,
      hash: recordHash,
      reason: 'BLOCKCHAIN_DISABLED',
    });
    return base;
  }

  if (blockchainWriteDisabled()) {
    await writeProofLog({
      kind: 'record',
      status: 'skipped',
      healthCenterId,
      subjectType: 'patientrecord',
      subjectId: recordId,
      recordId,
      identityId,
      hash: recordHash,
      reason: 'BLOCKCHAIN_WRITES_DISABLED',
    });
    return base;
  }

  try {
    const contract = await getRecordProofContract();
    if (!contract || typeof contract.anchorRecord !== 'function') {
      await writeProofLog({
        kind: 'record',
        status: 'skipped',
        healthCenterId,
        subjectType: 'patientrecord',
        subjectId: recordId,
        recordId,
        identityId,
        hash: recordHash,
        reason: 'RECORD_CONTRACT_UNAVAILABLE',
      });
      return base;
    }
    await assertContractWriteAccess(contract);

    const hash32 = toBytes32Hex(recordHash);

    if (typeof contract.isRecordHashAnchored === 'function') {
      const duplicate = Boolean(await contract.isRecordHashAnchored(hash32));
      if (duplicate) {
        await writeProofLog({
          kind: 'record',
          status: 'failed',
          healthCenterId,
          subjectType: 'patientrecord',
          subjectId: recordId,
          recordId,
          identityId,
          hash: recordHash,
          reason: 'RECORD_HASH_ALREADY_ANCHORED',
        });

        if (blockchainStrictMode()) {
          const strictErr = new Error('Blockchain record anchoring failed: RECORD_HASH_ALREADY_ANCHORED');
          strictErr.statusCode = 409;
          strictErr.code = 'BLOCKCHAIN_RECORD_DUPLICATE_HASH';
          throw strictErr;
        }

        return {
          ...base,
          verificationStatus: 'failed',
          errorMessage: 'RECORD_HASH_ALREADY_ANCHORED',
        };
      }
    }

    const tx = await contract.anchorRecord(
      String(recordId),
      String(patientId),
      hash32,
      String(identityId ?? '')
    );

    const receipt = await tx.wait();
    const network = await getBlockchainNetwork();
    const anchoredAt = new Date();
    const proofId = sha256Hex(`${tx.hash}:${String(recordId)}:${recordHash}`);

    const anchored = {
      ...base,
      network,
      txId: tx.hash,
      blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : null,
      proofId,
      anchoredAt,
      verificationStatus: 'anchored',
    };

    await writeProofLog({
      kind: 'record',
      status: 'success',
      healthCenterId,
      subjectType: 'patientrecord',
      subjectId: recordId,
      recordId,
      identityId,
      hash: recordHash,
      network,
      contractAddress: getRecordContractAddress(),
      txId: tx.hash,
      blockNumber: anchored.blockNumber,
      proofId,
      anchoredAt,
    });

    return anchored;
  } catch (err) {
    const message = safeErrorMessage(err);

    await writeProofLog({
      kind: 'record',
      status: 'failed',
      healthCenterId,
      subjectType: 'patientrecord',
      subjectId: recordId,
      recordId,
      identityId,
      hash: recordHash,
      reason: message,
      details: { code: err?.code ?? '' },
    });

    if (blockchainStrictMode()) {
      const strictErr = new Error(`Blockchain record anchoring failed: ${message}`);
      strictErr.statusCode = 502;
      strictErr.code = 'BLOCKCHAIN_RECORD_ANCHOR_FAILED';
      throw strictErr;
    }

    return {
      ...base,
      verificationStatus: 'failed',
      errorMessage: message,
    };
  }
}

export async function verifyRecordProof({
  healthCenterId = null,
  patientId = null,
  recordId,
  identityId = '',
  recordHash,
}) {
  const common = {
    available: false,
    verified: null,
    reason: '',
    network: '',
    contractAddress: getRecordContractAddress(),
    anchoredAt: null,
    identityId: '',
    error: '',
  };

  if (!blockchainEnabled()) {
    return { ...common, reason: 'BLOCKCHAIN_DISABLED' };
  }

  try {
    const contract = await getRecordProofContract();
    if (!contract || typeof contract.verifyRecord !== 'function') {
      return { ...common, reason: 'RECORD_VERIFY_METHOD_UNAVAILABLE' };
    }

    const response = await contract.verifyRecord(
      String(recordId),
      toBytes32Hex(recordHash)
    );

    const verified = Array.isArray(response) ? Boolean(response[0]) : Boolean(response);
    const anchoredAtValue = Array.isArray(response) ? Number(response[1] ?? 0) : 0;
    const chainIdentityId = Array.isArray(response) ? String(response[2] ?? '') : '';
    const anchoredAt = anchoredAtValue > 0 ? new Date(anchoredAtValue * 1000) : null;
    const network = await getBlockchainNetwork();

    await writeProofLog({
      kind: 'verification',
      status: verified ? 'success' : 'failed',
      healthCenterId,
      subjectType: 'patientrecord',
      subjectId: recordId,
      recordId,
      identityId,
      hash: recordHash,
      network,
      contractAddress: getRecordContractAddress(),
      anchoredAt,
      reason: verified ? 'RECORD_HASH_VERIFIED' : 'RECORD_HASH_NOT_FOUND',
      details: {
        patientId: patientId ? String(patientId) : '',
        chainIdentityId,
      },
    });

    return {
      ...common,
      available: true,
      verified,
      reason: verified ? 'RECORD_HASH_VERIFIED' : 'RECORD_HASH_NOT_FOUND',
      network,
      anchoredAt,
      identityId: chainIdentityId,
    };
  } catch (err) {
    const message = safeErrorMessage(err);

    await writeProofLog({
      kind: 'verification',
      status: 'failed',
      healthCenterId,
      subjectType: 'patientrecord',
      subjectId: recordId,
      recordId,
      identityId,
      hash: recordHash,
      reason: message,
      details: { code: err?.code ?? '' },
    });

    if (blockchainStrictMode()) {
      const strictErr = new Error(`Blockchain verification failed: ${message}`);
      strictErr.statusCode = 502;
      strictErr.code = 'BLOCKCHAIN_VERIFY_FAILED';
      throw strictErr;
    }

    return {
      ...common,
      available: true,
      verified: false,
      reason: 'BLOCKCHAIN_VERIFY_ERROR',
      error: message,
    };
  }
}
