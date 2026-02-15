/**
 * Role-Based Access Control (RBAC) Service
 * Handles permission checking, role assignment, and access control
 */

const db = require('./database');
const { RESOURCES, ACTIONS, actionImplies, hasOwnershipRules } = require('./config/permissions');
const { ROLES } = require('./config/roles');

/**
 * Check if user has permission for a specific resource and action
 */
const checkPermission = (userId, resource, action, resourceOwnerId = null) => {
  return new Promise((resolve, reject) => {
    // Get user's roles and their permissions
    const query = `
      SELECT r.name as role_name, r.permissions, rp.resource, rp.action, rp.allow
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE ur.user_id = ? 
        AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
    `;

    db.all(query, [userId], (err, rows) => {
      if (err) {
        return reject(err);
      }

      // Check for admin role (has all permissions)
      const isAdmin = rows.some(row => row.role_name === 'Admin');
      if (isAdmin) {
        return resolve(true);
      }

      // Check ownership rules - users can manage their own resources
      if (resourceOwnerId && resourceOwnerId === userId && hasOwnershipRules(resource)) {
        const ownerActions = ['read', 'update'];
        if (ownerActions.includes(action)) {
          return resolve(true);
        }
      }

      // Check explicit permissions
      const hasPermission = rows.some(row => {
        // Check role_permissions table
        if (row.resource === resource && row.allow) {
          return actionImplies(row.action, action);
        }

        // Check role's JSON permissions
        if (row.permissions) {
          try {
            const perms = JSON.parse(row.permissions);
            if (perms.all) return true; // Full access
            
            if (perms[resource]) {
              const actions = Array.isArray(perms[resource]) ? perms[resource] : [perms[resource]];
              return actions.some(a => actionImplies(a, action));
            }
          } catch (e) {
            // Invalid JSON, skip
          }
        }

        return false;
      });

      resolve(hasPermission);
    });
  });
};

/**
 * Assign a role to a user
 */
const assignRole = (userId, roleId, departmentId = null, assignedBy = null) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO user_roles (user_id, role_id, department_id, assigned_by)
      VALUES (?, ?, ?, ?)
    `;

    db.run(query, [userId, roleId, departmentId, assignedBy], function(err) {
      if (err) {
        // Check if it's a duplicate
        if (err.message.includes('UNIQUE')) {
          return reject(new Error('User already has this role in this department'));
        }
        return reject(err);
      }

      // Log audit event
      logAuditEvent(assignedBy, 'assign_role', 'user_roles', this.lastID, {
        userId,
        roleId,
        departmentId
      }).catch(console.error);

      resolve({ id: this.lastID, userId, roleId, departmentId });
    });
  });
};

/**
 * Revoke a role from a user
 */
const revokeRole = (userId, roleId, departmentId = null, revokedBy = null) => {
  return new Promise((resolve, reject) => {
    let query = `DELETE FROM user_roles WHERE user_id = ? AND role_id = ?`;
    const params = [userId, roleId];

    if (departmentId !== null) {
      query += ` AND department_id = ?`;
      params.push(departmentId);
    }

    db.run(query, params, function(err) {
      if (err) {
        return reject(err);
      }

      if (this.changes === 0) {
        return reject(new Error('Role assignment not found'));
      }

      // Log audit event
      logAuditEvent(revokedBy, 'revoke_role', 'user_roles', null, {
        userId,
        roleId,
        departmentId
      }).catch(console.error);

      resolve({ success: true, userId, roleId, departmentId });
    });
  });
};

/**
 * Create a custom role
 */
const createRole = (name, description, permissions, isSystemRole = false) => {
  return new Promise((resolve, reject) => {
    const permissionsJson = JSON.stringify(permissions);
    const query = `
      INSERT INTO roles (name, description, permissions, is_system_role)
      VALUES (?, ?, ?, ?)
    `;

    db.run(query, [name, description, permissionsJson, isSystemRole ? 1 : 0], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return reject(new Error('Role name already exists'));
        }
        return reject(err);
      }

      resolve({ id: this.lastID, name, description, permissions, isSystemRole });
    });
  });
};

/**
 * Get all permissions for a resource
 */
const getResourcePermissions = (roleId, resource) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT action, allow FROM role_permissions
      WHERE role_id = ? AND resource = ?
    `;

    db.all(query, [roleId, resource], (err, rows) => {
      if (err) {
        return reject(err);
      }

      const permissions = {};
      rows.forEach(row => {
        permissions[row.action] = row.allow === 1;
      });

      resolve(permissions);
    });
  });
};

/**
 * Check team access - verify user is member of team
 */
const checkTeamAccess = (userId, teamId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM user_teams
      WHERE user_id = ? AND team_id = ?
    `;

    db.get(query, [userId, teamId], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(!!row);
    });
  });
};

/**
 * Get all effective permissions for a user
 */
const getEffectivePermissions = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT r.name as role_name, r.permissions, rp.resource, rp.action, rp.allow
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE ur.user_id = ?
        AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
    `;

    db.all(query, [userId], (err, rows) => {
      if (err) {
        return reject(err);
      }

      const effectivePermissions = {};

      rows.forEach(row => {
        // Check if admin
        if (row.role_name === 'Admin') {
          effectivePermissions.admin = true;
          return;
        }

        // Process role_permissions table
        if (row.resource && row.action) {
          if (!effectivePermissions[row.resource]) {
            effectivePermissions[row.resource] = [];
          }
          if (row.allow && !effectivePermissions[row.resource].includes(row.action)) {
            effectivePermissions[row.resource].push(row.action);
          }
        }

        // Process JSON permissions
        if (row.permissions) {
          try {
            const perms = JSON.parse(row.permissions);
            if (perms.all) {
              effectivePermissions.admin = true;
              return;
            }

            Object.keys(perms).forEach(resource => {
              if (!effectivePermissions[resource]) {
                effectivePermissions[resource] = [];
              }
              const actions = Array.isArray(perms[resource]) ? perms[resource] : [perms[resource]];
              actions.forEach(action => {
                if (!effectivePermissions[resource].includes(action)) {
                  effectivePermissions[resource].push(action);
                }
              });
            });
          } catch (e) {
            // Invalid JSON, skip
          }
        }
      });

      resolve(effectivePermissions);
    });
  });
};

/**
 * Validate resource-level access with ownership check
 */
const validateResourceAccess = async (userId, resource, action, resourceId = null) => {
  try {
    // First check general permission
    const hasPermission = await checkPermission(userId, resource, action);
    if (hasPermission) {
      return true;
    }

    // If no general permission and resourceId provided, check ownership
    if (resourceId && hasOwnershipRules(resource)) {
      // Get resource owner based on resource type
      const ownerId = await getResourceOwner(resource, resourceId);
      if (ownerId === userId) {
        return await checkPermission(userId, resource, action, ownerId);
      }
    }

    return false;
  } catch (error) {
    console.error('Error validating resource access:', error);
    return false;
  }
};

/**
 * Get owner of a resource
 */
const getResourceOwner = (resource, resourceId) => {
  return new Promise((resolve, reject) => {
    let query;
    let ownerField;

    switch (resource) {
      case 'orders':
        ownerField = 'retailer_id';
        query = `SELECT ${ownerField} as owner_id FROM orders WHERE id = ?`;
        break;
      case 'products':
        ownerField = 'supplierId';
        query = `SELECT ${ownerField} as owner_id FROM products WHERE id = ?`;
        break;
      case 'users':
        query = `SELECT id as owner_id FROM users WHERE id = ?`;
        break;
      default:
        return resolve(null);
    }

    db.get(query, [resourceId], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row ? row.owner_id : null);
    });
  });
};

/**
 * Log audit event (helper function)
 */
const logAuditEvent = (userId, action, resource, resourceId = null, details = {}) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO audit_logs (user_id, action, resource, resource_id, details, status)
      VALUES (?, ?, ?, ?, ?, 'success')
    `;

    const detailsJson = JSON.stringify(details);

    db.run(query, [userId, action, resource, resourceId, detailsJson], function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ id: this.lastID });
    });
  });
};

/**
 * Get user roles with details
 */
const getUserRoles = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        r.id, r.name, r.description, r.permissions,
        ur.department_id, d.name as department_name,
        ur.assigned_at, ur.expires_at
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN departments d ON ur.department_id = d.id
      WHERE ur.user_id = ?
        AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
    `;

    db.all(query, [userId], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
};

module.exports = {
  checkPermission,
  assignRole,
  revokeRole,
  createRole,
  getResourcePermissions,
  checkTeamAccess,
  getEffectivePermissions,
  validateResourceAccess,
  getUserRoles,
  logAuditEvent
};
