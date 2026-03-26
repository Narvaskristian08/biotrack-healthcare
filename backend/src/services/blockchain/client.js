import { Contract, JsonRpcProvider, NonceManager, Wallet, getAddress, isAddress } from 'ethers';
import { env } from '../../config/env.js';
import { IDENTITY_REGISTRY_ABI, RECORD_PROOF_REGISTRY_ABI } from './abi.js';

let providerCache = null;
let signerCache = null;
let signerMetadataCache = null;
let identityContractCache = null;
let recordContractCache = null;
let testOverrides = {
  createProvider: null,
  createWallet: null,
  createIdentityContract: null,
  createRecordContract: null,
};

function trim(value) {
  return String(value ?? '').trim();
}

function normalizePrivateKey(privateKey) {
  const key = trim(privateKey);
  if (!key) return '';
  return key.startsWith('0x') ? key : `0x${key}`;
}

function normalizeAddress(addressValue, fieldName) {
  const raw = trim(addressValue);
  if (!raw) return '';
  if (!isAddress(raw)) {
    throw new Error(`${fieldName} must be a valid EVM address`);
  }
  return getAddress(raw);
}

function parsePrivateKeyRing(value) {
  const raw = trim(value);
  if (!raw) return [];

  return raw
    .split(',')
    .map((entry) => normalizePrivateKey(entry))
    .filter(Boolean);
}

function resolveSignerKeyConfig() {
  const ringKeys = parsePrivateKeyRing(env.BLOCKCHAIN_PRIVATE_KEYS);
  const fallbackKey = normalizePrivateKey(env.BLOCKCHAIN_PRIVATE_KEY);
  const keys = ringKeys.length > 0 ? ringKeys : (fallbackKey ? [fallbackKey] : []);

  if (keys.length === 0) {
    throw new Error('Missing blockchain signing key: set BLOCKCHAIN_PRIVATE_KEY or BLOCKCHAIN_PRIVATE_KEYS');
  }

  const keyIndex = Number(env.BLOCKCHAIN_ACTIVE_KEY_INDEX ?? 0);
  if (!Number.isInteger(keyIndex) || keyIndex < 0 || keyIndex >= keys.length) {
    throw new Error(`BLOCKCHAIN_ACTIVE_KEY_INDEX out of range: got ${keyIndex}, available keys=${keys.length}`);
  }

  return {
    privateKey: keys[keyIndex],
    keyIndex,
    totalKeys: keys.length,
  };
}

const MAINNET_CHAIN_IDS = new Set([
  '1', // Ethereum
  '10', // Optimism
  '56', // BSC
  '137', // Polygon
  '250', // Fantom
  '42161', // Arbitrum One
  '43114', // Avalanche C-Chain
  '8453', // Base
]);

const TEST_NETWORK_HINT = /(sepolia|goerli|holesky|mumbai|amoy|testnet|test|devnet|dev|localhost|local|anvil|hardhat|ganache)/i;
const MAINNET_HINT = /(mainnet|homestead)/i;

function hintLooksLikeMainnet(networkHint) {
  const hint = trim(networkHint).toLowerCase();
  if (!hint) return false;
  if (TEST_NETWORK_HINT.test(hint)) return false;
  return MAINNET_HINT.test(hint);
}

async function assertAllowedNetwork(provider) {
  if (!blockchainEnabled()) return;
  if (Boolean(env.BLOCKCHAIN_ALLOW_MAINNET)) return;

  const configuredNetwork = trim(env.BLOCKCHAIN_NETWORK);
  if (configuredNetwork) {
    if (hintLooksLikeMainnet(configuredNetwork)) {
      throw new Error('Mainnet network is blocked while BLOCKCHAIN_ALLOW_MAINNET=false');
    }
    if (TEST_NETWORK_HINT.test(configuredNetwork)) {
      return;
    }
  }

  if (!provider || typeof provider.getNetwork !== 'function') {
    throw new Error(
      'Unable to validate blockchain network safety; set BLOCKCHAIN_NETWORK explicitly or use a provider that supports getNetwork()'
    );
  }

  const network = await provider.getNetwork();
  const chainId = String(network?.chainId ?? '');
  const networkName = String(network?.name ?? '');

  if (MAINNET_CHAIN_IDS.has(chainId) || hintLooksLikeMainnet(networkName)) {
    throw new Error('Mainnet network is blocked while BLOCKCHAIN_ALLOW_MAINNET=false');
  }
}

function resetCaches() {
  providerCache = null;
  signerCache = null;
  signerMetadataCache = null;
  identityContractCache = null;
  recordContractCache = null;
}

export function __setBlockchainClientTestOverrides(overrides = {}) {
  testOverrides = {
    ...testOverrides,
    ...overrides,
  };
  resetCaches();
}

export function __resetBlockchainClientTestOverrides() {
  testOverrides = {
    createProvider: null,
    createWallet: null,
    createIdentityContract: null,
    createRecordContract: null,
  };
  resetCaches();
}

export function blockchainEnabled() {
  return Boolean(env.BLOCKCHAIN_ENABLED);
}

export function blockchainStrictMode() {
  return Boolean(env.BLOCKCHAIN_STRICT_MODE);
}

export function blockchainWriteDisabled() {
  return Boolean(env.BLOCKCHAIN_WRITE_DISABLED);
}

export function toBytes32Hex(hash) {
  const hex = trim(hash).replace(/^0x/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error('Hash must be a 32-byte hex string');
  }
  return `0x${hex}`;
}

function ensureConfigForEnabledMode() {
  if (!blockchainEnabled()) return;

  const missing = [];
  if (!trim(env.BLOCKCHAIN_RPC_URL)) missing.push('BLOCKCHAIN_RPC_URL');
  if (!trim(env.BLOCKCHAIN_PRIVATE_KEY) && !trim(env.BLOCKCHAIN_PRIVATE_KEYS)) {
    missing.push('BLOCKCHAIN_PRIVATE_KEY or BLOCKCHAIN_PRIVATE_KEYS');
  }
  if (missing.length) {
    throw new Error(`Missing blockchain config: ${missing.join(', ')}`);
  }
}

function normalizeRuntimeBytecode(code) {
  return trim(code).toLowerCase();
}

async function assertContractDeployment(contract, envVarName) {
  if (!blockchainEnabled() || !contract) return;

  const provider = contract?.runner?.provider ?? contract?.provider ?? contract?.runner ?? null;
  if (!provider || typeof provider.getCode !== 'function') return;

  const contractAddress = trim(contract?.target ?? contract?.address);
  if (!contractAddress) return;

  const code = normalizeRuntimeBytecode(await provider.getCode(contractAddress));
  if (!code || code === '0x' || code === '0x0') {
    throw new Error(
      `No contract deployed at ${envVarName} (${contractAddress}). Redeploy BioTrackRegistries.sol and update backend/.env.`
    );
  }
}

async function getProvider() {
  if (!providerCache) {
    ensureConfigForEnabledMode();
    const createdProvider = testOverrides.createProvider
      ? testOverrides.createProvider(env.BLOCKCHAIN_RPC_URL)
      : new JsonRpcProvider(env.BLOCKCHAIN_RPC_URL);
    await assertAllowedNetwork(createdProvider);
    providerCache = createdProvider;
  }
  return providerCache;
}

async function getSigner() {
  if (!signerCache) {
    const signerConfig = resolveSignerKeyConfig();
    const provider = await getProvider();
    const resolvedSigner = testOverrides.createWallet
      ? testOverrides.createWallet(signerConfig.privateKey, provider)
      : new NonceManager(new Wallet(signerConfig.privateKey, provider));
    signerCache = resolvedSigner;
    const rawAddress = typeof resolvedSigner?.getAddress === 'function'
      ? await resolvedSigner.getAddress()
      : resolvedSigner?.address;
    const configuredAddress = getAddress(rawAddress);
    const expectedAddress = normalizeAddress(env.BLOCKCHAIN_EXPECTED_SIGNER, 'BLOCKCHAIN_EXPECTED_SIGNER');
    if (expectedAddress && configuredAddress !== expectedAddress) {
      throw new Error(
        `BLOCKCHAIN_PRIVATE_KEY address mismatch: expected ${expectedAddress}, got ${configuredAddress}`
      );
    }
    signerMetadataCache = {
      address: configuredAddress,
      keyIndex: signerConfig.keyIndex,
      totalKeys: signerConfig.totalKeys,
    };
  }
  return signerCache;
}

export async function getSignerAddress() {
  if (!blockchainEnabled()) return '';
  const signer = await getSigner();
  const rawAddress = typeof signer?.getAddress === 'function' ? await signer.getAddress() : signer?.address;
  return getAddress(rawAddress);
}

export async function getSignerMetadata() {
  if (!blockchainEnabled()) {
    return {
      address: '',
      keyIndex: null,
      totalKeys: 0,
    };
  }

  await getSigner();
  return {
    address: String(signerMetadataCache?.address ?? ''),
    keyIndex: Number.isInteger(signerMetadataCache?.keyIndex) ? signerMetadataCache.keyIndex : null,
    totalKeys: Number.isInteger(signerMetadataCache?.totalKeys) ? signerMetadataCache.totalKeys : 0,
  };
}

export async function getBlockchainNetwork() {
  if (!blockchainEnabled()) return 'disabled';
  if (trim(env.BLOCKCHAIN_NETWORK)) return trim(env.BLOCKCHAIN_NETWORK);

  const provider = await getProvider();
  const network = await provider.getNetwork();
  return `${network.name}:${String(network.chainId)}`;
}

export async function getIdentityRegistryContract() {
  if (!blockchainEnabled()) return null;
  if (!trim(env.BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS)) return null;

  if (!identityContractCache) {
    const signer = await getSigner();
    identityContractCache = testOverrides.createIdentityContract
      ? testOverrides.createIdentityContract({
        address: env.BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        signer,
      })
      : new Contract(
        env.BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS,
        IDENTITY_REGISTRY_ABI,
        signer
      );
  }

  await assertContractDeployment(identityContractCache, 'BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS');

  return identityContractCache;
}

export async function getRecordProofContract() {
  if (!blockchainEnabled()) return null;
  if (!trim(env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS)) return null;

  if (!recordContractCache) {
    const signer = await getSigner();
    recordContractCache = testOverrides.createRecordContract
      ? testOverrides.createRecordContract({
        address: env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS,
        abi: RECORD_PROOF_REGISTRY_ABI,
        signer,
      })
      : new Contract(
        env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS,
        RECORD_PROOF_REGISTRY_ABI,
        signer
      );
  }

  await assertContractDeployment(recordContractCache, 'BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS');

  return recordContractCache;
}

export function getIdentityContractAddress() {
  return trim(env.BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS);
}

export function getRecordContractAddress() {
  return trim(env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS);
}

export async function assertContractWriteAccess(contract) {
  if (!blockchainEnabled() || blockchainWriteDisabled() || !contract) return;

  const signerAddress = String(await getSignerAddress()).toLowerCase();

  if (typeof contract.writesPaused === 'function') {
    const paused = Boolean(await contract.writesPaused());
    if (paused) {
      throw new Error('Contract writes are paused');
    }
  }

  if (typeof contract.owner !== 'function' || typeof contract.writers !== 'function') {
    return;
  }

  const owner = String(await contract.owner()).trim().toLowerCase();
  if (owner === signerAddress) return;

  const allowed = Boolean(await contract.writers(signerAddress));
  if (!allowed) {
    throw new Error(`Signer ${signerAddress} is not authorized as writer`);
  }
}
