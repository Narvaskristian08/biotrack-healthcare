import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requirePatientSelf, requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { createPatient, getPatient, listPatientLoginHistory, listPatients, updatePatient } from '../controllers/patientController.js';
import {
  addPatientRecord,
  deletePatientRecord,
  getPatientRecord,
  listPatientRecords,
  validatePatientRecordUpload,
  verifyPatientRecordIntegrity,
} from '../controllers/patientRecordController.js';
import {
  loginPatient,
  requestPatientPasswordResetCode,
  resetPatientPasswordWithCode,
  verifyPatientLoginMfa,
  registerPatientPublic,
  sendPatientVerificationCode,
  verifyPatientRegistrationCode,
} from '../controllers/patientAuthController.js';
import { authLoginLimiter, authMfaVerifyLimiter } from '../middleware/rateLimit.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import {
  loginSchema,
  patientForgotPasswordSchema,
  patientLoginMfaVerifySchema,
  patientPublicRegisterSchema,
  patientResetPasswordSchema,
  verificationSendCodeSchema,
  verificationVerifyCodeSchema,
} from '../validation/authSchemas.js';
import {
  patientCreateSchema,
  patientIdParamsSchema,
  patientListQuerySchema,
  patientLoginHistoryQuerySchema,
  patientRecordCreateSchema,
  patientRecordParamsSchema,
  patientRecordVerifyParamsSchema,
  patientUpdateSchema,
} from '../validation/apiSchemas.js';
import { rawUploadParser, validateRawUpload } from '../middleware/fileUpload.js';

export const patientRoutes = Router();

patientRoutes.post('/register', validateBody(patientPublicRegisterSchema), asyncHandler(registerPatientPublic));
patientRoutes.post('/verification/send-code', validateBody(verificationSendCodeSchema), asyncHandler(sendPatientVerificationCode));
patientRoutes.post('/verification/verify-code', validateBody(verificationVerifyCodeSchema), asyncHandler(verifyPatientRegistrationCode));
patientRoutes.post('/login', authLoginLimiter, validateBody(loginSchema), asyncHandler(loginPatient));
patientRoutes.post('/login/verify-mfa', authMfaVerifyLimiter, validateBody(patientLoginMfaVerifySchema), asyncHandler(verifyPatientLoginMfa));
patientRoutes.post('/password/forgot', authLoginLimiter, validateBody(patientForgotPasswordSchema), asyncHandler(requestPatientPasswordResetCode));
patientRoutes.post('/password/reset', authMfaVerifyLimiter, validateBody(patientResetPasswordSchema), asyncHandler(resetPatientPasswordWithCode));

patientRoutes.get('/', requireSessionAuth, requireRoles('healthcenter'), validateQuery(patientListQuerySchema), asyncHandler(listPatients));
patientRoutes.post('/', requireSessionAuth, requireRoles('healthcenter'), validateBody(patientCreateSchema), asyncHandler(createPatient));
patientRoutes.get(
  '/:id',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateParams(patientIdParamsSchema),
  requirePatientSelf('id'),
  asyncHandler(getPatient)
);
patientRoutes.patch(
  '/:id',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateParams(patientIdParamsSchema),
  validateBody(patientUpdateSchema),
  requirePatientSelf('id'),
  asyncHandler(updatePatient)
);
patientRoutes.get(
  '/:id/login-history',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateParams(patientIdParamsSchema),
  validateQuery(patientLoginHistoryQuerySchema),
  requirePatientSelf('id'),
  asyncHandler(listPatientLoginHistory)
);

patientRoutes.get(
  '/:patientId/records',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateParams(patientRecordParamsSchema),
  requirePatientSelf('patientId'),
  asyncHandler(listPatientRecords)
);
patientRoutes.post(
  '/:patientId/records',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateParams(patientRecordParamsSchema),
  requirePatientSelf('patientId'),
  validateBody(patientRecordCreateSchema),
  asyncHandler(addPatientRecord)
);
patientRoutes.get(
  '/:patientId/records/:recordId',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateParams(patientRecordVerifyParamsSchema),
  requirePatientSelf('patientId'),
  asyncHandler(getPatientRecord)
);
patientRoutes.post(
  '/:patientId/records/upload/validate',
  requireSessionAuth,
  requireRoles('healthcenter'),
  validateParams(patientRecordParamsSchema),
  rawUploadParser,
  validateRawUpload,
  asyncHandler(validatePatientRecordUpload)
);
patientRoutes.get(
  '/:patientId/records/:recordId/verify',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateParams(patientRecordVerifyParamsSchema),
  requirePatientSelf('patientId'),
  asyncHandler(verifyPatientRecordIntegrity)
);
patientRoutes.delete(
  '/:patientId/records/:recordId',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateParams(patientRecordVerifyParamsSchema),
  requirePatientSelf('patientId'),
  asyncHandler(deletePatientRecord)
);
