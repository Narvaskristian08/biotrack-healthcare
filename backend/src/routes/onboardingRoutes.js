import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { rawUploadParser, validateRawUpload } from '../middleware/fileUpload.js';
import { validateBody } from '../middleware/validate.js';
import { municipalOnboardingCreateSchema } from '../validation/apiSchemas.js';
import { createMunicipalOnboardingRequest, uploadOnboardingFile } from '../controllers/onboardingController.js';

export const onboardingRoutes = express.Router();

onboardingRoutes.post('/uploads', rawUploadParser, validateRawUpload, asyncHandler(uploadOnboardingFile));
onboardingRoutes.post('/applications', validateBody(municipalOnboardingCreateSchema), asyncHandler(createMunicipalOnboardingRequest));
