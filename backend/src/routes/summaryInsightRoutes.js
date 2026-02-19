import express from 'express';
import { getHealthSummary } from '../controllers/summaryInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { summaryInsightQuerySchema } from '../validation/apiSchemas.js';

export const summaryInsightRoutes = express.Router();

summaryInsightRoutes.get(
  '/summary',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateQuery(summaryInsightQuerySchema),
  getHealthSummary
);
