import express from 'express';
import { getFallInsight } from '../controllers/fallInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { fallInsightSchema } from '../validation/apiSchemas.js';

export const fallInsightRoutes = express.Router();

fallInsightRoutes.post(
  '/fall-insight',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateBody(fallInsightSchema),
  getFallInsight
);
