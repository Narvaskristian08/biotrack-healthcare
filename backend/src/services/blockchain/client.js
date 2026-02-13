import { Contract, JsonRpcProvider, Wallet, getAddress, isAddress } from 'ethers';
import { env } from '../../config/env.js';
import { IDENTITY_REGISTRY_ABI, RECORD_PROOF_REGISTRY_ABI } from './abi.js';

let providerCache = null;
let signerCache = null;
let identityContractCache = null;
let recordContractCache = null;

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
  if (!trim(env.BLOCKCHAIN_PRIVATE_KEY)) missing.push('BLOCKCHAIN_PRIVATE_KEY');
  if (missing.length) {
    throw new Error(`Missing blockchain config: ${missing.join(', ')}`);
  }
}

async function getProvider() {
  if (!providerCache) {
    ensureConfigForEnabledMode();
    providerCache = new JsonRpcProvider(env.BLOCKCHAIN_RPC_URL);
  }
  return providerCache;
}

async function getSigner() {
  if (!signerCache) {
    const provider = await getProvider();
    signerCache = new Wallet(normalizePrivateKey(env.BLOCKCHAIN_PRIVATE_KEY), provider);
    const configuredAddress = getAddress(signerCache.address);
    const expectedAddress = normalizeAddress(env.BLOCKCHAIN_EXPECTED_SIGNER, 'BLOCKCHAIN_EXPECTED_SIGNER');
    if (expectedAddress && configuredAddress !== expectedAddress) {
      throw new Error(
        `BLOCKCHAIN_PRIVATE_KEY address mismatch: expected ${expectedAddress}, got ${configuredAddress}`
      );
    }
  }
  return signerCache;
}

export async function getSignerAddress() {
  if (!blockchainEnabled()) return '';
  const signer = await getSigner();
  return getAddress(signer.address);
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
    identityContractCache = new Contract(
      env.BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS,
      IDENTITY_REGISTRY_ABI,
      signer
    );
  }

  return identityContractCache;
}

export async function getRecordProofContract() {
  if (!blockchainEnabled()) return null;
  if (!trim(env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS)) return null;

  if (!recordContractCache) {
    const signer = await getSigner();
    recordContractCache = new Contract(
      env.BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS,
      RECORD_PROOF_REGISTRY_ABI,
      signer
    );
  }

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
