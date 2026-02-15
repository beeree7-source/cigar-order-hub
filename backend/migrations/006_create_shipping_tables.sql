-- Shipping Integration Tables
-- Creates tables for UPS and USPS shipping integration

-- Supplier shipping accounts table
CREATE TABLE IF NOT EXISTS supplier_shipping_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  carrier TEXT NOT NULL CHECK(carrier IN ('UPS', 'USPS')),
  account_number TEXT NOT NULL,
  password TEXT,
  meter_number TEXT,
  api_key TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'expired', 'pending_verification')),
  last_verified DATETIME,
  connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(supplier_id, carrier)
);

-- Shipment tracking table
CREATE TABLE IF NOT EXISTS shipment_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  carrier TEXT NOT NULL CHECK(carrier IN ('UPS', 'USPS')),
  tracking_number TEXT UNIQUE NOT NULL,
  label_url TEXT,
  label_id TEXT,
  status TEXT DEFAULT 'label_generated' CHECK(status IN ('label_generated', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception')),
  current_location TEXT,
  estimated_delivery DATETIME,
  actual_delivery DATETIME,
  weight REAL,
  service_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_tracked DATETIME,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Shipment events table
CREATE TABLE IF NOT EXISTS shipment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracking_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  location TEXT,
  timestamp DATETIME NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tracking_id) REFERENCES shipment_tracking(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_supplier_shipping_accounts_supplier_id ON supplier_shipping_accounts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_shipping_accounts_carrier ON supplier_shipping_accounts(carrier);
CREATE INDEX IF NOT EXISTS idx_supplier_shipping_accounts_status ON supplier_shipping_accounts(status);

CREATE INDEX IF NOT EXISTS idx_shipment_tracking_order_id ON shipment_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_carrier ON shipment_tracking(carrier);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_tracking_number ON shipment_tracking(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_status ON shipment_tracking(status);
CREATE INDEX IF NOT EXISTS idx_shipment_tracking_created_at ON shipment_tracking(created_at);

CREATE INDEX IF NOT EXISTS idx_shipment_events_tracking_id ON shipment_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_event_type ON shipment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_shipment_events_timestamp ON shipment_events(timestamp);
