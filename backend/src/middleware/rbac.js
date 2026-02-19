import { AdminConfig } from '../models/AdminConfig.js';

const RBAC_CACHE_TTL_MS = 15000;
let cache = {
  value: null,
  expiresAt: 0,
};

const DEFAULT_ADMIN_RBAC = Object.freeze({
  canManageUsers: true,
  canManagePolicies: true,
  canMonitorSystem: true,
  canMonitorBlockchain: true,
  canManageBackups: true,
});

async function readAdminRbacSettings() {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) return cache.value;

  const cfg = await AdminConfig.findOne({ key: 'global' }).select('rbac.admin').lean();
  const adminSettings = {
    ...DEFAULT_ADMIN_RBAC,
    ...(cfg?.rbac?.admin ?? {}),
  };

  cache = {
    value: adminSettings,
    expiresAt: now + RBAC_CACHE_TTL_MS,
  };

  return adminSettings;
}

export function invalidateAdminRbacCache() {
  cache = {
    value: null,
    expiresAt: 0,
  };
}

export function requireAdminCapability(capability) {
  return async (req, res, next) => {
    try {
      if (req.context?.role !== 'admin') {
        return res.status(403).json({
          error: {
            message: 'Admin role is required',
            code: 'RBAC_FORBIDDEN',
          },
        });
      }

      const adminRbac = await readAdminRbacSettings();
      const allowed = adminRbac?.[capability] !== false;
      if (!allowed) {
        return res.status(403).json({
          error: {
            message: `Admin capability '${capability}' is disabled by policy`,
            code: 'RBAC_FORBIDDEN',
          },
        });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
