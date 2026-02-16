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

// ============================================
// Mobile Field Sales Representative System
// ============================================

// Sales Rep Service
const salesRepService = require('./sales-rep-service');
const locationService = require('./location-service');
const mileageService = require('./mileage-service');
const photoService = require('./photo-service');
const mobileOrders = require('./mobile-orders');
const performanceService = require('./performance-service');

// Daily Check-In (5 endpoints)
app.post('/api/reps/check-in', authenticateToken, salesRepService.checkIn);
app.post('/api/reps/check-out', authenticateToken, salesRepService.checkOut);
app.get('/api/reps/:sales_rep_id/check-in/today', authenticateToken, salesRepService.getTodayCheckIn);
app.get('/api/reps/:sales_rep_id/check-in/history', authenticateToken, salesRepService.getCheckInHistory);
app.put('/api/reps/check-in/:id', authenticateToken, salesRepService.updateCheckIn);

// Location Tracking (6 endpoints)
app.post('/api/reps/location/track', authenticateToken, locationService.trackLocation);
app.get('/api/reps/:sales_rep_id/location/today', authenticateToken, locationService.getTodayRoute);
app.get('/api/reps/:sales_rep_id/location/history', authenticateToken, locationService.getLocationHistory);
app.get('/api/reps/:sales_rep_id/location/route', authenticateToken, locationService.getRoute);
app.post('/api/reps/location/start-trip', authenticateToken, locationService.startTrip);
app.post('/api/reps/location/end-trip', authenticateToken, locationService.endTrip);

// Additional location utilities
app.get('/api/reps/location/geofence', authenticateToken, locationService.checkGeofence);
app.get('/api/reps/location/distance', authenticateToken, locationService.getDistance);
app.get('/api/reps/location/nearby-accounts', authenticateToken, locationService.getNearbyAccounts);

// Mileage (7 endpoints)
app.post('/api/reps/mileage/log', authenticateToken, mileageService.logMileage);
app.get('/api/reps/:sales_rep_id/mileage/today', authenticateToken, mileageService.getTodayMileage);
app.get('/api/reps/:sales_rep_id/mileage/month', authenticateToken, mileageService.getMonthlyMileage);
app.get('/api/reps/:sales_rep_id/mileage/reimbursement', authenticateToken, mileageService.calculateReimbursement);
app.put('/api/reps/mileage/:id', authenticateToken, mileageService.updateMileageLog);
app.post('/api/reps/:sales_rep_id/mileage/export', authenticateToken, mileageService.exportMileageForAccounting);
app.get('/api/reps/:sales_rep_id/mileage/calculate-from-tracking', authenticateToken, mileageService.calculateMileageFromTracking);

// Account Visits (7 endpoints)
app.post('/api/reps/visits/check-in', authenticateToken, salesRepService.checkInAtAccount);
app.post('/api/reps/visits/check-out', authenticateToken, salesRepService.checkOutFromAccount);
app.get('/api/reps/:sales_rep_id/visits/today', authenticateToken, salesRepService.getTodayVisits);
app.get('/api/reps/visits/account/:account_id', authenticateToken, salesRepService.getAccountVisitHistory);
app.get('/api/reps/:sales_rep_id/visits/schedule', authenticateToken, salesRepService.getScheduledVisits);
app.put('/api/reps/visits/:id', authenticateToken, salesRepService.updateVisit);
app.post('/api/reps/visits/:id/complete', authenticateToken, salesRepService.completeVisit);

// Photos (8 endpoints)
app.post('/api/reps/photos/upload', authenticateToken, photoService.uploadPhoto);
app.get('/api/reps/photos/visit/:visit_id', authenticateToken, photoService.getVisitPhotos);
app.get('/api/reps/photos/account/:account_id', authenticateToken, photoService.getAccountPhotos);
app.post('/api/reps/photos/:id/approve', authenticateToken, photoService.approvePhoto);
app.post('/api/reps/photos/:id/reject', authenticateToken, photoService.rejectPhoto);
app.delete('/api/reps/photos/:id', authenticateToken, photoService.deletePhoto);
app.get('/api/reps/:sales_rep_id/photos/gallery', authenticateToken, photoService.getPhotoGallery);
app.post('/api/reps/photos/batch-upload', authenticateToken, photoService.batchUploadPhotos);

// Photo statistics
app.get('/api/reps/photos/statistics', authenticateToken, photoService.getPhotoStatistics);

// Authorized Accounts (5 endpoints)
app.get('/api/reps/:sales_rep_id/accounts', authenticateToken, salesRepService.getAuthorizedAccounts);
app.get('/api/reps/accounts/:account_id', authenticateToken, salesRepService.getAccountDetails);
app.get('/api/reps/accounts/:account_id/preferences', authenticateToken, salesRepService.getAccountPreferences);
app.get('/api/reps/accounts/:account_id/visit-history', authenticateToken, salesRepService.getAccountVisitHistory);
app.post('/api/reps/accounts/:account_id/visit', authenticateToken, salesRepService.scheduleVisit);

// Orders (7 endpoints)
app.post('/api/reps/orders/create', authenticateToken, mobileOrders.createOrder);
app.get('/api/reps/orders/account/:account_id', authenticateToken, mobileOrders.getAccountOrders);
app.get('/api/reps/:sales_rep_id/orders/today', authenticateToken, mobileOrders.getTodayOrders);
app.get('/api/reps/orders/:order_id', authenticateToken, mobileOrders.getOrderDetails);
app.put('/api/reps/orders/:order_id', authenticateToken, mobileOrders.updateOrder);
app.get('/api/reps/orders/history/:account_id', authenticateToken, mobileOrders.getOrderHistory);
app.post('/api/reps/orders/:order_id/reorder', authenticateToken, mobileOrders.quickReorder);

// Performance & Analytics (6 endpoints)
app.get('/api/reps/:sales_rep_id/performance/dashboard', authenticateToken, performanceService.getRepDashboard);
app.get('/api/reps/:sales_rep_id/performance/daily', authenticateToken, performanceService.getDailyMetrics);
app.get('/api/reps/:sales_rep_id/performance/weekly', authenticateToken, performanceService.getWeeklySummary);
app.get('/api/reps/:sales_rep_id/performance/monthly', authenticateToken, performanceService.getMonthlySummary);
app.get('/api/reps/:sales_rep_id/performance/accounts', authenticateToken, performanceService.getAccountMetrics);
app.get('/api/reps/performance/comparison/:manager_id', authenticateToken, performanceService.getRepComparison);

// Sales Rep Management
app.post('/api/reps/create', authenticateToken, salesRepService.createSalesRep);
app.get('/api/reps/user/:user_id', authenticateToken, salesRepService.getSalesRepByUserId);

// ============================================
// Employee Scheduling & Time Clock System
// ============================================

const schedulingService = require('./scheduling-service');
const timeClockService = require('./time-clock-service');
const payrollService = require('./payroll-service');
const attendanceService = require('./attendance-service');
const overtimeService = require('./overtime-service');
const shiftSwapService = require('./shift-swap-service');
const timeOffService = require('./time-off-service');
const timesheetService = require('./timesheet-service');
const reportingService = require('./reporting-service');

// Shift Definitions (4 endpoints)
app.post('/api/:role/shifts/create', authenticateToken, schedulingService.createShift);
app.get('/api/:role/shifts/:company_id', authenticateToken, schedulingService.getShifts);
app.put('/api/:role/shifts/:id', authenticateToken, schedulingService.updateShift);
app.delete('/api/:role/shifts/:id', authenticateToken, schedulingService.deleteShift);

// Schedule Management (8 endpoints)
app.post('/api/:role/schedules/create', authenticateToken, schedulingService.createSchedule);
app.get('/api/:role/schedules/:id', authenticateToken, schedulingService.getSchedule);
app.put('/api/:role/schedules/:id', authenticateToken, schedulingService.updateSchedule);
app.delete('/api/:role/schedules/:id', authenticateToken, schedulingService.deleteSchedule);
app.get('/api/:role/schedules/week/:company_id/:date', authenticateToken, schedulingService.getWeeklySchedules);
app.get('/api/:role/schedules/month/:company_id/:date', authenticateToken, schedulingService.getMonthlySchedules);
app.post('/api/:role/schedules/publish', authenticateToken, schedulingService.publishSchedules);
app.get('/api/:role/schedules/conflicts/:company_id', authenticateToken, schedulingService.detectConflicts);

// Additional Schedule endpoints
app.post('/api/:role/schedules/recurring', authenticateToken, schedulingService.createRecurringSchedules);
app.get('/api/:role/schedules/coverage/:company_id/:department_id', authenticateToken, schedulingService.getDepartmentCoverage);
app.get('/api/:role/schedules/employee/:employee_id', authenticateToken, schedulingService.getEmployeeSchedules);

// Time Clock (8 endpoints)
app.post('/api/:role/timeclock/clock-in', authenticateToken, timeClockService.clockIn);
app.post('/api/:role/timeclock/clock-out', authenticateToken, timeClockService.clockOut);
app.get('/api/:role/timeclock/status/:employee_id', authenticateToken, timeClockService.getClockStatus);
app.get('/api/:role/timeclock/entries/today/:employee_id', authenticateToken, timeClockService.getTodayEntries);
app.get('/api/:role/timeclock/entries/range/:company_id', authenticateToken, timeClockService.getEntriesInRange);
app.post('/api/:role/timeclock/adjust', authenticateToken, timeClockService.adjustTimeEntry);
app.delete('/api/:role/timeclock/:id', authenticateToken, timeClockService.deleteTimeEntry);
app.post('/api/:role/timeclock/bulk-import', authenticateToken, timeClockService.bulkImportEntries);

// Additional Time Clock endpoints
app.post('/api/:role/timeclock/break/start', authenticateToken, timeClockService.startBreak);
app.post('/api/:role/timeclock/break/end', authenticateToken, timeClockService.endBreak);
app.get('/api/:role/timeclock/late-arrivals/:company_id', authenticateToken, timeClockService.getLateArrivals);
app.get('/api/:role/timeclock/timesheet-hours', authenticateToken, timeClockService.calculateTimesheetHours);

// Timesheets (10 endpoints)
app.post('/api/:role/timesheets/generate', authenticateToken, timesheetService.generateTimesheet);
app.get('/api/:role/timesheets/:id', authenticateToken, timesheetService.getTimesheet);
app.get('/api/:role/timesheets/employee/:employee_id', authenticateToken, timesheetService.getEmployeeTimesheets);
app.get('/api/:role/timesheets/week/:company_id/:week_of', authenticateToken, timesheetService.getWeekTimesheets);
app.put('/api/:role/timesheets/:id/submit', authenticateToken, timesheetService.submitTimesheet);
app.put('/api/:role/timesheets/:id/approve', authenticateToken, timesheetService.approveTimesheet);
app.put('/api/:role/timesheets/:id/reject', authenticateToken, timesheetService.rejectTimesheet);
app.get('/api/:role/timesheets/pending-approval/:company_id', authenticateToken, timesheetService.getPendingApprovals);
app.put('/api/:role/timesheets/:id/hours', authenticateToken, timesheetService.updateTimesheetHours);
app.get('/api/:role/timesheets/:id/details', authenticateToken, timesheetService.getTimesheetDetails);

// Overtime (6 endpoints)
app.post('/api/:role/overtime/record', authenticateToken, overtimeService.recordOvertime);
app.get('/api/:role/overtime/today/:company_id', authenticateToken, overtimeService.getTodayOvertime);
app.get('/api/:role/overtime/month/:company_id', authenticateToken, overtimeService.getMonthlyOvertime);
app.post('/api/:role/overtime/approve/:id', authenticateToken, overtimeService.approveOvertime);
app.get('/api/:role/overtime/pending/:company_id', authenticateToken, overtimeService.getPendingOvertime);
app.post('/api/:role/overtime/export/:company_id', authenticateToken, overtimeService.exportOvertime);

// Additional Overtime endpoints
app.post('/api/:role/overtime/reject/:id', authenticateToken, overtimeService.rejectOvertime);
app.post('/api/:role/overtime/auto-detect', authenticateToken, overtimeService.autoDetectOvertime);
app.get('/api/:role/overtime/forecast/:company_id', authenticateToken, overtimeService.getOvertimeForecast);
app.get('/api/:role/overtime/summary/:company_id', authenticateToken, overtimeService.getOvertimeSummaryByDepartment);

// Attendance (6 endpoints)
app.post('/api/:role/attendance/mark', authenticateToken, attendanceService.markAttendance);
app.get('/api/:role/attendance/today/:company_id', authenticateToken, attendanceService.getTodayAttendance);
app.get('/api/:role/attendance/month/:company_id', authenticateToken, attendanceService.getMonthlyAttendance);
app.post('/api/:role/attendance/bulk-mark', authenticateToken, attendanceService.bulkMarkAttendance);
app.get('/api/:role/attendance/report/:company_id', authenticateToken, attendanceService.getAttendanceReport);
app.post('/api/:role/attendance/absence-request', authenticateToken, attendanceService.submitAbsenceRequest);

// Additional Attendance endpoints
app.post('/api/:role/attendance/approve/:id', authenticateToken, attendanceService.approveAbsenceRequest);
app.get('/api/:role/attendance/patterns/:company_id', authenticateToken, attendanceService.detectAttendancePatterns);
app.get('/api/:role/attendance/summary/:company_id', authenticateToken, attendanceService.getAttendanceSummary);

// Shift Swap (6 endpoints)
app.post('/api/:role/shifts/swap-request', authenticateToken, shiftSwapService.createSwapRequest);
app.get('/api/:role/shifts/swap-requests/:company_id', authenticateToken, shiftSwapService.getSwapRequests);
app.post('/api/:role/shifts/swap-approve/:id', authenticateToken, shiftSwapService.approveSwapRequest);
app.post('/api/:role/shifts/swap-deny/:id', authenticateToken, shiftSwapService.denySwapRequest);
app.get('/api/:role/shifts/available/:company_id', authenticateToken, shiftSwapService.getAvailableShifts);
app.post('/api/:role/shifts/coverage-request', authenticateToken, shiftSwapService.requestCoverage);

// Additional Shift Swap endpoints
app.post('/api/:role/shifts/swap-cancel/:id', authenticateToken, shiftSwapService.cancelSwapRequest);
app.post('/api/:role/shifts/offer-cover', authenticateToken, shiftSwapService.offerToCover);
app.get('/api/:role/shifts/swap-history/:employee_id', authenticateToken, shiftSwapService.getSwapHistory);

// Payroll (15 endpoints)
app.post('/api/:role/payroll/create-period', authenticateToken, payrollService.createPayrollPeriod);
app.get('/api/:role/payroll/periods/:company_id', authenticateToken, payrollService.getPayrollPeriods);
app.get('/api/:role/payroll/periods/:id', authenticateToken, payrollService.getPayrollPeriod);
app.post('/api/:role/payroll/calculate/:period_id', authenticateToken, payrollService.calculatePayroll);
app.get('/api/:role/payroll/records/:employee_id', authenticateToken, payrollService.getEmployeePayrollRecords);
app.put('/api/:role/payroll/records/:id/approve', authenticateToken, payrollService.approvePayrollRecord);
app.post('/api/:role/payroll/process-payment', authenticateToken, payrollService.processPayment);
app.get('/api/:role/payroll/export/:period_id', authenticateToken, payrollService.exportPayroll);

// Additional Payroll endpoints
app.get('/api/:role/payroll/period-records/:period_id', authenticateToken, payrollService.getPeriodPayrollRecords);
app.get('/api/:role/payroll/summary/:company_id/:period_id', authenticateToken, payrollService.getPayrollSummaryByDepartment);
app.get('/api/:role/payroll/settings/:company_id', authenticateToken, payrollService.getPayrollSettings);
app.put('/api/:role/payroll/settings/:company_id', authenticateToken, payrollService.updatePayrollSettings);

// Paystub endpoints
app.get('/api/:role/payroll/paystub/:payroll_record_id', authenticateToken, payrollService.generatePaystub);
app.post('/api/:role/payroll/paystub/:payroll_record_id/email', authenticateToken, payrollService.emailPaystub);
app.get('/api/:role/payroll/paystubs/:employee_id', authenticateToken, payrollService.getEmployeePaystubs);

// Reports & Analytics (10 endpoints)
app.get('/api/:role/reports/labor-cost/:company_id', authenticateToken, reportingService.getLaborCostReport);
app.get('/api/:role/reports/productivity/:company_id', authenticateToken, reportingService.getProductivityReport);
app.get('/api/:role/reports/overtime-analysis/:company_id', authenticateToken, reportingService.getOvertimeAnalysisReport);
app.get('/api/:role/reports/attendance-summary/:company_id', authenticateToken, reportingService.getAttendanceSummaryReport);
app.get('/api/:role/reports/tardiness/:company_id', authenticateToken, reportingService.getTardinessReport);
app.get('/api/:role/reports/scheduling-efficiency/:company_id', authenticateToken, reportingService.getSchedulingEfficiencyReport);
app.get('/api/:role/reports/compliance/:company_id', authenticateToken, reportingService.getComplianceReport);
app.get('/api/:role/reports/turnover/:company_id', authenticateToken, reportingService.getTurnoverReport);
app.get('/api/:role/reports/employee-hours/:company_id', authenticateToken, reportingService.getEmployeeHoursReport);
app.get('/api/:role/reports/department-hours/:company_id', authenticateToken, reportingService.getDepartmentHoursReport);

// Time Off Management (11 endpoints)
app.get('/api/:role/time-off/balance/:employee_id', authenticateToken, timeOffService.getTimeOffBalance);
app.post('/api/:role/time-off/balance/initialize', authenticateToken, timeOffService.initializeTimeOffBalance);
app.put('/api/:role/time-off/balance/:id', authenticateToken, timeOffService.updateTimeOffBalance);
app.post('/api/:role/time-off/request', authenticateToken, timeOffService.submitTimeOffRequest);
app.get('/api/:role/time-off/requests/:company_id', authenticateToken, timeOffService.getTimeOffRequests);
app.get('/api/:role/time-off/requests/:id', authenticateToken, timeOffService.getTimeOffRequest);
app.put('/api/:role/time-off/requests/:id/approve', authenticateToken, timeOffService.approveTimeOffRequest);
app.put('/api/:role/time-off/requests/:id/deny', authenticateToken, timeOffService.denyTimeOffRequest);
app.delete('/api/:role/time-off/requests/:id/cancel', authenticateToken, timeOffService.cancelTimeOffRequest);
app.get('/api/:role/time-off/calendar/:company_id', authenticateToken, timeOffService.getTimeOffCalendar);
app.post('/api/:role/time-off/accruals/process', authenticateToken, timeOffService.processAccruals);

// ============================================
// WAREHOUSE MANAGEMENT SYSTEM
// ============================================

const warehouseService = require('./warehouse-service');
const scanningService = require('./scanning-service');
const receivingService = require('./receiving-service');
const pickingService = require('./picking-service');
const warehouseAnalytics = require('./warehouse-analytics-service');

// Universal Scan Endpoint
app.post('/api/protected/warehouse/scan', authenticateToken, async (req, res) => {
  try {
    const result = await scanningService.processScan(req.body, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Scan History
app.get('/api/protected/warehouse/scan-history', authenticateToken, async (req, res) => {
  try {
    const history = await scanningService.getScanHistory(req.query);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scan Statistics
app.get('/api/protected/warehouse/scan-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await scanningService.getScanStats(req.query);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Receiving Module ==========

// Create receiving shipment
app.post('/api/protected/warehouse/receiving/shipments', authenticateToken, async (req, res) => {
  try {
    const shipment = await receivingService.createReceivingShipment(req.body, req.user.userId);
    res.json(shipment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List receiving shipments
app.get('/api/protected/warehouse/receiving/shipments', authenticateToken, async (req, res) => {
  try {
    const shipments = await receivingService.getReceivingShipments(req.query);
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get shipment details
app.get('/api/protected/warehouse/receiving/shipments/:id', authenticateToken, async (req, res) => {
  try {
    const shipment = await receivingService.getReceivingShipmentDetails(req.params.id);
    res.json(shipment);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Scan item during receiving
app.post('/api/protected/warehouse/receiving/:shipmentId/scan', authenticateToken, async (req, res) => {
  try {
    const result = await receivingService.processScanReceiving(req.params.shipmentId, req.body, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Complete receiving shipment
app.put('/api/protected/warehouse/receiving/:shipmentId/complete', authenticateToken, async (req, res) => {
  try {
    const result = await receivingService.completeReceivingShipment(req.params.shipmentId, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Report discrepancy
app.post('/api/protected/warehouse/receiving/:shipmentId/discrepancy', authenticateToken, async (req, res) => {
  try {
    const result = await receivingService.reportDiscrepancy(req.params.shipmentId, req.body.item_id, req.body, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ========== Picking Module ==========

// Create pick list
app.post('/api/protected/warehouse/pick-lists', authenticateToken, async (req, res) => {
  try {
    const pickList = await pickingService.createPickList(req.body, req.user.userId);
    res.json(pickList);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List pick lists
app.get('/api/protected/warehouse/pick-lists', authenticateToken, async (req, res) => {
  try {
    const pickLists = await pickingService.getPickLists(req.query);
    res.json(pickLists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pick list details
app.get('/api/protected/warehouse/pick-lists/:id', authenticateToken, async (req, res) => {
  try {
    const pickList = await pickingService.getPickListDetails(req.params.id);
    res.json(pickList);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

// Scan item during picking
app.post('/api/protected/warehouse/pick-lists/:id/scan', authenticateToken, async (req, res) => {
  try {
    const result = await pickingService.processScanPicking(req.params.id, req.body, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Complete pick list
app.put('/api/protected/warehouse/pick-lists/:id/complete', authenticateToken, async (req, res) => {
  try {
    const result = await pickingService.completePickList(req.params.id, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get optimized pick route
app.get('/api/protected/warehouse/pick-lists/:id/suggested-route', authenticateToken, async (req, res) => {
  try {
    const route = await pickingService.getSuggestedRoute(req.params.id);
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Inventory Module ==========

// Get real-time inventory
app.get('/api/protected/warehouse/inventory', authenticateToken, async (req, res) => {
  try {
    const inventory = await warehouseAnalytics.getInventorySnapshot(req.query);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory by location
app.get('/api/protected/warehouse/inventory/by-location/:locationId', authenticateToken, async (req, res) => {
  try {
    const inventory = await warehouseService.getInventoryByLocation(req.params.locationId);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual inventory adjustment
app.post('/api/protected/warehouse/inventory/adjust', authenticateToken, async (req, res) => {
  try {
    const { product_id, location_id, quantity } = req.body;
    const result = await warehouseService.updateProductLocation(product_id, location_id, quantity, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get cycle count discrepancies
app.get('/api/protected/warehouse/inventory/discrepancies', authenticateToken, async (req, res) => {
  try {
    const discrepancies = await warehouseAnalytics.getCycleCountDiscrepancies(req.query);
    res.json(discrepancies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Locations Module ==========

// Create warehouse location
app.post('/api/protected/warehouse/locations', authenticateToken, async (req, res) => {
  try {
    const location = await warehouseService.createLocation(req.body, req.user.userId);
    res.json(location);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// List warehouse locations
app.get('/api/protected/warehouse/locations', authenticateToken, async (req, res) => {
  try {
    const locations = await warehouseService.getLocations(req.query);
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific location
app.get('/api/protected/warehouse/locations/:id', authenticateToken, async (req, res) => {
  try {
    const location = await warehouseService.getLocation(req.params.id);
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(location);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update warehouse location
app.put('/api/protected/warehouse/locations/:id', authenticateToken, async (req, res) => {
  try {
    const result = await warehouseService.updateLocation(req.params.id, req.body, req.user.userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ========== Analytics & Reporting ==========

// Warehouse dashboard KPIs
app.get('/api/protected/warehouse/dashboard', authenticateToken, async (req, res) => {
  try {
    const kpis = await warehouseAnalytics.getDashboardKPIs(req.query);
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Audit log
app.get('/api/protected/warehouse/reports/audit-log', authenticateToken, async (req, res) => {
  try {
    const logs = await warehouseService.getAuditLogs(req.query);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Inventory aging report
app.get('/api/protected/warehouse/reports/inventory-aging', authenticateToken, async (req, res) => {
  try {
    const report = await warehouseAnalytics.getInventoryAging(req.query);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SKU velocity report
app.get('/api/protected/warehouse/reports/sku-velocity', authenticateToken, async (req, res) => {
  try {
    const report = await warehouseAnalytics.getSKUVelocity(req.query);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Worker productivity report
app.get('/api/protected/warehouse/reports/worker-productivity', authenticateToken, async (req, res) => {
  try {
    const report = await warehouseAnalytics.getWorkerProductivity(req.query);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Performance trends
app.get('/api/protected/warehouse/reports/performance-trends', authenticateToken, async (req, res) => {
  try {
    const trends = await warehouseAnalytics.getPerformanceTrends(req.query);
    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Location utilization
app.get('/api/protected/warehouse/reports/location-utilization', authenticateToken, async (req, res) => {
  try {
    const utilization = await warehouseAnalytics.getLocationUtilization(req.query);
    res.json(utilization);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== Warehouse Users ==========

// Get warehouse user info
app.get('/api/protected/warehouse/users/:userId', authenticateToken, async (req, res) => {
  try {
    const warehouseUser = await warehouseService.getWarehouseUser(req.params.userId);
    res.json(warehouseUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create/update warehouse user
app.post('/api/protected/warehouse/users/:userId', authenticateToken, async (req, res) => {
  try {
    const result = await warehouseService.upsertWarehouseUser(req.params.userId, req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Initialize HTTP server for WebSocket
const http = require('http');
const server = http.createServer(app);

// Initialize WebSocket
const websocketServer = require('./websocket-server');
websocketServer.initializeWebSocket(server);

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`WebSocket server initialized`);
});
