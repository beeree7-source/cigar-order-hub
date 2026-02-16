/**
 * Role Definitions for RBAC System
 * Defines all system roles with their descriptions and default permissions
 */

const ROLES = {
  ADMIN: {
    id: 1,
    name: 'Admin',
    description: 'Full system access with all permissions',
    permissions: {
      all: true
    },
    isSystemRole: true
  },
  
  MANAGER: {
    id: 2,
    name: 'Manager',
    description: 'Manage department users and approve actions',
    permissions: {
      users: ['read', 'update'],
      orders: ['read', 'update', 'delete'],
      reports: ['read'],
      teams: ['manage']
    },
    isSystemRole: true
  },
  
  SALES: {
    id: 3,
    name: 'Sales',
    description: 'Create and manage orders and customers',
    permissions: {
      orders: ['create', 'read', 'update'],
      customers: ['create', 'read', 'update'],
      products: ['read']
    },
    isSystemRole: true
  },
  
  SHIPPING: {
    id: 4,
    name: 'Shipping',
    description: 'Process orders and manage shipments',
    permissions: {
      orders: ['read', 'update'],
      shipments: ['create', 'read', 'update'],
      inventory: ['read']
    },
    isSystemRole: true
  },
  
  OFFICE: {
    id: 5,
    name: 'Office',
    description: 'Administrative and data entry tasks',
    permissions: {
      orders: ['read'],
      users: ['read'],
      reports: ['read'],
      customers: ['read']
    },
    isSystemRole: true
  },
  
  FINANCE: {
    id: 6,
    name: 'Finance',
    description: 'View invoices and manage payments',
    permissions: {
      invoices: ['create', 'read', 'update'],
      payments: ['create', 'read'],
      reports: ['read']
    },
    isSystemRole: true
  },
  
  SUPPLIER: {
    id: 7,
    name: 'Supplier',
    description: 'Manage products and view orders',
    permissions: {
      products: ['create', 'read', 'update'],
      orders: ['read'],
      analytics: ['read']
    },
    isSystemRole: true
  },
  
  // Warehouse Management Roles
  WAREHOUSE_WORKER: {
    id: 8,
    name: 'Warehouse Worker',
    description: 'Perform assigned scanning operations (receiving, picking, shipping)',
    permissions: {
      warehouse_scan: ['create', 'read'],
      warehouse_locations: ['read'],
      warehouse_inventory: ['read'],
      receiving: ['create', 'read', 'update'],
      picking: ['create', 'read', 'update'],
      shipping_scan: ['create', 'read', 'update']
    },
    isSystemRole: true
  },
  
  WAREHOUSE_SUPERVISOR: {
    id: 9,
    name: 'Warehouse Supervisor',
    description: 'Manage pick lists, view real-time inventory, manage locations',
    permissions: {
      warehouse_scan: ['create', 'read'],
      warehouse_locations: ['read', 'update', 'manage'],
      warehouse_inventory: ['read', 'update'],
      warehouse_dashboard: ['read'],
      receiving: ['create', 'read', 'update', 'manage'],
      picking: ['create', 'read', 'update', 'manage'],
      shipping_scan: ['create', 'read', 'update', 'manage'],
      pick_lists: ['create', 'read', 'update', 'manage']
    },
    isSystemRole: true
  },
  
  WAREHOUSE_MANAGER: {
    id: 10,
    name: 'Warehouse Manager',
    description: 'Full analytics, reporting, user management for warehouse',
    permissions: {
      warehouse_scan: ['create', 'read', 'update', 'delete', 'manage'],
      warehouse_locations: ['create', 'read', 'update', 'delete', 'manage'],
      warehouse_inventory: ['create', 'read', 'update', 'delete', 'manage'],
      warehouse_dashboard: ['read', 'manage'],
      warehouse_analytics: ['read'],
      warehouse_reports: ['read'],
      warehouse_audit: ['read'],
      warehouse_users: ['create', 'read', 'update', 'manage'],
      receiving: ['create', 'read', 'update', 'delete', 'manage'],
      picking: ['create', 'read', 'update', 'delete', 'manage'],
      shipping_scan: ['create', 'read', 'update', 'delete', 'manage'],
      pick_lists: ['create', 'read', 'update', 'delete', 'manage'],
      cycle_counts: ['create', 'read', 'update', 'delete', 'manage']
    },
    isSystemRole: true
  },
  
  // HR & Payroll Management Roles
  EMPLOYEE: {
    id: 11,
    name: 'Employee',
    description: 'View own schedule, punch in/out, request time off, view paystubs',
    permissions: {
      schedules: ['read'], // Own schedule only
      time_clock: ['create', 'read'], // Own punches only
      timesheets: ['read'], // Own timesheets only
      time_off: ['create', 'read'], // Own requests only
      paystubs: ['read'] // Own paystubs only
    },
    isSystemRole: true
  },
  
  SHIFT_SUPERVISOR: {
    id: 12,
    name: 'Shift Supervisor',
    description: 'Manage team schedules, approve timesheets, view punch history',
    permissions: {
      schedules: ['read', 'update'], // Team schedules
      time_clock: ['read', 'update'], // Team punches
      timesheets: ['read', 'update'], // Approve team timesheets
      time_off: ['read'], // View team time off
      attendance: ['read', 'update'], // Manage team attendance
      overtime: ['read'], // View team overtime
      hr_reports: ['read'] // Team reports
    },
    isSystemRole: true
  },
  
  HR_MANAGER: {
    id: 13,
    name: 'HR Manager',
    description: 'Create schedules, manage all employees, approve time off, generate reports',
    permissions: {
      employees: ['create', 'read', 'update', 'manage'],
      schedules: ['create', 'read', 'update', 'delete', 'manage'],
      time_clock: ['read', 'update', 'manage'],
      timesheets: ['read', 'update', 'manage'],
      time_off: ['read', 'update', 'manage'], // Approve all requests
      attendance: ['create', 'read', 'update', 'manage'],
      overtime: ['read', 'update', 'manage'],
      schedule_templates: ['create', 'read', 'update', 'delete'],
      hr_reports: ['read'],
      hr_analytics: ['read']
    },
    isSystemRole: true
  },
  
  PAYROLL_ADMIN: {
    id: 14,
    name: 'Payroll Admin',
    description: 'Process payroll, view payroll reports, export for accounting',
    permissions: {
      payroll: ['create', 'read', 'update', 'manage'],
      timesheets: ['read'], // Read-only for payroll processing
      overtime: ['read'], // View for payroll calculation
      employees: ['read'], // View employee info
      payroll_reports: ['read'],
      paystubs: ['create', 'read', 'manage'],
      payroll_export: ['create', 'read']
    },
    isSystemRole: true
  },
  
  LOCATION_MANAGER: {
    id: 15,
    name: 'Location Manager',
    description: 'Manage schedules and time for specific location',
    permissions: {
      schedules: ['create', 'read', 'update', 'delete'], // Location schedules
      time_clock: ['read', 'update'], // Location punches
      timesheets: ['read', 'update'], // Location timesheets
      time_off: ['read', 'update'], // Approve location requests
      attendance: ['read', 'update'], // Location attendance
      overtime: ['read'], // Location overtime
      employees: ['read'], // Location employees
      hr_reports: ['read'] // Location reports
    },
    isSystemRole: true
  },
  
  DEPARTMENT_MANAGER: {
    id: 16,
    name: 'Department Manager',
    description: 'Manage schedules and time for specific department',
    permissions: {
      schedules: ['create', 'read', 'update', 'delete'], // Department schedules
      time_clock: ['read', 'update'], // Department punches
      timesheets: ['read', 'update'], // Department timesheets
      time_off: ['read', 'update'], // Approve department requests
      attendance: ['read', 'update'], // Department attendance
      overtime: ['read'], // Department overtime
      employees: ['read'], // Department employees
      hr_reports: ['read'] // Department reports
    },
    isSystemRole: true
  }
};

/**
 * Get role by name
 */
const getRoleByName = (name) => {
  const roleKey = name.toUpperCase();
  return ROLES[roleKey] || null;
};

/**
 * Get role by ID
 */
const getRoleById = (id) => {
  return Object.values(ROLES).find(role => role.id === id) || null;
};

/**
 * Check if role is a system role
 */
const isSystemRole = (roleName) => {
  const role = getRoleByName(roleName);
  return role ? role.isSystemRole : false;
};

/**
 * Get all roles
 */
const getAllRoles = () => {
  return Object.values(ROLES);
};

module.exports = {
  ROLES,
  getRoleByName,
  getRoleById,
  isSystemRole,
  getAllRoles
};
