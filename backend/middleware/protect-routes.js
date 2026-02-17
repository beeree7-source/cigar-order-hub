/**
 * Route Protection Utilities
 * Helper functions to apply protection to routes
 */

const { verifyAuth } = require('./auth');
const { requirePermission, requireAdmin, requireManager } = require('./rbac');

/**
 * Standard protection: JWT or API key required
 */
const protect = verifyAuth;

/**
 * Admin-only routes
 */
const adminOnly = [verifyAuth, requireAdmin];

/**
 * Manager or Admin routes
 */
const managerOrAdmin = [verifyAuth, requireManager];

/**
 * Resource-specific protection factory
 */
const protectResource = (resource, action) => {
  return [verifyAuth, requirePermission(resource, action)];
};

/**
 * Apply protection to multiple routes
 */
const applyProtection = (app, routes, middleware) => {
  routes.forEach(route => {
    const { method, path, handler } = route;
    const allMiddleware = Array.isArray(middleware) ? middleware : [middleware];
    
    app[method.toLowerCase()](path, ...allMiddleware, handler);
  });
};

/**
 * Common protection patterns
 */
const PROTECTION_PATTERNS = {
  // Read operations - most roles can read
  READ: (resource) => protectResource(resource, 'read'),
  
  // Create operations - specific roles only
  CREATE: (resource) => protectResource(resource, 'create'),
  
  // Update operations - specific roles only
  UPDATE: (resource) => protectResource(resource, 'update'),
  
  // Delete operations - admin or manager typically
  DELETE: (resource) => protectResource(resource, 'delete'),
  
  // Management operations - admin only
  MANAGE: (resource) => protectResource(resource, 'manage')
};

module.exports = {
  protect,
  adminOnly,
  managerOrAdmin,
  protectResource,
  applyProtection,
  PROTECTION_PATTERNS
};
