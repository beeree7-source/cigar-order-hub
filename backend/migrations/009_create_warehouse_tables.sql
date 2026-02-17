-- Migration 009: Create Warehouse Management System Tables
-- Created: 2026-02-16
-- Description: Comprehensive warehouse operations including locations, scanning, receiving, picking, and shipping

-- ========================================
-- Warehouse Locations (Bin Management)
-- ========================================
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  location_code VARCHAR(50) UNIQUE NOT NULL,
  aisle VARCHAR(20),
  shelf VARCHAR(20),
  position VARCHAR(20),
  zone VARCHAR(50),
  location_type VARCHAR(30) DEFAULT 'standard', -- standard, receiving, shipping, quarantine
  capacity INTEGER DEFAULT 100,
  current_capacity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouse_locations_code ON warehouse_locations(location_code);
CREATE INDEX idx_warehouse_locations_zone ON warehouse_locations(zone);
CREATE INDEX idx_warehouse_locations_type ON warehouse_locations(location_type);

-- ========================================
-- Inventory Scans (Complete Scan Log)
-- ========================================
CREATE TABLE IF NOT EXISTS inventory_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_type VARCHAR(30) NOT NULL, -- receiving, picking, shipping, cycle_count, adjustment
  user_id INTEGER NOT NULL,
  product_id INTEGER,
  upc_code VARCHAR(100),
  sku VARCHAR(100),
  location_id INTEGER,
  quantity INTEGER DEFAULT 1,
  status VARCHAR(30) DEFAULT 'success', -- success, error, pending
  error_message TEXT,
  session_id VARCHAR(100),
  metadata TEXT, -- JSON: shipment_id, pick_list_id, order_id, etc.
  scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (location_id) REFERENCES warehouse_locations(id)
);

CREATE INDEX idx_inventory_scans_user ON inventory_scans(user_id);
CREATE INDEX idx_inventory_scans_type ON inventory_scans(scan_type);
CREATE INDEX idx_inventory_scans_product ON inventory_scans(product_id);
CREATE INDEX idx_inventory_scans_upc ON inventory_scans(upc_code);
CREATE INDEX idx_inventory_scans_session ON inventory_scans(session_id);
CREATE INDEX idx_inventory_scans_date ON inventory_scans(scanned_at);

-- ========================================
-- Receiving Shipments (Inbound Tracking)
-- ========================================
CREATE TABLE IF NOT EXISTS receiving_shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id INTEGER,
  po_number VARCHAR(50),
  expected_arrival DATE,
  actual_arrival DATETIME,
  status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  received_by INTEGER,
  notes TEXT,
  total_items INTEGER DEFAULT 0,
  items_received INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (supplier_id) REFERENCES users(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

CREATE INDEX idx_receiving_shipments_number ON receiving_shipments(shipment_number);
CREATE INDEX idx_receiving_shipments_supplier ON receiving_shipments(supplier_id);
CREATE INDEX idx_receiving_shipments_status ON receiving_shipments(status);
CREATE INDEX idx_receiving_shipments_po ON receiving_shipments(po_number);

-- ========================================
-- Receiving Items (Items with PO Matching)
-- ========================================
CREATE TABLE IF NOT EXISTS receiving_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shipment_id INTEGER NOT NULL,
  product_id INTEGER,
  sku VARCHAR(100),
  upc_code VARCHAR(100),
  expected_quantity INTEGER DEFAULT 0,
  received_quantity INTEGER DEFAULT 0,
  match_status VARCHAR(30) DEFAULT 'pending', -- pending, matched, mismatch, damage, excess
  location_id INTEGER,
  notes TEXT,
  received_by INTEGER,
  received_at DATETIME,
  FOREIGN KEY (shipment_id) REFERENCES receiving_shipments(id),
  FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (received_by) REFERENCES users(id)
);

CREATE INDEX idx_receiving_items_shipment ON receiving_items(shipment_id);
CREATE INDEX idx_receiving_items_product ON receiving_items(product_id);
CREATE INDEX idx_receiving_items_sku ON receiving_items(sku);
CREATE INDEX idx_receiving_items_status ON receiving_items(match_status);

-- ========================================
-- Pick Lists (Orders to be Picked)
-- ========================================
CREATE TABLE IF NOT EXISTS pick_lists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pick_list_number VARCHAR(50) UNIQUE NOT NULL,
  order_id INTEGER,
  assigned_to INTEGER,
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
  status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  zone VARCHAR(50),
  total_items INTEGER DEFAULT 0,
  items_picked INTEGER DEFAULT 0,
  estimated_time INTEGER, -- minutes
  actual_time INTEGER, -- minutes
  route_data TEXT, -- JSON: optimized route
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_pick_lists_number ON pick_lists(pick_list_number);
CREATE INDEX idx_pick_lists_order ON pick_lists(order_id);
CREATE INDEX idx_pick_lists_assigned ON pick_lists(assigned_to);
CREATE INDEX idx_pick_lists_status ON pick_lists(status);
CREATE INDEX idx_pick_lists_zone ON pick_lists(zone);

-- ========================================
-- Pick List Items (Individual Pick Items)
-- ========================================
CREATE TABLE IF NOT EXISTS pick_list_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pick_list_id INTEGER NOT NULL,
  product_id INTEGER,
  sku VARCHAR(100),
  upc_code VARCHAR(100),
  quantity_requested INTEGER NOT NULL,
  quantity_picked INTEGER DEFAULT 0,
  location_id INTEGER,
  sequence_number INTEGER, -- Order in pick route
  status VARCHAR(30) DEFAULT 'pending', -- pending, picked, short_pick, not_found
  picked_by INTEGER,
  picked_at DATETIME,
  notes TEXT,
  FOREIGN KEY (pick_list_id) REFERENCES pick_lists(id),
  FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (picked_by) REFERENCES users(id)
);

CREATE INDEX idx_pick_list_items_pick_list ON pick_list_items(pick_list_id);
CREATE INDEX idx_pick_list_items_product ON pick_list_items(product_id);
CREATE INDEX idx_pick_list_items_location ON pick_list_items(location_id);
CREATE INDEX idx_pick_list_items_status ON pick_list_items(status);

-- ========================================
-- Shipment Batches (Outbound Shipments)
-- ========================================
CREATE TABLE IF NOT EXISTS shipment_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_number VARCHAR(50) UNIQUE NOT NULL,
  order_id INTEGER,
  pick_list_id INTEGER,
  carrier VARCHAR(50), -- UPS, USPS, FedEx, etc.
  tracking_number VARCHAR(100),
  status VARCHAR(30) DEFAULT 'pending', -- pending, packed, shipped, delivered
  total_weight DECIMAL(10,2),
  total_items INTEGER DEFAULT 0,
  items_packed INTEGER DEFAULT 0,
  packed_by INTEGER,
  shipped_by INTEGER,
  ship_date DATETIME,
  delivery_date DATETIME,
  label_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (pick_list_id) REFERENCES pick_lists(id),
  FOREIGN KEY (packed_by) REFERENCES users(id),
  FOREIGN KEY (shipped_by) REFERENCES users(id)
);

CREATE INDEX idx_shipment_batches_number ON shipment_batches(batch_number);
CREATE INDEX idx_shipment_batches_order ON shipment_batches(order_id);
CREATE INDEX idx_shipment_batches_tracking ON shipment_batches(tracking_number);
CREATE INDEX idx_shipment_batches_status ON shipment_batches(status);

-- ========================================
-- Warehouse Audit Logs (Complete Trail)
-- ========================================
CREATE TABLE IF NOT EXISTS warehouse_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL, -- scan, receive, pick, ship, adjust, move, cycle_count
  resource_type VARCHAR(50), -- shipment, pick_list, location, inventory
  resource_id INTEGER,
  old_value TEXT, -- JSON
  new_value TEXT, -- JSON
  ip_address VARCHAR(45),
  user_agent TEXT,
  session_id VARCHAR(100),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_warehouse_audit_logs_user ON warehouse_audit_logs(user_id);
CREATE INDEX idx_warehouse_audit_logs_action ON warehouse_audit_logs(action);
CREATE INDEX idx_warehouse_audit_logs_resource ON warehouse_audit_logs(resource_type, resource_id);
CREATE INDEX idx_warehouse_audit_logs_date ON warehouse_audit_logs(created_at);

-- ========================================
-- Warehouse Users (Extended Info)
-- ========================================
CREATE TABLE IF NOT EXISTS warehouse_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  warehouse_id VARCHAR(50),
  shift VARCHAR(20), -- morning, afternoon, night
  zone_assignment VARCHAR(50),
  default_operation VARCHAR(30), -- receiving, picking, shipping, all
  is_active BOOLEAN DEFAULT 1,
  employee_number VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_warehouse_users_user ON warehouse_users(user_id);
CREATE INDEX idx_warehouse_users_warehouse ON warehouse_users(warehouse_id);
CREATE INDEX idx_warehouse_users_zone ON warehouse_users(zone_assignment);
CREATE INDEX idx_warehouse_users_shift ON warehouse_users(shift);

-- ========================================
-- Product Locations (Product-Location Mapping)
-- ========================================
CREATE TABLE IF NOT EXISTS product_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
  UNIQUE(product_id, location_id)
);

CREATE INDEX idx_product_locations_product ON product_locations(product_id);
CREATE INDEX idx_product_locations_location ON product_locations(location_id);
CREATE INDEX idx_product_locations_primary ON product_locations(is_primary);

-- ========================================
-- Cycle Counts (Inventory Audits)
-- ========================================
CREATE TABLE IF NOT EXISTS cycle_counts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  count_number VARCHAR(50) UNIQUE NOT NULL,
  location_id INTEGER,
  status VARCHAR(30) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  assigned_to INTEGER,
  scheduled_date DATE,
  completed_date DATETIME,
  total_items INTEGER DEFAULT 0,
  items_counted INTEGER DEFAULT 0,
  discrepancies_found INTEGER DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE INDEX idx_cycle_counts_number ON cycle_counts(count_number);
CREATE INDEX idx_cycle_counts_location ON cycle_counts(location_id);
CREATE INDEX idx_cycle_counts_status ON cycle_counts(status);
CREATE INDEX idx_cycle_counts_assigned ON cycle_counts(assigned_to);

-- ========================================
-- Cycle Count Items (Individual Counts)
-- ========================================
CREATE TABLE IF NOT EXISTS cycle_count_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_count_id INTEGER NOT NULL,
  product_id INTEGER,
  location_id INTEGER,
  expected_quantity INTEGER DEFAULT 0,
  actual_quantity INTEGER,
  variance INTEGER DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending', -- pending, counted, adjusted
  counted_by INTEGER,
  counted_at DATETIME,
  notes TEXT,
  FOREIGN KEY (cycle_count_id) REFERENCES cycle_counts(id),
  FOREIGN KEY (location_id) REFERENCES warehouse_locations(id),
  FOREIGN KEY (counted_by) REFERENCES users(id)
);

CREATE INDEX idx_cycle_count_items_cycle_count ON cycle_count_items(cycle_count_id);
CREATE INDEX idx_cycle_count_items_product ON cycle_count_items(product_id);
CREATE INDEX idx_cycle_count_items_location ON cycle_count_items(location_id);

-- ========================================
-- Insert Default Warehouse Locations
-- ========================================
INSERT OR IGNORE INTO warehouse_locations (location_code, aisle, shelf, position, zone, location_type) VALUES
  ('RCV-01', 'RCV', '01', '01', 'RECEIVING', 'receiving'),
  ('RCV-02', 'RCV', '01', '02', 'RECEIVING', 'receiving'),
  ('A1-01-01', 'A1', '01', '01', 'ZONE-A', 'standard'),
  ('A1-01-02', 'A1', '01', '02', 'ZONE-A', 'standard'),
  ('A1-02-01', 'A1', '02', '01', 'ZONE-A', 'standard'),
  ('A2-01-01', 'A2', '01', '01', 'ZONE-B', 'standard'),
  ('A2-01-02', 'A2', '01', '02', 'ZONE-B', 'standard'),
  ('A2-02-01', 'A2', '02', '01', 'ZONE-B', 'standard'),
  ('SHP-01', 'SHP', '01', '01', 'SHIPPING', 'shipping'),
  ('SHP-02', 'SHP', '01', '02', 'SHIPPING', 'shipping'),
  ('QA-01', 'QA', '01', '01', 'QUALITY', 'quarantine'),
  ('QA-02', 'QA', '01', '02', 'QUALITY', 'quarantine');

-- ========================================
-- Migration Complete
-- ========================================
