-- Invoices table
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
);
