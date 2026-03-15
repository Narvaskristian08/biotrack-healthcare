import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ContractFactory, JsonRpcProvider, Wallet } from 'ethers';
import solc from 'solc';
import { env } from '../src/config/env.js';

function trim(value) {
  return String(value ?? '').trim();
}

function normalizePrivateKey(privateKey) {
  const key = trim(privateKey);
  if (!key) return '';
  return key.startsWith('0x') ? key : `0x${key}`;
}

function parsePrivateKeyRing(value) {
  const raw = trim(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => normalizePrivateKey(entry))
    .filter(Boolean);
}

function resolveSignerPrivateKey() {
  const ringKeys = parsePrivateKeyRing(env.BLOCKCHAIN_PRIVATE_KEYS);
  const fallbackKey = normalizePrivateKey(env.BLOCKCHAIN_PRIVATE_KEY);
  const keys = ringKeys.length > 0 ? ringKeys : (fallbackKey ? [fallbackKey] : []);
  if (keys.length === 0) {
    throw new Error('Missing blockchain signing key: set BLOCKCHAIN_PRIVATE_KEY or BLOCKCHAIN_PRIVATE_KEYS');
  }

  const activeKeyIndex = Number(env.BLOCKCHAIN_ACTIVE_KEY_INDEX ?? 0);
  if (!Number.isInteger(activeKeyIndex) || activeKeyIndex < 0 || activeKeyIndex >= keys.length) {
    throw new Error(`BLOCKCHAIN_ACTIVE_KEY_INDEX out of range: got ${activeKeyIndex}, available keys=${keys.length}`);
  }

  return keys[activeKeyIndex];
}

function compileRegistriesContract() {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const contractPath = path.resolve(scriptDir, '../contracts/BioTrackRegistries.sol');
  const source = readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'BioTrackRegistries.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: 'paris',
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (Array.isArray(output.errors)) {
    const fatalErrors = output.errors.filter((entry) => entry.severity === 'error');
    if (fatalErrors.length > 0) {
      throw new Error(fatalErrors.map((entry) => entry.formattedMessage ?? entry.message).join('\n\n'));
    }
  }

  const identityRegistry = output.contracts?.['BioTrackRegistries.sol']?.IdentityRegistry;
  const recordProofRegistry = output.contracts?.['BioTrackRegistries.sol']?.RecordProofRegistry;
  if (!identityRegistry?.abi || !identityRegistry?.evm?.bytecode?.object) {
    throw new Error('Failed to compile IdentityRegistry');
  }
  if (!recordProofRegistry?.abi || !recordProofRegistry?.evm?.bytecode?.object) {
    throw new Error('Failed to compile RecordProofRegistry');
  }

  return {
    identityRegistry,
    recordProofRegistry,
  };
}

async function main() {
  const rpcUrl = trim(env.BLOCKCHAIN_RPC_URL);
  if (!rpcUrl) {
    throw new Error('BLOCKCHAIN_RPC_URL is required');
  }

  const provider = new JsonRpcProvider(rpcUrl);
  const signer = new Wallet(resolveSignerPrivateKey(), provider);
  const { identityRegistry, recordProofRegistry } = compileRegistriesContract();

  const identityFactory = new ContractFactory(
    identityRegistry.abi,
    `0x${identityRegistry.evm.bytecode.object}`,
    signer
  );
  const identityContract = await identityFactory.deploy();
  await identityContract.waitForDeployment();
  const identityAddress = await identityContract.getAddress();

  const recordFactory = new ContractFactory(
    recordProofRegistry.abi,
    `0x${recordProofRegistry.evm.bytecode.object}`,
    signer
  );
  const recordContract = await recordFactory.deploy(identityAddress);
  await recordContract.waitForDeployment();
  const recordAddress = await recordContract.getAddress();

  const network = await provider.getNetwork();

  console.log(JSON.stringify({
    rpcUrl,
    chainId: String(network.chainId),
    signerAddress: signer.address,
    identityRegistryAddress: identityAddress,
    recordProofRegistryAddress: recordAddress,
  }, null, 2));
  console.log('');
  console.log(`BLOCKCHAIN_IDENTITIES_CONTRACT_ADDRESS=${identityAddress}`);
  console.log(`BLOCKCHAIN_RECORDS_CONTRACT_ADDRESS=${recordAddress}`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
