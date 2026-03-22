import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldAnchorGovernanceAction } from '../src/services/blockchain/governanceProof.service.js';

test('critical write and governance actions are eligible for blockchain anchoring', () => {
  assert.equal(shouldAnchorGovernanceAction('ADMIN.RBAC.UPDATE'), true);
  assert.equal(shouldAnchorGovernanceAction('PATIENT.MONITORING_HISTORY.CLEAR'), true);
  assert.equal(shouldAnchorGovernanceAction('RECORD.ADD'), true);
  assert.equal(shouldAnchorGovernanceAction('SESSION.LOGOUT'), false);
  assert.equal(shouldAnchorGovernanceAction('HEALTHCENTER.LOGIN'), false);
  assert.equal(shouldAnchorGovernanceAction(''), false);
});
