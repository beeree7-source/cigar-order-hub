-- Supplier metrics table
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
);

-- Supplier payment history table
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
);
