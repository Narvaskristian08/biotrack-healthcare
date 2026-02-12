import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdminAuth } from '../middleware/auth.js';
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
adminRoutes.post('/register', asyncHandler(registerAdmin));
adminRoutes.post('/login', asyncHandler(loginAdmin));

// Admin management
adminRoutes.post('/healthcenters', requireAdminAuth, asyncHandler(adminCreateHealthCenter));
adminRoutes.get('/overview', requireAdminAuth, asyncHandler(getAdminOverview));
adminRoutes.get('/users', requireAdminAuth, asyncHandler(listAdminUsers));
adminRoutes.post('/users', requireAdminAuth, asyncHandler(adminUpsertUser));
adminRoutes.patch('/users/:userRole/:userId', requireAdminAuth, asyncHandler(adminUpdateUser));
adminRoutes.post('/providers/:providerId/credential-status', requireAdminAuth, asyncHandler(approveProviderCredentials));

adminRoutes.get('/rbac', requireAdminAuth, asyncHandler(getRbacSettings));
adminRoutes.patch('/rbac', requireAdminAuth, asyncHandler(updateRbacSettings));

adminRoutes.get('/logs', requireAdminAuth, asyncHandler(listSystemLogs));
adminRoutes.get('/monitoring', requireAdminAuth, asyncHandler(getSystemMonitoring));

adminRoutes.get('/blockchain/overview', requireAdminAuth, asyncHandler(getBlockchainOverview));

adminRoutes.get('/governance', requireAdminAuth, asyncHandler(getDataGovernanceSettings));
adminRoutes.patch('/governance', requireAdminAuth, asyncHandler(updateDataGovernanceSettings));
adminRoutes.post('/governance/backup', requireAdminAuth, asyncHandler(runDatabaseBackup));
adminRoutes.post('/governance/restore', requireAdminAuth, asyncHandler(markRestoreOperation));

