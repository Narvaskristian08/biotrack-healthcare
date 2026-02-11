import express from 'express';
import { getActivityInsight } from '../controllers/activityInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';

export const activityInsightRoutes = express.Router();

activityInsightRoutes.post('/activity-insight', requireSessionAuth, requireRoles('healthcenter', 'patient'), getActivityInsight);
