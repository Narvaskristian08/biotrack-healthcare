import { Router } from 'express';
import { requireSessionAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { listAuditLogs } from '../controllers/auditLogController.js';
import { validateQuery } from '../middleware/validate.js';
import { auditLogListQuerySchema } from '../validation/apiSchemas.js';

export const auditLogRoutes = Router();

auditLogRoutes.get('/', requireSessionAuth, validateQuery(auditLogListQuerySchema), asyncHandler(listAuditLogs));

