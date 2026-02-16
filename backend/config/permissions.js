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
  SUPPLIERS: 'suppliers',
  // Warehouse Management Resources
  WAREHOUSE_SCAN: 'warehouse_scan',
  WAREHOUSE_LOCATIONS: 'warehouse_locations',
  WAREHOUSE_INVENTORY: 'warehouse_inventory',
  WAREHOUSE_DASHBOARD: 'warehouse_dashboard',
  WAREHOUSE_ANALYTICS: 'warehouse_analytics',
  WAREHOUSE_REPORTS: 'warehouse_reports',
  WAREHOUSE_AUDIT: 'warehouse_audit',
  WAREHOUSE_USERS: 'warehouse_users',
  RECEIVING: 'receiving',
  PICKING: 'picking',
  SHIPPING_SCAN: 'shipping_scan',
  PICK_LISTS: 'pick_lists',
  CYCLE_COUNTS: 'cycle_counts',
  // HR & Payroll Resources
  EMPLOYEES: 'employees',
  SCHEDULES: 'schedules',
  SCHEDULE_TEMPLATES: 'schedule_templates',
  TIME_CLOCK: 'time_clock',
  TIMESHEETS: 'timesheets',
  TIME_OFF: 'time_off',
  ATTENDANCE: 'attendance',
  OVERTIME: 'overtime',
  PAYROLL: 'payroll',
  PAYSTUBS: 'paystubs',
  PAYROLL_EXPORT: 'payroll_export',
  PAYROLL_REPORTS: 'payroll_reports',
  HR_REPORTS: 'hr_reports',
  HR_ANALYTICS: 'hr_analytics'
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
  },
  // Warehouse Management Resources
  warehouse_scan: {
    description: 'Warehouse scanning operations',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  warehouse_locations: {
    description: 'Warehouse bin and location management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  warehouse_inventory: {
    description: 'Warehouse inventory management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  warehouse_dashboard: {
    description: 'Warehouse dashboard and KPIs',
    actions: [ACTIONS.READ, ACTIONS.MANAGE]
  },
  warehouse_analytics: {
    description: 'Warehouse analytics and metrics',
    actions: [ACTIONS.READ]
  },
  warehouse_reports: {
    description: 'Warehouse reports',
    actions: [ACTIONS.READ]
  },
  warehouse_audit: {
    description: 'Warehouse audit logs',
    actions: [ACTIONS.READ]
  },
  warehouse_users: {
    description: 'Warehouse user management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  receiving: {
    description: 'Receiving operations',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  picking: {
    description: 'Picking operations',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  shipping_scan: {
    description: 'Shipping scan operations',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  pick_lists: {
    description: 'Pick list management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  cycle_counts: {
    description: 'Cycle count management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  // HR & Payroll Resources
  employees: {
    description: 'Employee management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  schedules: {
    description: 'Employee schedules',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  schedule_templates: {
    description: 'Schedule templates',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE]
  },
  time_clock: {
    description: 'Time clock operations',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  timesheets: {
    description: 'Timesheet management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  time_off: {
    description: 'Time off requests',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.DELETE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  attendance: {
    description: 'Attendance tracking',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  overtime: {
    description: 'Overtime management',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE],
    ownershipRules: true
  },
  payroll: {
    description: 'Payroll processing',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.UPDATE, ACTIONS.MANAGE]
  },
  paystubs: {
    description: 'Pay stubs',
    actions: [ACTIONS.CREATE, ACTIONS.READ, ACTIONS.MANAGE],
    ownershipRules: true
  },
  payroll_export: {
    description: 'Payroll export',
    actions: [ACTIONS.CREATE, ACTIONS.READ]
  },
  payroll_reports: {
    description: 'Payroll reports',
    actions: [ACTIONS.READ]
  },
  hr_reports: {
    description: 'HR reports',
    actions: [ACTIONS.READ]
  },
  hr_analytics: {
    description: 'HR analytics',
    actions: [ACTIONS.READ]
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
