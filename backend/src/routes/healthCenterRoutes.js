import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginHealthCenter, registerHealthCenter, listHealthCentersPublic } from '../controllers/healthCenterController.js';
import { authLoginLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../validation/authSchemas.js';

export const healthCenterRoutes = Router();

console.log('Mounting healthCenterRoutes...');

healthCenterRoutes.get('/ping', (req, res) => res.send('pong'));

healthCenterRoutes.get('/', (req, res, next) => {
    console.log('GET /api/healthcenters hit');
    next();
}, listHealthCentersPublic);
healthCenterRoutes.post('/register', asyncHandler(registerHealthCenter));
healthCenterRoutes.post('/login', authLoginLimiter, validateBody(loginSchema), asyncHandler(loginHealthCenter));
