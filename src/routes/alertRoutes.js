import express from 'express';
import { getAlerts } from '../controllers/alertController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';

export const alertRoutes = express.Router();

alertRoutes.get('/alerts', requireSessionAuth, requireRoles('healthcenter', 'patient'), getAlerts);
