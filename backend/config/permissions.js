/**
 * Permission Definitions for RBAC System
 * Defines all available resources and actions
 */

const RESOURCES = {
  USERS: 'users',
  ROLES: 'roles',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  CUSTOMERS: 'customers',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  REPORTS: 'reports',
  ANALYTICS: 'analytics',
  SHIPMENTS: 'shipments',
  INVENTORY: 'inventory',
  TEAMS: 'teams',
  DEPARTMENTS: 'departments',
  SETTINGS: 'settings',
  NOTIFICATIONS: 'notifications',
  SUPPLIERS: 'suppliers'
};

const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage' // Full control (all actions)
};

/**
 * Permission hierarchy - some actions imply others
 */
const PERMISSION_HIERARCHY = {
  manage: ['create', 'read', 'update', 'delete'],
  delete: ['read'],
  update: ['read'],
  create: ['read']
};

/**
 * Resource-specific permission rules
 */
const RESOURCE_RULES = {
  users: {
    description: 'User management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true // Users can always view/edit their own profile
  },
  orders: {
    description: 'Order management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true // Users can view their own orders
  },
  products: {
    description: 'Product catalog',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true // Suppliers can manage their own products
  },
  customers: {
    description: 'Customer management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  invoices: {
    description: 'Invoice management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  payments: {
    description: 'Payment processing',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  reports: {
    description: 'Reports and analytics',
    actions: [ACTIONS.READ]
  },
  analytics: {
    description: 'Analytics dashboard',
    actions: [ACTIONS.READ]
  },
  shipments: {
    description: 'Shipment tracking',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  inventory: {
    description: 'Inventory management',
    actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE]
  },
  teams: {
    description: 'Team management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  departments: {
    description: 'Department management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  settings: {
    description: 'System settings',
    actions: [ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE]
  },
  roles: {
    description: 'Role management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  }
};

/**
 * Check if an action implies another action based on hierarchy
 */
const actionImplies = (grantedAction, requiredAction) => {
  if (grantedAction === requiredAction) return true;
  
  const impliedActions = PERMISSION_HIERARCHY[grantedAction];
  return impliedActions ? impliedActions.includes(requiredAction) : false;
};

/**
 * Get all actions for a resource
 */
const getResourceActions = (resource) => {
  const rules = RESOURCE_RULES[resource];
  return rules ? rules.actions : [];
};

/**
 * Check if a resource has ownership rules
 */
const hasOwnershipRules = (resource) => {
  const rules = RESOURCE_RULES[resource];
  return rules ? rules.ownershipRules === true : false;
};

/**
 * Validate if action is valid for resource
 */
const isValidPermission = (resource, action) => {
  const validActions = getResourceActions(resource);
  return validActions.includes(action);
};

module.exports = {
  RESOURCES,
  ACTIONS,
  PERMISSION_HIERARCHY,
  RESOURCE_RULES,
  actionImplies,
  getResourceActions,
  hasOwnershipRules,
  isValidPermission
};
