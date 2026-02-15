const express = require("express");
const cors = require("cors");
const { registerUser, approveUser, uploadLicense, getUsers } = require("./users");
const { createOrder, getOrders } = require("./orders");
const { authenticateToken, login } = require("./auth");
const app = express();

const PORT = process.env.PORT || 4000;

// CORS configuration to allow requests from Vercel frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

// Public routes
app.get("/", (req, res) => {
  res.json({ message: "Cigar Order Hub with JWT auth & SQLite" });
});
app.post("/api/users/register", registerUser);
app.post("/api/auth/login", login);

// Protected routes (require JWT)
app.use("/api/protected", authenticateToken);
app.post("/api/protected/users/:id/approve", approveUser);
app.post("/api/protected/users/:id/license", uploadLicense);
app.get("/api/protected/users", getUsers);
app.post("/api/protected/orders", createOrder);
app.get("/api/protected/orders", getOrders);

const { createProduct, getProductsBySupplier, searchProducts } = require('./products');
app.post('/api/products', authenticateToken, createProduct);
app.get('/api/products/supplier/:supplierId', authenticateToken, getProductsBySupplier);
app.get('/api/products/search', authenticateToken, searchProducts);

// Analytics endpoints
const {
  getAnalyticsSummary,
  getRevenueData,
  getTopProducts,
  getTopSuppliers,
  getOrdersOverTime,
  getLowStockProducts,
  getOrderStatusBreakdown,
  adjustStock,
  getStockHistory
} = require('./analytics');

app.get('/api/protected/analytics/summary', authenticateToken, getAnalyticsSummary);
app.get('/api/protected/analytics/revenue', authenticateToken, getRevenueData);
app.get('/api/protected/analytics/top-products', authenticateToken, getTopProducts);
app.get('/api/protected/analytics/top-suppliers', authenticateToken, getTopSuppliers);
app.get('/api/protected/analytics/orders-over-time', authenticateToken, getOrdersOverTime);
app.get('/api/protected/analytics/order-status-breakdown', authenticateToken, getOrderStatusBreakdown);
app.get('/api/protected/products/low-stock', authenticateToken, getLowStockProducts);
app.post('/api/protected/products/:id/adjust-stock', authenticateToken, adjustStock);
app.get('/api/protected/products/:id/stock-history', authenticateToken, getStockHistory);

// CSV Export endpoints
const {
  exportOrders,
  exportUsers,
  exportProducts,
  exportMonthlyRevenue,
  exportLowStock,
  exportTopProducts
} = require('./exports');

app.get('/api/protected/export/orders', authenticateToken, exportOrders);
app.get('/api/protected/export/users', authenticateToken, exportUsers);
app.get('/api/protected/export/products', authenticateToken, exportProducts);
app.get('/api/protected/export/monthly-revenue', authenticateToken, exportMonthlyRevenue);
app.get('/api/protected/export/low-stock', authenticateToken, exportLowStock);
app.get('/api/protected/export/top-products', authenticateToken, exportTopProducts);

// Email Notifications endpoints
const {
  sendTestEmail,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationHistory
} = require('./notifications');

app.post('/api/protected/notifications/email/test', authenticateToken, sendTestEmail);
app.get('/api/protected/notifications/settings', authenticateToken, getNotificationSettings);
app.put('/api/protected/notifications/settings', authenticateToken, updateNotificationSettings);
app.get('/api/protected/notifications/history', authenticateToken, getNotificationHistory);

// Invoice endpoints
const {
  generateInvoice,
  getInvoices,
  getInvoiceDetails,
  getInvoicePDF,
  sendInvoiceEmail,
  markInvoicePaid
} = require('./invoices');

app.post('/api/protected/orders/:id/invoice', authenticateToken, generateInvoice);
app.get('/api/protected/invoices', authenticateToken, getInvoices);
app.get('/api/protected/invoices/:id', authenticateToken, getInvoiceDetails);
app.get('/api/protected/invoices/:id/pdf', authenticateToken, getInvoicePDF);
app.post('/api/protected/invoices/:id/send', authenticateToken, sendInvoiceEmail);
app.put('/api/protected/invoices/:id/mark-paid', authenticateToken, markInvoicePaid);

// Supplier endpoints
const {
  getSuppliers,
  getSupplierAnalytics,
  getSupplierOrders,
  getSupplierBalance,
  updateSupplierTerms
} = require('./suppliers');

app.get('/api/protected/suppliers', authenticateToken, getSuppliers);
app.get('/api/protected/suppliers/:id/analytics', authenticateToken, getSupplierAnalytics);
app.get('/api/protected/suppliers/:id/orders', authenticateToken, getSupplierOrders);
app.get('/api/protected/suppliers/:id/balance', authenticateToken, getSupplierBalance);
app.put('/api/protected/suppliers/:id/terms', authenticateToken, updateSupplierTerms);

// Reports endpoints
const {
  getQuarterlyRevenue,
  getSupplierPerformance,
  getCustomerLTV,
  getProfitAnalysis,
  getTaxSummary,
  getYoYComparison
} = require('./reports');

app.get('/api/protected/reports/quarterly', authenticateToken, getQuarterlyRevenue);
app.get('/api/protected/reports/supplier-performance', authenticateToken, getSupplierPerformance);
app.get('/api/protected/reports/customer-ltv', authenticateToken, getCustomerLTV);
app.get('/api/protected/reports/profit-analysis', authenticateToken, getProfitAnalysis);
app.get('/api/protected/reports/tax-summary', authenticateToken, getTaxSummary);
app.get('/api/protected/reports/yoy-comparison', authenticateToken, getYoYComparison);

// QuickBooks integration endpoints
const {
  connectQuickBooks,
  quickbooksCallback,
  triggerSync,
  getSyncStatus,
  syncOrders,
  syncCustomers,
  getAccountMapping,
  updateAccountMapping,
  getReconciliation
} = require('./quickbooks');

app.get('/api/protected/quickbooks/connect', authenticateToken, connectQuickBooks);
app.get('/api/protected/quickbooks/callback', quickbooksCallback);
app.post('/api/protected/quickbooks/sync', authenticateToken, triggerSync);
app.get('/api/protected/quickbooks/status', authenticateToken, getSyncStatus);
app.post('/api/protected/quickbooks/sync-orders', authenticateToken, syncOrders);
app.post('/api/protected/quickbooks/sync-customers', authenticateToken, syncCustomers);
app.get('/api/protected/quickbooks/mapping', authenticateToken, getAccountMapping);
app.put('/api/protected/quickbooks/mapping', authenticateToken, updateAccountMapping);
app.get('/api/protected/quickbooks/reconciliation', authenticateToken, getReconciliation);

// ============================================
// RBAC System - Authentication Endpoints
// ============================================

const authAdvanced = require('./auth-advanced');
const { verifyAuth } = require('./middleware/auth');
const { requireAdmin, requireManager, requireOwnerOrPermission } = require('./middleware/rbac');

// Enhanced registration with RBAC
app.post('/api/auth/register-rbac', async (req, res) => {
  try {
    const { name, email, password, role, companyId } = req.body;
    const user = await authAdvanced.registerUser(name, email, password, role, companyId);
    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Email/password login with sessions
app.post('/api/auth/login-email', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const result = await authAdvanced.loginWithEmail(email, password, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// SSO login (framework)
app.post('/api/auth/login-sso', async (req, res) => {
  try {
    const { provider, code } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    const result = await authAdvanced.loginWithSSO(provider, code, ipAddress, userAgent);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// API key login
app.post('/api/auth/login-api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const result = await authAdvanced.loginWithAPIKey(apiKey);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Refresh token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authAdvanced.refreshToken(refreshToken);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', verifyAuth, async (req, res) => {
  try {
    const sessionId = req.sessionId || req.body.sessionId;
    const result = await authAdvanced.logoutUser(sessionId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Setup MFA
app.post('/api/auth/mfa/setup', verifyAuth, async (req, res) => {
  try {
    const { method } = req.body;
    const result = await authAdvanced.setupMFA(req.user.id, method);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify MFA
app.post('/api/auth/mfa/verify', verifyAuth, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await authAdvanced.verifyMFA(req.user.id, code);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create API key
app.post('/api/auth/api-keys', verifyAuth, async (req, res) => {
  try {
    const { name, permissions, rateLimit, expiresInDays } = req.body;
    const result = await authAdvanced.createAPIKey(req.user.id, name, permissions, rateLimit, expiresInDays);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Revoke API key
app.delete('/api/auth/api-keys/:keyId', verifyAuth, async (req, res) => {
  try {
    const result = await authAdvanced.revokeAPIKey(req.params.keyId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// RBAC System - User Management Endpoints
// ============================================

const userManagement = require('./user-management');

// Create user (admin only)
app.post('/api/users', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, departmentId } = req.body;
    const user = await userManagement.createUser(name, email, password, role, departmentId, req.user.id);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user profile
app.get('/api/users/:id', verifyAuth, requireOwnerOrPermission('users', 'read', 'id'), async (req, res) => {
  try {
    const profile = await userManagement.getUserProfile(req.params.id);
    res.json(profile);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Update user
app.put('/api/users/:id', verifyAuth, requireOwnerOrPermission('users', 'update', 'id'), async (req, res) => {
  try {
    const result = await userManagement.updateUser(req.params.id, req.body, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const result = await userManagement.deleteUser(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change password
app.post('/api/users/:id/password', verifyAuth, requireOwnerOrPermission('users', 'update', 'id'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await userManagement.changePassword(req.params.id, currentPassword, newPassword);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add login method
app.post('/api/users/:id/login-methods', verifyAuth, requireOwnerOrPermission('users', 'update', 'id'), async (req, res) => {
  try {
    const { methodType, identifier, metadata } = req.body;
    const result = await userManagement.addLoginMethod(req.params.id, methodType, identifier, metadata);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove login method
app.delete('/api/users/:id/login-methods/:methodId', verifyAuth, requireOwnerOrPermission('users', 'update', 'id'), async (req, res) => {
  try {
    const result = await userManagement.removeLoginMethod(req.params.id, req.params.methodId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user activity
app.get('/api/users/:id/activity', verifyAuth, requireOwnerOrPermission('users', 'read', 'id'), async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const activity = await userManagement.getUserActivity(req.params.id, limit);
    res.json(activity);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// RBAC System - Roles & Permissions
// ============================================

const rbac = require('./rbac');
const { getAllRoles } = require('./config/roles');

// Get all roles
app.get('/api/roles', verifyAuth, (req, res) => {
  try {
    const roles = getAllRoles();
    res.json(roles);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create custom role (admin only)
app.post('/api/roles', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await rbac.createRole(name, description, permissions);
    res.json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get role permissions
app.get('/api/roles/:roleId/permissions', verifyAuth, async (req, res) => {
  try {
    const { resource } = req.query;
    const permissions = await rbac.getResourcePermissions(req.params.roleId, resource);
    res.json(permissions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user roles
app.get('/api/users/:id/roles', verifyAuth, requireOwnerOrPermission('users', 'read', 'id'), async (req, res) => {
  try {
    const roles = await rbac.getUserRoles(req.params.id);
    res.json(roles);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user permissions
app.get('/api/users/:id/permissions', verifyAuth, requireOwnerOrPermission('users', 'read', 'id'), async (req, res) => {
  try {
    const permissions = await rbac.getEffectivePermissions(req.params.id);
    res.json(permissions);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Assign role to user (manager or admin)
app.post('/api/users/:id/roles', verifyAuth, requireManager, async (req, res) => {
  try {
    const { roleId, departmentId } = req.body;
    const result = await rbac.assignRole(req.params.id, roleId, departmentId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Revoke role from user (manager or admin)
app.delete('/api/users/:id/roles/:roleId', verifyAuth, requireManager, async (req, res) => {
  try {
    const { departmentId } = req.query;
    const result = await rbac.revokeRole(req.params.id, req.params.roleId, departmentId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Check permission
app.post('/api/permissions/check', verifyAuth, async (req, res) => {
  try {
    const { resource, action } = req.body;
    const hasPermission = await rbac.checkPermission(req.user.id, resource, action);
    res.json({ hasPermission, resource, action });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// RBAC System - Teams & Departments
// ============================================

// Get all departments
app.get('/api/departments', verifyAuth, async (req, res) => {
  try {
    const db = require('./database');
    db.all('SELECT * FROM departments WHERE is_active = 1', (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create department (admin only)
app.post('/api/departments', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const { companyId, name, description, managerId } = req.body;
    const db = require('./database');
    
    db.run(
      'INSERT INTO departments (company_id, name, description, manager_id) VALUES (?, ?, ?, ?)',
      [companyId, name, description, managerId],
      function(err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ id: this.lastID, companyId, name, description, managerId });
      }
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get department members
app.get('/api/departments/:id/members', verifyAuth, async (req, res) => {
  try {
    const members = await userManagement.getDepartmentMembers(req.params.id);
    res.json(members);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get department teams
app.get('/api/departments/:id/teams', verifyAuth, async (req, res) => {
  try {
    const db = require('./database');
    db.all('SELECT * FROM teams WHERE department_id = ?', [req.params.id], (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create team (manager or admin)
app.post('/api/teams', verifyAuth, requireManager, async (req, res) => {
  try {
    const { departmentId, name, description, leadId } = req.body;
    const team = await userManagement.createTeam(departmentId, name, description, leadId, req.user.id);
    res.json(team);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add team member
app.post('/api/teams/:id/members', verifyAuth, requireManager, async (req, res) => {
  try {
    const { userId, roleInTeam } = req.body;
    const result = await userManagement.assignTeam(userId, req.params.id, roleInTeam, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove team member
app.delete('/api/teams/:id/members/:userId', verifyAuth, requireManager, async (req, res) => {
  try {
    const result = await userManagement.removeFromTeam(req.params.userId, req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get team members
app.get('/api/teams/:id/members', verifyAuth, async (req, res) => {
  try {
    const members = await userManagement.getTeamMembers(req.params.id);
    res.json(members);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// RBAC System - Audit Logs
// ============================================

// Get audit logs (admin only)
app.get('/api/audit-logs', verifyAuth, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, userId, resource, action } = req.query;
    const db = require('./database');
    
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (resource) {
      query += ' AND resource = ?';
      params.push(resource);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      
      // Parse JSON details
      const logs = rows.map(row => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : {}
      }));
      
      res.json(logs);
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================
// Shipping Integration - UPS & USPS
// ============================================

const shippingIntegration = require('./shipping-integration');

// UPS Account Management (5 endpoints)
app.post('/api/suppliers/:supplierId/shipping/ups/connect', authenticateToken, shippingIntegration.linkUPSAccount);
app.get('/api/suppliers/:supplierId/shipping/ups/status', authenticateToken, shippingIntegration.getUPSStatus);
app.post('/api/suppliers/:supplierId/shipping/ups/verify', authenticateToken, shippingIntegration.verifyUPSCredentialsEndpoint);
app.delete('/api/suppliers/:supplierId/shipping/ups/disconnect', authenticateToken, shippingIntegration.unlinkUPSAccount);
app.post('/api/suppliers/:supplierId/shipping/ups/refresh', authenticateToken, shippingIntegration.refreshUPSConnection);

// USPS Account Management (5 endpoints)
app.post('/api/suppliers/:supplierId/shipping/usps/connect', authenticateToken, shippingIntegration.linkUSPSAccount);
app.get('/api/suppliers/:supplierId/shipping/usps/status', authenticateToken, shippingIntegration.getUSPSStatus);
app.post('/api/suppliers/:supplierId/shipping/usps/verify', authenticateToken, shippingIntegration.verifyUSPSCredentialsEndpoint);
app.delete('/api/suppliers/:supplierId/shipping/usps/disconnect', authenticateToken, shippingIntegration.unlinkUSPSAccount);
app.post('/api/suppliers/:supplierId/shipping/usps/refresh', authenticateToken, shippingIntegration.refreshUSPSConnection);

// Label Generation (6 endpoints)
app.post('/api/suppliers/:supplierId/shipping/labels/ups', authenticateToken, shippingIntegration.generateUPSLabel);
app.post('/api/suppliers/:supplierId/shipping/labels/usps', authenticateToken, shippingIntegration.generateUSPSLabel);
app.get('/api/shipping/labels/:trackingNumber', authenticateToken, shippingIntegration.getLabel);
app.post('/api/shipping/labels/:trackingNumber/reprint', authenticateToken, shippingIntegration.reprintLabel);
app.post('/api/shipping/labels/:trackingNumber/download', authenticateToken, shippingIntegration.downloadLabel);
app.post('/api/shipping/labels/batch-generate', authenticateToken, shippingIntegration.batchGenerateLabels);

// Tracking (6 endpoints)
app.get('/api/shipping/track/:trackingNumber', authenticateToken, shippingIntegration.trackShipment);
app.get('/api/suppliers/:supplierId/shipping/track/summary', authenticateToken, shippingIntegration.getTrackingSummary);
app.get('/api/shipping/track/:trackingNumber/history', authenticateToken, shippingIntegration.getTrackingHistory);
app.post('/api/shipping/track/:trackingNumber/subscribe', authenticateToken, shippingIntegration.subscribeToUpdates);
app.get('/api/shipping/track/:trackingNumber/events', authenticateToken, shippingIntegration.getTrackingEvents);
app.post('/api/shipping/track/batch-track', authenticateToken, shippingIntegration.batchTrackShipments);

// Shipment Management (5 endpoints)
app.get('/api/suppliers/:supplierId/shipping/shipments', authenticateToken, shippingIntegration.getSupplierShipments);
app.get('/api/suppliers/:supplierId/shipping/shipments/:trackingNumber', authenticateToken, shippingIntegration.getShipmentDetails);
app.post('/api/suppliers/:supplierId/shipping/shipments/:trackingNumber/cancel', authenticateToken, shippingIntegration.cancelShipment);
app.post('/api/suppliers/:supplierId/shipping/shipments/:trackingNumber/hold', authenticateToken, shippingIntegration.holdShipment);
app.post('/api/suppliers/:supplierId/shipping/shipments/pickup/schedule', authenticateToken, shippingIntegration.schedulePickup);

// Analytics & Reporting (5 endpoints)
app.get('/api/suppliers/:supplierId/shipping/metrics', authenticateToken, shippingIntegration.getShippingMetrics);
app.get('/api/suppliers/:supplierId/shipping/analytics', authenticateToken, shippingIntegration.getShippingAnalytics);
app.post('/api/shipping/estimate-cost', authenticateToken, shippingIntegration.estimateShippingCost);
app.get('/api/suppliers/:supplierId/shipping/carrier-comparison', authenticateToken, shippingIntegration.getCarrierComparison);
app.get('/api/suppliers/:supplierId/shipping/delivery-trends', authenticateToken, shippingIntegration.getDeliveryTrends);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
