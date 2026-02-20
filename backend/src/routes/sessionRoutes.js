import { Router } from 'express';
import { requireHealthCenterAuth, requireSessionAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logoutSession, startSession } from '../controllers/sessionController.js';
import { validateBody } from '../middleware/validate.js';
import { emptyBodySchema } from '../validation/apiSchemas.js';

export const sessionRoutes = Router();

sessionRoutes.post('/start', requireHealthCenterAuth, validateBody(emptyBodySchema), asyncHandler(startSession));
sessionRoutes.post('/logout', requireSessionAuth, validateBody(emptyBodySchema), asyncHandler(logoutSession));

