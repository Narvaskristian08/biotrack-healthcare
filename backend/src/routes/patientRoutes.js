import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requirePatientSelf, requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { createPatient, getPatient, listPatients, updatePatient } from '../controllers/patientController.js';
import { addPatientRecord, listPatientRecords, verifyPatientRecordIntegrity } from '../controllers/patientRecordController.js';
import { loginPatient, registerPatientPublic } from '../controllers/patientAuthController.js';

export const patientRoutes = Router();

patientRoutes.post('/register', asyncHandler(registerPatientPublic));
patientRoutes.post('/login', asyncHandler(loginPatient));

patientRoutes.get('/', requireSessionAuth, requireRoles('healthcenter'), asyncHandler(listPatients));
patientRoutes.post('/', requireSessionAuth, requireRoles('healthcenter'), asyncHandler(createPatient));
patientRoutes.get('/:id', requireSessionAuth, requireRoles('healthcenter', 'patient'), requirePatientSelf('id'), asyncHandler(getPatient));
patientRoutes.patch('/:id', requireSessionAuth, requireRoles('healthcenter'), asyncHandler(updatePatient));

patientRoutes.get('/:patientId/records', requireSessionAuth, requireRoles('healthcenter', 'patient'), requirePatientSelf('patientId'), asyncHandler(listPatientRecords));
patientRoutes.post('/:patientId/records', requireSessionAuth, requireRoles('healthcenter'), asyncHandler(addPatientRecord));
patientRoutes.get('/:patientId/records/:recordId/verify', requireSessionAuth, requireRoles('healthcenter', 'patient'), requirePatientSelf('patientId'), asyncHandler(verifyPatientRecordIntegrity));

