import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { requireAdminCapability } from '../middleware/rbac.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { authLoginLimiter } from '../middleware/rateLimit.js';
import { adminRegisterSchema, adminUpsertSchema, loginSchema, providerCreateSchema } from '../validation/authSchemas.js';
import {
  emptyBodySchema,
  adminGovernanceUpdateSchema,
  blockchainMetricsQuerySchema,
  adminLogsQuerySchema,
  adminRbacUpdateSchema,
  adminUserUpdateParamsSchema,
  adminUserUpdateSchema,
  adminUsersQuerySchema,
  providerStatusParamsSchema,
  providerStatusUpdateSchema,
} from '../validation/apiSchemas.js';
import {
  adminCreateHealthCenter,
  adminUpdateUser,
  adminUpsertUser,
  approveProviderCredentials,
  getAdminOverview,
  getBlockchainOverview,
  getDataGovernanceSettings,
  getBlockchainMetrics,
  getRbacSettings,
  getSystemMonitoring,
  listAdminUsers,
  listSystemLogs,
  loginAdmin,
  markRestoreOperation,
  registerAdmin,
  runDatabaseBackup,
  updateDataGovernanceSettings,
  updateRbacSettings,
} from '../controllers/adminController.js';

export const adminRoutes = Router();

// Capstone bootstrap: create first admin
adminRoutes.post('/register', authLoginLimiter, validateBody(adminRegisterSchema), asyncHandler(registerAdmin));
adminRoutes.post('/login', authLoginLimiter, validateBody(loginSchema), asyncHandler(loginAdmin));

// Admin management
adminRoutes.post('/healthcenters', requireAdminAuth, validateBody(providerCreateSchema), asyncHandler(adminCreateHealthCenter));
adminRoutes.post('/barangays', requireAdminAuth, validateBody(providerCreateSchema), asyncHandler(adminCreateHealthCenter));
adminRoutes.get('/overview', requireAdminAuth, requireAdminCapability('canMonitorSystem'), asyncHandler(getAdminOverview));
adminRoutes.get('/users', requireAdminAuth, requireAdminCapability('canManageUsers'), validateQuery(adminUsersQuerySchema), asyncHandler(listAdminUsers));
adminRoutes.post('/users', requireAdminAuth, requireAdminCapability('canManageUsers'), validateBody(adminUpsertSchema), asyncHandler(adminUpsertUser));
adminRoutes.patch(
  '/users/:userRole/:userId',
  requireAdminAuth,
  requireAdminCapability('canManageUsers'),
  validateParams(adminUserUpdateParamsSchema),
  validateBody(adminUserUpdateSchema),
  asyncHandler(adminUpdateUser)
);
adminRoutes.post(
  '/providers/:providerId/credential-status',
  requireAdminAuth,
  requireAdminCapability('canManageUsers'),
  validateParams(providerStatusParamsSchema),
  validateBody(providerStatusUpdateSchema),
  asyncHandler(approveProviderCredentials)
);
adminRoutes.post(
  '/barangays/:providerId/status',
  requireAdminAuth,
  requireAdminCapability('canManageUsers'),
  validateParams(providerStatusParamsSchema),
  validateBody(providerStatusUpdateSchema),
  asyncHandler(approveProviderCredentials)
);

adminRoutes.get('/rbac', requireAdminAuth, requireAdminCapability('canManagePolicies'), asyncHandler(getRbacSettings));
adminRoutes.patch('/rbac', requireAdminAuth, requireAdminCapability('canManagePolicies'), validateBody(adminRbacUpdateSchema), asyncHandler(updateRbacSettings));

adminRoutes.get('/logs', requireAdminAuth, requireAdminCapability('canMonitorSystem'), validateQuery(adminLogsQuerySchema), asyncHandler(listSystemLogs));
adminRoutes.get('/monitoring', requireAdminAuth, requireAdminCapability('canMonitorSystem'), asyncHandler(getSystemMonitoring));

adminRoutes.get('/blockchain/overview', requireAdminAuth, requireAdminCapability('canMonitorBlockchain'), asyncHandler(getBlockchainOverview));
adminRoutes.get(
  '/blockchain/metrics',
  requireAdminAuth,
  requireAdminCapability('canMonitorBlockchain'),
  validateQuery(blockchainMetricsQuerySchema),
  asyncHandler(getBlockchainMetrics)
);

adminRoutes.get('/governance', requireAdminAuth, requireAdminCapability('canManagePolicies'), asyncHandler(getDataGovernanceSettings));
adminRoutes.patch('/governance', requireAdminAuth, requireAdminCapability('canManagePolicies'), validateBody(adminGovernanceUpdateSchema), asyncHandler(updateDataGovernanceSettings));
adminRoutes.post('/governance/backup', requireAdminAuth, requireAdminCapability('canManageBackups'), validateBody(emptyBodySchema), asyncHandler(runDatabaseBackup));
adminRoutes.post('/governance/restore', requireAdminAuth, requireAdminCapability('canManageBackups'), validateBody(emptyBodySchema), asyncHandler(markRestoreOperation));
