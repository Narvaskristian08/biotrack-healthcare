import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { listPatients, getPatient } from '../src/controllers/patientController.js';
import { Patient } from '../src/models/Patient.js';
import { HealthCenter } from '../src/models/HealthCenter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  const absolutePath = path.resolve(__dirname, '..', relativePath);
  return readFileSync(absolutePath, 'utf8');
}

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

test('patient self-registration keeps selected health center in persistence path', () => {
  const source = readSource('src/controllers/patientAuthController.js');

  assert.match(source, /patient = await Patient\.create\(\{[\s\S]*?healthCenterId,/);
  assert.match(source, /Patient\.findOne\(\{ healthCenterId, email: normalizedEmail \}\)/);
  assert.match(source, /Patient\.findOne\(\{ healthCenterId, contactNumber: normalizedContactNumber \}\)/);
});

test('provider patient list is scoped to provider health center', async () => {
  const originalFind = Patient.find;
  let capturedQuery = null;

  Patient.find = (query) => {
    capturedQuery = query;
    return {
      select() {
        return this;
      },
      sort() {
        return this;
      },
      limit() {
        return this;
      },
      async lean() {
        return [{ _id: 'patient-1', healthCenterId: 'hc-001', firstName: 'Ana' }];
      },
    };
  };

  try {
    const req = {
      context: { healthCenterId: 'hc-001' },
      query: { search: 'Ana' },
    };
    const res = createMockResponse();
    await listPatients(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      patients: [{ _id: 'patient-1', healthCenterId: 'hc-001', firstName: 'Ana' }],
    });
    assert.equal(capturedQuery.healthCenterId, 'hc-001');
    assert.equal(capturedQuery.status, 'active');
    assert.deepEqual(
      capturedQuery.$or.map((entry) => Object.keys(entry)[0]),
      ['lastName', 'firstName', 'email', 'mrn']
    );
  } finally {
    Patient.find = originalFind;
  }
});

test('provider cannot fetch patient from another health center', async () => {
  const originalFindOne = Patient.findOne;
  let capturedQuery = null;

  Patient.findOne = (query) => {
    capturedQuery = query;
    return {
      select() {
        return this;
      },
      async lean() {
        return null;
      },
    };
  };

  try {
    const req = {
      context: { healthCenterId: 'hc-001' },
      params: { id: 'patient-999' },
    };
    const res = createMockResponse();
    await getPatient(req, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(capturedQuery, {
      _id: 'patient-999',
      healthCenterId: 'hc-001',
    });
    assert.deepEqual(res.body, {
      error: { message: 'Patient not found' },
    });
  } finally {
    Patient.findOne = originalFindOne;
  }
});

test('provider patient detail response resolves assigned center from patient healthCenterId', async () => {
  const originalFindOne = Patient.findOne;
  const originalFindById = HealthCenter.findById;
  let capturedPatientQuery = null;
  let capturedHealthCenterId = null;

  Patient.findOne = (query) => {
    capturedPatientQuery = query;
    return {
      select() {
        return this;
      },
      async lean() {
        return {
          _id: 'patient-1',
          healthCenterId: 'hc-001',
          firstName: 'Ana',
          lastName: 'Santos',
          email: 'ana@example.com',
        };
      },
    };
  };

  HealthCenter.findById = (id) => {
    capturedHealthCenterId = id;
    return {
      select() {
        return this;
      },
      async lean() {
        return {
          _id: 'hc-001',
          name: 'Dyan Lang, San Fabian',
          barangayName: 'San Fabian',
          cityMunicipality: 'San Fabian',
          healthCenterName: "Viari's Clinic",
          address: 'Barangay Hall',
          contactNumber: '09084538768',
          officialContactInfo: '09084538768',
        };
      },
    };
  };

  try {
    const req = {
      context: { healthCenterId: 'hc-001' },
      params: { id: 'patient-1' },
    };
    const res = createMockResponse();
    await getPatient(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedPatientQuery, {
      _id: 'patient-1',
      healthCenterId: 'hc-001',
    });
    assert.equal(capturedHealthCenterId, 'hc-001');
    assert.equal(res.body?.patient?.assignedHealthCenter?.id, 'hc-001');
  } finally {
    Patient.findOne = originalFindOne;
    HealthCenter.findById = originalFindById;
  }
});
