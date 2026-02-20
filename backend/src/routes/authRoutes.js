import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCsrfToken, loginWithGoogle, logoutAnySession, pingAuthenticatedSession } from '../controllers/authController.js';
import { authLoginLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { oauthGoogleSchema } from '../validation/authSchemas.js';
import { emptyBodySchema } from '../validation/apiSchemas.js';
import { requireSessionAuth } from '../middleware/auth.js';

export const authRoutes = Router();

authRoutes.get('/csrf-token', asyncHandler(getCsrfToken));
authRoutes.get('/ping', requireSessionAuth, asyncHandler(pingAuthenticatedSession));
authRoutes.post('/logout', validateBody(emptyBodySchema), asyncHandler(logoutAnySession));
authRoutes.post('/oauth/google', authLoginLimiter, validateBody(oauthGoogleSchema), asyncHandler(loginWithGoogle));

