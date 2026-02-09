import express from 'express';
import { getActivityInsight } from '../controllers/activityInsightController.js';

export const activityInsightRoutes = express.Router();

activityInsightRoutes.post('/activity-insight', getActivityInsight);
