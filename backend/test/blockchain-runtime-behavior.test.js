import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { BlockchainProofLog } from '../src/models/BlockchainProofLog.js';
import {
  __resetBlockchainClientTestOverrides,
  __setBlockchainClientTestOverrides,
  getSignerAddress,
  getSignerMetadata,
} from '../src/services/blockchain/client.js';
import { anchorRecordProof } from '../src/services/blockchain/recordProof.service.js';

const MUTABLE_ENV_KEYS = [
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
  'BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS',
];

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

async function withPatchedProofLogCreate(fn) {
  const originalCreate = BlockchainProofLog.create;
  BlockchainProofLog.create = async () => ({ ok: true });
  try {
    return await fn();
  } finally {
    BlockchainProofLog.create = originalCreate;
  }
}

test('key rotation: active index selects signer from key ring', async () => {
  const key0 = `0x${'11'.repeat(32)}`;
  const key1 = `0x${'22'.repeat(32)}`;
  let walletKeyUsed = '';

  await withPatchedEnv(
    {
      BLOCKCHAIN_ENABLED: true,
      BLOCKCHAIN_NETWORK: 'sepolia',
      BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
      BLOCKCHAIN_PRIVATE_KEY: '',
      BLOCKCHAIN_PRIVATE_KEYS: `${key0},${key1}`,
      BLOCKCHAIN_ACTIVE_KEY_INDEX: 1,
      BLOCKCHAIN_EXPECTED_SIGNER: '',
      BLOCKCHAIN_ALLOW_MAINNET: false,
    },
    async () => {
      __setBlockchainClientTestOverrides({
        createProvider: () => ({}),
        createWallet: (key) => {
          walletKeyUsed = key;
          return {
            address: '0x00000000000000000000000000000000000000aa',
          };
        },
      });

      const address = await getSignerAddress();
      const meta = await getSignerMetadata();

      assert.equal(walletKeyUsed.toLowerCase(), key1.toLowerCase());
      assert.equal(address, '0x00000000000000000000000000000000000000AA');
      assert.equal(meta.keyIndex, 1);
      assert.equal(meta.totalKeys, 2);
    }
  );
});

test('key rotation: invalid active index is rejected', async () => {
  const key0 = `0x${'11'.repeat(32)}`;
  const key1 = `0x${'22'.repeat(32)}`;

  await withPatchedEnv(
    {
      BLOCKCHAIN_ENABLED: true,
      BLOCKCHAIN_NETWORK: 'sepolia',
      BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
      BLOCKCHAIN_PRIVATE_KEY: '',
      BLOCKCHAIN_PRIVATE_KEYS: `${key0},${key1}`,
      BLOCKCHAIN_ACTIVE_KEY_INDEX: 4,
      BLOCKCHAIN_EXPECTED_SIGNER: '',
      BLOCKCHAIN_ALLOW_MAINNET: false,
    },
    async () => {
      __setBlockchainClientTestOverrides({
        createProvider: () => ({}),
      });

      await assert.rejects(
        async () => getSignerAddress(),
        /BLOCKCHAIN_ACTIVE_KEY_INDEX out of range/
      );
    }
  );
});

test('testnet-first safety: mainnet is blocked unless explicitly allowed', async () => {
  const key0 = `0x${'11'.repeat(32)}`;

  await withPatchedEnv(
    {
      BLOCKCHAIN_ENABLED: true,
      BLOCKCHAIN_NETWORK: '',
      BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
      BLOCKCHAIN_PRIVATE_KEY: key0,
      BLOCKCHAIN_PRIVATE_KEYS: '',
      BLOCKCHAIN_ACTIVE_KEY_INDEX: 0,
      BLOCKCHAIN_EXPECTED_SIGNER: '',
      BLOCKCHAIN_ALLOW_MAINNET: false,
    },
    async () => {
      __setBlockchainClientTestOverrides({
        createProvider: () => ({
          getNetwork: async () => ({ name: 'mainnet', chainId: 1n }),
        }),
        createWallet: () => ({
          address: '0x00000000000000000000000000000000000000aa',
        }),
      });

      await assert.rejects(
        async () => getSignerAddress(),
        /Mainnet network is blocked while BLOCKCHAIN_ALLOW_MAINNET=false/
      );
    }
  );
});

test('mainnet can be explicitly allowed for controlled release', async () => {
  const key0 = `0x${'11'.repeat(32)}`;

  await withPatchedEnv(
    {
      BLOCKCHAIN_ENABLED: true,
      BLOCKCHAIN_NETWORK: '',
      BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
      BLOCKCHAIN_PRIVATE_KEY: key0,
      BLOCKCHAIN_PRIVATE_KEYS: '',
      BLOCKCHAIN_ACTIVE_KEY_INDEX: 0,
      BLOCKCHAIN_EXPECTED_SIGNER: '',
      BLOCKCHAIN_ALLOW_MAINNET: true,
    },
    async () => {
      __setBlockchainClientTestOverrides({
        createProvider: () => ({
          getNetwork: async () => ({ name: 'mainnet', chainId: 1n }),
        }),
        createWallet: () => ({
          address: '0x00000000000000000000000000000000000000AA',
        }),
      });

      const address = await getSignerAddress();
      assert.equal(address, '0x00000000000000000000000000000000000000AA');
    }
  );
});

test('strict duplicate replay returns conflict code (not masked)', async () => {
  const key0 = `0x${'11'.repeat(32)}`;

  await withPatchedProofLogCreate(async () =>
    withPatchedEnv(
      {
        BLOCKCHAIN_ENABLED: true,
        BLOCKCHAIN_STRICT_MODE: true,
        BLOCKCHAIN_WRITE_DISABLED: false,
        BLOCKCHAIN_NETWORK: 'sepolia',
        BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
        BLOCKCHAIN_PRIVATE_KEY: key0,
        BLOCKCHAIN_PRIVATE_KEYS: '',
        BLOCKCHAIN_ACTIVE_KEY_INDEX: 0,
        BLOCKCHAIN_EXPECTED_SIGNER: '',
        BLOCKCHAIN_ALLOW_MAINNET: false,
        BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS: '0x00000000000000000000000000000000000000cc',
      },
      async () => {
        __setBlockchainClientTestOverrides({
          createProvider: () => ({}),
          createWallet: () => ({
            address: '0x00000000000000000000000000000000000000aa',
          }),
          createRecordContract: () => ({
            anchorRecord: async () => ({
              hash: '0xtest',
              wait: async () => ({ blockNumber: 1 }),
            }),
            writesPaused: async () => false,
            owner: async () => '0x00000000000000000000000000000000000000bb',
            writers: async () => true,
            isRecordHashAnchored: async () => true,
          }),
        });

        await assert.rejects(
          async () =>
            anchorRecordProof({
              patientId: 'pt-1',
              recordId: 'rec-1',
              identityId: 'did:biotrack:patient:abc',
              recordHash: 'a'.repeat(64),
            }),
          (err) => {
            assert.equal(err?.code, 'BLOCKCHAIN_RECORD_DUPLICATE_HASH');
            assert.equal(err?.statusCode, 409);
            return true;
          }
        );
      }
    )
  );
});

test('write kill switch returns unanchored state with explicit reason', async () => {
  const key0 = `0x${'11'.repeat(32)}`;

  await withPatchedProofLogCreate(async () =>
    withPatchedEnv(
      {
        BLOCKCHAIN_ENABLED: true,
        BLOCKCHAIN_STRICT_MODE: false,
        BLOCKCHAIN_WRITE_DISABLED: true,
        BLOCKCHAIN_NETWORK: 'sepolia',
        BLOCKCHAIN_RPC_URL: 'http://localhost:8545',
        BLOCKCHAIN_PRIVATE_KEY: key0,
        BLOCKCHAIN_PRIVATE_KEYS: '',
        BLOCKCHAIN_ACTIVE_KEY_INDEX: 0,
        BLOCKCHAIN_EXPECTED_SIGNER: '',
        BLOCKCHAIN_ALLOW_MAINNET: false,
        BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS: '0x00000000000000000000000000000000000000cc',
      },
      async () => {
        const result = await anchorRecordProof({
          patientId: 'pt-1',
          recordId: 'rec-1',
          identityId: 'did:biotrack:patient:abc',
          recordHash: 'a'.repeat(64),
        });

        assert.equal(result.verificationStatus, 'unanchored');
        assert.equal(result.errorMessage, 'BLOCKCHAIN_WRITES_DISABLED');
        assert.equal(result.txId, '');
      }
    )
  );
});
