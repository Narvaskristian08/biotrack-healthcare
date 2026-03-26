import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  const absolutePath = path.resolve(__dirname, '..', relativePath);
  return readFileSync(absolutePath, 'utf8');
}

test('identity-linked wallet export enforcement is wired through contract and backend', () => {
  const contractSource = readSource('contracts/BioTrackRegistries.sol');
  const identityServiceSource = readSource('src/services/blockchain/identity.service.js');
  const patientControllerSource = readSource('src/controllers/patientController.js');

  assert.match(contractSource, /function getIdentityWallet\(string calldata identityId\) external view returns \(address walletAddress, bool exists\)/);
  assert.match(contractSource, /IIdentityWalletResolver\(identityRegistry\)\.getIdentityWallet\(\s*entry\.identityId\s*\)/);
  assert.match(contractSource, /require\(identityExists, "Identity not found"\);/);
  assert.match(contractSource, /require\(msg\.sender == linkedWallet, "Not authorized export wallet"\);/);

  assert.match(identityServiceSource, /const tx = await contract\.registerIdentity\([\s\S]*?toContractWalletAddress\(normalizedWalletAddress\)/);
  assert.match(identityServiceSource, /const tx = await contract\.linkIdentityWallet\(identityId, normalizedWalletAddress\);/);

  assert.match(patientControllerSource, /Only the patient can link an export wallet/);
  assert.match(patientControllerSource, /const \{ identity \} = await ensureBlockchainIdentityForDocument\([\s\S]*?walletAddress: requestedWalletAddress/);
  assert.match(patientControllerSource, /Failed to link export wallet on-chain\. Please try again\./);
});
