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

test('patient routes intentionally support self-monitoring record submission and verification', () => {
  const patientRoutesSource = readSource('src/routes/patientRoutes.js');
  const mobileScanSource = readSource('../lib/features/home/data/services/scan_record_store.dart');

  assert.match(
    patientRoutesSource,
    /patientRoutes\.post\(\s*'\/:patientId\/records',[\s\S]*?requireRoles\('healthcenter', 'patient'\)/
  );
  assert.match(
    patientRoutesSource,
    /patientRoutes\.get\(\s*'\/:patientId\/records\/:recordId\/verify',[\s\S]*?requireRoles\('healthcenter', 'patient'\)/
  );
  assert.match(
    mobileScanSource,
    /_buildUri\('\/api\/patients\/\$\{session\.patientId\}\/records'\)/
  );
});

test('admin blockchain responsibilities remain supervisory and governance-focused', () => {
  const adminRoutesSource = readSource('src/routes/adminRoutes.js');
  const adminModelSource = readSource('src/models/Admin.js');
  const auditServiceSource = readSource('src/services/auditService.js');
  const governanceProofSource = readSource('src/services/blockchain/governanceProof.service.js');

  assert.match(adminRoutesSource, /adminRoutes\.get\(\s*'\/blockchain\/overview'/);
  assert.match(adminRoutesSource, /adminRoutes\.get\(\s*'\/blockchain\/metrics'/);
  assert.match(adminRoutesSource, /adminRoutes\.post\(\s*'\/blockchain\/archive'/);
  assert.equal(adminModelSource.includes('blockchainIdentity'), false);
  assert.match(auditServiceSource, /if \(shouldAnchorGovernanceAction\(action\)\)/);
  assert.match(governanceProofSource, /'ADMIN\.RBAC\.UPDATE'/);
  assert.match(governanceProofSource, /'ADMIN\.GOVERNANCE\.UPDATE'/);
  assert.match(governanceProofSource, /'ADMIN\.BACKUP\.RUN'/);
});
