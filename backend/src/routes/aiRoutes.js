import express from 'express';
import { analyzeVitals, clearMyMonitoringHistory } from '../controllers/aiController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { aiAnalyzeSchema } from '../validation/apiSchemas.js';

export const aiRoutes = express.Router();

aiRoutes.post('/analyze', requireSessionAuth, requireRoles('healthcenter', 'patient'), validateBody(aiAnalyzeSchema), analyzeVitals);
aiRoutes.delete('/history', requireSessionAuth, requireRoles('patient'), clearMyMonitoringHistory);
