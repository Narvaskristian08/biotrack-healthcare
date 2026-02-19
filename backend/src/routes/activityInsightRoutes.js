import express from 'express';
import { getActivityInsight } from '../controllers/activityInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { activityInsightSchema } from '../validation/apiSchemas.js';

export const activityInsightRoutes = express.Router();

activityInsightRoutes.post(
  '/activity-insight',
  requireSessionAuth,
  requireRoles('healthcenter', 'patient'),
  validateBody(activityInsightSchema),
  getActivityInsight
);
