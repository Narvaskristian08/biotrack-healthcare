import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireSessionAuth } from '../middleware/auth.js';
import { createPatient, getPatient, listPatients, updatePatient } from '../controllers/patientController.js';
import { addPatientRecord, listPatientRecords } from '../controllers/patientRecordController.js';
import { loginPatient, registerPatientPublic } from '../controllers/patientAuthController.js';

export const patientRoutes = Router();

patientRoutes.post('/register', asyncHandler(registerPatientPublic));
patientRoutes.post('/login', asyncHandler(loginPatient));

patientRoutes.get('/', requireSessionAuth, asyncHandler(listPatients));
patientRoutes.post('/', requireSessionAuth, asyncHandler(createPatient));
patientRoutes.get('/:id', requireSessionAuth, asyncHandler(getPatient));
patientRoutes.patch('/:id', requireSessionAuth, asyncHandler(updatePatient));

patientRoutes.get('/:patientId/records', requireSessionAuth, asyncHandler(listPatientRecords));
patientRoutes.post('/:patientId/records', requireSessionAuth, asyncHandler(addPatientRecord));

