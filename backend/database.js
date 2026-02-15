const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "cigar-hub.db");
const db = new sqlite3.Database(dbPath);

// Create users table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('retailer', 'supplier')) NOT NULL,
      approved BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      retailer_id INTEGER,
      supplier_id INTEGER,
      items TEXT NOT NULL,  -- JSON string
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(retailer_id) REFERENCES users(id)
    )
  `);

  // Create licenses table
  db.run(`
    CREATE TABLE IF NOT EXISTS licenses (
      id INTEGER PRIMARY KEY,
      user_id INTEGER,
      license_number TEXT,
      expiration_date TEXT,
      file_name TEXT,
      verified BOOLEAN DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplierId INTEGER,
      name TEXT,
      sku TEXT UNIQUE,
      price REAL,
      stock INTEGER,
      imageUrl TEXT,
      description TEXT,
      FOREIGN KEY(supplierId) REFERENCES users(id)
    )
  `);

  // Create stock_history table for inventory tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS stock_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      user_id INTEGER,
      adjustment INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create notifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      subject TEXT,
      body TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'sent',
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create notification_settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      email_alerts BOOLEAN DEFAULT 1,
      sms_alerts BOOLEAN DEFAULT 0,
      low_stock_alert BOOLEAN DEFAULT 1,
      order_confirmation BOOLEAN DEFAULT 1,
      shipment_notification BOOLEAN DEFAULT 1,
      payment_reminder BOOLEAN DEFAULT 1,
      weekly_summary BOOLEAN DEFAULT 1,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Create invoices table
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER UNIQUE,
      invoice_number TEXT UNIQUE NOT NULL,
      total REAL NOT NULL,
      tax REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      due_date TEXT,
      status TEXT DEFAULT 'unpaid',
      payment_terms TEXT DEFAULT 'Net 30',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    )
  `);

  // Create quickbooks_config table
  db.run(`
    CREATE TABLE IF NOT EXISTS quickbooks_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT UNIQUE,
      access_token TEXT,
      refresh_token TEXT,
      realm_id TEXT,
      sync_status TEXT DEFAULT 'not_connected',
      last_sync DATETIME,
      token_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create qb_sync_log table
  db.run(`
    CREATE TABLE IF NOT EXISTS qb_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      items_synced INTEGER DEFAULT 0,
      last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create account_mapping table
  db.run(`
    CREATE TABLE IF NOT EXISTS account_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_account TEXT NOT NULL,
      qb_account_id TEXT,
      qb_account_name TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create supplier_metrics table
  db.run(`
    CREATE TABLE IF NOT EXISTS supplier_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER UNIQUE,
      total_orders INTEGER DEFAULT 0,
      on_time_deliveries INTEGER DEFAULT 0,
      total_deliveries INTEGER DEFAULT 0,
      on_time_percentage REAL DEFAULT 100.0,
      quality_rating REAL DEFAULT 5.0,
      total_revenue REAL DEFAULT 0,
      outstanding_balance REAL DEFAULT 0,
      credit_limit REAL DEFAULT 0,
      payment_terms TEXT DEFAULT 'Net 30',
      last_order_date DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(supplier_id) REFERENCES users(id)
    )
  `);

  // Create supplier_payments table
  db.run(`
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      order_id INTEGER,
      amount REAL NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      payment_method TEXT,
      reference_number TEXT,
      notes TEXT,
      FOREIGN KEY(supplier_id) REFERENCES users(id),
      FOREIGN KEY(order_id) REFERENCES orders(id)
    )
  `);
});

module.exports = db;
