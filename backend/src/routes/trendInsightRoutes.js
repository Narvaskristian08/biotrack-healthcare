import express from 'express';
import { getTrendComparison, getTrendInsight } from '../controllers/trendInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { trendCompareQuerySchema, trendInsightQuerySchema } from '../validation/apiSchemas.js';

export const trendInsightRoutes = express.Router();

trendInsightRoutes.get(
  '/trend-insight',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateQuery(trendInsightQuerySchema),
  getTrendInsight
);

trendInsightRoutes.get(
  '/trend-compare',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateQuery(trendCompareQuerySchema),
  getTrendComparison
);
