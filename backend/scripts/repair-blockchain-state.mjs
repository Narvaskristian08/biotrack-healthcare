import mongoose from 'mongoose';
import { connectDb } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { Patient } from '../src/models/Patient.js';
import { PatientRecord } from '../src/models/PatientRecord.js';
import { ensureBlockchainIdentityForDocument } from '../src/services/blockchain/identity.service.js';
import { anchorRecordProof } from '../src/services/blockchain/recordProof.service.js';
import { resolvePiiField } from '../src/services/pii.service.js';

function trim(value) {
  return String(value ?? '').trim();
}

function resolveErrorMessage(error) {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error?.message === 'string') return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function buildFailedBlockchainState(existing = {}, error) {
  return {
    enabled: Boolean(existing?.enabled),
    network: trim(existing?.network),
    contractAddress: trim(existing?.contractAddress),
    txId: trim(existing?.txId),
    blockNumber: Number.isFinite(Number(existing?.blockNumber)) ? Number(existing.blockNumber) : null,
    proofId: trim(existing?.proofId),
    anchoredAt: existing?.anchoredAt ? new Date(existing.anchoredAt) : null,
    lastVerifiedAt: existing?.lastVerifiedAt ? new Date(existing.lastVerifiedAt) : null,
    verificationStatus: 'failed',
    errorMessage: resolveErrorMessage(error),
  };
}

async function repairPatients() {
  const patients = await Patient.find({
    $or: [
      { 'blockchainIdentity.identityId': '' },
      { 'blockchainIdentity.identityId': { $exists: false } },
      { 'blockchainIdentity.verificationStatus': 'pending' },
      { 'blockchainIdentity.verificationStatus': 'failed' },
      {
        'blockchainIdentity.verificationStatus': 'local_only',
        $or: [
          { 'blockchainIdentity.txId': '' },
          { 'blockchainIdentity.txId': { $exists: false } },
        ],
      },
      {
        'blockchainIdentity.verificationStatus': 'anchored',
        $or: [
          { 'blockchainIdentity.txId': '' },
          { 'blockchainIdentity.txId': { $exists: false } },
          { 'blockchainIdentity.proofId': '' },
          { 'blockchainIdentity.proofId': { $exists: false } },
        ],
      },
    ],
  });

  let repaired = 0;
  let failed = 0;
  const patientById = new Map();

  for (const patient of patients) {
    try {
      const email =
        resolvePiiField({ encrypted: patient.emailEncrypted, fallback: patient.email, field: 'email' }) ||
        trim(patient.emailHash) ||
        String(patient._id);

      await ensureBlockchainIdentityForDocument({
        doc: patient,
        subjectType: 'patient',
        uniqueSeed: email,
        walletAddress: trim(patient.blockchainIdentity?.walletAddress),
        healthCenterId: patient.healthCenterId,
      });
      repaired += 1;
    } catch (error) {
      failed += 1;
      await Patient.updateOne(
        { _id: patient._id },
        {
          $set: {
            'blockchainIdentity.verificationStatus': 'failed',
            'blockchainIdentity.errorMessage': resolveErrorMessage(error),
          },
        }
      );
    }

    patientById.set(String(patient._id), patient);
  }

  return { repaired, failed, patientById };
}

async function repairRecords(patientById) {
  const records = await PatientRecord.find({
    'blockchain.enabled': true,
    'blockchain.verificationStatus': { $in: ['pending', 'failed', 'unanchored'] },
    $or: [
      { 'blockchain.txId': '' },
      { 'blockchain.txId': { $exists: false } },
    ],
  });

  let anchored = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of records) {
    let patient = patientById.get(String(record.patientId));
    if (!patient) {
      patient = await Patient.findById(record.patientId);
      if (patient) {
        patientById.set(String(patient._id), patient);
      }
    }

    if (!patient) {
      skipped += 1;
      await PatientRecord.updateOne(
        { _id: record._id },
        {
          $set: {
            blockchain: buildFailedBlockchainState(record.blockchain, 'Patient not found for blockchain repair'),
          },
        }
      );
      continue;
    }

    if (!trim(patient.blockchainIdentity?.identityId)) {
      try {
        const email =
          resolvePiiField({ encrypted: patient.emailEncrypted, fallback: patient.email, field: 'email' }) ||
          trim(patient.emailHash) ||
          String(patient._id);

        const result = await ensureBlockchainIdentityForDocument({
          doc: patient,
          subjectType: 'patient',
          uniqueSeed: email,
          walletAddress: trim(patient.blockchainIdentity?.walletAddress),
          healthCenterId: patient.healthCenterId,
        });
        patient.blockchainIdentity = result.identity;
      } catch (error) {
        failed += 1;
        await Patient.updateOne(
          { _id: patient._id },
          {
            $set: {
              'blockchainIdentity.verificationStatus': 'failed',
              'blockchainIdentity.errorMessage': resolveErrorMessage(error),
            },
          }
        );
        await PatientRecord.updateOne(
          { _id: record._id },
          {
            $set: {
              blockchain: buildFailedBlockchainState(record.blockchain, error),
            },
          }
        );
        continue;
      }
    }

    try {
      const anchoredState = await anchorRecordProof({
        healthCenterId: record.healthCenterId,
        patientId: record.patientId,
        recordId: record._id,
        identityId: trim(patient.blockchainIdentity?.identityId),
        recordHash: record.recordHash,
      });

      await PatientRecord.updateOne(
        { _id: record._id },
        {
          $set: {
            blockchain: {
              enabled: anchoredState.enabled,
              network: anchoredState.network,
              contractAddress: anchoredState.contractAddress,
              txId: anchoredState.txId,
              blockNumber: anchoredState.blockNumber,
              proofId: anchoredState.proofId,
              anchoredAt: anchoredState.anchoredAt,
              lastVerifiedAt: null,
              verificationStatus: anchoredState.verificationStatus,
              errorMessage: anchoredState.errorMessage,
            },
          },
        }
      );

      if (anchoredState.verificationStatus === 'anchored') {
        anchored += 1;
      } else {
        failed += 1;
      }
    } catch (error) {
      failed += 1;
      await PatientRecord.updateOne(
        { _id: record._id },
        {
          $set: {
            blockchain: buildFailedBlockchainState(
              {
                ...record.blockchain,
                contractAddress: trim(env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS),
              },
              error
            ),
          },
        }
      );
    }
  }

  return { anchored, failed, skipped };
}

async function main() {
  if (!trim(env.MONGODB_URI)) {
    throw new Error('MONGODB_URI is required');
  }

  await connectDb(env.MONGODB_URI);

  const patientRepair = await repairPatients();
  const recordRepair = await repairRecords(patientRepair.patientById);

  console.log(JSON.stringify({
    patientsRepaired: patientRepair.repaired,
    patientsFailed: patientRepair.failed,
    recordsAnchored: recordRepair.anchored,
    recordsFailed: recordRepair.failed,
    recordsSkipped: recordRepair.skipped,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(resolveErrorMessage(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
