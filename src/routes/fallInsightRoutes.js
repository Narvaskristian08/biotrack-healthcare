import express from 'express';
import { getFallInsight } from '../controllers/fallInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';

export const fallInsightRoutes = express.Router();

fallInsightRoutes.post('/fall-insight', requireSessionAuth, requireRoles('healthcenter', 'patient'), getFallInsight);
