import express from 'express';
import { getHealthSummary } from '../controllers/summaryInsightController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';

export const summaryInsightRoutes = express.Router();

summaryInsightRoutes.get('/summary', requireSessionAuth, requireRoles('healthcenter', 'patient'), getHealthSummary);
