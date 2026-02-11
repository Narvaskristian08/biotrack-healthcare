import mongoose from 'mongoose';
import { Patient } from '../../models/Patient.js';

function httpError(statusCode, message, code = 'REQUEST_INVALID') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

async function assertPatientInHealthCenter(patientId, healthCenterId) {
  const found = await Patient.findOne({
    _id: patientId,
    healthCenterId,
  })
    .select('_id')
    .lean();

  if (!found) {
    throw httpError(404, 'Patient not found in this health center', 'PATIENT_NOT_FOUND');
  }

  return String(found._id);
}

export async function resolveInsightPatientId(req, options = {}) {
  const {
    source = 'query',
    field = 'patientId',
  } = options;

  if (req.context?.role === 'patient') {
    return String(req.context.patientId);
  }

  if (req.context?.role !== 'healthcenter') {
    throw httpError(403, 'Only patient or healthcenter roles are allowed', 'ROLE_FORBIDDEN');
  }

  const carrier = source === 'body' ? req.body : req.query;
  const patientId = String(carrier?.[field] ?? '').trim();
  if (!patientId) {
    throw httpError(400, `${field} is required for health center requests`, 'PATIENT_ID_REQUIRED');
  }

  if (!mongoose.isValidObjectId(patientId)) {
    throw httpError(400, `${field} must be a valid ObjectId`, 'PATIENT_ID_INVALID');
  }

  return assertPatientInHealthCenter(patientId, req.context.healthCenterId);
}
