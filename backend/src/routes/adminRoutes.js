import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { authLoginLimiter } from '../middleware/rateLimit.js';
import { adminRegisterSchema, adminUpsertSchema, loginSchema, providerCreateSchema } from '../validation/authSchemas.js';
import {
  adminCreateHealthCenter,
  adminUpdateUser,
  adminUpsertUser,
  approveProviderCredentials,
  getAdminOverview,
  getBlockchainOverview,
  getDataGovernanceSettings,
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
adminRoutes.get('/overview', requireAdminAuth, asyncHandler(getAdminOverview));
adminRoutes.get('/users', requireAdminAuth, asyncHandler(listAdminUsers));
adminRoutes.post('/users', requireAdminAuth, validateBody(adminUpsertSchema), asyncHandler(adminUpsertUser));
adminRoutes.patch('/users/:userRole/:userId', requireAdminAuth, asyncHandler(adminUpdateUser));
adminRoutes.post('/providers/:providerId/credential-status', requireAdminAuth, asyncHandler(approveProviderCredentials));
adminRoutes.post('/barangays/:providerId/status', requireAdminAuth, asyncHandler(approveProviderCredentials));

adminRoutes.get('/rbac', requireAdminAuth, asyncHandler(getRbacSettings));
adminRoutes.patch('/rbac', requireAdminAuth, asyncHandler(updateRbacSettings));

adminRoutes.get('/logs', requireAdminAuth, asyncHandler(listSystemLogs));
adminRoutes.get('/monitoring', requireAdminAuth, asyncHandler(getSystemMonitoring));

adminRoutes.get('/blockchain/overview', requireAdminAuth, asyncHandler(getBlockchainOverview));

adminRoutes.get('/governance', requireAdminAuth, asyncHandler(getDataGovernanceSettings));
adminRoutes.patch('/governance', requireAdminAuth, asyncHandler(updateDataGovernanceSettings));
adminRoutes.post('/governance/backup', requireAdminAuth, asyncHandler(runDatabaseBackup));
adminRoutes.post('/governance/restore', requireAdminAuth, asyncHandler(markRestoreOperation));
