import express from 'express';
import { getTrendInsight } from '../controllers/trendInsightController.js';

export const trendInsightRoutes = express.Router();

trendInsightRoutes.get('/trend-insight', getTrendInsight);
