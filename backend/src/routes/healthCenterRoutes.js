import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getMyHealthCenterProfile,
  listHealthCentersPublic,
  loginHealthCenter,
  registerHealthCenter,
  updateMyHealthCenterProfile,
} from '../controllers/healthCenterController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { authLoginLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../validation/authSchemas.js';
import { emptyBodySchema, healthCenterSelfUpdateSchema } from '../validation/apiSchemas.js';

export const healthCenterRoutes = Router();

console.log('Mounting healthCenterRoutes...');

healthCenterRoutes.get('/ping', (req, res) => res.send('pong'));

healthCenterRoutes.get('/', (req, res, next) => {
    console.log('GET /api/healthcenters hit');
    next();
}, listHealthCentersPublic);
healthCenterRoutes.post('/register', validateBody(emptyBodySchema), asyncHandler(registerHealthCenter));
healthCenterRoutes.post('/login', authLoginLimiter, validateBody(loginSchema), asyncHandler(loginHealthCenter));
healthCenterRoutes.get('/me', requireSessionAuth, requireRoles('healthcenter'), asyncHandler(getMyHealthCenterProfile));
healthCenterRoutes.patch(
  '/me',
  requireSessionAuth,
  requireRoles('healthcenter'),
  validateBody(healthCenterSelfUpdateSchema),
  asyncHandler(updateMyHealthCenterProfile)
);
