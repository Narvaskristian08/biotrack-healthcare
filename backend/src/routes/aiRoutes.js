import express from 'express';
import { analyzeVitals, clearMyMonitoringHistory } from '../controllers/aiController.js';
import { listAiInsights } from '../controllers/aiInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { aiAnalyzeSchema, aiInsightListQuerySchema } from '../validation/apiSchemas.js';

export const aiRoutes = express.Router();

aiRoutes.post('/analyze', requireSessionAuth, requireRoles('healthcenter', 'patient'), validateBody(aiAnalyzeSchema), analyzeVitals);
aiRoutes.get('/insights', requireSessionAuth, requireRoles('healthcenter', 'patient'), validateQuery(aiInsightListQuerySchema), listAiInsights);
aiRoutes.delete('/history', requireSessionAuth, requireRoles('patient'), clearMyMonitoringHistory);
