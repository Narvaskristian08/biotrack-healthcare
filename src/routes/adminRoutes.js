import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { adminCreateHealthCenter, loginAdmin, registerAdmin } from '../controllers/adminController.js';

export const adminRoutes = Router();

// Capstone bootstrap: create first admin
adminRoutes.post('/register', asyncHandler(registerAdmin));
adminRoutes.post('/login', asyncHandler(loginAdmin));

// Admin management
adminRoutes.post('/healthcenters', requireAdminAuth, asyncHandler(adminCreateHealthCenter));

