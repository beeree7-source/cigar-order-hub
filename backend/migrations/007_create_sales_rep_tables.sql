-- ============================================
-- Mobile Field Sales Representative System Schema
-- Migration 007
-- ============================================

-- 1. Sales Reps Table
CREATE TABLE IF NOT EXISTS sales_reps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  company_id INTEGER,
  territory TEXT,
  assigned_accounts TEXT, -- JSON array of account IDs
  manager_id INTEGER,
  status TEXT CHECK(status IN ('active', 'inactive', 'on_leave')) DEFAULT 'active',
  hire_date DATETIME,
  base_location TEXT, -- home office location
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY(manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Daily Check-Ins Table
CREATE TABLE IF NOT EXISTS daily_check_ins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_rep_id INTEGER NOT NULL,
  check_in_date DATE NOT NULL,
  check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  check_in_location TEXT, -- latitude, longitude, address
  check_out_time DATETIME,
  check_out_location TEXT,
  notes TEXT,
  weather TEXT,
  daily_miles DECIMAL(10,2),
  status TEXT CHECK(status IN ('checked_in', 'checked_out', 'on_break')) DEFAULT 'checked_in',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sales_rep_id) REFERENCES sales_reps(id) ON DELETE CASCADE,
  UNIQUE(sales_rep_id, check_in_date)
);

-- 3. Location Tracking Table
CREATE TABLE IF NOT EXISTS location_tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_rep_id INTEGER NOT NULL,
  check_in_id INTEGER,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  accuracy REAL, -- GPS accuracy in meters
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  trip_start DATETIME,
  trip_end DATETIME,
  miles_traveled DECIMAL(10, 2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sales_rep_id) REFERENCES sales_reps(id) ON DELETE CASCADE,
  FOREIGN KEY(check_in_id) REFERENCES daily_check_ins(id) ON DELETE SET NULL
);

-- 4. Account Visits Table
CREATE TABLE IF NOT EXISTS account_visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_rep_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL, -- FOREIGN KEY users.id for retailer accounts
  check_in_id INTEGER,
  visit_date DATE NOT NULL,
  arrival_time DATETIME,
  departure_time DATETIME,
  visit_duration INTEGER, -- minutes
  notes TEXT,
  purpose TEXT, -- routine_call, problem_solving, order_delivery, etc.
  location_latitude DECIMAL(10, 8),
  location_longitude DECIMAL(11, 8),
  status TEXT CHECK(status IN ('scheduled', 'in_progress', 'completed', 'no_show')) DEFAULT 'completed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sales_rep_id) REFERENCES sales_reps(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(check_in_id) REFERENCES daily_check_ins(id) ON DELETE SET NULL
);

-- 5. Account Visit Photos Table
CREATE TABLE IF NOT EXISTS account_visit_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visit_id INTEGER NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type TEXT CHECK(photo_type IN ('display', 'inventory', 'product', 'signage', 'store_front', 'other')),
  taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_size INTEGER,
  file_name TEXT,
  photo_metadata TEXT, -- JSON - camera info, coordinates, etc.
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(visit_id) REFERENCES account_visits(id) ON DELETE CASCADE
);

-- 6. Account Preferences Table
CREATE TABLE IF NOT EXISTS account_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  allow_rep_photos BOOLEAN DEFAULT 0,
  allow_location_tracking BOOLEAN DEFAULT 0,
  allow_visit_notes BOOLEAN DEFAULT 0,
  allow_order_placement BOOLEAN DEFAULT 1,
  mileage_reimbursement_enabled BOOLEAN DEFAULT 0,
  mileage_rate DECIMAL(5,3) DEFAULT 0.585, -- IRS standard
  minimum_visit_duration INTEGER DEFAULT 0, -- minutes
  required_visit_frequency TEXT, -- daily, weekly, biweekly
  photo_approval_required BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(account_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Rep Authorized Accounts Table
CREATE TABLE IF NOT EXISTS rep_authorized_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_rep_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  authorization_type TEXT CHECK(authorization_type IN ('full_access', 'order_only', 'view_only')) DEFAULT 'full_access',
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  end_date DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sales_rep_id) REFERENCES sales_reps(id) ON DELETE CASCADE,
  FOREIGN KEY(account_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(sales_rep_id, account_id)
);

-- 8. Mileage Logs Table
CREATE TABLE IF NOT EXISTS mileage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_rep_id INTEGER NOT NULL,
  check_in_id INTEGER,
  start_odometer DECIMAL(10,2),
  end_odometer DECIMAL(10,2),
  total_miles DECIMAL(10,2),
  start_location TEXT,
  end_location TEXT,
  trip_date DATE NOT NULL,
  trip_start_time DATETIME,
  trip_end_time DATETIME,
  purpose TEXT, -- customer_visit, delivery, meeting, training, etc.
  notes TEXT,
  reimbursement_status TEXT CHECK(reimbursement_status IN ('pending', 'approved', 'paid')) DEFAULT 'pending',
  reimbursement_amount DECIMAL(10,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sales_rep_id) REFERENCES sales_reps(id) ON DELETE CASCADE,
  FOREIGN KEY(check_in_id) REFERENCES daily_check_ins(id) ON DELETE SET NULL
);

-- 9. Rep Performance Metrics Table
CREATE TABLE IF NOT EXISTS rep_performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sales_rep_id INTEGER NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_accounts INTEGER DEFAULT 0,
  accounts_visited INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_sales DECIMAL(15,2) DEFAULT 0,
  avg_order_value DECIMAL(10,2) DEFAULT 0,
  photos_taken INTEGER DEFAULT 0,
  total_miles DECIMAL(10,2) DEFAULT 0,
  visit_completion_rate DECIMAL(5,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(sales_rep_id) REFERENCES sales_reps(id) ON DELETE CASCADE,
  UNIQUE(sales_rep_id, period_start_date)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_sales_reps_user_id ON sales_reps(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_reps_company_id ON sales_reps(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_reps_status ON sales_reps(status);

CREATE INDEX IF NOT EXISTS idx_daily_check_ins_rep_date ON daily_check_ins(sales_rep_id, check_in_date);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_status ON daily_check_ins(status);

CREATE INDEX IF NOT EXISTS idx_location_tracking_rep_id ON location_tracking(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_timestamp ON location_tracking(timestamp);
CREATE INDEX IF NOT EXISTS idx_location_tracking_check_in ON location_tracking(check_in_id);

CREATE INDEX IF NOT EXISTS idx_account_visits_rep_id ON account_visits(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_account_visits_account_id ON account_visits(account_id);
CREATE INDEX IF NOT EXISTS idx_account_visits_date ON account_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_account_visits_status ON account_visits(status);

CREATE INDEX IF NOT EXISTS idx_account_visit_photos_visit_id ON account_visit_photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_account_visit_photos_type ON account_visit_photos(photo_type);

CREATE INDEX IF NOT EXISTS idx_account_preferences_account_id ON account_preferences(account_id);

CREATE INDEX IF NOT EXISTS idx_rep_authorized_accounts_rep_id ON rep_authorized_accounts(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_rep_authorized_accounts_account_id ON rep_authorized_accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_rep_authorized_accounts_active ON rep_authorized_accounts(is_active);

CREATE INDEX IF NOT EXISTS idx_mileage_logs_rep_id ON mileage_logs(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_trip_date ON mileage_logs(trip_date);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_reimbursement_status ON mileage_logs(reimbursement_status);

CREATE INDEX IF NOT EXISTS idx_rep_performance_rep_id ON rep_performance_metrics(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_rep_performance_period ON rep_performance_metrics(period_start_date, period_end_date);

-- Insert default account preferences for existing users
-- This ensures all existing retailer accounts have preference settings
INSERT OR IGNORE INTO account_preferences (account_id, allow_order_placement)
SELECT id, 1 FROM users WHERE role = 'retailer';
