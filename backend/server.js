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

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
