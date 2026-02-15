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

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
