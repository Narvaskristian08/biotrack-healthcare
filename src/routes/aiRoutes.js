import express from 'express';
import { analyzeVitals } from '../controllers/aiController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';

export const aiRoutes = express.Router();

aiRoutes.post('/analyze', requireSessionAuth, requireRoles('healthcenter', 'patient'), analyzeVitals);
