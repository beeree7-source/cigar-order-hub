const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const http = require("http");
const db = require("./database");

// Warehouse Services
const warehouseService = require("./warehouse-service");
const scanningService = require("./scanning-service");
const receivingService = require("./receiving-service");
const pickingService = require("./picking-service");
const warehouseAnalyticsService = require("./warehouse-analytics-service");
const syncManager = require("./warehouse-sync");

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Mock data storage with numeric IDs
let userIdCounter = 15; // Start after existing users (1-14)
let productIdCounter = 6;
let orderIdCounter = 4;

const mockUsers = [
  // Original users
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'sales_rep', employee_id: 'SR-001', created_at: '2026-01-01' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'retailer', password: 'password123', approved: 1, business_name: 'Smoke Shop Downtown', employee_role: 'sales_rep', employee_id: 'SR-002', created_at: '2026-01-02' },
  { id: 3, name: 'Admin User', email: 'admin@example.com', role: 'admin', password: 'password123', approved: 1, employee_role: 'admin', employee_id: 'ADM-001', created_at: '2026-01-03' },
  
  // Sales Team
  { id: 4, name: 'Mike Johnson', email: 'mike.sales@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'sales_rep', employee_id: 'SR-003', created_at: '2026-01-04' },
  { id: 5, name: 'Sarah Williams', email: 'sarah.sales@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'sales_manager', employee_id: 'SM-001', created_at: '2026-01-05' },
  
  // Warehouse Team
  { id: 6, name: 'David Martinez', email: 'david.warehouse@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'warehouse_manager', employee_id: 'WM-001', created_at: '2026-01-06' },
  { id: 7, name: 'Carlos Rodriguez', email: 'carlos.warehouse@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'warehouse_worker', employee_id: 'WW-001', created_at: '2026-01-07' },
  { id: 8, name: 'Maria Garcia', email: 'maria.warehouse@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'warehouse_worker', employee_id: 'WW-002', created_at: '2026-01-08' },
  
  // HR & Admin Team
  { id: 9, name: 'Linda Chen', email: 'linda.hr@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'hr_manager', employee_id: 'HR-001', created_at: '2026-01-09' },
  { id: 10, name: 'Robert Taylor', email: 'robert.accounting@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'accountant', employee_id: 'ACC-001', created_at: '2026-01-10' },
  
  // Operations Team
  { id: 11, name: 'Jennifer Brown', email: 'jennifer.ops@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'operations_manager', employee_id: 'OM-001', created_at: '2026-01-11' },
  
  // Customer Service
  { id: 12, name: 'Kevin Anderson', email: 'kevin.support@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'customer_service', employee_id: 'CS-001', created_at: '2026-01-12' },
  
  // Delivery Team
  { id: 13, name: 'James Wilson', email: 'james.delivery@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'delivery_driver', employee_id: 'DD-001', created_at: '2026-01-13' },
  { id: 14, name: 'Thomas Moore', email: 'thomas.delivery@premiumcigars.com', role: 'supplier', password: 'password123', approved: 1, business_name: 'Premium Cigars Inc', employee_role: 'delivery_driver', employee_id: 'DD-002', created_at: '2026-01-14' }
];

const mockProducts = [
  { id: 1, supplierId: 1, name: 'Premium Cigar A', sku: 'SKU-1001', price: 25.99, stock: 150, category: 'Premium', description: 'High quality premium cigar', imageUrl: '' },
  { id: 2, supplierId: 1, name: 'Standard Cigar B', sku: 'SKU-1002', price: 12.99, stock: 300, category: 'Standard', description: 'Standard quality cigar', imageUrl: '' },
  { id: 3, supplierId: 2, name: 'Luxury Cigar C', sku: 'SKU-1003', price: 45.99, stock: 75, category: 'Luxury', description: 'Luxury premium cigar', imageUrl: '' },
  { id: 4, supplierId: 2, name: 'Budget Cigar D', sku: 'SKU-1004', price: 8.99, stock: 500, category: 'Budget', description: 'Affordable budget cigar', imageUrl: '' },
  { id: 5, supplierId: 1, name: 'Specialty Cigar E', sku: 'SKU-1005', price: 35.99, stock: 100, category: 'Specialty', description: 'Special blend cigar', imageUrl: '' }
];

const mockOrders = [
  { id: 1, retailer_id: 1, supplier_id: 1, items: JSON.stringify([{ productId: 1, quantity: 5 }]), status: 'shipped', created_at: '2026-02-10', carrier: 'UPS', tracking_number: '1Z4A6G9B2C8D5E1F', label_url: '/uploads/labels/label_1_ups.pdf', eta: '2026-02-18', delivery_status: 'in_transit' },
  { id: 2, retailer_id: 2, supplier_id: 1, items: JSON.stringify([{ productId: 2, quantity: 10 }]), status: 'pending', created_at: '2026-02-15', carrier: null, tracking_number: null, label_url: null, eta: null, delivery_status: 'pending' },
  { id: 3, retailer_id: 1, supplier_id: 2, items: JSON.stringify([{ productId: 3, quantity: 2 }]), status: 'shipped', created_at: '2026-02-12', carrier: 'USPS', tracking_number: '9400111899223456789', label_url: '/uploads/labels/label_3_usps.pdf', eta: '2026-02-19', delivery_status: 'out_for_delivery' }
];

// Mock supplier applications (templates)
let mockSupplierApplications = [
  {
    id: 1,
    supplier_id: 1,
    application_name: 'Premium Cigars - Retailer Application',
    description: 'Standard retailer application for Premium Cigars Inc',
    required_fields: ['business_name', 'address', 'tax_id', 'bank_info'],
    form_template: '{"business_name":"","address":"","tax_id":"","bank_info":"","references":""}',
    is_required: true,
    created_at: '2026-01-15'
  },
  {
    id: 2,
    supplier_id: 2,
    application_name: 'Luxury Cigars - Dealer Application',
    description: 'Dealer application for high-end retail partners',
    required_fields: ['business_name', 'years_in_business', 'retail_location', 'sales_forecast'],
    form_template: '{"business_name":"","years_in_business":"","retail_location":"","sales_forecast":""}',
    is_required: false,
    created_at: '2026-01-20'
  }
];

// Mock retailer licenses
let mockRetailerLicenses = [
  {
    id: 1,
    retailer_id: 2,
    license_type: 'tobacco',
    license_number: 'TX-2025-12345',
    issue_date: '2025-01-15',
    expiration_date: '2027-01-15',
    file_name: 'tobacco_license_2025.pdf',
    file_path: '/uploads/licenses/TX-2025-12345.pdf',
    verified: true,
    verified_by: 1,
    verified_at: '2026-01-16'
  }
];

// Mock retailer applications (submissions)
let mockRetailerApplications = [
  {
    id: 1,
    retailer_id: 2,
    supplier_id: 1,
    supplier_application_id: 1,
    status: 'approved',
    application_data: JSON.stringify({
      business_name: 'Smoke Shop Downtown',
      address: '123 Main St, Austin TX',
      tax_id: '12-3456789',
      bank_info: 'Chase Bank',
      references: 'John Smith - Smith Distributors'
    }),
    license_file_name: 'tobacco_license_2025.pdf',
    license_file_path: '/uploads/licenses/TX-2025-12345.pdf',
    license_uploaded_at: '2026-01-16T10:00:00Z',
    submitted_at: '2026-01-16T09:00:00Z',
    reviewed_at: '2026-01-17T14:00:00Z',
    reviewed_by: 1,
    rejection_reason: null
  }
];

// Mock supplier approvals
let mockSupplierApprovals = [
  {
    id: 1,
    retailer_id: 2,
    supplier_id: 1,
    retailer_application_id: 1,
    status: 'approved',
    approved_at: '2026-01-17T14:00:00Z',
    approved_by: 1,
    credit_limit: 5000,
    payment_terms: 'Net 30',
    notes: 'Approved - tobacco license verified'
  }
];

// Mock counters for new tables
let supplierApplicationIdCounter = 3;
let retailerApplicationIdCounter = 2;
let retailerLicenseIdCounter = 2;
let supplierApprovalIdCounter = 2;

// Mock communication data
let messageIdCounter = 2;
let callLogIdCounter = 2;

let mockMessages = [
  {
    id: 1,
    sender_id: 1,
    recipient_id: 2,
    content: 'Welcome aboard. Your account is approved and ready for orders.',
    created_at: '2026-01-18T10:30:00Z'
  }
];

let mockCallLogs = [
  {
    id: 1,
    caller_id: 1,
    recipient_id: 2,
    call_type: 'outbound',
    duration_seconds: 420,
    notes: 'Initial onboarding call completed.',
    created_at: '2026-01-18T11:00:00Z'
  }
];

// Mock scheduling data
let shiftIdCounter = 3;
let scheduleIdCounter = 3;

const mockShifts = [
  { id: 1, company_id: 1, shift_name: 'Morning Shift', start_time: '08:00', end_time: '16:00', break_duration: 15, lunch_duration: 30, days_of_week: [1,2,3,4,5], is_recurring: true },
  { id: 2, company_id: 1, shift_name: 'Evening Shift', start_time: '16:00', end_time: '00:00', break_duration: 15, lunch_duration: 30, days_of_week: [1,2,3,4,5], is_recurring: true }
];

const mockSchedules = [
  { id: 1, company_id: 1, employee_id: 1, employee_name: 'John Doe', shift_id: 1, shift_name: 'Morning Shift', scheduled_date: '2026-02-17', start_time: '08:00', end_time: '16:00', status: 'scheduled', published: true },
  { id: 2, company_id: 1, employee_id: 2, employee_name: 'Jane Smith', shift_id: 2, shift_name: 'Evening Shift', scheduled_date: '2026-02-17', start_time: '16:00', end_time: '00:00', status: 'scheduled', published: true }
];

// ============================================
// Health & Status Endpoints
// ============================================

app.get("/", (req, res) => {
  res.json({
    message: "Cigar Order Hub Backend API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      auth: "/api/auth/*",
      products: "/api/products/*",
      orders: "/api/orders/*",
      users: "/api/users/*",
      analytics: "/api/analytics/*"
    }
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// Authentication Endpoints
// ============================================

app.post("/api/auth/register", (req, res) => {
  try {
    const { name, email, password, role, business_name, employee_role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if email exists
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const userId = userIdCounter++;
    const newUser = { 
      id: userId, 
      name, 
      email, 
      password, 
      role: role || 'user',
      business_name: business_name || null,
      employee_role: employee_role || null,
      employee_id: employee_role ? `EMP-${userId}` : null,
      approved: 0,
      created_at: new Date().toISOString()
    };
    mockUsers.push(newUser);

    const token = jwt.sign({ userId, email, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Find user by email
    const user = mockUsers.find(u => u.email === email);

    if (!user || user.password !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token" });
  }
};

// Validate sales rep access
const validateSalesRepAccess = (req, res, next) => {
  const userId = req.user.userId;
  const salesRepId = parseInt(req.params.sales_rep_id);
  
  // Find the sales rep for this user
  const salesRep = mockSalesReps.find(rep => rep.user_id === userId);
  
  if (!salesRep) {
    return res.status(403).json({ error: 'No sales rep profile found for your account' });
  }
  
  // Check if the requested sales_rep_id matches the user's sales rep
  if (salesRep.id !== salesRepId) {
    return res.status(403).json({ error: 'You can only access your own sales rep data' });
  }
  
  // Attach sales rep info to request for convenience
  req.salesRep = salesRep;
  next();
};

// ============================================
// Employee Role & Permissions
// ============================================

const rolePermissions = {
  admin: {
    label: 'System Administrator',
    access: ['all'],
    can_manage_users: true,
    can_view_analytics: true,
    can_manage_products: true,
    can_manage_orders: true,
    can_view_all_data: true
  },
  sales_rep: {
    label: 'Sales Representative',
    access: ['field_sales', 'accounts', 'orders', 'products'],
    can_manage_users: false,
    can_view_analytics: false,
    can_manage_products: false,
    can_manage_orders: true,
    can_view_all_data: false
  },
  sales_manager: {
    label: 'Sales Manager',
    access: ['field_sales', 'accounts', 'orders', 'products', 'analytics', 'scheduling'],
    can_manage_users: false,
    can_view_analytics: true,
    can_manage_products: false,
    can_manage_orders: true,
    can_view_all_data: true
  },
  warehouse_manager: {
    label: 'Warehouse Manager',
    access: ['warehouse', 'products', 'orders', 'scheduling', 'analytics'],
    can_manage_users: false,
    can_view_analytics: true,
    can_manage_products: true,
    can_manage_orders: true,
    can_view_all_data: false
  },
  warehouse_worker: {
    label: 'Warehouse Worker',
    access: ['warehouse', 'products', 'orders'],
    can_manage_users: false,
    can_view_analytics: false,
    can_manage_products: false,
    can_manage_orders: false,
    can_view_all_data: false
  },
  hr_manager: {
    label: 'HR Manager',
    access: ['hr', 'scheduling', 'users', 'analytics'],
    can_manage_users: true,
    can_view_analytics: true,
    can_manage_products: false,
    can_manage_orders: false,
    can_view_all_data: true
  },
  accountant: {
    label: 'Accountant',
    access: ['orders', 'analytics', 'contracts'],
    can_manage_users: false,
    can_view_analytics: true,
    can_manage_products: false,
    can_manage_orders: false,
    can_view_all_data: true
  },
  operations_manager: {
    label: 'Operations Manager',
    access: ['warehouse', 'orders', 'products', 'scheduling', 'analytics'],
    can_manage_users: false,
    can_view_analytics: true,
    can_manage_products: true,
    can_manage_orders: true,
    can_view_all_data: true
  },
  customer_service: {
    label: 'Customer Service',
    access: ['orders', 'products', 'accounts'],
    can_manage_users: false,
    can_view_analytics: false,
    can_manage_products: false,
    can_manage_orders: true,
    can_view_all_data: false
  },
  delivery_driver: {
    label: 'Delivery Driver',
    access: ['orders'],
    can_manage_users: false,
    can_view_analytics: false,
    can_manage_products: false,
    can_manage_orders: false,
    can_view_all_data: false
  }
};

// Get current user's employee info and permissions
app.get("/api/auth/employee-info", authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const user = mockUsers.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const employeeRole = user.employee_role || 'customer_service';
    const permissions = rolePermissions[employeeRole] || rolePermissions.customer_service;
    
    const { password, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword,
      employee_role: employeeRole,
      employee_id: user.employee_id,
      permissions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all available roles and their permissions
app.get("/api/roles", authenticateToken, (req, res) => {
  try {
    res.json({ roles: rolePermissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Products Endpoints
// ============================================

app.get("/api/products", (req, res) => {
  try {
    const { category, supplier, search } = req.query;
    let filtered = [...mockProducts];

    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }
    if (supplier) {
      filtered = filtered.filter(p => p.supplierId.toString() === supplier);
    }
    if (search) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }

    res.json({
      message: "Products retrieved",
      count: filtered.length,
      products: filtered
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/products/:id", (req, res) => {
  try {
    const product = mockProducts.find(p => p.id.toString() === req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product retrieved", product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/products", authenticateToken, (req, res) => {
  try {
    const { name, sku, price, stock, category, description, imageUrl, supplierId } = req.body;

    if (!name || !sku || !price || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const nextProductId = app.locals.productIdCounter || productIdCounter;
    const newProduct = {
      id: nextProductId,
      supplierId: supplierId || req.user.userId,
      name,
      sku,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      category,
      description: description || '',
      imageUrl: imageUrl || ''
    };

    app.locals.productIdCounter = nextProductId + 1;
    productIdCounter = app.locals.productIdCounter;

    mockProducts.push(newProduct);

    res.status(201).json({
      message: "Product created successfully",
      product: newProduct
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/products/:id", authenticateToken, (req, res) => {
  try {
    const productIndex = mockProducts.findIndex(p => p.id.toString() === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    const { name, sku, price, stock, category, description, imageUrl } = req.body;

    if (name) mockProducts[productIndex].name = name;
    if (sku) mockProducts[productIndex].sku = sku;
    if (price !== undefined) mockProducts[productIndex].price = parseFloat(price);
    if (stock !== undefined) mockProducts[productIndex].stock = parseInt(stock);
    if (category) mockProducts[productIndex].category = category;
    if (description !== undefined) mockProducts[productIndex].description = description;
    if (imageUrl !== undefined) mockProducts[productIndex].imageUrl = imageUrl;

    res.json({
      message: "Product updated successfully",
      product: mockProducts[productIndex]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/products/:id", authenticateToken, (req, res) => {
  try {
    const productIndex = mockProducts.findIndex(p => p.id.toString() === req.params.id);

    if (productIndex === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    const deletedProduct = mockProducts.splice(productIndex, 1)[0];

    res.json({
      message: "Product deleted successfully",
      product: deletedProduct
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/products/supplier/:supplierId", (req, res) => {
  try {
    const products = mockProducts.filter(p => p.supplier === req.params.supplierId);

    res.json({
      message: "Supplier products retrieved",
      supplier: req.params.supplierId,
      count: products.length,
      products
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/products/search", (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Search query required" });
    }

    const results = mockProducts.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.category.toLowerCase().includes(q.toLowerCase())
    );

    res.json({
      message: "Search results",
      query: q,
      count: results.length,
      products: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Orders Endpoints
// ============================================

app.get("/api/orders", authenticateToken, (req, res) => {
  try {
    const userOrders = mockOrders.filter(o => o.retailer_id === req.user.userId);

    res.json({
      message: "Orders retrieved",
      count: userOrders.length,
      orders: userOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/orders/:id", authenticateToken, (req, res) => {
  try {
    const order = mockOrders.find(o => o.id.toString() === req.params.id && o.retailer_id === req.user.userId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Order retrieved", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/orders", authenticateToken, (req, res) => {
  try {
    const { products, supplier_id } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "Products array required" });
    }

    // Validate warehouse inventory
    const insufficientInventory = [];
    for (const item of products) {
      const product = mockProducts.find(p => p.id === item.product_id);
      if (!product) {
        insufficientInventory.push({ product_id: item.product_id, error: 'Product not found' });
        continue;
      }

      // Get total warehouse inventory for this product
      const warehouseInventory = mockProductLocations
        .filter(pl => pl.product_id === item.product_id)
        .reduce((sum, pl) => sum + pl.quantity, 0);

      if (warehouseInventory < (item.quantity || 1)) {
        insufficientInventory.push({
          product_id: item.product_id,
          sku: product.sku,
          requested: item.quantity || 1,
          available: warehouseInventory,
          error: 'Insufficient warehouse inventory'
        });
      }
    }

    if (insufficientInventory.length > 0) {
      return res.status(409).json({
        error: 'Insufficient inventory for one or more items',
        details: insufficientInventory
      });
    }

    const newOrder = {
      id: orderIdCounter++,
      retailer_id: req.user.userId,
      supplier_id: supplier_id || 1,
      items: JSON.stringify(products),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    db.run(
      `INSERT INTO orders (id, retailer_id, supplier_id, items, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        newOrder.id,
        newOrder.retailer_id,
        newOrder.supplier_id,
        newOrder.items,
        newOrder.status,
        newOrder.created_at
      ],
      (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to persist order", details: err.message });
        }

        mockOrders.push(newOrder);

        res.status(201).json({
          message: "Order created successfully",
          order: newOrder,
          inventory_confirmed: true
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/orders/:id", authenticateToken, (req, res) => {
  try {
    const { status } = req.body;
    const orderIndex = mockOrders.findIndex(o => o.id.toString() === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (status) {
      mockOrders[orderIndex].status = status;
    }

    res.json({
      message: "Order updated successfully",
      order: mockOrders[orderIndex]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/orders/:id", authenticateToken, (req, res) => {
  try {
    const orderIndex = mockOrders.findIndex(o => o.id.toString() === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: "Order not found" });
    }

    const deletedOrder = mockOrders.splice(orderIndex, 1)[0];

    res.json({
      message: "Order deleted successfully",
      order: deletedOrder
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Order Tracking Endpoints
// ============================================

// Supplier: Get all orders they've created (with tracking info)
app.get("/api/suppliers/:supplierId/orders", authenticateToken, (req, res) => {
  try {
    const supplierId = parseInt(req.params.supplierId);
    
    // Verify supplier is requesting their own orders
    if (req.user.userId !== supplierId && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const supplierOrders = mockOrders.filter(o => o.supplier_id === supplierId);
    
    // Enrich with product and retailer details
    const enrichedOrders = supplierOrders.map(order => {
      const retailer = mockUsers.find(u => u.id === order.retailer_id);
      const items = JSON.parse(order.items);
      const enrichedItems = items.map(item => {
        const product = mockProducts.find(p => p.id === item.product_id);
        return {
          ...item,
          name: product?.name || 'Unknown Product',
          price: product?.price || 0,
          sku: product?.sku || 'N/A'
        };
      });

      return {
        ...order,
        retailer_name: retailer?.business_name || 'Unknown Retailer',
        retailer_email: retailer?.email || 'N/A',
        items: enrichedItems,
        is_shipped: !!order.tracking_number,
        shipping_info: order.tracking_number ? {
          carrier: order.carrier,
          tracking_number: order.tracking_number,
          eta: order.eta,
          delivery_status: order.delivery_status,
          label_url: order.label_url
        } : null
      };
    });

    res.json({
      message: "Supplier orders retrieved",
      supplier_id: supplierId,
      count: enrichedOrders.length,
      orders: enrichedOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Get tracking info for orders they've placed
app.get("/api/retailers/orders/tracking", authenticateToken, (req, res) => {
  try {
    const retailerId = req.user.userId;
    
    const retailerOrders = mockOrders.filter(o => o.retailer_id === retailerId);
    
    // Enrich with supplier and product details
    const enrichedOrders = retailerOrders.map(order => {
      const supplier = mockUsers.find(u => u.id === order.supplier_id);
      const items = JSON.parse(order.items);
      const enrichedItems = items.map(item => {
        const product = mockProducts.find(p => p.id === item.product_id);
        return {
          ...item,
          name: product?.name || 'Unknown Product',
          price: product?.price || 0,
          sku: product?.sku || 'N/A'
        };
      });

      return {
        ...order,
        supplier_name: supplier?.business_name || 'Unknown Supplier',
        supplier_email: supplier?.email || 'N/A',
        items: enrichedItems,
        is_shipped: !!order.tracking_number,
        shipping_info: order.tracking_number ? {
          carrier: order.carrier,
          tracking_number: order.tracking_number,
          eta: order.eta,
          delivery_status: order.delivery_status,
          label_url: order.label_url
        } : null
      };
    });

    res.json({
      message: "Retailer orders with tracking retrieved",
      retailer_id: retailerId,
      count: enrichedOrders.length,
      orders: enrichedOrders
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Get specific order tracking details
app.get("/api/retailers/orders/:orderId/tracking", authenticateToken, (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const retailerId = req.user.userId;
    
    const order = mockOrders.find(o => o.id === orderId && o.retailer_id === retailerId);
    
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const supplier = mockUsers.find(u => u.id === order.supplier_id);
    const items = JSON.parse(order.items);
    const enrichedItems = items.map(item => {
      const product = mockProducts.find(p => p.id === item.product_id);
      return {
        ...item,
        name: product?.name || 'Unknown Product',
        price: product?.price || 0,
        sku: product?.sku || 'N/A'
      };
    });

    res.json({
      message: "Order tracking details retrieved",
      order: {
        ...order,
        supplier_name: supplier?.business_name || 'Unknown Supplier',
        supplier_email: supplier?.email || 'N/A',
        items: enrichedItems,
        is_shipped: !!order.tracking_number,
        shipping_info: order.tracking_number ? {
          carrier: order.carrier,
          tracking_number: order.tracking_number,
          eta: order.eta,
          delivery_status: order.delivery_status,
          label_url: order.label_url,
          carrier_url: generateCarrierUrl(order.carrier, order.tracking_number)
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to generate carrier tracking URLs
function generateCarrierUrl(carrier, trackingNumber) {
  if (carrier === 'UPS') {
    return `https://www.ups.com/track?tracknum=${trackingNumber}`;
  } else if (carrier === 'USPS') {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
  }
  return null;
}

function isApprovedSupplierRetailerPair(userA, userB) {
  if (!userA || !userB) return false;

  let supplierId;
  let retailerId;

  if (userA.role === 'supplier' && userB.role === 'retailer') {
    supplierId = userA.id;
    retailerId = userB.id;
  } else if (userA.role === 'retailer' && userB.role === 'supplier') {
    supplierId = userB.id;
    retailerId = userA.id;
  } else {
    return false;
  }

  return mockSupplierApprovals.some(
    approval =>
      approval.status === 'approved' &&
      approval.supplier_id === supplierId &&
      approval.retailer_id === retailerId
  );
}

function getApprovedCounterparties(userId) {
  const currentUser = mockUsers.find(u => u.id === userId);
  if (!currentUser) return [];

  if (currentUser.role === 'supplier') {
    const retailerIds = mockSupplierApprovals
      .filter(a => a.supplier_id === userId && a.status === 'approved')
      .map(a => a.retailer_id);
    return mockUsers.filter(u => retailerIds.includes(u.id));
  }

  if (currentUser.role === 'retailer') {
    const supplierIds = mockSupplierApprovals
      .filter(a => a.retailer_id === userId && a.status === 'approved')
      .map(a => a.supplier_id);
    return mockUsers.filter(u => supplierIds.includes(u.id));
  }

  return [];
}

function isSameBusinessTeam(userA, userB) {
  if (!userA || !userB) return false;
  if (userA.id === userB.id) return false;
  if (!userA.business_name || !userB.business_name) return false;

  return (
    userA.role === userB.role &&
    ['supplier', 'retailer'].includes(userA.role) &&
    String(userA.business_name).toLowerCase() === String(userB.business_name).toLowerCase()
  );
}

function canUsersCommunicate(userA, userB) {
  return isApprovedSupplierRetailerPair(userA, userB) || isSameBusinessTeam(userA, userB);
}

function getCommunicationContacts(userId, { teamOnly = false } = {}) {
  const currentUser = mockUsers.find(u => u.id === userId);
  if (!currentUser) return [];

  const teamContacts = mockUsers
    .filter(contact => isSameBusinessTeam(currentUser, contact))
    .map(contact => ({
      ...contact,
      communication_type: 'team'
    }));

  if (teamOnly) {
    return teamContacts;
  }

  const approvedContacts = getApprovedCounterparties(userId).map(contact => ({
    ...contact,
    communication_type: 'approved_partner'
  }));

  const byId = new Map();
  [...teamContacts, ...approvedContacts].forEach(contact => {
    byId.set(contact.id, contact);
  });

  return Array.from(byId.values());
}

// ============================================
// Supplier Approvals & Applications API
// ============================================

// Supplier: Create application template
app.post("/api/suppliers/applications", authenticateToken, (req, res) => {
  try {
    const { application_name, description, required_fields, form_template, is_required } = req.body;
    
    if (!application_name) {
      return res.status(400).json({ error: 'application_name is required' });
    }

    const newApplication = {
      id: supplierApplicationIdCounter++,
      supplier_id: req.user.userId,
      application_name,
      description: description || '',
      required_fields: required_fields || [],
      form_template: form_template || '{}',
      is_required: is_required || false,
      created_at: new Date().toISOString()
    };

    mockSupplierApplications.push(newApplication);

    res.status(201).json({
      message: 'Application template created',
      application: newApplication
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier: Get my application templates
app.get("/api/suppliers/applications", authenticateToken, (req, res) => {
  try {
    const applications = mockSupplierApplications.filter(a => a.supplier_id === req.user.userId);
    
    res.json({
      count: applications.length,
      applications: applications
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Get list of all approved suppliers
app.get("/api/retailers/approved-suppliers", authenticateToken, (req, res) => {
  try {
    const approvals = mockSupplierApprovals.filter(a => a.retailer_id === req.user.userId && a.status === 'approved');
    
    const approvedSuppliers = approvals.map(approval => {
      const supplier = mockUsers.find(u => u.id === approval.supplier_id);
      return {
        supplier_id: approval.supplier_id,
        supplier_name: supplier?.name,
        supplier_email: supplier?.email,
        business_name: supplier?.business_name,
        credit_limit: approval.credit_limit,
        payment_terms: approval.payment_terms,
        approved_at: approval.approved_at,
        product_count: mockProducts.filter(p => p.supplierId === approval.supplier_id).length
      };
    });

    res.json({
      count: approvedSuppliers.length,
      approved_suppliers: approvedSuppliers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Get approved sales reps for approved suppliers
app.get("/api/retailers/approved-sales-reps", authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'retailer') {
      return res.status(403).json({ error: 'Only retailers can access approved sales reps' });
    }

    const retailerId = req.user.userId;
    const approvedSupplierIds = new Set(
      mockSupplierApprovals
        .filter(a => a.retailer_id === retailerId && a.status === 'approved')
        .map(a => a.supplier_id)
    );

    const repsById = new Map();

    const addRepIfAllowed = (rep, source, authorizationType) => {
      const repUser = mockUsers.find(u => u.id === rep.user_id);
      if (!repUser || repUser.role !== 'supplier' || !approvedSupplierIds.has(repUser.id)) {
        return;
      }

      repsById.set(rep.id, {
        sales_rep_id: rep.id,
        user_id: repUser.id,
        supplier_id: repUser.id,
        name: repUser.name,
        email: repUser.email,
        business_name: repUser.business_name || null,
        employee_id: rep.employee_id,
        territory: rep.territory,
        status: rep.status,
        authorization_type: authorizationType,
        source
      });
    };

    const accountAuthorizations = mockRepAuthorizedAccounts.filter(
      auth => auth.account_id === retailerId && auth.is_active
    );

    accountAuthorizations.forEach(auth => {
      const rep = mockSalesReps.find(r => r.id === auth.sales_rep_id && r.status === 'active');
      if (rep) {
        addRepIfAllowed(rep, 'account_authorization', auth.authorization_type || 'full_access');
      }
    });

    mockSalesReps
      .filter(rep => rep.status === 'active')
      .forEach(rep => {
        let assignedAccounts = [];
        try {
          assignedAccounts = JSON.parse(rep.assigned_accounts || '[]');
        } catch {
          assignedAccounts = [];
        }

        if (Array.isArray(assignedAccounts) && assignedAccounts.includes(retailerId) && !repsById.has(rep.id)) {
          addRepIfAllowed(rep, 'assigned_accounts', 'assigned_account');
        }
      });

    const approvedSalesReps = Array.from(repsById.values()).sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      count: approvedSalesReps.length,
      approved_sales_reps: approvedSalesReps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier/Sales Rep: Get approved retailers for contact
app.get("/api/suppliers/approved-retailers", authenticateToken, (req, res) => {
  try {
    if (req.user.role !== 'supplier') {
      return res.status(403).json({ error: 'Only supplier users can access approved retailers' });
    }

    const supplierId = req.user.userId;
    const allApprovedRetailers = mockSupplierApprovals
      .filter(a => a.supplier_id === supplierId && a.status === 'approved')
      .map(approval => {
        const retailer = mockUsers.find(u => u.id === approval.retailer_id && u.role === 'retailer');
        if (!retailer) return null;

        return {
          retailer_id: retailer.id,
          retailer_name: retailer.name,
          retailer_email: retailer.email,
          business_name: retailer.business_name || null,
          approved_at: approval.approved_at,
          credit_limit: approval.credit_limit,
          payment_terms: approval.payment_terms
        };
      })
      .filter(Boolean);

    const salesRepProfile = mockSalesReps.find(rep => rep.user_id === supplierId && rep.status === 'active');

    if (!salesRepProfile) {
      return res.json({
        count: allApprovedRetailers.length,
        approved_retailers: allApprovedRetailers
      });
    }

    const repRetailerIds = new Set();

    mockRepAuthorizedAccounts
      .filter(auth => auth.sales_rep_id === salesRepProfile.id && auth.is_active)
      .forEach(auth => repRetailerIds.add(auth.account_id));

    try {
      const assignedAccounts = JSON.parse(salesRepProfile.assigned_accounts || '[]');
      if (Array.isArray(assignedAccounts)) {
        assignedAccounts.forEach(accountId => repRetailerIds.add(accountId));
      }
    } catch {
    }

    const repApprovedRetailers = allApprovedRetailers.filter(retailer => repRetailerIds.has(retailer.retailer_id));

    res.json({
      count: repApprovedRetailers.length,
      approved_retailers: repApprovedRetailers
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Get available suppliers to apply to
app.get("/api/retailers/available-suppliers", authenticateToken, (req, res) => {
  try {
    // Get suppliers that have applications AND aren't already approved by this retailer
    const retailers_applies_to = mockSupplierApplications.map(a => a.supplier_id);
    const already_approved = mockSupplierApprovals
      .filter(a => a.retailer_id === req.user.userId)
      .map(a => a.supplier_id);
    
    const unique_supplier_ids = [...new Set(retailers_applies_to)].filter(id => !already_approved.includes(id));
    
    const available = unique_supplier_ids.map(supplier_id => {
      const supplier = mockUsers.find(u => u.id === supplier_id);
      const applications = mockSupplierApplications.filter(a => a.supplier_id === supplier_id);
      const pending_app = mockRetailerApplications.find(a => 
        a.retailer_id === req.user.userId && a.supplier_id === supplier_id
      );
      
      return {
        supplier_id: supplier_id,
        supplier_name: supplier?.name,
        business_name: supplier?.business_name,
        applications_required: applications.length,
        pending_application: pending_app ? true : false,
        pending_status: pending_app?.status || null
      };
    });

    res.json({
      count: available.length,
      available_suppliers: available
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Get ALL suppliers (with their application status)
app.get("/api/retailers/all-suppliers", authenticateToken, (req, res) => {
  try {
    // Get all suppliers
    const all_suppliers = mockUsers.filter(u => u.role === 'supplier');
    
    // Get approved suppliers for this retailer
    const approved_ids = mockSupplierApprovals
      .filter(a => a.retailer_id === req.user.userId && a.status === 'approved')
      .map(a => a.supplier_id);
    
    // Get pending/denied applications for this retailer
    const retailer_apps = mockRetailerApplications.filter(a => a.retailer_id === req.user.userId);
    
    const suppliers_with_status = all_suppliers.map(supplier => {
      const is_approved = approved_ids.includes(supplier.id);
      const application = retailer_apps.find(a => a.supplier_id === supplier.id);
      const has_applications = mockSupplierApplications.some(a => a.supplier_id === supplier.id);
      
      let status = 'none';
      if (is_approved) {
        status = 'approved';
      } else if (application) {
        status = application.status;
      }
      
      return {
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_email: supplier.email,
        business_name: supplier.business_name,
        status: status, // 'approved', 'pending', 'denied', or 'none'
        has_applications: has_applications,
        application_count: mockSupplierApplications.filter(a => a.supplier_id === supplier.id).length,
        product_count: mockProducts.filter(p => p.supplierId === supplier.id).length
      };
    });

    res.json({
      count: suppliers_with_status.length,
      all_suppliers: suppliers_with_status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Upload tobacco license
app.post("/api/retailers/licenses", authenticateToken, (req, res) => {
  try {
    const { license_number, license_type, issue_date, expiration_date, file_name } = req.body;
    
    if (!license_number || !expiration_date) {
      return res.status(400).json({ error: 'license_number and expiration_date are required' });
    }

    const newLicense = {
      id: retailerLicenseIdCounter++,
      retailer_id: req.user.userId,
      license_type: license_type || 'tobacco',
      license_number,
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      expiration_date,
      file_name: file_name || `license_${license_number}.pdf`,
      file_path: `/uploads/licenses/${license_number}.pdf`,
      verified: false,
      verified_by: null,
      verified_at: null,
      created_at: new Date().toISOString()
    };

    mockRetailerLicenses.push(newLicense);

    res.status(201).json({
      message: 'License uploaded successfully',
      license: newLicense
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Get my licenses
app.get("/api/retailers/licenses", authenticateToken, (req, res) => {
  try {
    const licenses = mockRetailerLicenses.filter(l => l.retailer_id === req.user.userId);
    
    res.json({
      count: licenses.length,
      licenses: licenses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Submit application to supplier
app.post("/api/retailers/applications", authenticateToken, (req, res) => {
  try {
    const { supplier_id, supplier_application_id, application_data, license_id } = req.body;
    
    if (!supplier_id || !application_data) {
      return res.status(400).json({ error: 'supplier_id and application_data are required' });
    }

    // Check if already approved
    const existing_approval = mockSupplierApprovals.find(a => 
      a.retailer_id === req.user.userId && a.supplier_id === supplier_id
    );
    if (existing_approval) {
      return res.status(409).json({ error: 'Already approved by this supplier' });
    }

    // Check if already applied
    const existing_app = mockRetailerApplications.find(a =>
      a.retailer_id === req.user.userId && a.supplier_id === supplier_id && a.status === 'pending'
    );
    if (existing_app) {
      return res.status(409).json({ error: 'Application already pending with this supplier' });
    }

    // Get license info if provided
    let license_file_name = null;
    let license_file_path = null;
    if (license_id) {
      const license = mockRetailerLicenses.find(l => l.id === license_id && l.retailer_id === req.user.userId);
      if (license) {
        license_file_name = license.file_name;
        license_file_path = license.file_path;
      }
    }

    const newApplication = {
      id: retailerApplicationIdCounter++,
      retailer_id: req.user.userId,
      supplier_id: supplier_id,
      supplier_application_id: supplier_application_id || null,
      status: 'pending',
      application_data: JSON.stringify(application_data),
      license_file_name: license_file_name,
      license_file_path: license_file_path,
      license_uploaded_at: license_file_name ? new Date().toISOString() : null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null
    };

    mockRetailerApplications.push(newApplication);

    res.status(201).json({
      message: 'Application submitted successfully',
      application: newApplication
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retailer: Get my applications
app.get("/api/retailers/applications", authenticateToken, (req, res) => {
  try {
    const applications = mockRetailerApplications.filter(a => a.retailer_id === req.user.userId);
    
    const enriched = applications.map(app => {
      const supplier = mockUsers.find(u => u.id === app.supplier_id);
      return {
        ...app,
        application_data: JSON.parse(app.application_data),
        supplier_name: supplier?.name,
        supplier_business: supplier?.business_name
      };
    });

    res.json({
      count: enriched.length,
      applications: enriched
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier: Get applications from retailers
app.get("/api/suppliers/retailer-applications", authenticateToken, (req, res) => {
  try {
    const { status } = req.query;
    let applications = mockRetailerApplications.filter(a => a.supplier_id === req.user.userId);
    
    if (status) {
      applications = applications.filter(a => a.status === status);
    }
    
    const enriched = applications.map(app => {
      const retailer = mockUsers.find(u => u.id === app.retailer_id);
      return {
        ...app,
        application_data: JSON.parse(app.application_data),
        retailer_name: retailer?.name,
        retailer_business: retailer?.business_name,
        retailer_email: retailer?.email
      };
    });

    res.json({
      count: enriched.length,
      status_filter: status || 'all',
      applications: enriched
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier: Approve retailer application
app.post("/api/suppliers/applications/:applicationId/approve", authenticateToken, (req, res) => {
  try {
    const { applicationId } = req.params;
    const { credit_limit, payment_terms, notes } = req.body;

    const application = mockRetailerApplications.find(a => 
      a.id === parseInt(applicationId) && a.supplier_id === req.user.userId
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update application
    application.status = 'approved';
    application.reviewed_at = new Date().toISOString();
    application.reviewed_by = req.user.userId;

    // Create approval record
    const newApproval = {
      id: supplierApprovalIdCounter++,
      retailer_id: application.retailer_id,
      supplier_id: req.user.userId,
      retailer_application_id: application.id,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: req.user.userId,
      credit_limit: credit_limit || 5000,
      payment_terms: payment_terms || 'Net 30',
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    mockSupplierApprovals.push(newApproval);

    res.json({
      message: 'Application approved successfully',
      application: application,
      approval: newApproval
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier: Deny retailer application
app.post("/api/suppliers/applications/:applicationId/deny", authenticateToken, (req, res) => {
  try {
    const { applicationId } = req.params;
    const { rejection_reason } = req.body;

    const application = mockRetailerApplications.find(a => 
      a.id === parseInt(applicationId) && a.supplier_id === req.user.userId
    );

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    application.status = 'denied';
    application.reviewed_at = new Date().toISOString();
    application.reviewed_by = req.user.userId;
    application.rejection_reason = rejection_reason || 'Application denied by supplier';

    res.json({
      message: 'Application denied',
      application: application
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier: Verify retailer license
app.post("/api/suppliers/licenses/:licenseId/verify", authenticateToken, (req, res) => {
  try {
    const { licenseId } = req.params;
    
    // Find which supplier is trying to verify - just verify as admin/supplier
    const license = mockRetailerLicenses.find(l => l.id === parseInt(licenseId));

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    license.verified = true;
    license.verified_by = req.user.userId;
    license.verified_at = new Date().toISOString();

    res.json({
      message: 'License verified successfully',
      license: license
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Communication Endpoints
// ============================================

app.get('/api/communication/contacts', authenticateToken, (req, res) => {
  try {
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['supplier', 'retailer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only suppliers and retailers can use communication endpoints' });
    }

    const teamOnly = String(req.query.teamOnly || '').toLowerCase() === 'true';

    const contacts = getCommunicationContacts(req.user.userId, { teamOnly }).map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      role: contact.role,
      business_name: contact.business_name,
      employee_role: contact.employee_role || null,
      communication_type: contact.communication_type || 'approved_partner'
    }));

    res.json({
      count: contacts.length,
      contacts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages', authenticateToken, (req, res) => {
  try {
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const withUserId = req.query.with_user_id ? parseInt(req.query.with_user_id, 10) : null;

    if (!['supplier', 'retailer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only suppliers and retailers can use communication endpoints' });
    }

    if (withUserId) {
      const counterpart = mockUsers.find(u => u.id === withUserId);
      if (!counterpart) {
        return res.status(404).json({ error: 'Counterparty not found' });
      }

      if (!canUsersCommunicate(currentUser, counterpart)) {
        return res.status(403).json({ error: 'Messaging is only allowed with approved counterparties or your employees' });
      }
    }

    let messages = mockMessages.filter(
      message => message.sender_id === req.user.userId || message.recipient_id === req.user.userId
    );

    if (withUserId) {
      messages = messages.filter(
        message =>
          (message.sender_id === req.user.userId && message.recipient_id === withUserId) ||
          (message.sender_id === withUserId && message.recipient_id === req.user.userId)
      );
    }

    const enriched = messages
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(message => ({
        ...message,
        sender_name: mockUsers.find(u => u.id === message.sender_id)?.name || null,
        recipient_name: mockUsers.find(u => u.id === message.recipient_id)?.name || null
      }));

    res.json({
      count: enriched.length,
      messages: enriched
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', authenticateToken, (req, res) => {
  try {
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    const recipientId = parseInt(req.body.recipient_id, 10);
    const { content } = req.body;

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['supplier', 'retailer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only suppliers and retailers can use communication endpoints' });
    }

    if (!recipientId || !content) {
      return res.status(400).json({ error: 'recipient_id and content are required' });
    }

    if (recipientId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    const recipient = mockUsers.find(u => u.id === recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (!canUsersCommunicate(currentUser, recipient)) {
      return res.status(403).json({ error: 'Messaging is only allowed with approved counterparties or your employees' });
    }

    const newMessage = {
      id: messageIdCounter++,
      sender_id: req.user.userId,
      recipient_id: recipientId,
      content: String(content).trim(),
      created_at: new Date().toISOString()
    };

    mockMessages.push(newMessage);

    res.status(201).json({
      message: 'Message sent successfully',
      data: newMessage
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/calls', authenticateToken, (req, res) => {
  try {
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['supplier', 'retailer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only suppliers and retailers can use communication endpoints' });
    }

    const withUserId = req.query.with_user_id ? parseInt(req.query.with_user_id, 10) : null;
    if (withUserId) {
      const counterpart = mockUsers.find(u => u.id === withUserId);
      if (!counterpart) {
        return res.status(404).json({ error: 'Counterparty not found' });
      }

      if (!canUsersCommunicate(currentUser, counterpart)) {
        return res.status(403).json({ error: 'Call logs are only available with approved counterparties or your employees' });
      }
    }

    let logs = mockCallLogs.filter(
      log => log.caller_id === req.user.userId || log.recipient_id === req.user.userId
    );

    if (withUserId) {
      logs = logs.filter(
        log =>
          (log.caller_id === req.user.userId && log.recipient_id === withUserId) ||
          (log.caller_id === withUserId && log.recipient_id === req.user.userId)
      );
    }

    const enriched = logs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(log => ({
        ...log,
        caller_name: mockUsers.find(u => u.id === log.caller_id)?.name || null,
        recipient_name: mockUsers.find(u => u.id === log.recipient_id)?.name || null
      }));

    res.json({
      count: enriched.length,
      calls: enriched
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/calls', authenticateToken, (req, res) => {
  try {
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    const recipientId = parseInt(req.body.recipient_id, 10);
    const { call_type, duration_seconds, notes } = req.body;

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!['supplier', 'retailer'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Only suppliers and retailers can use communication endpoints' });
    }

    if (!recipientId) {
      return res.status(400).json({ error: 'recipient_id is required' });
    }

    const recipient = mockUsers.find(u => u.id === recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (!canUsersCommunicate(currentUser, recipient)) {
      return res.status(403).json({ error: 'Call logs are only allowed with approved counterparties or your employees' });
    }

    const newCallLog = {
      id: callLogIdCounter++,
      caller_id: req.user.userId,
      recipient_id: recipientId,
      call_type: call_type || 'outbound',
      duration_seconds: Number.isFinite(Number(duration_seconds)) ? Number(duration_seconds) : 0,
      notes: notes || '',
      created_at: new Date().toISOString()
    };

    mockCallLogs.push(newCallLog);

    res.status(201).json({
      message: 'Call log created successfully',
      call: newCallLog
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Users Endpoints
// ============================================

app.get("/api/users", authenticateToken, (req, res) => {
  try {
    const users = mockUsers.map(u => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    res.json({
      message: "Users retrieved",
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users/:id", authenticateToken, (req, res) => {
  try {
    const user = mockUsers.find(u => u.id.toString() === req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      message: "User retrieved",
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", authenticateToken, (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const userId = userIdCounter++;
    const newUser = { 
      id: userId, 
      name, 
      email, 
      password, 
      role: role || 'user',
      approved: 0,
      created_at: new Date().toISOString()
    };
    mockUsers.push(newUser);

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      message: "User created successfully",
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/users/:id", authenticateToken, (req, res) => {
  try {
    const userIndex = mockUsers.findIndex(u => u.id.toString() === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    if (req.body.name) mockUsers[userIndex].name = req.body.name;
    if (req.body.email) mockUsers[userIndex].email = req.body.email;
    if (req.body.role) mockUsers[userIndex].role = req.body.role;
    if (req.body.approved !== undefined) mockUsers[userIndex].approved = req.body.approved;

    const { password, ...userWithoutPassword } = mockUsers[userIndex];

    res.json({
      message: "User updated successfully",
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:id", authenticateToken, (req, res) => {
  try {
    const userIndex = mockUsers.findIndex(u => u.id.toString() === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    const deletedUser = mockUsers.splice(userIndex, 1)[0];
    const { password, ...userWithoutPassword } = deletedUser;

    res.json({
      message: "User deleted successfully",
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Employee Management Routes
// ============================================
const employeeManagement = require('./employee-management');
const suppliersService = require('./suppliers');
const retailerSubscriptionRoutes = require('./retailer-subscription-routes');
const supplierSubscriptionRoutes = require('./supplier-subscription-routes');
const quickbooksRoutes = require('./quickbooks-routes');
const inventoryImportRoutes = require('./inventory-import-routes');
const supplierCatalogRoutes = require('./supplier-catalog-routes');
const accountingRoutes = require('./accounting-routes');
const invoiceRoutes = require('./invoice-routes');
employeeManagement.init(mockUsers, () => userIdCounter++);
app.use('/api/employees', authenticateToken, employeeManagement.router);
app.use('/api/retailer-subscription', authenticateToken, retailerSubscriptionRoutes);
app.use('/api/supplier-subscription', authenticateToken, supplierSubscriptionRoutes);
app.use('/api/protected/quickbooks', authenticateToken, quickbooksRoutes.router);
app.get('/api/quickbooks/callback', quickbooksRoutes.callbackHandler);
app.locals.mockProducts = mockProducts;
app.locals.productIdCounter = productIdCounter;
app.locals.mockUsers = mockUsers;
app.locals.supplierCatalogs = app.locals.supplierCatalogs || [];
app.use('/api/inventory-import', authenticateToken, inventoryImportRoutes);
app.use('/api/supplier-catalog', authenticateToken, supplierCatalogRoutes);
app.use('/api/accounting', authenticateToken, accountingRoutes);
app.use('/api/invoices', authenticateToken, invoiceRoutes);

// ============================================
// Protected Endpoints (Frontend expects these)
// ============================================

app.get("/api/protected/users", authenticateToken, (req, res) => {
  try {
    const users = mockUsers.map(u => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/protected/orders", authenticateToken, (req, res) => {
  try {
    res.json(mockOrders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/protected/users/:id/approve", authenticateToken, (req, res) => {
  try {
    const userIndex = mockUsers.findIndex(u => u.id.toString() === req.params.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    mockUsers[userIndex].approved = 1;
    const { password, ...userWithoutPassword } = mockUsers[userIndex];

    res.json({
      message: "User approved successfully",
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Protected Supplier Management Endpoints
// ============================================

app.get('/api/protected/suppliers', authenticateToken, suppliersService.getSuppliers);
app.get('/api/protected/suppliers/:id/analytics', authenticateToken, suppliersService.getSupplierAnalytics);
app.get('/api/protected/suppliers/:id/orders', authenticateToken, suppliersService.getSupplierOrders);
app.get('/api/protected/suppliers/:id/balance', authenticateToken, suppliersService.getSupplierBalance);
app.put('/api/protected/suppliers/:id/terms', authenticateToken, suppliersService.updateSupplierTerms);

// ============================================
// Analytics Endpoints
// ============================================

app.get("/api/analytics/summary", authenticateToken, (req, res) => {
  try {
    const totalOrders = mockOrders.length;
    const totalProducts = mockProducts.length;
    const totalStock = mockProducts.reduce((sum, p) => sum + p.stock, 0);

    res.json({
      message: "Analytics summary",
      summary: {
        totalOrders,
        totalProducts,
        totalStock,
        totalUsers: mockUsers.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/analytics/revenue", authenticateToken, (req, res) => {
  try {
    const revenueByDate = {};

    mockOrders.forEach(order => {
      const date = order.created_at.split('T')[0];
      revenueByDate[date] = (revenueByDate[date] || 0) + 1;
    });

    res.json({
      message: "Revenue data",
      revenueByDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/analytics/top-products", authenticateToken, (req, res) => {
  try {
    // Return top products by stock
    const topProducts = [...mockProducts]
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 10);

    res.json({
      message: "Top products",
      products: topProducts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/analytics/orders-over-time", authenticateToken, (req, res) => {
  try {
    const ordersByDate = {};

    mockOrders.forEach(order => {
      const date = order.created_at.split('T')[0];
      ordersByDate[date] = (ordersByDate[date] || 0) + 1;
    });

    res.json({
      message: "Orders over time",
      ordersByDate
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Scheduling Endpoints
// ============================================

// Get all shifts for a company
app.get("/api/shifts/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    const shifts = mockShifts.filter(s => s.company_id.toString() === company_id);
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new shift
app.post("/api/shifts", authenticateToken, (req, res) => {
  try {
    const { company_id, shift_name, start_time, end_time, break_duration, lunch_duration, days_of_week, is_recurring } = req.body;

    if (!company_id || !shift_name || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newShift = {
      id: shiftIdCounter++,
      company_id: parseInt(company_id),
      shift_name,
      start_time,
      end_time,
      break_duration: break_duration || 0,
      lunch_duration: lunch_duration || 0,
      days_of_week: days_of_week || [],
      is_recurring: is_recurring !== false
    };

    mockShifts.push(newShift);

    res.status(201).json({
      message: 'Shift created successfully',
      shift_id: newShift.id,
      shift: newShift
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a shift
app.put("/api/shifts/:id", authenticateToken, (req, res) => {
  try {
    const shiftIndex = mockShifts.findIndex(s => s.id.toString() === req.params.id);

    if (shiftIndex === -1) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const { shift_name, start_time, end_time, break_duration, lunch_duration, days_of_week, is_recurring } = req.body;

    if (shift_name) mockShifts[shiftIndex].shift_name = shift_name;
    if (start_time) mockShifts[shiftIndex].start_time = start_time;
    if (end_time) mockShifts[shiftIndex].end_time = end_time;
    if (break_duration !== undefined) mockShifts[shiftIndex].break_duration = break_duration;
    if (lunch_duration !== undefined) mockShifts[shiftIndex].lunch_duration = lunch_duration;
    if (days_of_week) mockShifts[shiftIndex].days_of_week = days_of_week;
    if (is_recurring !== undefined) mockShifts[shiftIndex].is_recurring = is_recurring;

    res.json({
      message: 'Shift updated successfully',
      shift: mockShifts[shiftIndex]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a shift
app.delete("/api/shifts/:id", authenticateToken, (req, res) => {
  try {
    const shiftIndex = mockShifts.findIndex(s => s.id.toString() === req.params.id);

    if (shiftIndex === -1) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const deletedShift = mockShifts.splice(shiftIndex, 1)[0];

    res.json({
      message: 'Shift deleted successfully',
      shift: deletedShift
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all schedules for a company
app.get("/api/schedules/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    const { start_date, end_date, employee_id } = req.query;

    let schedules = mockSchedules.filter(s => s.company_id.toString() === company_id);

    if (employee_id) {
      schedules = schedules.filter(s => s.employee_id.toString() === employee_id);
    }

    if (start_date) {
      schedules = schedules.filter(s => s.scheduled_date >= start_date);
    }

    if (end_date) {
      schedules = schedules.filter(s => s.scheduled_date <= end_date);
    }

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new schedule
app.post("/api/schedules", authenticateToken, (req, res) => {
  try {
    const { company_id, employee_id, shift_id, scheduled_date, start_time, end_time } = req.body;

    if (!company_id || !employee_id || !scheduled_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for conflicts
    const conflict = mockSchedules.find(s => 
      s.employee_id === employee_id && 
      s.scheduled_date === scheduled_date && 
      s.status !== 'cancelled'
    );

    if (conflict) {
      return res.status(409).json({ error: 'Schedule conflict: Employee already scheduled for this date' });
    }

    // Get employee and shift names
    const employee = mockUsers.find(u => u.id === employee_id);
    const shift = shift_id ? mockShifts.find(s => s.id === shift_id) : null;

    const newSchedule = {
      id: scheduleIdCounter++,
      company_id: parseInt(company_id),
      employee_id,
      employee_name: employee ? employee.name : 'Unknown',
      shift_id: shift_id || null,
      shift_name: shift ? shift.shift_name : 'Custom',
      scheduled_date,
      start_time,
      end_time,
      status: 'scheduled',
      published: false
    };

    mockSchedules.push(newSchedule);

    res.status(201).json({
      message: 'Schedule created successfully',
      schedule_id: newSchedule.id,
      schedule: newSchedule
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a schedule
app.put("/api/schedules/:id", authenticateToken, (req, res) => {
  try {
    const scheduleIndex = mockSchedules.findIndex(s => s.id.toString() === req.params.id);

    if (scheduleIndex === -1) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const { shift_id, scheduled_date, start_time, end_time, status, published } = req.body;

    if (shift_id !== undefined) {
      const shift = mockShifts.find(s => s.id === shift_id);
      mockSchedules[scheduleIndex].shift_id = shift_id;
      mockSchedules[scheduleIndex].shift_name = shift ? shift.shift_name : 'Custom';
    }
    if (scheduled_date) mockSchedules[scheduleIndex].scheduled_date = scheduled_date;
    if (start_time) mockSchedules[scheduleIndex].start_time = start_time;
    if (end_time) mockSchedules[scheduleIndex].end_time = end_time;
    if (status) mockSchedules[scheduleIndex].status = status;
    if (published !== undefined) mockSchedules[scheduleIndex].published = published;

    res.json({
      message: 'Schedule updated successfully',
      schedule: mockSchedules[scheduleIndex]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a schedule
app.delete("/api/schedules/:id", authenticateToken, (req, res) => {
  try {
    const scheduleIndex = mockSchedules.findIndex(s => s.id.toString() === req.params.id);

    if (scheduleIndex === -1) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Soft delete by marking as cancelled
    mockSchedules[scheduleIndex].status = 'cancelled';

    res.json({
      message: 'Schedule cancelled successfully',
      schedule: mockSchedules[scheduleIndex]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weekly schedules
app.get("/api/schedules/weekly/:company_id/:date", authenticateToken, (req, res) => {
  try {
    const { company_id, date } = req.params;
    
    // Simple week filter (would need proper date calculation in production)
    const schedules = mockSchedules.filter(s => 
      s.company_id.toString() === company_id && 
      s.status !== 'cancelled'
    );

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HR MANAGEMENT - MOCK DATA
// ============================================

// Time Off Balances
let mockTimeOffBalances = [
  {
    id: 1,
    employee_id: 2,
    company_id: 1,
    leave_type: 'vacation',
    total_hours: 80,
    used_hours: 16,
    available_hours: 64,
    accrual_rate: 6.67,
    year: 2026,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 2,
    employee_id: 2,
    company_id: 1,
    leave_type: 'sick',
    total_hours: 40,
    used_hours: 8,
    available_hours: 32,
    accrual_rate: 3.33,
    year: 2026,
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 3,
    employee_id: 3,
    company_id: 1,
    leave_type: 'vacation',
    total_hours: 80,
    used_hours: 0,
    available_hours: 80,
    accrual_rate: 6.67,
    year: 2026,
    created_at: '2026-01-01T00:00:00Z'
  }
];

// Time Off Requests
let mockTimeOffRequests = [
  {
    id: 1,
    employee_id: 2,
    company_id: 1,
    leave_type: 'vacation',
    start_date: '2026-03-10',
    end_date: '2026-03-12',
    total_hours: 24,
    reason: 'Family vacation',
    status: 'approved',
    approved_by: 1,
    approved_at: '2026-02-15T10:00:00Z',
    created_at: '2026-02-10T09:00:00Z'
  },
  {
    id: 2,
    employee_id: 3,
    company_id: 1,
    leave_type: 'sick',
    start_date: '2026-02-20',
    end_date: '2026-02-20',
    total_hours: 8,
    reason: 'Doctor appointment',
    status: 'pending',
    created_at: '2026-02-16T08:30:00Z'
  }
];

// Timesheets
let mockTimesheets = [
  {
    id: 1,
    employee_id: 2,
    company_id: 1,
    period_start_date: '2026-02-03',
    period_end_date: '2026-02-16',
    total_regular_hours: 80,
    total_overtime_hours: 4,
    absences: 0,
    late_arrivals: 1,
    status: 'submitted',
    submitted_at: '2026-02-16T18:00:00Z',
    created_at: '2026-02-16T17:00:00Z'
  },
  {
    id: 2,
    employee_id: 3,
    company_id: 1,
    period_start_date: '2026-02-03',
    period_end_date: '2026-02-16',
    total_regular_hours: 80,
    total_overtime_hours: 0,
    absences: 1,
    late_arrivals: 0,
    status: 'approved',
    submitted_at: '2026-02-16T17:30:00Z',
    approved_by: 1,
    approved_at: '2026-02-17T09:00:00Z',
    created_at: '2026-02-16T17:00:00Z'
  }
];

// Payroll Records (for paystubs)
let mockPayrollRecords = [
  {
    id: 1,
    payroll_period_id: 1,
    employee_id: 2,
    company_id: 1,
    regular_hours: 80,
    overtime_hours: 4,
    regular_rate: 25.00,
    overtime_rate: 37.50,
    gross_pay: 2150.00,
    total_deductions: 430.00,
    net_pay: 1720.00,
    status: 'paid',
    payment_date: '2026-02-20',
    created_at: '2026-02-17T10:00:00Z'
  },
  {
    id: 2,
    payroll_period_id: 1,
    employee_id: 3,
    company_id: 1,
    regular_hours: 80,
    overtime_hours: 0,
    regular_rate: 20.00,
    overtime_rate: 30.00,
    gross_pay: 1600.00,
    total_deductions: 320.00,
    net_pay: 1280.00,
    status: 'paid',
    payment_date: '2026-02-20',
    created_at: '2026-02-17T10:00:00Z'
  }
];

// ============================================
// TIME OFF MANAGEMENT API
// ============================================

// Get time off balance for employee
app.get("/api/time-off/balance/:employee_id", authenticateToken, (req, res) => {
  try {
    const { employee_id } = req.params;
    const { leave_type, year } = req.query;

    let balances = mockTimeOffBalances.filter(b => 
      b.employee_id.toString() === employee_id
    );

    if (leave_type) {
      balances = balances.filter(b => b.leave_type === leave_type);
    }

    if (year) {
      balances = balances.filter(b => b.year.toString() === year);
    }

    const enrichedBalances = balances.map(b => ({
      ...b,
      employee_name: mockUsers.find(u => u.id === b.employee_id)?.name || 'Unknown'
    }));

    res.json({ balances: enrichedBalances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize time off balance
app.post("/api/time-off/balance/initialize", authenticateToken, (req, res) => {
  try {
    const { employee_id, company_id, leave_type, total_hours, accrual_rate } = req.body;

    if (!employee_id || !company_id || !leave_type || total_hours === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const year = new Date().getFullYear();
    const newBalance = {
      id: mockTimeOffBalances.length + 1,
      employee_id,
      company_id,
      leave_type,
      total_hours,
      used_hours: 0,
      available_hours: total_hours,
      accrual_rate: accrual_rate || 0,
      year,
      created_at: new Date().toISOString()
    };

    mockTimeOffBalances.push(newBalance);
    res.status(201).json({ message: 'Time off balance initialized', balance: newBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update time off balance
app.put("/api/time-off/balance/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { total_hours, used_hours, accrual_rate } = req.body;

    const balanceIndex = mockTimeOffBalances.findIndex(b => b.id.toString() === id);
    if (balanceIndex === -1) {
      return res.status(404).json({ error: 'Balance not found' });
    }

    if (total_hours !== undefined) mockTimeOffBalances[balanceIndex].total_hours = total_hours;
    if (used_hours !== undefined) mockTimeOffBalances[balanceIndex].used_hours = used_hours;
    if (accrual_rate !== undefined) mockTimeOffBalances[balanceIndex].accrual_rate = accrual_rate;
    
    mockTimeOffBalances[balanceIndex].available_hours = 
      mockTimeOffBalances[balanceIndex].total_hours - mockTimeOffBalances[balanceIndex].used_hours;

    res.json({ message: 'Balance updated', balance: mockTimeOffBalances[balanceIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit time off request
app.post("/api/time-off/request", authenticateToken, (req, res) => {
  try {
    const { employee_id, company_id, leave_type, start_date, end_date, total_hours, reason } = req.body;

    if (!employee_id || !company_id || !leave_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newRequest = {
      id: mockTimeOffRequests.length + 1,
      employee_id,
      company_id,
      leave_type,
      start_date,
      end_date,
      total_hours: total_hours || 8,
      reason: reason || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    mockTimeOffRequests.push(newRequest);
    res.status(201).json({ message: 'Time off request submitted', request: newRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get time off requests for company
app.get("/api/time-off/requests/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    const { status, employee_id } = req.query;

    let requests = mockTimeOffRequests.filter(r => 
      r.company_id.toString() === company_id
    );

    if (status) {
      requests = requests.filter(r => r.status === status);
    }

    if (employee_id) {
      requests = requests.filter(r => r.employee_id.toString() === employee_id);
    }

    const enrichedRequests = requests.map(r => ({
      ...r,
      employee_name: mockUsers.find(u => u.id === r.employee_id)?.name || 'Unknown',
      approver_name: r.approved_by ? mockUsers.find(u => u.id === r.approved_by)?.name : null
    }));

    res.json({ requests: enrichedRequests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific time off request
app.get("/api/time-off/request/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const request = mockTimeOffRequests.find(r => r.id.toString() === id);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const enriched = {
      ...request,
      employee_name: mockUsers.find(u => u.id === request.employee_id)?.name || 'Unknown',
      approver_name: request.approved_by ? mockUsers.find(u => u.id === request.approved_by)?.name : null
    };

    res.json({ request: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve time off request
app.put("/api/time-off/requests/:id/approve", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id } = req.body;

    const requestIndex = mockTimeOffRequests.findIndex(r => r.id.toString() === id);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    mockTimeOffRequests[requestIndex].status = 'approved';
    mockTimeOffRequests[requestIndex].approved_by = approver_id || 1;
    mockTimeOffRequests[requestIndex].approved_at = new Date().toISOString();

    // Update balance
    const request = mockTimeOffRequests[requestIndex];
    const balance = mockTimeOffBalances.find(b => 
      b.employee_id === request.employee_id && 
      b.leave_type === request.leave_type &&
      b.year === new Date().getFullYear()
    );
    
    if (balance) {
      balance.used_hours += request.total_hours;
      balance.available_hours -= request.total_hours;
    }

    res.json({ message: 'Request approved', request: mockTimeOffRequests[requestIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deny time off request
app.put("/api/time-off/requests/:id/deny", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id, denial_reason } = req.body;

    const requestIndex = mockTimeOffRequests.findIndex(r => r.id.toString() === id);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    mockTimeOffRequests[requestIndex].status = 'denied';
    mockTimeOffRequests[requestIndex].approved_by = approver_id || 1;
    mockTimeOffRequests[requestIndex].denial_reason = denial_reason;
    mockTimeOffRequests[requestIndex].approved_at = new Date().toISOString();

    res.json({ message: 'Request denied', request: mockTimeOffRequests[requestIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel time off request
app.delete("/api/time-off/requests/:id/cancel", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const requestIndex = mockTimeOffRequests.findIndex(r => r.id.toString() === id);
    if (requestIndex === -1) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = mockTimeOffRequests[requestIndex];
    
    if (request.status === 'approved') {
      // Restore balance
      const balance = mockTimeOffBalances.find(b => 
        b.employee_id === request.employee_id && 
        b.leave_type === request.leave_type &&
        b.year === new Date().getFullYear()
      );
      
      if (balance) {
        balance.used_hours -= request.total_hours;
        balance.available_hours += request.total_hours;
      }
    }

    mockTimeOffRequests[requestIndex].status = 'cancelled';
    res.json({ message: 'Request cancelled', request: mockTimeOffRequests[requestIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TIMESHEET MANAGEMENT API
// ============================================

// Generate timesheet
app.post("/api/timesheets/generate", authenticateToken, (req, res) => {
  try {
    const { employee_id, company_id, period_start_date, period_end_date } = req.body;

    if (!employee_id || !company_id || !period_start_date || !period_end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newTimesheet = {
      id: mockTimesheets.length + 1,
      employee_id,
      company_id,
      period_start_date,
      period_end_date,
      total_regular_hours: 80,
      total_overtime_hours: 0,
      absences: 0,
      late_arrivals: 0,
      status: 'draft',
      created_at: new Date().toISOString()
    };

    mockTimesheets.push(newTimesheet);
    res.status(201).json({ message: 'Timesheet generated', timesheet: newTimesheet });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get timesheet by ID
app.get("/api/timesheets/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const timesheet = mockTimesheets.find(t => t.id.toString() === id);

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    const enriched = {
      ...timesheet,
      employee_name: mockUsers.find(u => u.id === timesheet.employee_id)?.name || 'Unknown',
      approver_name: timesheet.approved_by ? mockUsers.find(u => u.id === timesheet.approved_by)?.name : null
    };

    res.json({ timesheet: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get timesheets for employee
app.get("/api/timesheets/employee/:employee_id", authenticateToken, (req, res) => {
  try {
    const { employee_id } = req.params;
    const timesheets = mockTimesheets.filter(t => 
      t.employee_id.toString() === employee_id
    );

    const enriched = timesheets.map(t => ({
      ...t,
      employee_name: mockUsers.find(u => u.id === t.employee_id)?.name || 'Unknown'
    }));

    res.json({ timesheets: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get timesheets for week
app.get("/api/timesheets/week/:company_id/:week_of", authenticateToken, (req, res) => {
  try {
    const { company_id, week_of } = req.params;
    
    const timesheets = mockTimesheets.filter(t => 
      t.company_id.toString() === company_id &&
      t.period_start_date <= week_of &&
      t.period_end_date >= week_of
    );

    const enriched = timesheets.map(t => ({
      ...t,
      employee_name: mockUsers.find(u => u.id === t.employee_id)?.name || 'Unknown'
    }));

    res.json({ timesheets: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit timesheet
app.put("/api/timesheets/:id/submit", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const timesheetIndex = mockTimesheets.findIndex(t => t.id.toString() === id);
    if (timesheetIndex === -1) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    mockTimesheets[timesheetIndex].status = 'submitted';
    mockTimesheets[timesheetIndex].submitted_at = new Date().toISOString();

    res.json({ message: 'Timesheet submitted', timesheet: mockTimesheets[timesheetIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve timesheet
app.put("/api/timesheets/:id/approve", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id } = req.body;

    const timesheetIndex = mockTimesheets.findIndex(t => t.id.toString() === id);
    if (timesheetIndex === -1) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    mockTimesheets[timesheetIndex].status = 'approved';
    mockTimesheets[timesheetIndex].approved_by = approver_id || 1;
    mockTimesheets[timesheetIndex].approved_at = new Date().toISOString();

    res.json({ message: 'Timesheet approved', timesheet: mockTimesheets[timesheetIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject timesheet
app.put("/api/timesheets/:id/reject", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { approver_id, rejection_reason } = req.body;

    const timesheetIndex = mockTimesheets.findIndex(t => t.id.toString() === id);
    if (timesheetIndex === -1) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    mockTimesheets[timesheetIndex].status = 'rejected';
    mockTimesheets[timesheetIndex].approved_by = approver_id || 1;
    mockTimesheets[timesheetIndex].rejection_reason = rejection_reason;
    mockTimesheets[timesheetIndex].approved_at = new Date().toISOString();

    res.json({ message: 'Timesheet rejected', timesheet: mockTimesheets[timesheetIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending timesheets
app.get("/api/timesheets/pending-approval/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const timesheets = mockTimesheets.filter(t => 
      t.company_id.toString() === company_id &&
      t.status === 'submitted'
    );

    const enriched = timesheets.map(t => ({
      ...t,
      employee_name: mockUsers.find(u => u.id === t.employee_id)?.name || 'Unknown'
    }));

    res.json({ timesheets: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update timesheet hours
app.put("/api/timesheets/:id/hours", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { regular_hours, overtime_hours } = req.body;

    const timesheetIndex = mockTimesheets.findIndex(t => t.id.toString() === id);
    if (timesheetIndex === -1) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    if (regular_hours !== undefined) mockTimesheets[timesheetIndex].total_regular_hours = regular_hours;
    if (overtime_hours !== undefined) mockTimesheets[timesheetIndex].total_overtime_hours = overtime_hours;

    res.json({ message: 'Hours updated', timesheet: mockTimesheets[timesheetIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PAYROLL & PAYSTUBS API
// ============================================

// Get paystub for payroll record
app.get("/api/payroll/paystub/:payroll_record_id", authenticateToken, (req, res) => {
  try {
    const { payroll_record_id } = req.params;
    const record = mockPayrollRecords.find(p => p.id.toString() === payroll_record_id);

    if (!record) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    const employee = mockUsers.find(u => u.id === record.employee_id);
    
    const paystub = {
      id: record.id,
      employee_id: record.employee_id,
      employee_name: employee?.name || 'Unknown',
      employee_email: employee?.email || '',
      pay_period: `${record.created_at.split('T')[0]}`,
      payment_date: record.payment_date,
      regular_hours: record.regular_hours,
      overtime_hours: record.overtime_hours,
      regular_rate: record.regular_rate,
      overtime_rate: record.overtime_rate,
      gross_pay: record.gross_pay,
      deductions: {
        federal_tax: (record.gross_pay * 0.12).toFixed(2),
        state_tax: (record.gross_pay * 0.05).toFixed(2),
        social_security: (record.gross_pay * 0.062).toFixed(2),
        medicare: (record.gross_pay * 0.0145).toFixed(2)
      },
      total_deductions: record.total_deductions,
      net_pay: record.net_pay,
      status: record.status
    };

    res.json({ paystub });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Email paystub
app.post("/api/payroll/paystub/:payroll_record_id/email", authenticateToken, (req, res) => {
  try {
    const { payroll_record_id } = req.params;
    const record = mockPayrollRecords.find(p => p.id.toString() === payroll_record_id);

    if (!record) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    const employee = mockUsers.find(u => u.id === record.employee_id);
    
    // In production, this would send an actual email
    res.json({ 
      message: 'Paystub email sent successfully',
      recipient: employee?.email || 'unknown@example.com'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all paystubs for employee
app.get("/api/payroll/paystubs/:employee_id", authenticateToken, (req, res) => {
  try {
    const { employee_id } = req.params;
    const records = mockPayrollRecords.filter(p => 
      p.employee_id.toString() === employee_id
    );

    const paystubs = records.map(record => ({
      id: record.id,
      pay_period: `${record.created_at.split('T')[0]}`,
      payment_date: record.payment_date,
      gross_pay: record.gross_pay,
      net_pay: record.net_pay,
      status: record.status
    }));

    res.json({ paystubs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// REPORTING & ANALYTICS API
// ============================================

// Labor cost report
app.get("/api/reports/labor-cost/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const totalPayroll = mockPayrollRecords
      .filter(p => p.company_id.toString() === company_id)
      .reduce((sum, p) => sum + p.gross_pay, 0);
    
    const totalHours = mockPayrollRecords
      .filter(p => p.company_id.toString() === company_id)
      .reduce((sum, p) => sum + p.regular_hours + p.overtime_hours, 0);
    
    const report = {
      company_id,
      period: 'Current Period',
      total_payroll: totalPayroll,
      total_hours: totalHours,
      average_hourly_cost: totalHours > 0 ? (totalPayroll / totalHours).toFixed(2) : 0,
      employee_count: new Set(mockPayrollRecords.filter(p => p.company_id.toString() === company_id).map(p => p.employee_id)).size
    };

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Productivity report
app.get("/api/reports/productivity/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const report = {
      company_id,
      period: 'Current Period',
      average_hours_per_employee: 80,
      total_productivity_score: 92,
      on_time_completion_rate: 95
    };

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Overtime analysis report
app.get("/api/reports/overtime-analysis/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const overtimeRecords = mockPayrollRecords
      .filter(p => p.company_id.toString() === company_id && p.overtime_hours > 0);
    
    const totalOvertimeHours = overtimeRecords.reduce((sum, p) => sum + p.overtime_hours, 0);
    const totalOvertimeCost = overtimeRecords.reduce((sum, p) => sum + (p.overtime_hours * p.overtime_rate), 0);
    
    const report = {
      company_id,
      period: 'Current Period',
      total_overtime_hours: totalOvertimeHours,
      total_overtime_cost: totalOvertimeCost.toFixed(2),
      employees_with_overtime: overtimeRecords.length,
      average_overtime_per_employee: overtimeRecords.length > 0 ? (totalOvertimeHours / overtimeRecords.length).toFixed(2) : 0
    };

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Attendance summary report
app.get("/api/reports/attendance-summary/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const totalAbsences = mockTimesheets
      .filter(t => t.company_id.toString() === company_id)
      .reduce((sum, t) => sum + t.absences, 0);
    
    const totalLateArrivals = mockTimesheets
      .filter(t => t.company_id.toString() === company_id)
      .reduce((sum, t) => sum + t.late_arrivals, 0);
    
    const report = {
      company_id,
      period: 'Current Period',
      total_absences: totalAbsences,
      total_late_arrivals: totalLateArrivals,
      attendance_rate: 96.5
    };

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tardiness report
app.get("/api/reports/tardiness/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const report = {
      company_id,
      period: 'Current Period',
      total_late_clock_ins: 3,
      average_late_minutes: 12,
      employees_with_tardiness: 2
    };

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scheduling efficiency report
app.get("/api/reports/scheduling-efficiency/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const report = {
      company_id,
      period: 'Current Period',
      schedule_adherence_rate: 94,
      shift_coverage_rate: 98,
      scheduling_conflicts: 1
    };

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compliance report
app.get("/api/reports/compliance/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const report = {
      company_id,
      period: 'Current Period',
      break_violations: 0,
      overtime_violations: 0,
      minimum_wage_compliance: 100,
      overall_compliance_score: 100
    };

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Turnover report
app.get("/api/reports/turnover/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const report = {
      company_id,
      period: 'YTD 2026',
      turnover_rate: 8.5,
      new_hires: 2,
      terminations: 1,
      average_tenure_months: 24
    };

    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Employee hours report
app.get("/api/reports/employee-hours/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const employeeHours = mockTimesheets
      .filter(t => t.company_id.toString() === company_id)
      .map(t => {
        const employee = mockUsers.find(u => u.id === t.employee_id);
        return {
          employee_id: t.employee_id,
          employee_name: employee?.name || 'Unknown',
          regular_hours: t.total_regular_hours,
          overtime_hours: t.total_overtime_hours,
          total_hours: t.total_regular_hours + t.total_overtime_hours
        };
      });

    res.json({ employee_hours: employeeHours });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Department hours report
app.get("/api/reports/department-hours/:company_id", authenticateToken, (req, res) => {
  try {
    const { company_id } = req.params;
    
    const report = {
      company_id,
      period: 'Current Period',
      departments: [
        {
          department: 'Sales',
          total_hours: 160,
          regular_hours: 156,
          overtime_hours: 4,
          employee_count: 2
        },
        {
          department: 'Operations',
          total_hours: 80,
          regular_hours: 80,
          overtime_hours: 0,
          employee_count: 1
        }
      ]
    };

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DOCUMENT & CONTRACT MANAGEMENT - MOCK DATA
// ============================================

// Supplier Documents
let mockSupplierDocuments = [
  {
    id: 1,
    supplier_id: 1,
    retailer_id: 2,
    filename: 'a1b2c3d4-e5f6-7890-1234-567890abcdef.pdf',
    original_filename: 'product_catalog_2026.pdf',
    file_path: '/uploads/documents/supplier_1/retailer_2/a1b2c3d4-e5f6-7890-1234-567890abcdef.pdf',
    file_type: 'application/pdf',
    file_size: 2048576,
    document_type: 'catalog',
    description: '2026 Product Catalog',
    uploaded_by: 1,
    created_at: '2026-02-10T09:00:00Z'
  },
  {
    id: 2,
    supplier_id: 1,
    retailer_id: 2,
    filename: 'b2c3d4e5-f6g7-8901-2345-678901bcdefg.pdf',
    original_filename: 'invoice_jan_2026.pdf',
    file_path: '/uploads/documents/supplier_1/retailer_2/b2c3d4e5-f6g7-8901-2345-678901bcdefg.pdf',
    file_type: 'application/pdf',
    file_size: 512000,
    document_type: 'invoice',
    description: 'January 2026 Invoice',
    uploaded_by: 1,
    created_at: '2026-02-01T14:30:00Z'
  }
];

// ============================================
// MOBILE SALES REP MOCK DATA
// ============================================

// Sales Representatives
let mockSalesReps = [
  {
    id: 1,
    user_id: 1,
    employee_id: 'SR-001',
    company_id: 1,
    territory: 'Northeast Region',
    base_location: '40.7128,-74.0060,New York, NY',
    manager_id: 5, // Sarah Williams - Sales Manager
    status: 'active',
    hire_date: '2025-06-01',
    assigned_accounts: JSON.stringify([2, 3]),
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z'
  },
  {
    id: 2,
    user_id: 2,
    employee_id: 'SR-002',
    company_id: 1,
    territory: 'Midwest Region',
    base_location: '41.8781,-87.6298,Chicago, IL',
    manager_id: 5, // Sarah Williams - Sales Manager
    status: 'active',
    hire_date: '2025-08-15',
    assigned_accounts: JSON.stringify([4, 5, 6]),
    created_at: '2025-08-15T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z'
  },
  {
    id: 3,
    user_id: 4,
    employee_id: 'SR-003',
    company_id: 1,
    territory: 'West Coast Region',
    base_location: '34.0522,-118.2437,Los Angeles, CA',
    manager_id: 5, // Sarah Williams - Sales Manager
    status: 'active',
    hire_date: '2025-10-01',
    assigned_accounts: JSON.stringify([2]),
    created_at: '2025-10-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z'
  }
];

// Daily Check-Ins
let mockDailyCheckIns = [
  {
    id: 1,
    sales_rep_id: 1,
    check_in_date: '2026-02-16',
    check_in_time: '08:30:00',
    check_out_time: '17:15:00',
    check_in_location: '40.7128,-74.0060,New York, NY',
    check_out_location: '40.7589,-73.9851,Manhattan, NY',
    daily_miles: 45.5,
    weather: 'Sunny, 68°F',
    status: 'checked_out',
    notes: 'Productive day, visited 3 accounts'
  },
  {
    id: 2,
    sales_rep_id: 1,
    check_in_date: '2026-02-15',
    check_in_time: '08:45:00',
    check_out_time: '17:00:00',
    check_in_location: '40.7128,-74.0060,New York, NY',
    check_out_location: '40.7128,-74.0060,New York, NY',
    daily_miles: 38.2,
    weather: 'Cloudy, 62°F',
    status: 'checked_out',
    notes: 'Morning route completed'
  },
  {
    id: 3,
    sales_rep_id: 2,
    check_in_date: '2026-02-16',
    check_in_time: '09:00:00',
    check_out_time: null,
    check_in_location: '41.8781,-87.6298,Chicago, IL',
    check_out_location: null,
    daily_miles: null,
    weather: 'Partly Cloudy, 55°F',
    status: 'checked_in',
    notes: 'Starting afternoon route'
  }
];

// Location Tracking
let mockLocationTracking = [
  {
    id: 1,
    sales_rep_id: 1,
    check_in_id: 1,
    latitude: 40.7128,
    longitude: -74.0060,
    address: 'New York, NY',
    accuracy: 10,
    timestamp: '2026-02-16T08:30:00Z',
    trip_start: true,
    trip_end: false,
    miles_traveled: 0,
    created_at: '2026-02-16T08:30:00Z'
  },
  {
    id: 2,
    sales_rep_id: 1,
    check_in_id: 1,
    latitude: 40.7589,
    longitude: -73.9851,
    address: 'Manhattan, NY',
    accuracy: 15,
    timestamp: '2026-02-16T12:30:00Z',
    trip_start: false,
    trip_end: false,
    miles_traveled: 15.2,
    created_at: '2026-02-16T12:30:00Z'
  },
  {
    id: 3,
    sales_rep_id: 1,
    check_in_id: 1,
    latitude: 40.7589,
    longitude: -73.9851,
    address: 'Manhattan, NY',
    accuracy: 12,
    timestamp: '2026-02-16T17:15:00Z',
    trip_start: false,
    trip_end: true,
    miles_traveled: 30.3,
    created_at: '2026-02-16T17:15:00Z'
  }
];

// Account Visits
let mockAccountVisits = [
  {
    id: 1,
    sales_rep_id: 1,
    account_id: 2,
    check_in_id: 1,
    visit_date: '2026-02-16',
    arrival_time: '09:15:00',
    departure_time: '10:30:00',
    visit_duration: 75,
    location_latitude: 40.7589,
    location_longitude: -73.9851,
    notes: 'Discussed new product line, placed order for spring collection',
    purpose: 'Sales call',
    status: 'completed',
    created_at: '2026-02-16T09:15:00Z',
    updated_at: '2026-02-16T10:30:00Z'
  },
  {
    id: 2,
    sales_rep_id: 1,
    account_id: 2,
    check_in_id: 1,
    visit_date: '2026-02-16',
    arrival_time: '13:00:00',
    departure_time: '14:15:00',
    visit_duration: 75,
    location_latitude: 40.7306,
    location_longitude: -73.9352,
    notes: 'Updated inventory display, took photos',
    purpose: 'Store merchandising',
    status: 'completed',
    created_at: '2026-02-16T13:00:00Z',
    updated_at: '2026-02-16T14:15:00Z'
  },
  {
    id: 3,
    sales_rep_id: 1,
    account_id: 2,
    check_in_id: 3,
    visit_date: '2026-02-17',
    arrival_time: '10:00:00',
    departure_time: null,
    visit_duration: null,
    location_latitude: 40.7128,
    location_longitude: -74.0060,
    notes: '',
    purpose: 'Follow-up visit',
    status: 'scheduled',
    created_at: '2026-02-15T16:00:00Z',
    updated_at: '2026-02-15T16:00:00Z'
  }
];

// Visit Photos
let mockVisitPhotos = [
  {
    id: 1,
    visit_id: 1,
    photo_url: '/uploads/photos/visit_1_product_display.jpg',
    file_name: 'product_display_main.jpg',
    file_size: 2458624,
    photo_type: 'display',
    photo_metadata: JSON.stringify({
      camera: 'iPhone 14 Pro',
      gps: '40.7589,-73.9851',
      timestamp: '2026-02-16T09:45:00Z'
    }),
    taken_at: '2026-02-16T09:45:00Z',
    created_at: '2026-02-16T09:45:05Z'
  },
  {
    id: 2,
    visit_id: 1,
    photo_url: '/uploads/photos/visit_1_inventory.jpg',
    file_name: 'inventory_count.jpg',
    file_size: 1825792,
    photo_type: 'inventory',
    photo_metadata: JSON.stringify({
      camera: 'iPhone 14 Pro',
      gps: '40.7589,-73.9851',
      timestamp: '2026-02-16T10:00:00Z'
    }),
    taken_at: '2026-02-16T10:00:00Z',
    created_at: '2026-02-16T10:00:05Z'
  },
  {
    id: 3,
    visit_id: 2,
    photo_url: '/uploads/photos/visit_2_storefront.jpg',
    file_name: 'storefront_exterior.jpg',
    file_size: 3147264,
    photo_type: 'store_front',
    photo_metadata: JSON.stringify({
      camera: 'iPhone 14 Pro',
      gps: '40.7306,-73.9352',
      timestamp: '2026-02-16T13:30:00Z'
    }),
    taken_at: '2026-02-16T13:30:00Z',
    created_at: '2026-02-16T13:30:05Z'
  }
];

// Mileage Logs
let mockMileageLogs = [
  {
    id: 1,
    sales_rep_id: 1,
    check_in_id: 1,
    trip_date: '2026-02-16',
    trip_start_time: '08:30:00',
    trip_end_time: '17:15:00',
    start_location: '40.7128,-74.0060,New York, NY',
    end_location: '40.7589,-73.9851,Manhattan, NY',
    start_odometer: 45230,
    end_odometer: 45275,
    total_miles: 45.5,
    purpose: 'Account visits',
    notes: 'Route included 3 customer visits',
    reimbursement_status: 'pending',
    reimbursement_amount: 26.62,
    created_at: '2026-02-16T17:15:00Z',
    updated_at: '2026-02-16T17:15:00Z'
  },
  {
    id: 2,
    sales_rep_id: 1,
    check_in_id: 2,
    trip_date: '2026-02-15',
    trip_start_time: '08:45:00',
    trip_end_time: '17:00:00',
    start_location: '40.7128,-74.0060,New York, NY',
    end_location: '40.7128,-74.0060,New York, NY',
    start_odometer: 45192,
    end_odometer: 45230,
    total_miles: 38.2,
    purpose: 'Account visits',
    notes: 'Morning route',
    reimbursement_status: 'approved',
    reimbursement_amount: 22.35,
    created_at: '2026-02-15T17:00:00Z',
    updated_at: '2026-02-16T08:00:00Z'
  }
];

// Authorized Accounts (junction table)
let mockRepAuthorizedAccounts = [
  {
    id: 1,
    sales_rep_id: 1,
    account_id: 2,
    authorization_type: 'full_access',
    start_date: '2025-06-01',
    end_date: null,
    is_active: true,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z'
  },
  {
    id: 2,
    sales_rep_id: 1,
    account_id: 3,
    authorization_type: 'order_only',
    start_date: '2025-06-01',
    end_date: null,
    is_active: true,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z'
  },
  {
    id: 3,
    sales_rep_id: 2,
    account_id: 4,
    authorization_type: 'full_access',
    start_date: '2025-08-15',
    end_date: null,
    is_active: true,
    created_at: '2025-08-15T00:00:00Z',
    updated_at: '2025-08-15T00:00:00Z'
  }
];

// Account Preferences
let mockAccountPreferences = [
  {
    id: 1,
    account_id: 2,
    allow_rep_photos: true,
    allow_location_tracking: true,
    allow_visit_notes: true,
    allow_order_placement: true,
    mileage_reimbursement_enabled: true,
    mileage_rate: 0.585,
    minimum_visit_duration: 30,
    required_visit_frequency: 7,
    photo_approval_required: false,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z'
  },
  {
    id: 2,
    account_id: 3,
    allow_rep_photos: false,
    allow_location_tracking: true,
    allow_visit_notes: true,
    allow_order_placement: true,
    mileage_reimbursement_enabled: true,
    mileage_rate: 0.585,
    minimum_visit_duration: 15,
    required_visit_frequency: 14,
    photo_approval_required: true,
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2025-06-01T00:00:00Z'
  }
];

// Performance Metrics
let mockPerformanceMetrics = [
  {
    id: 1,
    sales_rep_id: 1,
    period_start_date: '2026-02-10',
    period_end_date: '2026-02-16',
    total_accounts: 3,
    accounts_visited: 2,
    total_orders: 5,
    total_sales: 2450.75,
    avg_order_value: 490.15,
    photos_taken: 8,
    total_miles: 156.3,
    visit_completion_rate: 95.5,
    created_at: '2026-02-16T23:59:59Z',
    updated_at: '2026-02-16T23:59:59Z'
  },
  {
    id: 2,
    sales_rep_id: 1,
    period_start_date: '2026-02-01',
    period_end_date: '2026-02-09',
    total_accounts: 3,
    accounts_visited: 3,
    total_orders: 8,
    total_sales: 3890.25,
    avg_order_value: 486.28,
    photos_taken: 12,
    total_miles: 187.5,
    visit_completion_rate: 100.0,
    created_at: '2026-02-09T23:59:59Z',
    updated_at: '2026-02-09T23:59:59Z'
  }
];

// Digital Contracts
let mockContracts = [
  {
    id: 1,
    contract_number: 'CON-1739721600-001',
    supplier_id: 1,
    retailer_id: 2,
    title: 'Annual Supply Agreement 2026',
    content: 'This Supply Agreement ("Agreement") is entered into as of February 1, 2026, between the Supplier and Retailer.\n\nTERMS:\n1. The Supplier agrees to provide premium cigars at wholesale prices.\n2. Minimum order quantity: 500 units per month.\n3. Payment terms: Net 30 days.\n4. Delivery within 5-7 business days.\n5. Quality guarantee on all products.\n\nThis agreement is valid for one year from the date of signing.',
    contract_type: 'sales',
    status: 'signed',
    created_by: 1,
    sent_at: '2026-02-01T10:00:00Z',
    viewed_at: '2026-02-02T08:30:00Z',
    signed_at: '2026-02-02T09:15:00Z',
    pdf_path: '/uploads/contracts/contract_1_signed.pdf',
    expires_at: '2027-02-01T00:00:00Z',
    created_at: '2026-02-01T09:00:00Z'
  },
  {
    id: 2,
    contract_number: 'CON-1739808000-002',
    supplier_id: 1,
    retailer_id: 3,
    title: 'Service Agreement - Premium Support',
    content: 'This Service Agreement outlines the terms of premium support services.\n\nSERVICES PROVIDED:\n1. 24/7 phone support\n2. Priority order processing\n3. Dedicated account manager\n4. Quarterly business reviews\n5. Custom product recommendations\n\nTerm: 12 months from signing date.\nMonthly fee: $500',
    contract_type: 'service',
    status: 'sent',
    created_by: 1,
    sent_at: '2026-02-15T14:00:00Z',
    pdf_path: null,
    expires_at: '2027-02-15T00:00:00Z',
    created_at: '2026-02-15T13:30:00Z'
  },
  {
    id: 3,
    contract_number: 'CON-1739894400-003',
    supplier_id: 1,
    retailer_id: 2,
    title: 'Non-Disclosure Agreement',
    content: 'CONFIDENTIAL INFORMATION AGREEMENT\n\nThis NDA protects confidential business information shared between parties.\n\nCOVERAGE:\n1. Product formulas and recipes\n2. Pricing structures\n3. Customer lists\n4. Business strategies\n5. Financial information\n\nDuration: 5 years from signing.\nViolation penalties apply.',
    contract_type: 'nda',
    status: 'draft',
    created_by: 1,
    pdf_path: null,
    expires_at: null,
    created_at: '2026-02-16T11:00:00Z'
  }
];

// Contract Signatures
let mockSignatures = [
  {
    id: 1,
    contract_id: 1,
    signer_user_id: 2,
    signer_name: 'John Doe',
    signer_email: 'john@example.com',
    signer_role: 'retailer',
    signature_type: 'draw',
    signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    signed_at: '2026-02-02T09:15:00Z'
  }
];

// Document Audit Logs
let mockDocumentAuditLogs = [
  {
    id: 1,
    user_id: 1,
    entity_type: 'contract',
    entity_id: 1,
    action: 'create',
    details: JSON.stringify({ title: 'Annual Supply Agreement 2026', contract_type: 'sales' }),
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-01T09:00:00Z'
  },
  {
    id: 2,
    user_id: 1,
    entity_type: 'contract',
    entity_id: 1,
    action: 'send',
    details: JSON.stringify({ retailer_id: 2 }),
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-01T10:00:00Z'
  },
  {
    id: 3,
    user_id: 2,
    entity_type: 'contract',
    entity_id: 1,
    action: 'view',
    details: JSON.stringify({ contract_number: 'CON-1739721600-001' }),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-02T08:30:00Z'
  },
  {
    id: 4,
    user_id: 2,
    entity_type: 'contract',
    entity_id: 1,
    action: 'sign',
    details: JSON.stringify({ signature_type: 'draw' }),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-02T09:15:00Z'
  },
  // Document audit logs
  {
    id: 5,
    user_id: 1,
    entity_type: 'document',
    entity_id: 1,
    action: 'upload',
    details: JSON.stringify({ 
      filename: 'product_catalog_2026.pdf',
      document_type: 'catalog',
      file_size: 2048576
    }),
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-10T09:00:00Z'
  },
  {
    id: 6,
    user_id: 2,
    entity_type: 'document',
    entity_id: 1,
    action: 'view',
    details: JSON.stringify({ 
      filename: 'product_catalog_2026.pdf',
      document_type: 'catalog'
    }),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-10T14:30:00Z'
  },
  {
    id: 7,
    user_id: 2,
    entity_type: 'document',
    entity_id: 1,
    action: 'download',
    details: JSON.stringify({ 
      filename: 'product_catalog_2026.pdf',
      file_type: 'application/pdf'
    }),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-10T14:31:00Z'
  },
  {
    id: 8,
    user_id: 1,
    entity_type: 'document',
    entity_id: 2,
    action: 'upload',
    details: JSON.stringify({ 
      filename: 'invoice_jan_2026.pdf',
      document_type: 'invoice',
      file_size: 512000
    }),
    ip_address: '192.168.1.50',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-01T14:30:00Z'
  },
  {
    id: 9,
    user_id: 2,
    entity_type: 'document',
    entity_id: 2,
    action: 'download',
    details: JSON.stringify({ 
      filename: 'invoice_jan_2026.pdf',
      file_type: 'application/pdf'
    }),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-03T10:15:00Z'
  },
  {
    id: 10,
    user_id: 2,
    entity_type: 'document',
    entity_id: 2,
    action: 'download',
    details: JSON.stringify({ 
      filename: 'invoice_jan_2026.pdf',
      file_type: 'application/pdf'
    }),
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    created_at: '2026-02-15T11:45:00Z'
  }
];

// ============================================
// WAREHOUSE MOCK DATA
// ============================================

// Warehouse Locations
let mockWarehouseLocations = [
  // Receiving Zones
  { id: 1, location_code: 'RCV-01', aisle: null, shelf: null, position: null, zone: 'RECEIVING', location_type: 'receiving', capacity: 500, current_capacity: 120, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  { id: 2, location_code: 'RCV-02', aisle: null, shelf: null, position: null, zone: 'RECEIVING', location_type: 'receiving', capacity: 500, current_capacity: 85, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  
  // Storage Zone A
  { id: 3, location_code: 'A1-01-01', aisle: 'A1', shelf: '01', position: '01', zone: 'ZONE-A', location_type: 'standard', capacity: 200, current_capacity: 150, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  { id: 4, location_code: 'A1-01-02', aisle: 'A1', shelf: '01', position: '02', zone: 'ZONE-A', location_type: 'standard', capacity: 200, current_capacity: 180, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  { id: 5, location_code: 'A1-02-01', aisle: 'A1', shelf: '02', position: '01', zone: 'ZONE-A', location_type: 'standard', capacity: 200, current_capacity: 95, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  { id: 6, location_code: 'A2-01-01', aisle: 'A2', shelf: '01', position: '01', zone: 'ZONE-A', location_type: 'standard', capacity: 200, current_capacity: 130, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  
  // Storage Zone B
  { id: 7, location_code: 'B1-01-01', aisle: 'B1', shelf: '01', position: '01', zone: 'ZONE-B', location_type: 'standard', capacity: 200, current_capacity: 110, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  { id: 8, location_code: 'B1-02-01', aisle: 'B1', shelf: '02', position: '01', zone: 'ZONE-B', location_type: 'standard', capacity: 200, current_capacity: 75, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  
  // Shipping Zones
  { id: 9, location_code: 'SHP-01', aisle: null, shelf: null, position: null, zone: 'SHIPPING', location_type: 'shipping', capacity: 300, current_capacity: 45, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  { id: 10, location_code: 'SHP-02', aisle: null, shelf: null, position: null, zone: 'SHIPPING', location_type: 'shipping', capacity: 300, current_capacity: 32, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  
  // Quarantine/QA
  { id: 11, location_code: 'QA-01', aisle: null, shelf: null, position: null, zone: 'QUALITY', location_type: 'quarantine', capacity: 100, current_capacity: 15, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' },
  { id: 12, location_code: 'QA-02', aisle: null, shelf: null, position: null, zone: 'QUALITY', location_type: 'quarantine', capacity: 100, current_capacity: 8, is_active: true, created_at: '2026-01-01', updated_at: '2026-02-16' }
];

// Product Locations (where products are stored)
let mockProductLocations = [
  // Product 1 (Premium Cigar A) - SKU-1001
  { id: 1, product_id: 1, location_id: 3, quantity: 150, is_primary: true, last_counted: '2026-02-15', created_at: '2026-01-10', updated_at: '2026-02-16' },
  { id: 2, product_id: 1, location_id: 4, quantity: 50, is_primary: false, last_counted: '2026-02-15', created_at: '2026-01-15', updated_at: '2026-02-16' },
  
  // Product 2 (Standard Cigar B) - SKU-1002
  { id: 3, product_id: 2, location_id: 4, quantity: 180, is_primary: true, last_counted: '2026-02-14', created_at: '2026-01-10', updated_at: '2026-02-16' },
  { id: 4, product_id: 2, location_id: 5, quantity: 120, is_primary: false, last_counted: '2026-02-14', created_at: '2026-01-12', updated_at: '2026-02-16' },
  
  // Product 3 (Luxury Cigar C) - SKU-1003
  { id: 5, product_id: 3, location_id: 6, quantity: 75, is_primary: true, last_counted: '2026-02-15', created_at: '2026-01-10', updated_at: '2026-02-16' },
  
  // Product 4 (Budget Cigar D) - SKU-1004
  { id: 6, product_id: 4, location_id: 7, quantity: 300, is_primary: true, last_counted: '2026-02-14', created_at: '2026-01-10', updated_at: '2026-02-16' },
  { id: 7, product_id: 4, location_id: 8, quantity: 200, is_primary: false, last_counted: '2026-02-14', created_at: '2026-01-11', updated_at: '2026-02-16' },
  
  // Product 5 (Specialty Cigar E) - SKU-1005
  { id: 8, product_id: 5, location_id: 5, quantity: 100, is_primary: true, last_counted: '2026-02-15', created_at: '2026-01-10', updated_at: '2026-02-16' }
];

// Receiving Shipments
let mockReceivingShipments = [
  {
    id: 1,
    shipment_number: 'RCV-1739721600001',
    supplier_id: 1,
    po_number: 'PO-2026-001',
    carrier: 'FedEx',
    tracking_number: 'FDX123456789',
    status: 'completed',
    expected_arrival: '2026-02-10',
    actual_arrival: '2026-02-10T14:30:00Z',
    total_items: 3,
    items_received: 3,
    received_by: 7,
    notes: 'All items received in good condition',
    created_at: '2026-02-08T09:00:00Z',
    updated_at: '2026-02-10T15:45:00Z'
  },
  {
    id: 2,
    shipment_number: 'RCV-1739722200002',
    supplier_id: 2,
    po_number: 'PO-2026-002',
    carrier: 'UPS',
    tracking_number: 'UPS987654321',
    status: 'in_progress',
    expected_arrival: '2026-02-16',
    actual_arrival: '2026-02-16T10:15:00Z',
    total_items: 2,
    items_received: 1,
    received_by: 8,
    notes: 'Receiving in progress',
    created_at: '2026-02-14T10:00:00Z',
    updated_at: '2026-02-16T11:30:00Z'
  },
  {
    id: 3,
    shipment_number: 'RCV-1739722600003',
    supplier_id: 1,
    po_number: 'PO-2026-003',
    carrier: 'DHL',
    tracking_number: null,
    status: 'pending',
    expected_arrival: '2026-02-18',
    actual_arrival: null,
    total_items: 2,
    items_received: 0,
    received_by: null,
    notes: 'Awaiting delivery',
    created_at: '2026-02-15T14:00:00Z',
    updated_at: '2026-02-15T14:00:00Z'
  }
];

// Receiving Items
let mockReceivingItems = [
  // Shipment 1 items
  {
    id: 1,
    shipment_id: 1,
    product_id: 1,
    sku: 'SKU-1001',
    expected_quantity: 100,
    received_quantity: 100,
    location_id: 3,
    match_status: 'matched',
    condition: 'good',
    notes: '',
    created_at: '2026-02-10T14:30:00Z',
    updated_at: '2026-02-10T15:15:00Z'
  },
  {
    id: 2,
    shipment_id: 1,
    product_id: 2,
    sku: 'SKU-1002',
    expected_quantity: 150,
    received_quantity: 150,
    location_id: 4,
    match_status: 'matched',
    condition: 'good',
    notes: '',
    created_at: '2026-02-10T14:30:00Z',
    updated_at: '2026-02-10T15:30:00Z'
  },
  {
    id: 3,
    shipment_id: 1,
    product_id: 5,
    sku: 'SKU-1005',
    expected_quantity: 50,
    received_quantity: 50,
    location_id: 5,
    match_status: 'matched',
    condition: 'good',
    notes: '',
    created_at: '2026-02-10T14:30:00Z',
    updated_at: '2026-02-10T15:45:00Z'
  },
  
  // Shipment 2 items
  {
    id: 4,
    shipment_id: 2,
    product_id: 3,
    sku: 'SKU-1003',
    expected_quantity: 50,
    received_quantity: 50,
    location_id: 6,
    match_status: 'matched',
    condition: 'good',
    notes: '',
    created_at: '2026-02-16T10:15:00Z',
    updated_at: '2026-02-16T11:30:00Z'
  },
  {
    id: 5,
    shipment_id: 2,
    product_id: 4,
    sku: 'SKU-1004',
    expected_quantity: 200,
    received_quantity: 0,
    location_id: null,
    match_status: 'pending',
    condition: null,
    notes: 'Not yet received',
    created_at: '2026-02-16T10:15:00Z',
    updated_at: '2026-02-16T10:15:00Z'
  },
  
  // Shipment 3 items (not yet arrived)
  {
    id: 6,
    shipment_id: 3,
    product_id: 1,
    sku: 'SKU-1001',
    expected_quantity: 75,
    received_quantity: 0,
    location_id: null,
    match_status: 'pending',
    condition: null,
    notes: '',
    created_at: '2026-02-15T14:00:00Z',
    updated_at: '2026-02-15T14:00:00Z'
  },
  {
    id: 7,
    shipment_id: 3,
    product_id: 3,
    sku: 'SKU-1003',
    expected_quantity: 25,
    received_quantity: 0,
    location_id: null,
    match_status: 'pending',
    condition: null,
    notes: '',
    created_at: '2026-02-15T14:00:00Z',
    updated_at: '2026-02-15T14:00:00Z'
  }
];

// Pick Lists
let mockPickLists = [
  {
    id: 1,
    pick_list_number: 'PICK-1739721700001',
    order_id: 1,
    assigned_to: 7,
    priority: 'normal',
    zone: 'ZONE-A',
    status: 'completed',
    total_items: 1,
    items_picked: 1,
    route_data: JSON.stringify([{ location_code: 'A1-01-01', sequence: 1 }]),
    started_at: '2026-02-12T09:00:00Z',
    completed_at: '2026-02-12T09:45:00Z',
    created_at: '2026-02-12T08:30:00Z',
    updated_at: '2026-02-12T09:45:00Z'
  },
  {
    id: 2,
    pick_list_number: 'PICK-1739722100002',
    order_id: 2,
    assigned_to: 8,
    priority: 'high',
    zone: 'ZONE-A',
    status: 'in_progress',
    total_items: 1,
    items_picked: 0,
    route_data: JSON.stringify([{ location_code: 'A1-01-02', sequence: 1 }]),
    started_at: '2026-02-16T10:00:00Z',
    completed_at: null,
    created_at: '2026-02-16T09:30:00Z',
    updated_at: '2026-02-16T10:00:00Z'
  },
  {
    id: 3,
    pick_list_number: 'PICK-1739722400003',
    order_id: 3,
    assigned_to: null,
    priority: 'normal',
    zone: 'ZONE-A',
    status: 'pending',
    total_items: 1,
    items_picked: 0,
    route_data: null,
    started_at: null,
    completed_at: null,
    created_at: '2026-02-16T11:00:00Z',
    updated_at: '2026-02-16T11:00:00Z'
  }
];

// Pick List Items
let mockPickListItems = [
  // Pick List 1
  {
    id: 1,
    pick_list_id: 1,
    product_id: 1,
    sku: 'SKU-1001',
    location_id: 3,
    quantity_requested: 5,
    quantity_picked: 5,
    sequence_number: 1,
    status: 'picked',
    notes: '',
    created_at: '2026-02-12T08:30:00Z',
    updated_at: '2026-02-12T09:45:00Z'
  },
  
  // Pick List 2
  {
    id: 2,
    pick_list_id: 2,
    product_id: 2,
    sku: 'SKU-1002',
    location_id: 4,
    quantity_requested: 10,
    quantity_picked: 0,
    sequence_number: 1,
    status: 'pending',
    notes: '',
    created_at: '2026-02-16T09:30:00Z',
    updated_at: '2026-02-16T09:30:00Z'
  },
  
  // Pick List 3
  {
    id: 3,
    pick_list_id: 3,
    product_id: 3,
    sku: 'SKU-1003',
    location_id: 6,
    quantity_requested: 2,
    quantity_picked: 0,
    sequence_number: 1,
    status: 'pending',
    notes: '',
    created_at: '2026-02-16T11:00:00Z',
    updated_at: '2026-02-16T11:00:00Z'
  }
];

// Inventory Scans
let mockInventoryScans = [
  {
    id: 1,
    scan_type: 'receiving',
    user_id: 7,
    product_id: 1,
    upc_code: '123456789012',
    sku: 'SKU-1001',
    location_id: 3,
    quantity: 100,
    status: 'success',
    error_message: null,
    session_id: 'scan-session-001',
    metadata: JSON.stringify({ shipment_id: 1 }),
    scanned_at: '2026-02-10T15:00:00Z'
  },
  {
    id: 2,
    scan_type: 'receiving',
    user_id: 7,
    product_id: 2,
    upc_code: '123456789013',
    sku: 'SKU-1002',
    location_id: 4,
    quantity: 150,
    status: 'success',
    error_message: null,
    session_id: 'scan-session-001',
    metadata: JSON.stringify({ shipment_id: 1 }),
    scanned_at: '2026-02-10T15:20:00Z'
  },
  {
    id: 3,
    scan_type: 'picking',
    user_id: 7,
    product_id: 1,
    upc_code: '123456789012',
    sku: 'SKU-1001',
    location_id: 3,
    quantity: 5,
    status: 'success',
    error_message: null,
    session_id: 'scan-session-002',
    metadata: JSON.stringify({ pick_list_id: 1, order_id: 1 }),
    scanned_at: '2026-02-12T09:30:00Z'
  },
  {
    id: 4,
    scan_type: 'cycle_count',
    user_id: 6,
    product_id: 2,
    upc_code: '123456789013',
    sku: 'SKU-1002',
    location_id: 4,
    quantity: 180,
    status: 'success',
    error_message: null,
    session_id: 'scan-session-003',
    metadata: JSON.stringify({ cycle_count_id: 1 }),
    scanned_at: '2026-02-14T14:00:00Z'
  }
];

// Shipment Batches (outbound)
let mockShipmentBatches = [
  {
    id: 1,
    batch_number: 'BATCH-1739722000001',
    order_id: 1,
    pick_list_id: 1,
    carrier: 'FedEx',
    tracking_number: 'FDX555666777',
    status: 'shipped',
    total_weight: 12.5,
    label_url: '/uploads/labels/batch_1_label.pdf',
    packed_by: 7,
    shipped_at: '2026-02-12T14:00:00Z',
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T14:00:00Z'
  },
  {
    id: 2,
    batch_number: 'BATCH-1739722500002',
    order_id: 2,
    pick_list_id: 2,
    carrier: 'UPS',
    tracking_number: null,
    status: 'pending',
    total_weight: 0,
    label_url: null,
    packed_by: null,
    shipped_at: null,
    created_at: '2026-02-16T11:30:00Z',
    updated_at: '2026-02-16T11:30:00Z'
  }
];

// Warehouse Audit Logs
let mockWarehouseAuditLogs = [
  {
    id: 1,
    user_id: 7,
    action: 'receive',
    resource_type: 'product',
    resource_id: 1,
    old_value: JSON.stringify({ quantity: 50 }),
    new_value: JSON.stringify({ quantity: 150 }),
    ip_address: '192.168.1.75',
    user_agent: 'Mozilla/5.0 Warehouse-App/1.0',
    session_id: 'scan-session-001',
    notes: 'Received shipment RCV-1739721600001',
    created_at: '2026-02-10T15:00:00Z'
  },
  {
    id: 2,
    user_id: 7,
    action: 'pick',
    resource_type: 'product',
    resource_id: 1,
    old_value: JSON.stringify({ quantity: 150 }),
    new_value: JSON.stringify({ quantity: 145 }),
    ip_address: '192.168.1.75',
    user_agent: 'Mozilla/5.0 Warehouse-App/1.0',
    session_id: 'scan-session-002',
    notes: 'Picked for order 1, pick list PICK-1739721700001',
    created_at: '2026-02-12T09:30:00Z'
  },
  {
    id: 3,
    user_id: 6,
    action: 'cycle_count',
    resource_type: 'product',
    resource_id: 2,
    old_value: JSON.stringify({ quantity: 170 }),
    new_value: JSON.stringify({ quantity: 180 }),
    ip_address: '192.168.1.70',
    user_agent: 'Mozilla/5.0 Warehouse-App/1.0',
    session_id: 'scan-session-003',
    notes: 'Cycle count adjustment - found 10 additional units',
    created_at: '2026-02-14T14:00:00Z'
  },
  {
    id: 4,
    user_id: 6,
    action: 'create_location',
    resource_type: 'warehouse_locations',
    resource_id: 3,
    old_value: null,
    new_value: JSON.stringify({ location_code: 'A1-01-01', zone: 'ZONE-A' }),
    ip_address: '192.168.1.70',
    user_agent: 'Mozilla/5.0',
    session_id: null,
    notes: 'Created new storage location',
    created_at: '2026-01-10T09:00:00Z'
  }
];

// ============================================
// DOCUMENT MANAGEMENT API
// ============================================

// Get supplier documents
app.get("/api/documents/supplier/:supplierId/retailer/:retailerId", authenticateToken, (req, res) => {
  try {
    const { supplierId, retailerId } = req.params;
    const { document_type } = req.query;

    let documents = mockSupplierDocuments.filter(d =>
      d.supplier_id.toString() === supplierId &&
      d.retailer_id.toString() === retailerId
    );

    if (document_type) {
      documents = documents.filter(d => d.document_type === document_type);
    }

    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload document (simplified - no actual file handling)
app.post("/api/documents/upload", authenticateToken, (req, res) => {
  try {
    const { supplierId, retailerId, filename, originalFilename, fileType, fileSize, documentType, description } = req.body;

    if (!supplierId || !retailerId || !filename || !originalFilename) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newDocument = {
      id: mockSupplierDocuments.length + 1,
      supplier_id: parseInt(supplierId),
      retailer_id: parseInt(retailerId),
      filename,
      original_filename: originalFilename,
      file_path: `/uploads/documents/supplier_${supplierId}/retailer_${retailerId}/${filename}`,
      file_type: fileType || 'application/pdf',
      file_size: fileSize || 0,
      document_type: documentType || 'other',
      description: description || '',
      uploaded_by: req.user?.id || 1,
      created_at: new Date().toISOString()
    };

    mockSupplierDocuments.push(newDocument);

    // Log audit
    mockDocumentAuditLogs.push({
      id: mockDocumentAuditLogs.length + 1,
      user_id: req.user?.id || 1,
      entity_type: 'document',
      entity_id: newDocument.id,
      action: 'upload',
      details: JSON.stringify({ filename: originalFilename, document_type: documentType }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      created_at: new Date().toISOString()
    });

    res.status(201).json({ message: 'Document uploaded successfully', document: newDocument });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get document by ID
app.get("/api/documents/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const document = mockSupplierDocuments.find(d => d.id.toString() === id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete document
app.delete("/api/documents/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const documentIndex = mockSupplierDocuments.findIndex(d => d.id.toString() === id);

    if (documentIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = mockSupplierDocuments[documentIndex];
    mockSupplierDocuments.splice(documentIndex, 1);

    // Log audit
    mockDocumentAuditLogs.push({
      id: mockDocumentAuditLogs.length + 1,
      user_id: req.user?.id || 1,
      entity_type: 'document',
      entity_id: parseInt(id),
      action: 'delete',
      details: JSON.stringify({ filename: document.original_filename }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all documents for a user account (supplier or retailer view)
app.get("/api/documents/account/:userId", authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    const user = mockUsers.find(u => u.id.toString() === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let documents = [];
    
    if (user.role === 'supplier') {
      // Get all documents where user is the supplier
      documents = mockSupplierDocuments.filter(d => d.supplier_id.toString() === userId);
    } else if (user.role === 'retailer') {
      // Get all documents where user is the retailer
      documents = mockSupplierDocuments.filter(d => d.retailer_id.toString() === userId);
    }

    // Enrich with supplier and retailer names
    const enriched = documents.map(doc => {
      const supplier = mockUsers.find(u => u.id === doc.supplier_id);
      const retailer = mockUsers.find(u => u.id === doc.retailer_id);
      const uploader = mockUsers.find(u => u.id === doc.uploaded_by);
      
      return {
        ...doc,
        supplier_name: supplier?.name || 'Unknown',
        retailer_name: retailer?.name || 'Unknown',
        uploader_name: uploader?.name || 'Unknown',
        file_name: doc.original_filename
      };
    });

    // Sort by most recent first
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ 
      documents: enriched,
      total: enriched.length,
      account_type: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get document history/audit for a specific document
app.get("/api/documents/:documentId/history", authenticateToken, (req, res) => {
  try {
    const { documentId } = req.params;
    const document = mockSupplierDocuments.find(d => d.id.toString() === documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Get all audit logs for this document
    const logs = mockDocumentAuditLogs.filter(log =>
      log.entity_type === 'document' &&
      log.entity_id.toString() === documentId
    );

    // Enrich with user names
    const enriched = logs.map(log => {
      const user = mockUsers.find(u => u.id === log.user_id);
      return {
        ...log,
        user_name: user?.name || 'Unknown',
        user_email: user?.email || 'Unknown'
      };
    });

    // Sort by most recent first
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ 
      document: {
        id: document.id,
        filename: document.original_filename,
        document_type: document.document_type,
        uploaded_at: document.created_at
      },
      history: enriched 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all document activity for an account
app.get("/api/documents/account/:userId/history", authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    const user = mockUsers.find(u => u.id.toString() === userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all documents for this account
    let userDocumentIds = [];
    if (user.role === 'supplier') {
      userDocumentIds = mockSupplierDocuments
        .filter(d => d.supplier_id.toString() === userId)
        .map(d => d.id);
    } else if (user.role === 'retailer') {
      userDocumentIds = mockSupplierDocuments
        .filter(d => d.retailer_id.toString() === userId)
        .map(d => d.id);
    }

    // Get all audit logs for these documents
    const logs = mockDocumentAuditLogs.filter(log =>
      log.entity_type === 'document' &&
      userDocumentIds.includes(log.entity_id)
    );

    // Enrich with user and document info
    const enriched = logs.map(log => {
      const user = mockUsers.find(u => u.id === log.user_id);
      const document = mockSupplierDocuments.find(d => d.id === log.entity_id);
      
      return {
        ...log,
        user_name: user?.name || 'Unknown',
        user_email: user?.email || 'Unknown',
        document_name: document?.original_filename || 'Unknown',
        document_type: document?.document_type || 'Unknown'
      };
    });

    // Sort by most recent first
    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ 
      account_history: enriched,
      total_activities: enriched.length,
      account_type: user.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Download document (with audit logging)
app.get("/api/documents/:documentId/download", authenticateToken, (req, res) => {
  try {
    const { documentId } = req.params;
    const document = mockSupplierDocuments.find(d => d.id.toString() === documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log download action
    mockDocumentAuditLogs.push({
      id: mockDocumentAuditLogs.length + 1,
      user_id: req.user?.id || 1,
      entity_type: 'document',
      entity_id: parseInt(documentId),
      action: 'download',
      details: JSON.stringify({ 
        filename: document.original_filename,
        file_type: document.file_type 
      }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      created_at: new Date().toISOString()
    });

    // Return document info (in real app, would stream file)
    res.json({ 
      message: 'Document download initiated',
      document: {
        id: document.id,
        filename: document.original_filename,
        file_type: document.file_type,
        file_size: document.file_size,
        download_url: document.file_path
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CONTRACT MANAGEMENT API
// ============================================

// Create contract
app.post("/api/contracts/create", authenticateToken, (req, res) => {
  try {
    const { retailerId, title, content, contractType, expiresAt } = req.body;

    if (!retailerId || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const contractNumber = `CON-${timestamp}-${random}`;

    const newContract = {
      id: mockContracts.length + 1,
      contract_number: contractNumber,
      supplier_id: req.user?.id || 1,
      retailer_id: parseInt(retailerId),
      title,
      content,
      contract_type: contractType || 'sales',
      status: 'draft',
      created_by: req.user?.id || 1,
      pdf_path: null,
      expires_at: expiresAt || null,
      created_at: new Date().toISOString()
    };

    mockContracts.push(newContract);

    // Log audit
    mockDocumentAuditLogs.push({
      id: mockDocumentAuditLogs.length + 1,
      user_id: req.user?.id || 1,
      entity_type: 'contract',
      entity_id: newContract.id,
      action: 'create',
      details: JSON.stringify({ title, contract_type: contractType }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      created_at: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Contract created successfully',
      contract: newContract
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send contract to retailer
app.post("/api/contracts/:id/send", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const contractIndex = mockContracts.findIndex(c => c.id.toString() === id);

    if (contractIndex === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    mockContracts[contractIndex].status = 'sent';
    mockContracts[contractIndex].sent_at = new Date().toISOString();

    // Log audit
    mockDocumentAuditLogs.push({
      id: mockDocumentAuditLogs.length + 1,
      user_id: req.user?.id || 1,
      entity_type: 'contract',
      entity_id: parseInt(id),
      action: 'send',
      details: JSON.stringify({ retailer_id: mockContracts[contractIndex].retailer_id }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      created_at: new Date().toISOString()
    });

    res.json({
      message: 'Contract sent to retailer',
      contract: mockContracts[contractIndex]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get contract details
app.get("/api/contracts/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const contract = mockContracts.find(c => c.id.toString() === id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Mark as viewed if sent and not yet viewed
    const contractIndex = mockContracts.findIndex(c => c.id.toString() === id);
    if (contract.status === 'sent' && !contract.viewed_at) {
      mockContracts[contractIndex].status = 'viewed';
      mockContracts[contractIndex].viewed_at = new Date().toISOString();

      // Log audit
      mockDocumentAuditLogs.push({
        id: mockDocumentAuditLogs.length + 1,
        user_id: req.user?.id || 1,
        entity_type: 'contract',
        entity_id: parseInt(id),
        action: 'view',
        details: JSON.stringify({ contract_number: contract.contract_number }),
        ip_address: req.ip || '127.0.0.1',
        user_agent: req.get('user-agent') || '',
        created_at: new Date().toISOString()
      });
    }

    // Get signatures for this contract
    const signatures = mockSignatures.filter(s => s.contract_id.toString() === id);

    // Get supplier and retailer names
    const supplier = mockUsers.find(u => u.id === contract.supplier_id);
    const retailer = mockUsers.find(u => u.id === contract.retailer_id);

    res.json({
      contract: {
        ...contract,
        supplier_name: supplier?.name || 'Unknown',
        retailer_name: retailer?.name || 'Unknown'
      },
      signatures
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get supplier contracts
app.get("/api/contracts/supplier/:supplierId", authenticateToken, (req, res) => {
  try {
    const { supplierId } = req.params;
    const { status } = req.query;

    let contracts = mockContracts.filter(c =>
      c.supplier_id.toString() === supplierId
    );

    if (status) {
      contracts = contracts.filter(c => c.status === status);
    }

    // Enrich with names
    const enriched = contracts.map(c => {
      const retailer = mockUsers.find(u => u.id === c.retailer_id);
      return {
        ...c,
        retailer_name: retailer?.name || 'Unknown'
      };
    });

    res.json({ contracts: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending contracts for retailer
app.get("/api/contracts/retailer/:retailerId/pending", authenticateToken, (req, res) => {
  try {
    const { retailerId } = req.params;

    const contracts = mockContracts.filter(c =>
      c.retailer_id.toString() === retailerId &&
      (c.status === 'sent' || c.status === 'viewed')
    );

    // Enrich with names
    const enriched = contracts.map(c => {
      const supplier = mockUsers.find(u => u.id === c.supplier_id);
      return {
        ...c,
        supplier_name: supplier?.name || 'Unknown'
      };
    });

    res.json({ contracts: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update contract status
app.put("/api/contracts/:id/status", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const contractIndex = mockContracts.findIndex(c => c.id.toString() === id);
    if (contractIndex === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    mockContracts[contractIndex].status = status;

    res.json({
      message: 'Contract status updated',
      contract: mockContracts[contractIndex]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete contract
app.delete("/api/contracts/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const contractIndex = mockContracts.findIndex(c => c.id.toString() === id);

    if (contractIndex === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const contract = mockContracts[contractIndex];
    
    // Only allow deletion of draft contracts
    if (contract.status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft contracts' });
    }

    mockContracts.splice(contractIndex, 1);

    // Log audit
    mockDocumentAuditLogs.push({
      id: mockDocumentAuditLogs.length + 1,
      user_id: req.user?.id || 1,
      entity_type: 'contract',
      entity_id: parseInt(id),
      action: 'delete',
      details: JSON.stringify({ title: contract.title }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      created_at: new Date().toISOString()
    });

    res.json({ message: 'Contract deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// E-SIGNATURE API
// ============================================

// Initialize signature workflow
app.post("/api/contracts/:id/signature/initialize", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const contract = mockContracts.find(c => c.id.toString() === id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (contract.status !== 'sent' && contract.status !== 'viewed') {
      return res.status(400).json({ error: 'Contract must be sent before signing' });
    }

    res.json({
      message: 'Signature workflow initialized',
      contract_id: contract.id,
      contract_number: contract.contract_number,
      ready_to_sign: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit signature
app.post("/api/contracts/:id/signature", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { signatureType, signatureData, signerName, signerEmail } = req.body;

    const contractIndex = mockContracts.findIndex(c => c.id.toString() === id);
    if (contractIndex === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    if (!signatureType || !signatureData) {
      return res.status(400).json({ error: 'Missing signature data' });
    }

    const newSignature = {
      id: mockSignatures.length + 1,
      contract_id: parseInt(id),
      signer_user_id: req.user?.id || 2,
      signer_name: signerName || req.user?.name || 'Unknown',
      signer_email: signerEmail || req.user?.email || 'unknown@example.com',
      signer_role: req.user?.role || 'retailer',
      signature_type: signatureType,
      signature_data: signatureData,
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      signed_at: new Date().toISOString()
    };

    mockSignatures.push(newSignature);

    // Update contract status
    mockContracts[contractIndex].status = 'signed';
    mockContracts[contractIndex].signed_at = new Date().toISOString();
    mockContracts[contractIndex].pdf_path = `/uploads/contracts/contract_${id}_signed.pdf`;

    // Log audit
    mockDocumentAuditLogs.push({
      id: mockDocumentAuditLogs.length + 1,
      user_id: req.user?.id || 1,
      entity_type: 'contract',
      entity_id: parseInt(id),
      action: 'sign',
      details: JSON.stringify({ signature_type: signatureType }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      created_at: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Signature saved successfully',
      signature: newSignature,
      contract_status: 'signed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get signature status
app.get("/api/contracts/:id/signature-status", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const contract = mockContracts.find(c => c.id.toString() === id);

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const signatures = mockSignatures.filter(s => s.contract_id.toString() === id);

    res.json({
      contract_id: contract.id,
      contract_status: contract.status,
      is_signed: contract.status === 'signed',
      signatures_count: signatures.length,
      signatures: signatures.map(s => ({
        id: s.id,
        signer_name: s.signer_name,
        signer_role: s.signer_role,
        signed_at: s.signed_at
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete contract signing
app.put("/api/contracts/:id/complete", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const contractIndex = mockContracts.findIndex(c => c.id.toString() === id);

    if (contractIndex === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    mockContracts[contractIndex].status = 'completed';

    // Log audit
    mockDocumentAuditLogs.push({
      id: mockDocumentAuditLogs.length + 1,
      user_id: req.user?.id || 1,
      entity_type: 'contract',
      entity_id: parseInt(id),
      action: 'complete',
      details: JSON.stringify({ final_status: 'completed' }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      created_at: new Date().toISOString()
    });

    res.json({
      message: 'Contract completed',
      contract: mockContracts[contractIndex]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit log
app.get("/api/audit/:entityType/:entityId", authenticateToken, (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = mockDocumentAuditLogs.filter(log =>
      log.entity_type === entityType &&
      log.entity_id.toString() === entityId
    );

    // Enrich with user names
    const enriched = logs.map(log => {
      const user = mockUsers.find(u => u.id === log.user_id);
      return {
        ...log,
        user_name: user?.name || 'Unknown'
      };
    });

    res.json({ audit_logs: enriched });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// MOBILE SALES REP API
// ============================================

// Get current user's sales rep profile
app.get("/api/reps/me", authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const salesRep = mockSalesReps.find(rep => rep.user_id === userId);
    
    if (!salesRep) {
      return res.status(404).json({ error: 'No sales rep profile found for this user' });
    }
    
    res.json({ salesRep });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily Check-In
app.post("/api/reps/check-in", authenticateToken, (req, res) => {
  try {
    const { sales_rep_id, check_in_location, notes, weather } = req.body;
    
    const newCheckIn = {
      id: mockDailyCheckIns.length + 1,
      sales_rep_id,
      check_in_date: new Date().toISOString().split('T')[0],
      check_in_time: new Date().toTimeString().split(' ')[0],
      check_out_time: null,
      check_in_location,
      check_out_location: null,
      daily_miles: null,
      weather: weather || 'N/A',
      status: 'checked_in',
      notes: notes || ''
    };
    
    mockDailyCheckIns.push(newCheckIn);
    res.json({ check_in: newCheckIn, message: 'Checked in successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily Check-Out
app.post("/api/reps/check-out", authenticateToken, (req, res) => {
  try {
    const { check_in_id, check_out_location, daily_miles } = req.body;
    
    const checkIn = mockDailyCheckIns.find(c => c.id === parseInt(check_in_id));
    if (!checkIn) {
      return res.status(404).json({ error: 'Check-in not found' });
    }
    
    checkIn.check_out_time = new Date().toTimeString().split(' ')[0];
    checkIn.check_out_location = check_out_location;
    checkIn.daily_miles = daily_miles;
    checkIn.status = 'checked_out';
    
    res.json({ check_in: checkIn, message: 'Checked out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's check-in status
app.get("/api/reps/:sales_rep_id/check-in/today", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const todayCheckIn = mockDailyCheckIns.find(c => 
      c.sales_rep_id === parseInt(sales_rep_id) && c.check_in_date === today
    );
    
    res.json({ 
      check_in: todayCheckIn, 
      is_checked_in: todayCheckIn?.status === 'checked_in'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get authorized accounts
app.get("/api/reps/:sales_rep_id/accounts", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    
    const authorizations = mockRepAuthorizedAccounts.filter(a => 
      a.sales_rep_id === parseInt(sales_rep_id) && a.is_active
    );
    
    const accounts = authorizations.map(auth => {
      const account = mockUsers.find(u => u.id === auth.account_id && u.role === 'retailer');
      const prefs = mockAccountPreferences.find(p => p.account_id === auth.account_id);
      const lastVisit = mockAccountVisits
        .filter(v => v.account_id === auth.account_id && v.status === 'completed')
        .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
      
      return {
        ...auth,
        account_name: account?.name || 'Unknown',
        account_email: account?.email || 'Unknown',
        business_name: account?.business_name || 'Unknown',
        last_visit_date: lastVisit?.visit_date || null,
        preferences: prefs || {}
      };
    });
    
    res.json({ accounts, total: accounts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get account details
app.get("/api/reps/accounts/:account_id", authenticateToken, (req, res) => {
  try {
    const { account_id } = req.params;
    
    const account = mockUsers.find(u => u.id === parseInt(account_id) && u.role === 'retailer');
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const prefs = mockAccountPreferences.find(p => p.account_id === parseInt(account_id));
    const visits = mockAccountVisits.filter(v => v.account_id === parseInt(account_id));
    
    const { password, ...accountData } = account;
    
    res.json({ 
      account: accountData, 
      preferences: prefs,
      total_visits: visits.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Visit Check-In
app.post("/api/reps/visits/check-in", authenticateToken, (req, res) => {
  try {
    const { sales_rep_id, account_id, check_in_id, location_latitude, location_longitude, purpose, notes } = req.body;
    
    const newVisit = {
      id: mockAccountVisits.length + 1,
      sales_rep_id,
      account_id,
      check_in_id,
      visit_date: new Date().toISOString().split('T')[0],
      arrival_time: new Date().toTimeString().split(' ')[0],
      departure_time: null,
      visit_duration: null,
      location_latitude,
      location_longitude,
      notes: notes || '',
      purpose: purpose || 'Sales call',
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockAccountVisits.push(newVisit);
    res.json({ visit: newVisit, message: 'Checked in to account successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Visit Check-Out
app.post("/api/reps/visits/check-out", authenticateToken, (req, res) => {
  try {
    const { visit_id, notes } = req.body;
    
    const visit = mockAccountVisits.find(v => v.id === parseInt(visit_id));
    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    
    const departure = new Date();
    const arrival = new Date(`${visit.visit_date}T${visit.arrival_time}`);
    const duration = Math.floor((departure - arrival) / 60000); // minutes
    
    visit.departure_time = departure.toTimeString().split(' ')[0];
    visit.visit_duration = duration;
    visit.status = 'completed';
    visit.notes = notes || visit.notes;
    visit.updated_at = new Date().toISOString();
    
    res.json({ visit, message: 'Checked out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's visits
app.get("/api/reps/:sales_rep_id/visits/today", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    let visits = mockAccountVisits.filter(v => 
      v.sales_rep_id === parseInt(sales_rep_id) && v.visit_date === today
    );
    
    // Enrich with account names
    visits = visits.map(visit => {
      const account = mockUsers.find(u => u.id === visit.account_id);
      return {
        ...visit,
        account_name: account?.name || 'Unknown',
        business_name: account?.business_name || 'Unknown'
      };
    });
    
    res.json({ visits, total: visits.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get scheduled visits
app.get("/api/reps/:sales_rep_id/visits/schedule", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    
    let visits = mockAccountVisits.filter(v => 
      v.sales_rep_id === parseInt(sales_rep_id) && v.status === 'scheduled'
    );
    
    // Enrich with account names
    visits = visits.map(visit => {
      const account = mockUsers.find(u => u.id === visit.account_id);
      return {
        ...visit,
        account_name: account?.name || 'Unknown',
        business_name: account?.business_name || 'Unknown'
      };
    });
    
    res.json({ visits, total: visits.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload photo
app.post("/api/reps/photos/upload", authenticateToken, (req, res) => {
  try {
    const { visit_id, photo_url, file_name, file_size, photo_type, photo_metadata } = req.body;
    
    const newPhoto = {
      id: mockVisitPhotos.length + 1,
      visit_id,
      photo_url: photo_url || `/uploads/photos/visit_${visit_id}_${Date.now()}.jpg`,
      file_name,
      file_size,
      photo_type: photo_type || 'other',
      photo_metadata: JSON.stringify(photo_metadata || {}),
      taken_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    mockVisitPhotos.push(newPhoto);
    res.json({ photo: newPhoto, message: 'Photo uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get photos for a visit
app.get("/api/reps/photos/visit/:visit_id", authenticateToken, (req, res) => {
  try {
    const { visit_id } = req.params;
    
    const photos = mockVisitPhotos.filter(p => p.visit_id === parseInt(visit_id));
    
    res.json({ photos, total: photos.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get photo gallery for rep
app.get("/api/reps/:sales_rep_id/photos/gallery", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    const { photo_type } = req.query;
    
    // Get all visits for this rep
    const repVisits = mockAccountVisits.filter(v => v.sales_rep_id === parseInt(sales_rep_id));
    const visitIds = repVisits.map(v => v.id);
    
    let photos = mockVisitPhotos.filter(p => visitIds.includes(p.visit_id));
    
    if (photo_type) {
      photos = photos.filter(p => p.photo_type === photo_type);
    }
    
    // Enrich with visit and account info
    photos = photos.map(photo => {
      const visit = mockAccountVisits.find(v => v.id === photo.visit_id);
      const account = visit ? mockUsers.find(u => u.id === visit.account_id) : null;
      return {
        ...photo,
        visit_date: visit?.visit_date || null,
        account_name: account?.name || 'Unknown',
        business_name: account?.business_name || 'Unknown'
      };
    });
    
    res.json({ photos, total: photos.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log mileage
app.post("/api/reps/mileage/log", authenticateToken, (req, res) => {
  try {
    const { sales_rep_id, check_in_id, total_miles, purpose, notes, start_odometer, end_odometer } = req.body;
    
    const newLog = {
      id: mockMileageLogs.length + 1,
      sales_rep_id,
      check_in_id,
      trip_date: new Date().toISOString().split('T')[0],
      trip_start_time: new Date().toTimeString().split(' ')[0],
      trip_end_time: new Date().toTimeString().split(' ')[0],
      start_location: '',
      end_location: '',
      start_odometer: start_odometer || null,
      end_odometer: end_odometer || null,
      total_miles,
      purpose: purpose || 'Account visits',
      notes: notes || '',
      reimbursement_status: 'pending',
      reimbursement_amount: (total_miles * 0.585).toFixed(2),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockMileageLogs.push(newLog);
    res.json({ mileage_log: newLog, message: 'Mileage logged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's mileage
app.get("/api/reps/:sales_rep_id/mileage/today", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const logs = mockMileageLogs.filter(m => 
      m.sales_rep_id === parseInt(sales_rep_id) && m.trip_date === today
    );
    
    const total_miles = logs.reduce((sum, log) => sum + log.total_miles, 0);
    const total_reimbursement = logs.reduce((sum, log) => sum + parseFloat(log.reimbursement_amount), 0);
    
    res.json({ 
      logs, 
      summary: {
        total_miles,
        total_reimbursement: total_reimbursement.toFixed(2),
        trip_count: logs.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get monthly mileage summary
app.get("/api/reps/:sales_rep_id/mileage/month", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    const { year, month } = req.query;
    
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1).toString().padStart(2, '0');
    const monthPrefix = `${currentYear}-${currentMonth}`;
    
    const logs = mockMileageLogs.filter(m => 
      m.sales_rep_id === parseInt(sales_rep_id) && m.trip_date.startsWith(monthPrefix)
    );
    
    const total_miles = logs.reduce((sum, log) => sum + log.total_miles, 0);
    const total_reimbursement = logs.reduce((sum, log) => sum + parseFloat(log.reimbursement_amount), 0);
    const pending = logs.filter(l => l.reimbursement_status === 'pending');
    const approved = logs.filter(l => l.reimbursement_status === 'approved');
    
    res.json({ 
      logs,
      summary: {
        period: `${currentYear}-${currentMonth}`,
        total_miles,
        total_reimbursement: total_reimbursement.toFixed(2),
        trip_count: logs.length,
        pending_trips: pending.length,
        approved_trips: approved.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track location
app.post("/api/reps/location/track", authenticateToken, (req, res) => {
  try {
    const { sales_rep_id, check_in_id, latitude, longitude, address, accuracy } = req.body;
    
    const newLocation = {
      id: mockLocationTracking.length + 1,
      sales_rep_id,
      check_in_id,
      latitude,
      longitude,
      address: address || 'Unknown',
      accuracy: accuracy || 10,
      timestamp: new Date().toISOString(),
      trip_start: false,
      trip_end: false,
      miles_traveled: 0,
      created_at: new Date().toISOString()
    };
    
    mockLocationTracking.push(newLocation);
    res.json({ location: newLocation, message: 'Location tracked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's route
app.get("/api/reps/:sales_rep_id/location/today", authenticateToken, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    const locations = mockLocationTracking.filter(l => 
      l.sales_rep_id === parseInt(sales_rep_id) && 
      l.timestamp.startsWith(today)
    );
    
    const total_miles = locations.reduce((sum, loc) => sum + loc.miles_traveled, 0);
    
    res.json({ 
      locations, 
      total_miles,
      point_count: locations.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get performance dashboard
app.get("/api/reps/:sales_rep_id/performance/dashboard", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    // Today's stats
    const todayCheckIn = mockDailyCheckIns.find(c => 
      c.sales_rep_id === parseInt(sales_rep_id) && c.check_in_date === today
    );
    const todayVisits = mockAccountVisits.filter(v => 
      v.sales_rep_id === parseInt(sales_rep_id) && v.visit_date === today
    );
    const todayMileage = mockMileageLogs.filter(m => 
      m.sales_rep_id === parseInt(sales_rep_id) && m.trip_date === today
    );
    
    // Week stats (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const weekVisits = mockAccountVisits.filter(v => 
      v.sales_rep_id === parseInt(sales_rep_id) && 
      v.visit_date >= weekAgoStr && v.visit_date <= today
    );
    const weekMileage = mockMileageLogs.filter(m => 
      m.sales_rep_id === parseInt(sales_rep_id) && 
      m.trip_date >= weekAgoStr && m.trip_date <= today
    );
    
    // Latest performance metric
    const latestMetric = mockPerformanceMetrics
      .filter(m => m.sales_rep_id === parseInt(sales_rep_id))
      .sort((a, b) => new Date(b.period_end_date) - new Date(a.period_end_date))[0];
    
    res.json({
      today: {
        is_checked_in: todayCheckIn?.status === 'checked_in',
        visits: todayVisits.length,
        completed_visits: todayVisits.filter(v => v.status === 'completed').length,
        miles: todayMileage.reduce((sum, m) => sum + m.total_miles, 0)
      },
      week: {
        visits: weekVisits.length,
        completed_visits: weekVisits.filter(v => v.status === 'completed').length,
        miles: weekMileage.reduce((sum, m) => sum + m.total_miles, 0),
        unique_accounts: [...new Set(weekVisits.map(v => v.account_id))].length
      },
      performance: latestMetric || {}
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get weekly performance summary
app.get("/api/reps/:sales_rep_id/performance/weekly", authenticateToken, validateSalesRepAccess, (req, res) => {
  try {
    const { sales_rep_id } = req.params;
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    
    const visits = mockAccountVisits.filter(v => 
      v.sales_rep_id === parseInt(sales_rep_id) && 
      v.visit_date >= weekAgoStr && v.visit_date <= today
    );
    
    const mileage = mockMileageLogs.filter(m => 
      m.sales_rep_id === parseInt(sales_rep_id) && 
      m.trip_date >= weekAgoStr && m.trip_date <= today
    );
    
    const photos = mockVisitPhotos.filter(p => {
      const visit = mockAccountVisits.find(v => v.id === p.visit_id);
      return visit && visit.sales_rep_id === parseInt(sales_rep_id) && 
             visit.visit_date >= weekAgoStr && visit.visit_date <= today;
    });
    
    res.json({
      period: `${weekAgoStr} to ${today}`,
      visits: visits.length,
      completed_visits: visits.filter(v => v.status === 'completed').length,
      scheduled_visits: visits.filter(v => v.status === 'scheduled').length,
      unique_accounts: [...new Set(visits.map(v => v.account_id))].length,
      total_miles: mileage.reduce((sum, m) => sum + m.total_miles, 0),
      photos_taken: photos.length,
      visit_completion_rate: visits.length > 0 
        ? ((visits.filter(v => v.status === 'completed').length / visits.length) * 100).toFixed(1)
        : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WAREHOUSE MANAGEMENT API
// ============================================

// Get live warehouse inventory for all products (for ordering page)
app.get("/api/warehouse/live-inventory", authenticateToken, (req, res) => {
  try {
    const inventory = mockProducts.map(product => {
      // Aggregate inventory across all locations for this product
      const locations = mockProductLocations.filter(pl => pl.product_id === product.id);
      const totalQuantity = locations.reduce((sum, pl) => sum + pl.quantity, 0);
      const locationBreakdown = locations.map(pl => {
        const loc = mockWarehouseLocations.find(l => l.id === pl.location_id);
        return {
          location_id: pl.location_id,
          location_code: loc?.location_code,
          zone: loc?.zone,
          quantity: pl.quantity
        };
      });

      return {
        product_id: product.id,
        sku: product.sku,
        name: product.name,
        upc: product.upc,
        available_quantity: totalQuantity,
        locations: locationBreakdown,
        low_stock: totalQuantity < 50,
        last_updated: new Date().toISOString()
      };
    });

    res.json({
      timestamp: new Date().toISOString(),
      total_products: inventory.length,
      inventory: inventory
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get live inventory for a specific product
app.get("/api/warehouse/live-inventory/:productId", authenticateToken, (req, res) => {
  try {
    const { productId } = req.params;
    const product = mockProducts.find(p => p.id === parseInt(productId));

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const locations = mockProductLocations.filter(pl => pl.product_id === product.id);
    const totalQuantity = locations.reduce((sum, pl) => sum + pl.quantity, 0);
    const locationBreakdown = locations.map(pl => {
      const loc = mockWarehouseLocations.find(l => l.id === pl.location_id);
      return {
        location_id: pl.location_id,
        location_code: loc?.location_code,
        zone: loc?.zone,
        quantity: pl.quantity,
        is_primary: pl.is_primary
      };
    });

    res.json({
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      upc: product.upc,
      available_quantity: totalQuantity,
      locations: locationBreakdown,
      low_stock: totalQuantity < 50,
      last_updated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket-Sync Status endpoint
app.get("/api/warehouse/sync-status", authenticateToken, (req, res) => {
  res.json({
    sync_enabled: true,
    connected_clients: syncManager.getClientCount(),
    sync_type: 'websocket',
    url: `ws://${req.get('host')}`,
    message: 'Real-time inventory updates enabled. Connect WebSocket to receive live inventory changes.'
  });
});

// ============================================
// Scanning Operations
// ============================================

// Universal scan endpoint
app.post("/api/warehouse/scan", authenticateToken, (req, res) => {
  try {
    const { scan_type, upc_code, sku, location_id, quantity = 1, session_id, metadata = {} } = req.body;
    
    if (!scan_type || (!upc_code && !sku)) {
      return res.status(400).json({ error: 'scan_type and (upc_code or sku) are required' });
    }
    
    // Find product by UPC or SKU
    const product = mockProducts.find(p => 
      (upc_code && p.upc === upc_code) || 
      (sku && p.sku === sku)
    );
    
    if (!product) {
      const scan = {
        id: mockInventoryScans.length + 1,
        scan_type,
        user_id: req.user.id,
        product_id: null,
        upc_code,
        sku,
        location_id,
        quantity,
        status: 'error',
        error_message: 'Product not found',
        session_id,
        metadata: JSON.stringify(metadata),
        scanned_at: new Date().toISOString()
      };
      mockInventoryScans.push(scan);
      return res.status(404).json({ error: 'Product not found', scan });
    }
    
    // Get current location inventory
    const locationInventory = mockProductLocations.find(pl => 
      pl.product_id === product.id && pl.location_id === parseInt(location_id)
    );
    
    // Log successful scan
    const scan = {
      id: mockInventoryScans.length + 1,
      scan_type,
      user_id: req.user.id,
      product_id: product.id,
      upc_code: product.upc || upc_code,
      sku: product.sku,
      location_id: parseInt(location_id),
      quantity,
      status: 'success',
      error_message: null,
      session_id,
      metadata: JSON.stringify(metadata),
      scanned_at: new Date().toISOString()
    };
    mockInventoryScans.push(scan);
    
    // Log audit event
    mockWarehouseAuditLogs.push({
      id: mockWarehouseAuditLogs.length + 1,
      user_id: req.user.id,
      action: scan_type,
      resource_type: 'product',
      resource_id: product.id,
      old_value: JSON.stringify({ quantity: locationInventory?.quantity || 0 }),
      new_value: JSON.stringify({ quantity: (locationInventory?.quantity || 0) + (scan_type === 'receiving' ? quantity : -quantity) }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      session_id,
      notes: `Scanned ${scan_type} - ${quantity} units`,
      created_at: new Date().toISOString()
    });
    
    // Broadcast inventory update to all connected clients
    const totalInventory = mockProductLocations
      .filter(pl => pl.product_id === product.id)
      .reduce((sum, pl) => sum + pl.quantity, 0);
    syncManager.broadcastInventoryUpdate(product.id, totalInventory, scan_type, {
      sku: product.sku,
      location_id: parseInt(location_id),
      quantity_change: scan_type === 'receiving' ? quantity : -quantity
    });
    
    const location = mockWarehouseLocations.find(l => l.id === parseInt(location_id));
    
    res.json({
      scan_id: scan.id,
      product: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        upc: product.upc
      },
      location_id: parseInt(location_id),
      current_inventory: {
        quantity: locationInventory?.quantity || 0,
        location_code: location?.location_code
      },
      quantity_scanned: quantity,
      next_action: scan_type === 'receiving' ? 'confirm_receive' : 'complete_pick',
      expected_location: location ? {
        id: location.id,
        location_code: location.location_code,
        zone: location.zone
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get scan history
app.get("/api/warehouse/scan-history", authenticateToken, (req, res) => {
  try {
    const { session_id, user_id, scan_type, status, limit = 50 } = req.query;
    
    let scans = [...mockInventoryScans];
    
    if (session_id) {
      scans = scans.filter(s => s.session_id === session_id);
    }
    if (user_id) {
      scans = scans.filter(s => s.user_id === parseInt(user_id));
    }
    if (scan_type) {
      scans = scans.filter(s => s.scan_type === scan_type);
    }
    if (status) {
      scans = scans.filter(s => s.status === status);
    }
    
    // Sort by most recent first
    scans.sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at));
    
    // Limit results
    scans = scans.slice(0, parseInt(limit));
    
    // Enrich with product and location data
    const enrichedScans = scans.map(scan => {
      const product = mockProducts.find(p => p.id === scan.product_id);
      const location = mockWarehouseLocations.find(l => l.id === scan.location_id);
      return {
        ...scan,
        product_name: product?.name,
        product_sku: product?.sku,
        location_code: location?.location_code
      };
    });
    
    res.json({ scans: enrichedScans, total: enrichedScans.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get scan statistics
app.get("/api/warehouse/scan-stats", authenticateToken, (req, res) => {
  try {
    const { start_date, end_date, user_id } = req.query;
    
    let scans = [...mockInventoryScans];
    
    if (start_date) {
      scans = scans.filter(s => s.scanned_at >= start_date);
    }
    if (end_date) {
      scans = scans.filter(s => s.scanned_at <= end_date);
    }
    if (user_id) {
      scans = scans.filter(s => s.user_id === parseInt(user_id));
    }
    
    const stats = {
      total_scans: scans.length,
      successful_scans: scans.filter(s => s.status === 'success').length,
      error_scans: scans.filter(s => s.status === 'error').length,
      by_type: {},
      by_user: {},
      total_quantity: scans.reduce((sum, s) => sum + (s.quantity || 0), 0)
    };
    
    // Group by scan type
    scans.forEach(scan => {
      stats.by_type[scan.scan_type] = (stats.by_type[scan.scan_type] || 0) + 1;
      stats.by_user[scan.user_id] = (stats.by_user[scan.user_id] || 0) + 1;
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Receiving Module
// ============================================

// Create receiving shipment
app.post("/api/warehouse/receiving/shipments", authenticateToken, (req, res) => {
  try {
    const { supplier_id, po_number, carrier, tracking_number, expected_arrival, items } = req.body;
    
    if (!supplier_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'supplier_id and items array are required' });
    }
    
    const shipment_number = `RCV-${Date.now()}`;
    
    const newShipment = {
      id: mockReceivingShipments.length + 1,
      shipment_number,
      supplier_id: parseInt(supplier_id),
      po_number,
      carrier,
      tracking_number,
      status: 'pending',
      expected_arrival: expected_arrival || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      actual_arrival: null,
      total_items: items.length,
      items_received: 0,
      received_by: null,
      notes: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockReceivingShipments.push(newShipment);
    
    // Create receiving items
    const receivingItems = items.map(item => {
      const product = mockProducts.find(p => p.id === item.product_id || p.sku === item.sku);
      return {
        id: mockReceivingItems.length + receivingItems.length + 1,
        shipment_id: newShipment.id,
        product_id: product?.id || item.product_id,
        sku: product?.sku || item.sku,
        expected_quantity: item.quantity,
        received_quantity: 0,
        location_id: null,
        match_status: 'pending',
        condition: null,
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    mockReceivingItems.push(...receivingItems);
    
    res.status(201).json({ 
      message: 'Receiving shipment created successfully',
      shipment: newShipment,
      items: receivingItems
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get receiving shipments
app.get("/api/warehouse/receiving/shipments", authenticateToken, (req, res) => {
  try {
    const { status, supplier_id, limit = 50 } = req.query;
    
    let shipments = [...mockReceivingShipments];
    
    if (status) {
      shipments = shipments.filter(s => s.status === status);
    }
    if (supplier_id) {
      shipments = shipments.filter(s => s.supplier_id === parseInt(supplier_id));
    }
    
    // Sort by most recent first
    shipments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    shipments = shipments.slice(0, parseInt(limit));
    
    res.json({ shipments, total: shipments.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get receiving shipment details
app.get("/api/warehouse/receiving/shipments/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const shipment = mockReceivingShipments.find(s => s.id === parseInt(id));
    
    if (!shipment) {
      return res.status(404).json({ error: 'Receiving shipment not found' });
    }
    
    // Get items for this shipment
    const items = mockReceivingItems.filter(i => i.shipment_id === parseInt(id)).map(item => {
      const product = mockProducts.find(p => p.id === item.product_id);
      return {
        ...item,
        product_name: product?.name,
        product_sku: product?.sku
      };
    });
    
    res.json({ shipment, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process scan during receiving
app.post("/api/warehouse/receiving/:shipmentId/scan", authenticateToken, (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { upc_code, sku, quantity = 1, location_id, condition = 'good' } = req.body;
    
    const shipment = mockReceivingShipments.find(s => s.id === parseInt(shipmentId));
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    const product = mockProducts.find(p => 
      (upc_code && p.upc === upc_code) || 
      (sku && p.sku === sku)
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Find receiving item
    const receivingItem = mockReceivingItems.find(i => 
      i.shipment_id === parseInt(shipmentId) && i.product_id === product.id
    );
    
    if (!receivingItem) {
      return res.status(404).json({ error: 'Product not in this shipment' });
    }
    
    // Update receiving item
    receivingItem.received_quantity += quantity;
    receivingItem.location_id = parseInt(location_id);
    receivingItem.condition = condition;
    receivingItem.match_status = receivingItem.received_quantity === receivingItem.expected_quantity ? 'matched' : 
                                  receivingItem.received_quantity > receivingItem.expected_quantity ? 'excess' : 'pending';
    receivingItem.updated_at = new Date().toISOString();
    
    // Update product location
    let productLocation = mockProductLocations.find(pl => 
      pl.product_id === product.id && pl.location_id === parseInt(location_id)
    );
    
    if (productLocation) {
      productLocation.quantity += quantity;
      productLocation.updated_at = new Date().toISOString();
    } else {
      mockProductLocations.push({
        id: mockProductLocations.length + 1,
        product_id: product.id,
        location_id: parseInt(location_id),
        quantity,
        is_primary: mockProductLocations.filter(pl => pl.product_id === product.id).length === 0,
        last_counted: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    
    // Create scan record
    const scan = {
      id: mockInventoryScans.length + 1,
      scan_type: 'receiving',
      user_id: req.user.id,
      product_id: product.id,
      upc_code: product.upc,
      sku: product.sku,
      location_id: parseInt(location_id),
      quantity,
      status: 'success',
      error_message: null,
      session_id: `receiving-${shipmentId}`,
      metadata: JSON.stringify({ shipment_id: parseInt(shipmentId) }),
      scanned_at: new Date().toISOString()
    };
    mockInventoryScans.push(scan);
    
    // Update shipment status
    const allItems = mockReceivingItems.filter(i => i.shipment_id === parseInt(shipmentId));
    const receivedCount = allItems.filter(i => i.match_status !== 'pending').length;
    shipment.items_received = receivedCount;
    if (receivedCount > 0 && shipment.status === 'pending') {
      shipment.status = 'in_progress';
      if (!shipment.actual_arrival) {
        shipment.actual_arrival = new Date().toISOString();
      }
      if (!shipment.received_by) {
        shipment.received_by = req.user.id;
      }
    }
    shipment.updated_at = new Date().toISOString();
    
    res.json({
      message: 'Scan processed successfully',
      receiving_item: receivingItem,
      scan
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete receiving shipment
app.put("/api/warehouse/receiving/:shipmentId/complete", authenticateToken, (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { notes } = req.body;
    
    const shipment = mockReceivingShipments.find(s => s.id === parseInt(shipmentId));
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    shipment.status = 'completed';
    shipment.notes = notes || shipment.notes;
    shipment.updated_at = new Date().toISOString();
    
    res.json({ message: 'Receiving shipment completed', shipment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report discrepancy
app.post("/api/warehouse/receiving/:shipmentId/discrepancy", authenticateToken, (req, res) => {
  try {
    const { shipmentId } = req.params;
    const { item_id, issue_type, description } = req.body;
    
    const shipment = mockReceivingShipments.find(s => s.id === parseInt(shipmentId));
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    const receivingItem = mockReceivingItems.find(i => i.id === parseInt(item_id));
    if (!receivingItem) {
      return res.status(404).json({ error: 'Receiving item not found' });
    }
    
    receivingItem.match_status = issue_type === 'damage' ? 'damage' : 'mismatch';
    receivingItem.notes = description;
    receivingItem.updated_at = new Date().toISOString();
    
    // Log audit
    mockWarehouseAuditLogs.push({
      id: mockWarehouseAuditLogs.length + 1,
      user_id: req.user.id,
      action: 'report_discrepancy',
      resource_type: 'receiving_items',
      resource_id: receivingItem.id,
      old_value: null,
      new_value: JSON.stringify({ issue_type, description }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      session_id: `receiving-${shipmentId}`,
      notes: `Discrepancy reported: ${issue_type}`,
      created_at: new Date().toISOString()
    });
    
    res.json({ message: 'Discrepancy reported', receiving_item: receivingItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Picking Module
// ============================================

// Create pick list
app.post("/api/warehouse/pick-lists", authenticateToken, (req, res) => {
  try {
    const { order_id, assigned_to, priority = 'normal', zone } = req.body;
    
    if (!order_id) {
      return res.status(400).json({ error: 'order_id is required' });
    }
    
    const order = mockOrders.find(o => o.id === parseInt(order_id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const pick_list_number = `PICK-${Date.now()}`;
    const items = JSON.parse(order.items);
    
    const newPickList = {
      id: mockPickLists.length + 1,
      pick_list_number,
      order_id: parseInt(order_id),
      assigned_to: assigned_to ? parseInt(assigned_to) : null,
      priority,
      zone,
      status: 'pending',
      total_items: items.length,
      items_picked: 0,
      route_data: null,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockPickLists.push(newPickList);
    
    // Create pick list items
    const pickListItems = items.map((item, index) => {
      const product = mockProducts.find(p => p.id === item.productId);
      const primaryLocation = mockProductLocations.find(pl => 
        pl.product_id === item.productId && pl.is_primary
      );
      
      return {
        id: mockPickListItems.length + index + 1,
        pick_list_id: newPickList.id,
        product_id: item.productId,
        sku: product?.sku,
        location_id: primaryLocation?.location_id,
        quantity_requested: item.quantity,
        quantity_picked: 0,
        sequence_number: index + 1,
        status: 'pending',
        notes: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    });
    
    mockPickListItems.push(...pickListItems);
    
    res.status(201).json({
      message: 'Pick list created successfully',
      pick_list: newPickList,
      items: pickListItems
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pick lists
app.get("/api/warehouse/pick-lists", authenticateToken, (req, res) => {
  try {
    const { status, assigned_to, priority, zone, limit = 50 } = req.query;
    
    let pickLists = [...mockPickLists];
    
    if (status) {
      pickLists = pickLists.filter(pl => pl.status === status);
    }
    if (assigned_to) {
      pickLists = pickLists.filter(pl => pl.assigned_to === parseInt(assigned_to));
    }
    if (priority) {
      pickLists = pickLists.filter(pl => pl.priority === priority);
    }
    if (zone) {
      pickLists = pickLists.filter(pl => pl.zone === zone);
    }
    
    // Sort by priority and created date
    pickLists.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
    
    pickLists = pickLists.slice(0, parseInt(limit));
    
    res.json({ pick_lists: pickLists, total: pickLists.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pick list details
app.get("/api/warehouse/pick-lists/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const pickList = mockPickLists.find(pl => pl.id === parseInt(id));
    
    if (!pickList) {
      return res.status(404).json({ error: 'Pick list not found' });
    }
    
    // Get items for this pick list
    const items = mockPickListItems.filter(i => i.pick_list_id === parseInt(id)).map(item => {
      const product = mockProducts.find(p => p.id === item.product_id);
      const location = mockWarehouseLocations.find(l => l.id === item.location_id);
      return {
        ...item,
        product_name: product?.name,
        product_sku: product?.sku,
        location_code: location?.location_code
      };
    });
    
    res.json({ pick_list: pickList, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Process scan during picking
app.post("/api/warehouse/pick-lists/:id/scan", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { upc_code, sku, quantity = 1, location_id } = req.body;
    
    const pickList = mockPickLists.find(pl => pl.id === parseInt(id));
    if (!pickList) {
      return res.status(404).json({ error: 'Pick list not found' });
    }
    
    const product = mockProducts.find(p => 
      (upc_code && p.upc === upc_code) || 
      (sku && p.sku === sku)
    );
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Find pick list item
    const pickListItem = mockPickListItems.find(i => 
      i.pick_list_id === parseInt(id) && i.product_id === product.id
    );
    
    if (!pickListItem) {
      return res.status(404).json({ error: 'Product not in this pick list' });
    }
    
    // Update pick list item
    pickListItem.quantity_picked += quantity;
    pickListItem.status = pickListItem.quantity_picked >= pickListItem.quantity_requested ? 'picked' : 
                          pickListItem.quantity_picked > 0 ? 'short_pick' : 'pending';
    pickListItem.updated_at = new Date().toISOString();
    
    // Update product location (decrease quantity)
    const productLocation = mockProductLocations.find(pl => 
      pl.product_id === product.id && pl.location_id === parseInt(location_id)
    );
    
    if (productLocation) {
      productLocation.quantity = Math.max(0, productLocation.quantity - quantity);
      productLocation.updated_at = new Date().toISOString();
    }
    
    // Create scan record
    const scan = {
      id: mockInventoryScans.length + 1,
      scan_type: 'picking',
      user_id: req.user.id,
      product_id: product.id,
      upc_code: product.upc,
      sku: product.sku,
      location_id: parseInt(location_id),
      quantity,
      status: 'success',
      error_message: null,
      session_id: `picking-${id}`,
      metadata: JSON.stringify({ pick_list_id: parseInt(id), order_id: pickList.order_id }),
      scanned_at: new Date().toISOString()
    };
    mockInventoryScans.push(scan);
    
    // Update pick list status
    const allItems = mockPickListItems.filter(i => i.pick_list_id === parseInt(id));
    const pickedCount = allItems.filter(i => i.status === 'picked').length;
    pickList.items_picked = pickedCount;
    if (pickList.status === 'pending' && pickedCount > 0) {
      pickList.status = 'in_progress';
      pickList.started_at = new Date().toISOString();
    }
    pickList.updated_at = new Date().toISOString();
    
    res.json({
      message: 'Scan processed successfully',
      pick_list_item: pickListItem,
      scan
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete pick list
app.put("/api/warehouse/pick-lists/:id/complete", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const pickList = mockPickLists.find(pl => pl.id === parseInt(id));
    if (!pickList) {
      return res.status(404).json({ error: 'Pick list not found' });
    }
    
    pickList.status = 'completed';
    pickList.completed_at = new Date().toISOString();
    pickList.updated_at = new Date().toISOString();
    
    res.json({ message: 'Pick list completed', pick_list: pickList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get suggested route
app.get("/api/warehouse/pick-lists/:id/suggested-route", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const pickList = mockPickLists.find(pl => pl.id === parseInt(id));
    
    if (!pickList) {
      return res.status(404).json({ error: 'Pick list not found' });
    }
    
    // Get pick list items with locations
    const items = mockPickListItems.filter(i => i.pick_list_id === parseInt(id)).map(item => {
      const location = mockWarehouseLocations.find(l => l.id === item.location_id);
      return { ...item, location };
    });
    
    // Sort by zone, aisle, shelf, position
    const sortedItems = items.sort((a, b) => {
      if (a.location?.zone !== b.location?.zone) {
        return (a.location?.zone || '').localeCompare(b.location?.zone || '');
      }
      if (a.location?.aisle !== b.location?.aisle) {
        return (a.location?.aisle || '').localeCompare(b.location?.aisle || '');
      }
      if (a.location?.shelf !== b.location?.shelf) {
        return (a.location?.shelf || '').localeCompare(b.location?.shelf || '');
      }
      return (a.location?.position || '').localeCompare(b.location?.position || '');
    });
    
    // Update sequence numbers
    sortedItems.forEach((item, index) => {
      const pickListItem = mockPickListItems.find(i => i.id === item.id);
      if (pickListItem) {
        pickListItem.sequence_number = index + 1;
      }
    });
    
    const route = sortedItems.map((item, index) => ({
      sequence: index + 1,
      location_id: item.location_id,
      location_code: item.location?.location_code,
      product_id: item.product_id,
      sku: item.sku,
      quantity: item.quantity_requested
    }));
    
    // Update pick list route data
    pickList.route_data = JSON.stringify(route);
    pickList.updated_at = new Date().toISOString();
    
    res.json({ route });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Inventory Module
// ============================================

// Get real-time inventory
app.get("/api/warehouse/inventory", authenticateToken, (req, res) => {
  try {
    const { product_id, location_id, zone, low_stock } = req.query;
    
    let inventory = [...mockProductLocations];
    
    if (product_id) {
      inventory = inventory.filter(i => i.product_id === parseInt(product_id));
    }
    if (location_id) {
      inventory = inventory.filter(i => i.location_id === parseInt(location_id));
    }
    if (zone) {
      inventory = inventory.filter(i => {
        const location = mockWarehouseLocations.find(l => l.id === i.location_id);
        return location?.zone === zone;
      });
    }
    
    // Enrich with product and location data
    const enrichedInventory = inventory.map(inv => {
      const product = mockProducts.find(p => p.id === inv.product_id);
      const location = mockWarehouseLocations.find(l => l.id === inv.location_id);
      return {
        ...inv,
        product_name: product?.name,
        product_sku: product?.sku,
        location_code: location?.location_code,
        zone: location?.zone
      };
    });
    
    // Filter by low stock if requested
    let results = enrichedInventory;
    if (low_stock === 'true') {
      results = results.filter(inv => inv.quantity < 50);
    }
    
    res.json({ inventory: results, total: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory by location
app.get("/api/warehouse/inventory/by-location/:locationId", authenticateToken, (req, res) => {
  try {
    const { locationId } = req.params;
    
    const location = mockWarehouseLocations.find(l => l.id === parseInt(locationId));
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const inventory = mockProductLocations.filter(i => i.location_id === parseInt(locationId)).map(inv => {
      const product = mockProducts.find(p => p.id === inv.product_id);
      return {
        ...inv,
        product_name: product?.name,
        product_sku: product?.sku,
        product_category: product?.category
      };
    });
    
    res.json({ location, inventory, total_items: inventory.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manual inventory adjustment
app.post("/api/warehouse/inventory/adjust", authenticateToken, (req, res) => {
  try {
    const { product_id, location_id, quantity, reason } = req.body;
    
    if (!product_id || !location_id || quantity === undefined) {
      return res.status(400).json({ error: 'product_id, location_id, and quantity are required' });
    }
    
    let productLocation = mockProductLocations.find(pl => 
      pl.product_id === parseInt(product_id) && pl.location_id === parseInt(location_id)
    );
    
    const oldQuantity = productLocation?.quantity || 0;
    
    if (productLocation) {
      productLocation.quantity = parseInt(quantity);
      productLocation.updated_at = new Date().toISOString();
    } else {
      productLocation = {
        id: mockProductLocations.length + 1,
        product_id: parseInt(product_id),
        location_id: parseInt(location_id),
        quantity: parseInt(quantity),
        is_primary: false,
        last_counted: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockProductLocations.push(productLocation);
    }
    
    // Log audit
    mockWarehouseAuditLogs.push({
      id: mockWarehouseAuditLogs.length + 1,
      user_id: req.user.id,
      action: 'adjust',
      resource_type: 'product',
      resource_id: parseInt(product_id),
      old_value: JSON.stringify({ quantity: oldQuantity }),
      new_value: JSON.stringify({ quantity: parseInt(quantity) }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      session_id: null,
      notes: reason || 'Manual inventory adjustment',
      created_at: new Date().toISOString()
    });
    
    res.json({ message: 'Inventory adjusted successfully', product_location: productLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory discrepancies
app.get("/api/warehouse/inventory/discrepancies", authenticateToken, (req, res) => {
  try {
    // Find receiving items with mismatches
    const discrepancies = mockReceivingItems.filter(i => 
      i.match_status === 'mismatch' || i.match_status === 'damage' || i.match_status === 'excess'
    ).map(item => {
      const shipment = mockReceivingShipments.find(s => s.id === item.shipment_id);
      const product = mockProducts.find(p => p.id === item.product_id);
      return {
        type: 'receiving',
        shipment_number: shipment?.shipment_number,
        product_name: product?.name,
        product_sku: product?.sku,
        expected: item.expected_quantity,
        actual: item.received_quantity,
        status: item.match_status,
        notes: item.notes,
        created_at: item.created_at
      };
    });
    
    res.json({ discrepancies, total: discrepancies.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Locations Module
// ============================================

// Create location
app.post("/api/warehouse/locations", authenticateToken, (req, res) => {
  try {
    const { location_code, aisle, shelf, position, zone, location_type = 'standard', capacity = 200 } = req.body;
    
    if (!location_code || !zone) {
      return res.status(400).json({ error: 'location_code and zone are required' });
    }
    
    // Check if location code already exists
    if (mockWarehouseLocations.find(l => l.location_code === location_code)) {
      return res.status(400).json({ error: 'Location code already exists' });
    }
    
    const newLocation = {
      id: mockWarehouseLocations.length + 1,
      location_code,
      aisle,
      shelf,
      position,
      zone,
      location_type,
      capacity: parseInt(capacity),
      current_capacity: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockWarehouseLocations.push(newLocation);
    
    // Log audit
    mockWarehouseAuditLogs.push({
      id: mockWarehouseAuditLogs.length + 1,
      user_id: req.user.id,
      action: 'create_location',
      resource_type: 'warehouse_locations',
      resource_id: newLocation.id,
      old_value: null,
      new_value: JSON.stringify({ location_code, zone, location_type }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      session_id: null,
      notes: 'Created new warehouse location',
      created_at: new Date().toISOString()
    });
    
    res.status(201).json({ message: 'Location created successfully', location: newLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get locations
app.get("/api/warehouse/locations", authenticateToken, (req, res) => {
  try {
    const { zone, location_type, is_active } = req.query;
    
    let locations = [...mockWarehouseLocations];
    
    if (zone) {
      locations = locations.filter(l => l.zone === zone);
    }
    if (location_type) {
      locations = locations.filter(l => l.location_type === location_type);
    }
    if (is_active !== undefined) {
      locations = locations.filter(l => l.is_active === (is_active === 'true'));
    }
    
    // Sort by location code
    locations.sort((a, b) => a.location_code.localeCompare(b.location_code));
    
    res.json({ locations, total: locations.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single location
app.get("/api/warehouse/locations/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const location = mockWarehouseLocations.find(l => l.id === parseInt(id) || l.location_code === id);
    
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    // Get inventory at this location
    const inventory = mockProductLocations.filter(pl => pl.location_id === location.id).map(inv => {
      const product = mockProducts.find(p => p.id === inv.product_id);
      return {
        ...inv,
        product_name: product?.name,
        product_sku: product?.sku
      };
    });
    
    res.json({ location, inventory, total_products: inventory.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update location
app.put("/api/warehouse/locations/:id", authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const location = mockWarehouseLocations.find(l => l.id === parseInt(id));
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const allowedFields = ['aisle', 'shelf', 'position', 'zone', 'location_type', 'capacity', 'is_active'];
    const oldValue = { ...location };
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        location[field] = updates[field];
      }
    });
    
    location.updated_at = new Date().toISOString();
    
    // Log audit
    mockWarehouseAuditLogs.push({
      id: mockWarehouseAuditLogs.length + 1,
      user_id: req.user.id,
      action: 'update_location',
      resource_type: 'warehouse_locations',
      resource_id: location.id,
      old_value: JSON.stringify(oldValue),
      new_value: JSON.stringify(location),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.get('user-agent') || '',
      session_id: null,
      notes: 'Updated warehouse location',
      created_at: new Date().toISOString()
    });
    
    res.json({ message: 'Location updated successfully', location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Analytics & Reports
// ============================================

// Get warehouse dashboard KPIs
app.get("/api/warehouse/dashboard", authenticateToken, (req, res) => {
  try {
    // Calculate KPIs
    const totalLocations = mockWarehouseLocations.filter(l => l.is_active).length;
    const totalInventoryItems = mockProductLocations.reduce((sum, pl) => sum + pl.quantity, 0);
    const totalScansToday = mockInventoryScans.filter(s => 
      s.scanned_at.startsWith(new Date().toISOString().split('T')[0])
    ).length;
    
    const activeReceiving = mockReceivingShipments.filter(s => s.status === 'in_progress').length;
    const activePicking = mockPickLists.filter(pl => pl.status === 'in_progress').length;
    const pendingShipments = mockReceivingShipments.filter(s => s.status === 'pending').length;
    
    // Low stock items
    const lowStockItems = mockProductLocations.filter(pl => pl.quantity < 50).length;
    
    // Recent activity
    const recentScans = mockInventoryScans.slice(-10).reverse();
    const recentAudit = mockWarehouseAuditLogs.slice(-10).reverse();
    
    res.json({
      kpis: {
        total_locations: totalLocations,
        total_inventory_items: totalInventoryItems,
        scans_today: totalScansToday,
        active_receiving: activeReceiving,
        active_picking: activePicking,
        pending_shipments: pendingShipments,
        low_stock_items: lowStockItems
      },
      recent_scans: recentScans,
      recent_activity: recentAudit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit log
app.get("/api/warehouse/reports/audit-log", authenticateToken, (req, res) => {
  try {
    const { user_id, action, resource_type, start_date, end_date, limit = 100 } = req.query;
    
    let logs = [...mockWarehouseAuditLogs];
    
    if (user_id) {
      logs = logs.filter(l => l.user_id === parseInt(user_id));
    }
    if (action) {
      logs = logs.filter(l => l.action === action);
    }
    if (resource_type) {
      logs = logs.filter(l => l.resource_type === resource_type);
    }
    if (start_date) {
      logs = logs.filter(l => l.created_at >= start_date);
    }
    if (end_date) {
      logs = logs.filter(l => l.created_at <= end_date);
    }
    
    // Sort by most recent first
    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    logs = logs.slice(0, parseInt(limit));
    
    // Enrich with user data
    const enrichedLogs = logs.map(log => {
      const user = mockUsers.find(u => u.id === log.user_id);
      return {
        ...log,
        user_name: user?.name,
        user_email: user?.email
      };
    });
    
    res.json({ audit_logs: enrichedLogs, total: enrichedLogs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get inventory aging report
app.get("/api/warehouse/reports/inventory-aging", authenticateToken, (req, res) => {
  try {
    const inventory = mockProductLocations.map(pl => {
      const product = mockProducts.find(p => p.id === pl.product_id);
      const location = mockWarehouseLocations.find(l => l.id === pl.location_id);
      const daysSinceLastCount = Math.floor((new Date() - new Date(pl.last_counted)) / (1000 * 60 * 60 * 24));
      
      return {
        product_id: pl.product_id,
        product_name: product?.name,
        product_sku: product?.sku,
        location_code: location?.location_code,
        quantity: pl.quantity,
        last_counted: pl.last_counted,
        days_since_count: daysSinceLastCount,
        aging_category: daysSinceLastCount < 7 ? 'fresh' : 
                       daysSinceLastCount < 30 ? 'recent' : 
                       daysSinceLastCount < 90 ? 'aging' : 'old'
      };
    });
    
    res.json({ inventory_aging: inventory, total: inventory.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get SKU velocity (ABC analysis)
app.get("/api/warehouse/reports/sku-velocity", authenticateToken, (req, res) => {
  try {
    // Calculate movement based on scans
    const skuActivity = {};
    
    mockInventoryScans.forEach(scan => {
      if (scan.product_id) {
        if (!skuActivity[scan.product_id]) {
          skuActivity[scan.product_id] = { scans: 0, total_quantity: 0 };
        }
        skuActivity[scan.product_id].scans += 1;
        skuActivity[scan.product_id].total_quantity += scan.quantity;
      }
    });
    
    const velocity = Object.keys(skuActivity).map(productId => {
      const product = mockProducts.find(p => p.id === parseInt(productId));
      const activity = skuActivity[productId];
      
      return {
        product_id: parseInt(productId),
        product_name: product?.name,
        product_sku: product?.sku,
        total_scans: activity.scans,
        total_quantity_moved: activity.total_quantity,
        velocity_score: activity.scans * activity.total_quantity
      };
    });
    
    // Sort by velocity score
    velocity.sort((a, b) => b.velocity_score - a.velocity_score);
    
    // Assign ABC classification
    const total = velocity.length;
    velocity.forEach((item, index) => {
      const percentile = (index / total) * 100;
      item.classification = percentile < 20 ? 'A' : percentile < 50 ? 'B' : 'C';
    });
    
    res.json({ sku_velocity: velocity, total: velocity.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get worker productivity
app.get("/api/warehouse/reports/worker-productivity", authenticateToken, (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    let scans = [...mockInventoryScans];
    
    if (start_date) {
      scans = scans.filter(s => s.scanned_at >= start_date);
    }
    if (end_date) {
      scans = scans.filter(s => s.scanned_at <= end_date);
    }
    
    // Group by user
    const userActivity = {};
    
    scans.forEach(scan => {
      if (!userActivity[scan.user_id]) {
        userActivity[scan.user_id] = {
          total_scans: 0,
          successful_scans: 0,
          error_scans: 0,
          total_items: 0,
          by_type: {}
        };
      }
      
      userActivity[scan.user_id].total_scans += 1;
      if (scan.status === 'success') {
        userActivity[scan.user_id].successful_scans += 1;
        userActivity[scan.user_id].total_items += scan.quantity;
      } else {
        userActivity[scan.user_id].error_scans += 1;
      }
      
      userActivity[scan.user_id].by_type[scan.scan_type] = 
        (userActivity[scan.user_id].by_type[scan.scan_type] || 0) + 1;
    });
    
    // Enrich with user data
    const productivity = Object.keys(userActivity).map(userId => {
      const user = mockUsers.find(u => u.id === parseInt(userId));
      const activity = userActivity[userId];
      
      return {
        user_id: parseInt(userId),
        user_name: user?.name,
        employee_id: user?.employee_id,
        total_scans: activity.total_scans,
        successful_scans: activity.successful_scans,
        error_scans: activity.error_scans,
        success_rate: ((activity.successful_scans / activity.total_scans) * 100).toFixed(1),
        total_items_processed: activity.total_items,
        scans_by_type: activity.by_type
      };
    });
    
    // Sort by total scans
    productivity.sort((a, b) => b.total_scans - a.total_scans);
    
    res.json({ worker_productivity: productivity, total: productivity.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get performance trends
app.get("/api/warehouse/reports/performance-trends", authenticateToken, (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    const scans = mockInventoryScans.filter(s => new Date(s.scanned_at) >= daysAgo);
    
    // Group by date
    const dailyStats = {};
    
    scans.forEach(scan => {
      const date = scan.scanned_at.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          total_scans: 0,
          successful_scans: 0,
          total_items: 0,
          receiving: 0,
          picking: 0,
          other: 0
        };
      }
      
      dailyStats[date].total_scans += 1;
      if (scan.status === 'success') {
        dailyStats[date].successful_scans += 1;
        dailyStats[date].total_items += scan.quantity;
      }
      
      if (scan.scan_type === 'receiving') {
        dailyStats[date].receiving += 1;
      } else if (scan.scan_type === 'picking') {
        dailyStats[date].picking += 1;
      } else {
        dailyStats[date].other += 1;
      }
    });
    
    const trends = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
    
    res.json({ performance_trends: trends, total_days: trends.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get location utilization
app.get("/api/warehouse/reports/location-utilization", authenticateToken, (req, res) => {
  try {
    const { zone } = req.query;
    
    let locations = [...mockWarehouseLocations];
    
    if (zone) {
      locations = locations.filter(l => l.zone === zone);
    }
    
    const utilization = locations.filter(l => l.is_active).map(location => {
      const inventory = mockProductLocations.filter(pl => pl.location_id === location.id);
      const totalItems = inventory.reduce((sum, pl) => sum + pl.quantity, 0);
      const utilizationPct = location.capacity > 0 ? ((totalItems / location.capacity) * 100).toFixed(1) : 0;
      
      return {
        location_id: location.id,
        location_code: location.location_code,
        zone: location.zone,
        location_type: location.location_type,
        capacity: location.capacity,
        current_items: totalItems,
        utilization_percentage: parseFloat(utilizationPct),
        unique_products: inventory.length,
        status: utilizationPct > 90 ? 'full' : utilizationPct > 70 ? 'high' : utilizationPct > 40 ? 'medium' : 'low'
      };
    });
    
    // Sort by utilization percentage
    utilization.sort((a, b) => b.utilization_percentage - a.utilization_percentage);
    
    res.json({ location_utilization: utilization, total: utilization.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SHIPPING ACCOUNT MANAGEMENT API (Phase 5)
// ============================================

// Mock shipping accounts data
let mockShippingAccounts = [
  {
    id: 1,
    supplier_id: 1,
    carrier: 'UPS',
    account_number: 'ENCRYPTED_UPS_123456',
    account_number_masked: '*****456',
    password: 'ENCRYPTED_PASSWORD_UPS',
    meter_number: 'UPS_METER_001',
    api_key: 'ENCRYPTED_API_KEY_UPS',
    status: 'active',
    last_verified: '2026-02-15T10:30:00Z',
    connected_at: '2026-01-20T08:00:00Z',
    verified_by: 1,
    created_at: '2026-01-20T08:00:00Z',
    updated_at: '2026-02-15T10:30:00Z'
  },
  {
    id: 2,
    supplier_id: 1,
    carrier: 'USPS',
    account_number: 'ENCRYPTED_USPS_789012',
    account_number_masked: '*****012',
    password: 'ENCRYPTED_PASSWORD_USPS',
    meter_number: null,
    api_key: 'ENCRYPTED_API_KEY_USPS',
    status: 'active',
    last_verified: '2026-02-10T14:15:00Z',
    connected_at: '2026-02-01T09:30:00Z',
    verified_by: 1,
    created_at: '2026-02-01T09:30:00Z',
    updated_at: '2026-02-10T14:15:00Z'
  }
];

// Mock print queue data
let mockPrintQueue = [
  {
    id: 1,
    order_id: 1,
    label_id: 'LBL-001',
    carrier: 'UPS',
    tracking_number: 'FDX555666777',
    service_type: 'ground',
    label_url: '/uploads/labels/label_1_ups.pdf',
    printer_name: null,
    status: 'ready_to_print',
    created_by: 1,
    created_at: '2026-02-16T10:00:00Z',
    printed_at: null,
    printed_by: null
  },
  {
    id: 2,
    order_id: 2,
    label_id: 'LBL-002',
    carrier: 'USPS',
    tracking_number: 'USPS987654321',
    service_type: 'priority_mail',
    label_url: '/uploads/labels/label_2_usps.pdf',
    printer_name: null,
    status: 'ready_to_print',
    created_by: 1,
    created_at: '2026-02-16T11:30:00Z',
    printed_at: null,
    printed_by: null
  }
];

// Add supplier shipping account
app.post("/api/suppliers/:supplierId/shipping/account", authenticateToken, (req, res) => {
  try {
    const { supplierId } = req.params;
    const { carrier, account_number, password, meter_number, api_key } = req.body;
    
    // Verify supplier ownership
    if (parseInt(supplierId) !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to add accounts for this supplier' });
    }
    
    if (!carrier || !account_number) {
      return res.status(400).json({ error: 'carrier and account_number are required' });
    }
    
    if (!['UPS', 'USPS'].includes(carrier)) {
      return res.status(400).json({ error: 'carrier must be UPS or USPS' });
    }
    
    // Check for duplicate carrier account
    const existing = mockShippingAccounts.find(a => 
      a.supplier_id === parseInt(supplierId) && a.carrier === carrier
    );
    if (existing) {
      return res.status(409).json({ error: `${carrier} account already exists for this supplier` });
    }
    
    const newAccount = {
      id: mockShippingAccounts.length + 1,
      supplier_id: parseInt(supplierId),
      carrier,
      account_number: `ENCRYPTED_${carrier}_${account_number}`,
      account_number_masked: '*****' + account_number.slice(-3),
      password: `ENCRYPTED_PASSWORD_${carrier}`,
      meter_number: meter_number || null,
      api_key: `ENCRYPTED_API_KEY_${carrier}`,
      status: 'pending_verification',
      last_verified: null,
      connected_at: new Date().toISOString(),
      verified_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockShippingAccounts.push(newAccount);
    
    res.status(201).json({
      message: `${carrier} account added successfully. Verification pending.`,
      account: {
        id: newAccount.id,
        carrier: newAccount.carrier,
        account_number_masked: newAccount.account_number_masked,
        status: newAccount.status,
        connected_at: newAccount.connected_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get supplier shipping accounts
app.get("/api/suppliers/:supplierId/shipping/accounts", authenticateToken, (req, res) => {
  try {
    const { supplierId } = req.params;
    
    // Verify supplier ownership or admin
    if (parseInt(supplierId) !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view accounts for this supplier' });
    }
    
    const accounts = mockShippingAccounts
      .filter(a => a.supplier_id === parseInt(supplierId))
      .map(a => ({
        id: a.id,
        carrier: a.carrier,
        status: a.status,
        account_number_masked: a.account_number_masked,
        last_verified: a.last_verified,
        connected_at: a.connected_at,
        meter_number: a.meter_number
      }));
    
    res.json({
      supplier_id: parseInt(supplierId),
      accounts,
      total: accounts.length,
      active_carriers: accounts.filter(a => a.status === 'active').map(a => a.carrier)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update supplier shipping account
app.put("/api/suppliers/:supplierId/shipping/account/:accountId", authenticateToken, (req, res) => {
  try {
    const { supplierId, accountId } = req.params;
    const { account_number, password, meter_number } = req.body;
    
    if (parseInt(supplierId) !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update accounts' });
    }
    
    const account = mockShippingAccounts.find(a => 
      a.id === parseInt(accountId) && a.supplier_id === parseInt(supplierId)
    );
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (account_number) {
      account.account_number = `ENCRYPTED_${account.carrier}_${account_number}`;
      account.account_number_masked = '*****' + account_number.slice(-3);
    }
    if (password) {
      account.password = `ENCRYPTED_PASSWORD_${account.carrier}`;
    }
    if (meter_number !== undefined) {
      account.meter_number = meter_number;
    }
    
    account.status = 'pending_verification';
    account.last_verified = null;
    account.verified_by = null;
    account.updated_at = new Date().toISOString();
    
    res.json({
      message: 'Account updated. Verification required.',
      account: {
        id: account.id,
        carrier: account.carrier,
        status: account.status,
        account_number_masked: account.account_number_masked
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete supplier shipping account
app.delete("/api/suppliers/:supplierId/shipping/account/:accountId", authenticateToken, (req, res) => {
  try {
    const { supplierId, accountId } = req.params;
    
    if (parseInt(supplierId) !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete accounts' });
    }
    
    const accountIndex = mockShippingAccounts.findIndex(a => 
      a.id === parseInt(accountId) && a.supplier_id === parseInt(supplierId)
    );
    
    if (accountIndex === -1) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    const deleted = mockShippingAccounts.splice(accountIndex, 1)[0];
    
    res.json({
      message: `${deleted.carrier} account deleted successfully`,
      carrier: deleted.carrier
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify shipping account (admin only)
app.post("/api/suppliers/:supplierId/shipping/account/:accountId/verify", authenticateToken, (req, res) => {
  try {
    const { supplierId, accountId } = req.params;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can verify accounts' });
    }
    
    const account = mockShippingAccounts.find(a => 
      a.id === parseInt(accountId) && a.supplier_id === parseInt(supplierId)
    );
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    account.status = 'active';
    account.last_verified = new Date().toISOString();
    account.verified_by = req.user.userId;
    
    res.json({
      message: `${account.carrier} account verified successfully`,
      account: {
        id: account.id,
        carrier: account.carrier,
        status: account.status,
        last_verified: account.last_verified
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LABEL GENERATION & PRINT QUEUE API
// ============================================

// Generate shipping label (triggered when warehouse marks order as ready_to_ship)
app.post("/api/orders/:orderId/shipping/label/generate", authenticateToken, (req, res) => {
  try {
    const { orderId } = req.params;
    const { carrier, service_type, weight = 1.0 } = req.body;
    
    const order = mockOrders.find(o => o.id === parseInt(orderId));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    if (!carrier || !['UPS', 'USPS'].includes(carrier)) {
      return res.status(400).json({ error: 'Valid carrier (UPS/USPS) is required' });
    }
    
    // Check if supplier has active account for carrier
    const shippingAccount = mockShippingAccounts.find(a => 
      a.supplier_id === order.supplier_id && a.carrier === carrier && a.status === 'active'
    );
    
    if (!shippingAccount) {
      return res.status(400).json({ 
        error: `Supplier does not have an active ${carrier} account. Please add and verify shipping account first.` 
      });
    }
    
    // Check for existing label
    const existingLabel = mockPrintQueue.find(l => l.order_id === parseInt(orderId));
    if (existingLabel) {
      return res.status(409).json({ error: 'Label already exists for this order' });
    }
    
    // Generate tracking number (mock)
    let trackingNumber = '';
    if (carrier === 'UPS') {
      trackingNumber = '1Z' + Math.random().toString(36).substring(2, 18).toUpperCase();
    } else if (carrier === 'USPS') {
      trackingNumber = '9' + Array(20).fill(0).map(() => Math.floor(Math.random() * 10)).join('');
    }
    
    // Create label
    const newLabel = {
      id: mockPrintQueue.length + 1,
      order_id: parseInt(orderId),
      label_id: `LBL-${Date.now()}`,
      carrier,
      tracking_number: trackingNumber,
      service_type: service_type || 'ground',
      label_url: `/uploads/labels/label_${orderId}_${carrier.toLowerCase()}.pdf`,
      printer_name: null,
      status: 'ready_to_print',
      created_by: req.user.userId,
      created_at: new Date().toISOString(),
      printed_at: null,
      printed_by: null
    };
    
    mockPrintQueue.push(newLabel);
    
    // Update order with tracking info
    order.carrier = carrier;
    order.tracking_number = trackingNumber;
    order.label_url = newLabel.label_url;
    
    res.status(201).json({
      message: 'Shipping label generated successfully',
      label: {
        id: newLabel.id,
        order_id: newLabel.order_id,
        label_id: newLabel.label_id,
        carrier: newLabel.carrier,
        tracking_number: newLabel.tracking_number,
        service_type: newLabel.service_type,
        status: newLabel.status,
        label_url: newLabel.label_url
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get print queue for warehouse
app.get("/api/warehouse/shipping-labels/queue", authenticateToken, (req, res) => {
  try {
    const { status, carrier, limit = 50 } = req.query;
    
    let labels = [...mockPrintQueue];
    
    if (status) {
      labels = labels.filter(l => l.status === status);
    }
    if (carrier) {
      labels = labels.filter(l => l.carrier === carrier);
    }
    
    // Sort by most recent first
    labels.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    labels = labels.slice(0, parseInt(limit));
    
    // Enrich with order and retailer info
    const enriched = labels.map(label => {
      const order = mockOrders.find(o => o.id === label.order_id);
      const retailer = order ? mockUsers.find(u => u.id === order.retailer_id) : null;
      
      return {
        ...label,
        retailer_name: retailer?.name || 'Unknown',
        printer_status: label.status === 'ready_to_print' ? 'Ready' : 
                       label.status === 'printed' ? 'Complete' : 'Pending'
      };
    });
    
    res.json({
      queue: enriched,
      total: enriched.length,
      ready_to_print: enriched.filter(l => l.status === 'ready_to_print').length,
      printed: enriched.filter(l => l.status === 'printed').length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark label as printed
app.post("/api/warehouse/shipping-labels/:labelId/printed", authenticateToken, (req, res) => {
  try {
    const { labelId } = req.params;
    const { printer_name } = req.body;
    
    const label = mockPrintQueue.find(l => l.id === parseInt(labelId));
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }
    
    label.status = 'printed';
    label.printed_at = new Date().toISOString();
    label.printed_by = req.user.userId;
    if (printer_name) {
      label.printer_name = printer_name;
    }
    
    res.json({
      message: 'Label marked as printed',
      label: {
        id: label.id,
        order_id: label.order_id,
        tracking_number: label.tracking_number,
        status: label.status,
        printed_at: label.printed_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get label details
app.get("/api/warehouse/shipping-labels/:labelId", authenticateToken, (req, res) => {
  try {
    const { labelId } = req.params;
    
    const label = mockPrintQueue.find(l => l.id === parseInt(labelId));
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }
    
    const order = mockOrders.find(o => o.id === label.order_id);
    const retailer = order ? mockUsers.find(u => u.id === order.retailer_id) : null;
    
    res.json({
      label: {
        id: label.id,
        order_id: label.order_id,
        label_id: label.label_id,
        carrier: label.carrier,
        tracking_number: label.tracking_number,
        service_type: label.service_type,
        status: label.status,
        label_url: label.label_url,
        created_at: label.created_at,
        printed_at: label.printed_at
      },
      order: {
        id: order?.id,
        retailer_name: retailer?.name,
        retailer_email: retailer?.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get labels for specific order
app.get("/api/orders/:orderId/shipping/labels", authenticateToken, (req, res) => {
  try {
    const { orderId } = req.params;
    
    const labels = mockPrintQueue.filter(l => l.order_id === parseInt(orderId));
    
    res.json({
      order_id: parseInt(orderId),
      labels,
      total: labels.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// Server Startup
// ============================================

const server = http.createServer(app);

// Initialize WebSocket for real-time warehouse sync
syncManager.initialize(server);

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log(`Health check: /health`);
  console.log(`API documentation: /`);
  console.log(`WebSocket sync manager ready on ws://localhost:${PORT}`);
});
