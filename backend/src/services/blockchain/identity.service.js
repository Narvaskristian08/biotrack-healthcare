import { randomBytes } from 'crypto';
import { isAddress } from 'ethers';
import { BlockchainProofLog } from '../../models/BlockchainProofLog.js';
import { HealthCenter } from '../../models/HealthCenter.js';
import { Patient } from '../../models/Patient.js';
import { canonicalJsonStringify, sha256Hex } from '../../utils/crypto.js';
import {
  blockchainEnabled,
  blockchainStrictMode,
  getBlockchainNetwork,
  getIdentityContractAddress,
  getIdentityRegistryContract,
  toBytes32Hex,
} from './client.js';

function nowDate() {
  return new Date();
}

function normalizeWalletAddress(walletAddress = '') {
  const raw = String(walletAddress ?? '').trim();
  if (!raw) return '';
  if (!isAddress(raw)) {
    const err = new Error('walletAddress must be a valid EVM address');
    err.statusCode = 400;
    err.code = 'WALLET_ADDRESS_INVALID';
    throw err;
  }
  return raw.toLowerCase();
}

async function writeProofLog(payload) {
  try {
    await BlockchainProofLog.create(payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('BLOCKCHAIN_PROOF_LOG_WRITE_ERROR(identity):', err?.message ?? err);
  }
}

async function assertWalletAddressAvailable({ walletAddress, subjectType, subjectId }) {
  if (!walletAddress) return;

  const isPatient = subjectType === 'patient';
  const isHealthCenter = subjectType === 'healthcenter';

  const [existingPatient, existingHealthCenter] = await Promise.all([
    Patient.findOne({
      'blockchainIdentity.walletAddress': walletAddress,
      ...(isPatient ? { _id: { $ne: subjectId } } : {}),
    })
      .select('_id')
      .lean(),
    HealthCenter.findOne({
      'blockchainIdentity.walletAddress': walletAddress,
      ...(isHealthCenter ? { _id: { $ne: subjectId } } : {}),
    })
      .select('_id')
      .lean(),
  ]);

  if (existingPatient || existingHealthCenter) {
    const err = new Error('Wallet address is already linked to another account');
    err.statusCode = 409;
    err.code = 'WALLET_ADDRESS_ALREADY_USED';
    throw err;
  }
}

function buildIdentityReference({ subjectType, subjectId, uniqueSeed }) {
  const identitySalt = randomBytes(16).toString('hex');
  const identityHash = sha256Hex(
    canonicalJsonStringify({
      subjectType,
      subjectId: String(subjectId),
      uniqueSeed: String(uniqueSeed ?? ''),
      identitySalt,
    })
  );

  const identityId = `did:biotrack:${String(subjectType).toLowerCase()}:${identityHash.slice(0, 24)}`;
  return { identityId, identityHash, identitySalt };
}

function normalizeBlockchainIdentity(identity = {}) {
  return {
    identityId: String(identity.identityId ?? '').trim(),
    identityHash: String(identity.identityHash ?? '').trim(),
    identitySalt: String(identity.identitySalt ?? '').trim(),
    walletAddress: String(identity.walletAddress ?? '').trim().toLowerCase(),
    network: String(identity.network ?? '').trim(),
    txId: String(identity.txId ?? '').trim(),
    blockNumber: Number.isFinite(Number(identity.blockNumber)) ? Number(identity.blockNumber) : null,
    proofId: String(identity.proofId ?? '').trim(),
    anchoredAt: identity.anchoredAt ? new Date(identity.anchoredAt) : null,
    verificationStatus: String(identity.verificationStatus ?? 'pending').trim() || 'pending',
    errorMessage: String(identity.errorMessage ?? '').trim(),
  };
}

export async function provisionBlockchainIdentity({
  subjectType,
  subjectId,
  uniqueSeed,
  walletAddress = '',
  healthCenterId = null,
}) {
  const { identityId, identityHash, identitySalt } = buildIdentityReference({
    subjectType,
    subjectId,
    uniqueSeed,
  });

  const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
  await assertWalletAddressAvailable({ walletAddress: normalizedWalletAddress, subjectType, subjectId });
  const base = {
    identityId,
    identityHash,
    identitySalt,
    walletAddress: normalizedWalletAddress,
    network: '',
    txId: '',
    blockNumber: null,
    proofId: '',
    anchoredAt: null,
    verificationStatus: 'local_only',
    errorMessage: '',
  };

  if (!blockchainEnabled()) {
    await writeProofLog({
      kind: 'identity',
      status: 'skipped',
      subjectType,
      subjectId,
      healthCenterId,
      identityId,
      hash: identityHash,
      reason: 'BLOCKCHAIN_DISABLED',
      details: { verificationStatus: 'local_only' },
    });

    return base;
  }

  try {
    const contract = await getIdentityRegistryContract();
    if (!contract || typeof contract.registerIdentity !== 'function') {
      await writeProofLog({
        kind: 'identity',
        status: 'skipped',
        subjectType,
        subjectId,
        healthCenterId,
        identityId,
        hash: identityHash,
        reason: 'IDENTITY_CONTRACT_UNAVAILABLE',
      });
      return base;
    }

    const tx = await contract.registerIdentity(
      identityId,
      toBytes32Hex(identityHash),
      String(subjectType),
      String(subjectId)
    );
    const receipt = await tx.wait();

    const anchoredAt = nowDate();
    const network = await getBlockchainNetwork();
    const proofId = sha256Hex(`${tx.hash}:${identityId}:${identityHash}`);

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
      kind: 'identity',
      status: 'success',
      subjectType,
      subjectId,
      healthCenterId,
      identityId,
      hash: identityHash,
      network,
      contractAddress: getIdentityContractAddress(),
      txId: tx.hash,
      blockNumber: anchored.blockNumber,
      proofId,
      anchoredAt,
    });

    return anchored;
  } catch (err) {
    await writeProofLog({
      kind: 'identity',
      status: 'failed',
      subjectType,
      subjectId,
      healthCenterId,
      identityId,
      hash: identityHash,
      reason: err?.message ?? 'Identity anchoring failed',
      details: { code: err?.code ?? '' },
    });

    if (blockchainStrictMode()) {
      const strictErr = new Error(`Blockchain identity registration failed: ${err?.message ?? 'Unknown error'}`);
      strictErr.statusCode = 502;
      strictErr.code = 'BLOCKCHAIN_IDENTITY_ANCHOR_FAILED';
      throw strictErr;
    }

    return {
      ...base,
      verificationStatus: 'failed',
      errorMessage: err?.message ?? 'Identity anchoring failed',
    };
  }
}

export async function ensureBlockchainIdentityForDocument({
  doc,
  subjectType,
  uniqueSeed,
  walletAddress = '',
  healthCenterId = null,
}) {
  const existing = normalizeBlockchainIdentity(doc?.blockchainIdentity ?? {});
  if (existing.identityId && existing.identityHash) {
    if (walletAddress && !existing.walletAddress) {
      const normalizedWalletAddress = normalizeWalletAddress(walletAddress);
      await assertWalletAddressAvailable({ walletAddress: normalizedWalletAddress, subjectType, subjectId: doc._id });
      existing.walletAddress = normalizedWalletAddress;
      doc.blockchainIdentity = existing;
      await doc.save();
    }
    return { created: false, identity: existing };
  }

  const provisioned = await provisionBlockchainIdentity({
    subjectType,
    subjectId: doc._id,
    uniqueSeed,
    walletAddress,
    healthCenterId,
  });

  doc.blockchainIdentity = provisioned;
  await doc.save();

  return { created: true, identity: provisioned };
}

export async function verifyBlockchainIdentity(identity = {}, subject = {}) {
  const normalizedIdentity = normalizeBlockchainIdentity(identity);
  if (!normalizedIdentity.identityId || !normalizedIdentity.identityHash) {
    return { verified: false, onChain: false, reason: 'IDENTITY_REFERENCE_MISSING' };
  }

  if (!blockchainEnabled()) {
    return { verified: true, onChain: false, reason: 'BLOCKCHAIN_DISABLED' };
  }

  try {
    const contract = await getIdentityRegistryContract();
    if (!contract || typeof contract.isIdentityRegistered !== 'function') {
      return { verified: true, onChain: false, reason: 'IDENTITY_VERIFY_METHOD_UNAVAILABLE' };
    }

    const exists = await contract.isIdentityRegistered(
      normalizedIdentity.identityId,
      toBytes32Hex(normalizedIdentity.identityHash)
    );

    const verified = Boolean(exists);

    await writeProofLog({
      kind: 'verification',
      status: verified ? 'success' : 'failed',
      subjectType: subject.subjectType ?? 'unknown',
      subjectId: subject.subjectId ?? null,
      healthCenterId: subject.healthCenterId ?? null,
      identityId: normalizedIdentity.identityId,
      hash: normalizedIdentity.identityHash,
      network: await getBlockchainNetwork(),
      contractAddress: getIdentityContractAddress(),
      reason: verified ? 'IDENTITY_VERIFIED' : 'IDENTITY_NOT_FOUND_ON_CHAIN',
    });

    return {
      verified,
      onChain: true,
      reason: verified ? 'IDENTITY_VERIFIED' : 'IDENTITY_NOT_FOUND_ON_CHAIN',
    };
  } catch (err) {
    if (blockchainStrictMode()) {
      const strictErr = new Error(`Blockchain identity verification failed: ${err?.message ?? 'Unknown error'}`);
      strictErr.statusCode = 502;
      strictErr.code = 'BLOCKCHAIN_IDENTITY_VERIFY_FAILED';
      throw strictErr;
    }

    return {
      verified: false,
      onChain: true,
      reason: 'IDENTITY_VERIFY_ERROR',
      error: err?.message ?? 'Unknown error',
    };
  }
}
