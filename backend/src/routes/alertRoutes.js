import express from 'express';
import { getAlerts } from '../controllers/alertController.js';
import { requireRoles, requireSessionAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { alertListQuerySchema } from '../validation/apiSchemas.js';

export const alertRoutes = express.Router();

alertRoutes.get('/alerts', requireSessionAuth, requireRoles('healthcenter', 'patient'), validateQuery(alertListQuerySchema), getAlerts);
