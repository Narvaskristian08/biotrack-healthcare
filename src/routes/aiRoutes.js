import express from 'express';
import { analyzeVitals } from '../controllers/aiController.js';

export const aiRoutes = express.Router();

aiRoutes.post('/analyze', analyzeVitals);
