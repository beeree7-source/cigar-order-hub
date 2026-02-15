-- ============================================
-- Enterprise Multi-Login & RBAC System Schema
-- Migration 005
-- ============================================

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  industry TEXT DEFAULT 'Cigar/Tobacco',
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT DEFAULT 'USA',
  status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
  subscription_tier_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  name TEXT CHECK(name IN ('Office', 'Sales', 'Shipping', 'Finance', 'Management')) NOT NULL,
  description TEXT,
  manager_id INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Roles Table
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT, -- JSON string for permissions data
  is_system_role BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Role Permissions Table (Granular permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  resource TEXT NOT NULL, -- e.g., 'orders', 'users', 'invoices'
  action TEXT CHECK(action IN ('create', 'read', 'update', 'delete', 'manage')) NOT NULL,
  allow BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(role_id, resource, action)
);

-- 5. User Roles Table (Many-to-Many)
CREATE TABLE IF NOT EXISTS user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  department_id INTEGER,
  assigned_by INTEGER,
  assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY(assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(user_id, role_id, department_id)
);

-- 6. Teams Table
CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  department_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lead_id INTEGER,
  member_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE CASCADE,
  FOREIGN KEY(lead_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 7. User Teams Table (Team membership)
CREATE TABLE IF NOT EXISTS user_teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  role_in_team TEXT DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE,
  UNIQUE(user_id, team_id)
);

-- 8. Login Methods Table
CREATE TABLE IF NOT EXISTS login_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  method_type TEXT CHECK(method_type IN ('email', 'sso', 'api_key', 'biometric')) NOT NULL,
  identifier TEXT NOT NULL, -- email, SSO provider, key name, etc.
  status TEXT CHECK(status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  metadata TEXT, -- JSON for additional data (provider details, etc.)
  last_used DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, method_type, identifier)
);

-- 9. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id INTEGER,
  details TEXT, -- JSON string for additional details
  ip_address TEXT,
  user_agent TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('success', 'failed')) DEFAULT 'success',
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. API Keys Table
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  permissions TEXT, -- JSON string for specific permissions
  last_used DATETIME,
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. MFA Settings Table
CREATE TABLE IF NOT EXISTS mfa_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT 0,
  method TEXT CHECK(method IN ('totp', 'sms', 'email')) DEFAULT 'totp',
  secret TEXT,
  backup_codes TEXT, -- JSON array of backup codes
  last_verified DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- Indexes for Performance Optimization
-- ============================================

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_departments_company ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_resource ON role_permissions(resource);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);
CREATE INDEX IF NOT EXISTS idx_login_methods_user ON login_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- Seed Data: Default Roles
-- ============================================

INSERT OR IGNORE INTO roles (id, name, description, permissions, is_system_role) VALUES
(1, 'Admin', 'Full system access with all permissions', '{"all": true}', 1),
(2, 'Manager', 'Manage department users and approve actions', '{"users": ["read", "update"], "orders": ["read", "update", "delete"], "reports": ["read"]}', 1),
(3, 'Sales', 'Create and manage orders and customers', '{"orders": ["create", "read", "update"], "customers": ["read", "create", "update"], "products": ["read"]}', 1),
(4, 'Shipping', 'Process orders and manage shipments', '{"orders": ["read", "update"], "shipments": ["create", "read", "update"], "inventory": ["read"]}', 1),
(5, 'Office', 'Administrative and data entry tasks', '{"orders": ["read"], "users": ["read"], "reports": ["read"]}', 1),
(6, 'Finance', 'View invoices and manage payments', '{"invoices": ["read", "create", "update"], "payments": ["read", "create"], "reports": ["read"]}', 1),
(7, 'Supplier', 'Manage products and view orders', '{"products": ["create", "read", "update"], "orders": ["read"], "analytics": ["read"]}', 1);

-- ============================================
-- Seed Data: Default Role Permissions
-- ============================================

-- Admin permissions (all resources)
INSERT OR IGNORE INTO role_permissions (role_id, resource, action, allow) VALUES
(1, 'users', 'manage', 1),
(1, 'roles', 'manage', 1),
(1, 'orders', 'manage', 1),
(1, 'products', 'manage', 1),
(1, 'invoices', 'manage', 1),
(1, 'reports', 'manage', 1),
(1, 'settings', 'manage', 1);

-- Manager permissions
INSERT OR IGNORE INTO role_permissions (role_id, resource, action, allow) VALUES
(2, 'users', 'read', 1),
(2, 'users', 'update', 1),
(2, 'orders', 'read', 1),
(2, 'orders', 'update', 1),
(2, 'orders', 'delete', 1),
(2, 'reports', 'read', 1),
(2, 'teams', 'manage', 1);

-- Sales permissions
INSERT OR IGNORE INTO role_permissions (role_id, resource, action, allow) VALUES
(3, 'orders', 'create', 1),
(3, 'orders', 'read', 1),
(3, 'orders', 'update', 1),
(3, 'customers', 'create', 1),
(3, 'customers', 'read', 1),
(3, 'customers', 'update', 1),
(3, 'products', 'read', 1);

-- Shipping permissions
INSERT OR IGNORE INTO role_permissions (role_id, resource, action, allow) VALUES
(4, 'orders', 'read', 1),
(4, 'orders', 'update', 1),
(4, 'shipments', 'create', 1),
(4, 'shipments', 'read', 1),
(4, 'shipments', 'update', 1),
(4, 'inventory', 'read', 1);

-- Office permissions
INSERT OR IGNORE INTO role_permissions (role_id, resource, action, allow) VALUES
(5, 'orders', 'read', 1),
(5, 'users', 'read', 1),
(5, 'reports', 'read', 1),
(5, 'customers', 'read', 1);

-- Finance permissions
INSERT OR IGNORE INTO role_permissions (role_id, resource, action, allow) VALUES
(6, 'invoices', 'create', 1),
(6, 'invoices', 'read', 1),
(6, 'invoices', 'update', 1),
(6, 'payments', 'create', 1),
(6, 'payments', 'read', 1),
(6, 'reports', 'read', 1);

-- Supplier permissions
INSERT OR IGNORE INTO role_permissions (role_id, resource, action, allow) VALUES
(7, 'products', 'create', 1),
(7, 'products', 'read', 1),
(7, 'products', 'update', 1),
(7, 'orders', 'read', 1),
(7, 'analytics', 'read', 1);

-- ============================================
-- Seed Data: Sample Company
-- ============================================

INSERT OR IGNORE INTO companies (id, name, industry, status) VALUES
(1, 'Default Company', 'Cigar/Tobacco', 'active');

-- ============================================
-- Seed Data: Sample Departments
-- ============================================

INSERT OR IGNORE INTO departments (id, company_id, name, description, is_active) VALUES
(1, 1, 'Management', 'Executive and management team', 1),
(2, 1, 'Sales', 'Sales and customer relations', 1),
(3, 1, 'Shipping', 'Shipping and logistics', 1),
(4, 1, 'Finance', 'Finance and accounting', 1),
(5, 1, 'Office', 'Administrative staff', 1);
