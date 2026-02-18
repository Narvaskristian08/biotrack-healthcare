import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCsrfToken, loginWithGoogle, logoutAnySession } from '../controllers/authController.js';
import { authLoginLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { oauthGoogleSchema } from '../validation/authSchemas.js';

export const authRoutes = Router();

authRoutes.get('/csrf-token', asyncHandler(getCsrfToken));
authRoutes.post('/logout', asyncHandler(logoutAnySession));
authRoutes.post('/oauth/google', authLoginLimiter, validateBody(oauthGoogleSchema), asyncHandler(loginWithGoogle));

