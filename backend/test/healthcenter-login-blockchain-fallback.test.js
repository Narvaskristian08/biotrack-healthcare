import test from 'node:test';
import assert from 'node:assert/strict';

import { env } from '../src/config/env.js';
import { loginHealthCenter } from '../src/controllers/healthCenterController.js';
import { hashPassword } from '../src/services/authService.js';
import {
  __resetBlockchainClientTestOverrides,
  __setBlockchainClientTestOverrides,
} from '../src/services/blockchain/client.js';
import { HealthCenter } from '../src/models/HealthCenter.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { BlockchainProofLog } from '../src/models/BlockchainProofLog.js';

const MUTABLE_ENV_KEYS = [
  'NODE_ENV',
  'BLOCKCHAIN_ENABLED',
  'BLOCKCHAIN_STRICT_MODE',
  'BLOCKCHAIN_WRITE_DISABLED',
  'BLOCKCHAIN_NETWORK',
  'BLOCKCHAIN_RPC_URL',
  'BLOCKCHAIN_PRIVATE_KEY',
  'BLOCKCHAIN_PRIVATE_KEYS',
  'BLOCKCHAIN_ACTIVE_KEY_INDEX',
  'BLOCKCHAIN_EXPECTED_SIGNER',
  'BLOCKCHAIN_ALLOW_MAINNET',
  'BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS',
];

function createMockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function withPatchedEnv(patch, fn) {
  const previous = {};
  for (const key of MUTABLE_ENV_KEYS) {
    previous[key] = env[key];
  }
  Object.assign(env, patch);
  __resetBlockchainClientTestOverrides();

  try {
    return await fn();
  } finally {
    Object.assign(env, previous);
    __resetBlockchainClientTestOverrides();
  }
}

test('provider login tolerates recoverable blockchain provisioning errors in non-production', async () => {
  const originalFindOne = HealthCenter.findOne;
  const originalUpdateOne = HealthCenter.updateOne;
  const originalAuditCreate = AuditLog.create;
  const originalProofCreate = BlockchainProofLog.create;
  const originalConsoleError = console.error;

  const email = 'pines.family.clinic@baguiohealth.example.com';
  const healthCenterDoc = {
    _id: 'hc-001',
    email,
    emailHash: '',
    emailEncrypted: null,
    passwordHash: await hashPassword('Pines!Clinic26'),
    name: 'Irisan - Pines Family Wellness Center',
    holderName: '',
    holderNameEncrypted: null,
    status: 'active',
    barangayName: 'Irisan',
    cityMunicipality: 'Baguio City',
    healthCenterName: 'Pines Family Wellness Center',
    officialContactInfo: '',
    officialContactInfoEncrypted: null,
    address: '',
    addressEncrypted: null,
    contactNumber: '',
    contactNumberEncrypted: null,
    updatedAt: new Date(),
    blockchainIdentity: null,
    async save() {
      return this;
    },
  };

  let persistedFailure = null;
  const auditActions = [];

  HealthCenter.findOne = async () => healthCenterDoc;
  HealthCenter.updateOne = async (_query, payload) => {
    persistedFailure = payload;
    return { acknowledged: true };
  };
  AuditLog.create = async (payload) => {
    auditActions.push(payload.action);
    return { _id: 'audit-001' };
  };
  BlockchainProofLog.create = async () => ({ _id: 'proof-001' });
  console.error = () => {};

  try {
    await withPatchedEnv(
      {
        NODE_ENV: 'development',
        BLOCKCHAIN_ENABLED: true,
        BLOCKCHAIN_STRICT_MODE: true,
        BLOCKCHAIN_WRITE_DISABLED: false,
        BLOCKCHAIN_NETWORK: 'sepolia',
        BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
        BLOCKCHAIN_PRIVATE_KEY: `0x${'11'.repeat(32)}`,
        BLOCKCHAIN_PRIVATE_KEYS: '',
        BLOCKCHAIN_ACTIVE_KEY_INDEX: 0,
        BLOCKCHAIN_EXPECTED_SIGNER: '',
        BLOCKCHAIN_ALLOW_MAINNET: false,
        BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS: '0x00000000000000000000000000000000000000cc',
      },
      async () => {
        __setBlockchainClientTestOverrides({
          createProvider: () => ({}),
          createWallet: () => ({
            address: '0x00000000000000000000000000000000000000AA',
          }),
          createIdentityContract: () => ({
            isIdentityRegistered: async () => false,
            writesPaused: async () => false,
            owner: async () => '0x00000000000000000000000000000000000000BB',
            writers: async () => true,
            registerIdentity: async () => {
              const error = new Error('contract write failed');
              error.code = 'CALL_EXCEPTION';
              throw error;
            },
          }),
        });

        const req = {
          body: { email, password: 'Pines!Clinic26' },
          headers: {},
          context: {},
        };
        const res = createMockResponse();

        await loginHealthCenter(req, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.body?.healthCenter?.email, email);
        assert.equal(res.body?.healthCenter?.blockchainIdentity?.verificationStatus, 'failed');
        assert.equal(res.body?.healthCenter?.blockchainIdentity?.verified, false);
        assert.equal(res.body?.healthCenter?.blockchainIdentity?.onChain, false);
        assert.equal(
          persistedFailure?.$set?.['blockchainIdentity.verificationStatus'],
          'failed'
        );
        assert.match(
          String(persistedFailure?.$set?.['blockchainIdentity.errorMessage'] ?? ''),
          /Blockchain identity registration failed/
        );
        assert.equal(auditActions.includes('HEALTHCENTER.LOGIN'), true);
      }
    );
  } finally {
    HealthCenter.findOne = originalFindOne;
    HealthCenter.updateOne = originalUpdateOne;
    AuditLog.create = originalAuditCreate;
    BlockchainProofLog.create = originalProofCreate;
    console.error = originalConsoleError;
  }
});
