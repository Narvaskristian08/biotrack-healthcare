import test from 'node:test';
import assert from 'node:assert/strict';

import { Admin } from '../src/models/Admin.js';
import { HealthCenter } from '../src/models/HealthCenter.js';
import {
  buildAdminOrProviderEmailConflictMessage,
  findExistingAdminOrProviderByEmail,
} from '../src/services/accountEmailConflict.service.js';

function createLeanQuery(result) {
  return {
    select() {
      return this;
    },
    async lean() {
      return result;
    },
  };
}

test('email conflict helper prefers matching admin accounts', async () => {
  const originalAdminFindOne = Admin.findOne;
  const originalHealthCenterFindOne = HealthCenter.findOne;
  let providerLookups = 0;

  Admin.findOne = () => createLeanQuery({ _id: 'admin-1' });
  HealthCenter.findOne = () => {
    providerLookups += 1;
    return createLeanQuery({ _id: 'provider-1' });
  };

  try {
    const conflict = await findExistingAdminOrProviderByEmail({
      hash: 'hash-admin',
      normalized: 'same@example.com',
    });

    assert.deepEqual(conflict, { role: 'admin', id: 'admin-1' });
    assert.equal(providerLookups, 0);
    assert.equal(buildAdminOrProviderEmailConflictMessage(conflict), 'Email is already used by an admin account');
  } finally {
    Admin.findOne = originalAdminFindOne;
    HealthCenter.findOne = originalHealthCenterFindOne;
  }
});

test('email conflict helper returns provider conflict when admin is absent', async () => {
  const originalAdminFindOne = Admin.findOne;
  const originalHealthCenterFindOne = HealthCenter.findOne;

  Admin.findOne = () => createLeanQuery(null);
  HealthCenter.findOne = () => createLeanQuery({ _id: 'provider-1' });

  try {
    const conflict = await findExistingAdminOrProviderByEmail({
      hash: 'hash-provider',
      normalized: 'provider@example.com',
    });

    assert.deepEqual(conflict, { role: 'provider', id: 'provider-1' });
    assert.equal(
      buildAdminOrProviderEmailConflictMessage(conflict),
      'Email is already used by a healthcare provider account'
    );
  } finally {
    Admin.findOne = originalAdminFindOne;
    HealthCenter.findOne = originalHealthCenterFindOne;
  }
});

test('email conflict helper ignores the current provider during provider email updates', async () => {
  const originalAdminFindOne = Admin.findOne;
  const originalHealthCenterFindOne = HealthCenter.findOne;

  Admin.findOne = () => createLeanQuery(null);
  HealthCenter.findOne = () => createLeanQuery({ _id: 'provider-1' });

  try {
    const conflict = await findExistingAdminOrProviderByEmail(
      {
        hash: 'hash-provider',
        normalized: 'provider@example.com',
      },
      { excludeProviderId: 'provider-1' }
    );

    assert.equal(conflict, null);
  } finally {
    Admin.findOne = originalAdminFindOne;
    HealthCenter.findOne = originalHealthCenterFindOne;
  }
});
