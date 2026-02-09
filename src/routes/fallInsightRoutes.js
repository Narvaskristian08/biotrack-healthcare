import express from 'express';
import { getFallInsight } from '../controllers/fallInsightController.js';

export const fallInsightRoutes = express.Router();

fallInsightRoutes.post('/fall-insight', getFallInsight);
