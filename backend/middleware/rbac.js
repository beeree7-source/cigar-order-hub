/**
 * RBAC Authorization Middleware
 * Permission checking and resource validation
 */

const { checkPermission, validateResourceAccess } = require('../rbac');

/**
 * Middleware factory: Require specific permission
 */
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasPermission = await checkPermission(userId, resource, action);

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Permission denied',
          required: { resource, action }
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

/**
 * Middleware factory: Require resource ownership or permission
 */
const requireResourceAccess = (resource, action, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const resourceId = req.params[resourceIdParam];

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const hasAccess = await validateResourceAccess(userId, resource, action, resourceId);

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          required: { resource, action, resourceId }
        });
      }

      next();
    } catch (error) {
      console.error('Resource access check error:', error);
      return res.status(500).json({ error: 'Error checking access' });
    }
  };
};

/**
 * Middleware: Require admin role
 */
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has admin role
    const hasPermission = await checkPermission(userId, 'users', 'manage');

    if (!hasPermission) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: 'Error checking admin access' });
  }
};

/**
 * Middleware: Require manager role (or higher)
 */
const requireManager = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has manager permissions (can manage teams)
    const hasPermission = await checkPermission(userId, 'teams', 'manage');

    if (!hasPermission) {
      return res.status(403).json({ error: 'Manager access required' });
    }

    next();
  } catch (error) {
    console.error('Manager check error:', error);
    return res.status(500).json({ error: 'Error checking manager access' });
  }
};

/**
 * Middleware: Check if user can modify their own resource or has permission
 */
const requireOwnerOrPermission = (resource, action, ownerIdParam = 'id') => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const resourceOwnerId = req.params[ownerIdParam];

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user is the owner
      if (parseInt(resourceOwnerId) === parseInt(userId)) {
        return next();
      }

      // Check if user has permission
      const hasPermission = await checkPermission(userId, resource, action);

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You can only access your own resources or need appropriate permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Owner/permission check error:', error);
      return res.status(500).json({ error: 'Error checking access' });
    }
  };
};

module.exports = {
  requirePermission,
  requireResourceAccess,
  requireAdmin,
  requireManager,
  requireOwnerOrPermission
};
