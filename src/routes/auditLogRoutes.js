import { Router } from 'express';
import { requireSessionAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listAuditLogs } from '../controllers/auditLogController.js';

export const auditLogRoutes = Router();

auditLogRoutes.get('/', requireSessionAuth, asyncHandler(listAuditLogs));

