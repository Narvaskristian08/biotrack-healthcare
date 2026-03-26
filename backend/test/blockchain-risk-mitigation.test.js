import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildRecordHashV2 } from '../src/services/blockchain/recordHash.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  const absolutePath = path.resolve(__dirname, '..', relativePath);
  return readFileSync(absolutePath, 'utf8');
}

const contractSource = readSource('contracts/BioTrackRegistries.sol');
const envSource = readSource('src/config/env.js');
const clientSource = readSource('src/services/blockchain/client.js');
const recordProofSource = readSource('src/services/blockchain/recordProof.service.js');

test('Smart Contract Access mitigation is implemented', () => {
  assert.match(contractSource, /modifier onlyOwner\(\)/);
  assert.match(contractSource, /modifier onlyWriter\(\)/);
  assert.match(contractSource, /function setWritesPaused\(bool paused\) external onlyOwner/);
  assert.match(contractSource, /function setWriter\(address account, bool allowed\) external onlyOwner/);
  assert.match(contractSource, /function transferOwnership\(address newOwner\) external onlyOwner/);
  assert.match(contractSource, /function registerIdentity\([\s\S]*?\) external onlyWriter returns \(bytes32 proofId\)/);
  assert.match(contractSource, /function linkIdentityWallet\(string calldata identityId, address walletAddress\) external onlyWriter/);
  assert.match(contractSource, /function anchorRecord\([\s\S]*?\) external onlyWriter returns \(bytes32 proofId\)/);
  assert.match(contractSource, /function setIdentityRegistry\(address identityRegistryAddress\) external onlyOwner/);
});

test('Data Integrity mitigation is implemented and deterministic', () => {
  const basePayload = {
    healthCenterId: 'hc-1',
    patientId: 'pt-1',
    recordId: 'rec-1',
    type: 'vitals',
    capturedAt: '2026-01-01T00:00:00.000Z',
    recordNonce: 'nonce-1',
    data: {
      heartRate: 92,
      bpm: 92,
      nested: { b: 2, a: 1 },
    },
  };

  const reorderedPayload = {
    ...basePayload,
    data: {
      bpm: 92,
      heartRate: 92,
      nested: { a: 1, b: 2 },
    },
  };

  const baselineHash = buildRecordHashV2(basePayload);
  const reorderedHash = buildRecordHashV2(reorderedPayload);

  assert.equal(baselineHash, reorderedHash);
  assert.match(baselineHash, /^[a-f0-9]{64}$/);

  const changedValueHash = buildRecordHashV2({
    ...basePayload,
    data: { ...basePayload.data, heartRate: 93 },
  });
  const changedTimestampHash = buildRecordHashV2({
    ...basePayload,
    capturedAt: '2026-01-01T00:00:01.000Z',
  });

  assert.notEqual(baselineHash, changedValueHash);
  assert.notEqual(baselineHash, changedTimestampHash);
});

test('Replay Attack mitigation is implemented', () => {
  assert.match(contractSource, /mapping\(bytes32 => bool\) private anchoredRecordHashes;/);
  assert.match(contractSource, /require\(!anchoredRecordHashes\[recordHash\], "Record hash already anchored"\);/);
  assert.match(contractSource, /require\(!recordById\[recordKey\]\.exists, "Record already anchored"\);/);

  const baselineHash = buildRecordHashV2({
    healthCenterId: 'hc-1',
    patientId: 'pt-1',
    recordId: 'rec-1',
    type: 'vitals',
    capturedAt: '2026-01-02T00:00:00.000Z',
    recordNonce: 'nonce-1',
    data: { heartRate: 88 },
  });

  const differentNonceHash = buildRecordHashV2({
    healthCenterId: 'hc-1',
    patientId: 'pt-1',
    recordId: 'rec-1',
    type: 'vitals',
    capturedAt: '2026-01-02T00:00:00.000Z',
    recordNonce: 'nonce-2',
    data: { heartRate: 88 },
  });

  const differentRecordIdHash = buildRecordHashV2({
    healthCenterId: 'hc-1',
    patientId: 'pt-1',
    recordId: 'rec-2',
    type: 'vitals',
    capturedAt: '2026-01-02T00:00:00.000Z',
    recordNonce: 'nonce-1',
    data: { heartRate: 88 },
  });

  assert.notEqual(baselineHash, differentNonceHash);
  assert.notEqual(baselineHash, differentRecordIdHash);
});

test('Private Key Compromise mitigation is implemented', () => {
  assert.match(envSource, /BLOCKCHAIN_WRITE_DISABLED: toBool\(process\.env\.BLOCKCHAIN_WRITE_DISABLED, false\)/);
  assert.match(envSource, /BLOCKCHAIN_PRIVATE_KEYS: process\.env\.BLOCKCHAIN_PRIVATE_KEYS \?\? ''/);
  assert.match(envSource, /BLOCKCHAIN_ACTIVE_KEY_INDEX: toNumber\(process\.env\.BLOCKCHAIN_ACTIVE_KEY_INDEX, 0\)/);
  assert.match(envSource, /BLOCKCHAIN_ALLOW_MAINNET: toBool\(process\.env\.BLOCKCHAIN_ALLOW_MAINNET, false\)/);
  assert.match(clientSource, /BLOCKCHAIN_PRIVATE_KEY address mismatch: expected/);
  assert.match(clientSource, /BLOCKCHAIN_ACTIVE_KEY_INDEX out of range/);
  assert.match(clientSource, /if \(paused\) \{\s*throw new Error\('Contract writes are paused'\);/);
  assert.match(clientSource, /if \(!allowed\) \{\s*throw new Error\(`Signer \$\{signerAddress\} is not authorized as writer`\);/);
  assert.match(clientSource, /Mainnet network is blocked while BLOCKCHAIN_ALLOW_MAINNET=false/);
  assert.match(recordProofSource, /if \(blockchainWriteDisabled\(\)\) \{/);
  assert.match(recordProofSource, /reason: 'BLOCKCHAIN_WRITES_DISABLED'/);
});

test('Smart Contract Vulnerability mitigation is implemented', () => {
  assert.match(contractSource, /function setWritesPaused\(bool paused\) external onlyOwner/);
  assert.match(contractSource, /require\(bytes\(identityId\)\.length > 0, "identityId required"\);/);
  assert.match(contractSource, /require\(identityHash != bytes32\(0\), "identityHash required"\);/);
  assert.match(contractSource, /require\(walletAddress != address\(0\), "walletAddress required"\);/);
  assert.match(contractSource, /require\(bytes\(recordId\)\.length > 0, "recordId required"\);/);
  assert.match(contractSource, /require\(recordHash != bytes32\(0\), "recordHash required"\);/);
  assert.match(contractSource, /require\(!recordById\[recordKey\]\.exists, "Record already anchored"\);/);
  assert.match(contractSource, /require\(linkedWallet != address\(0\), "Export wallet not configured"\);/);
  assert.match(contractSource, /require\(msg\.sender == linkedWallet, "Not authorized export wallet"\);/);

  // Guard against regression where duplicate strict errors are incorrectly masked as generic 502s.
  assert.match(recordProofSource, /if \(err\?\.code === 'BLOCKCHAIN_RECORD_DUPLICATE_HASH'\) \{\s*throw err;\s*\}/);

  // Guard against malformed source reintroduction.
  assert.equal(contractSource.includes('}g'), false);
});
