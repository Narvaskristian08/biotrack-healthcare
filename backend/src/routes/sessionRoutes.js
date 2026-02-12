import { Router } from 'express';
import { requireHealthCenterAuth, requireSessionAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logoutSession, startSession } from '../controllers/sessionController.js';

export const sessionRoutes = Router();

sessionRoutes.post('/start', requireHealthCenterAuth, asyncHandler(startSession));
sessionRoutes.post('/logout', requireSessionAuth, asyncHandler(logoutSession));

