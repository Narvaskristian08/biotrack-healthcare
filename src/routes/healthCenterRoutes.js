import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginHealthCenter, registerHealthCenter } from '../controllers/healthCenterController.js';

export const healthCenterRoutes = Router();


healthCenterRoutes.post('/register', asyncHandler(registerHealthCenter));
healthCenterRoutes.post('/login', asyncHandler(loginHealthCenter));

