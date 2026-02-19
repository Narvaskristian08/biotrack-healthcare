import express from 'express';
import { getTrendInsight } from '../controllers/trendInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { trendInsightQuerySchema } from '../validation/apiSchemas.js';

export const trendInsightRoutes = express.Router();

trendInsightRoutes.get(
  '/trend-insight',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateQuery(trendInsightQuerySchema),
  getTrendInsight
);
