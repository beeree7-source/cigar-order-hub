-- ============================================
-- HR System Extended Tables
-- Migration 010
-- Adds time off management, schedule templates, breaks tracking,
-- timesheet approvals, and hourly rate history
-- ============================================

-- 1. Schedule Templates Table
-- Reusable schedule patterns (e.g., "Full Time", "Part Time", "Weekend Only")
CREATE TABLE IF NOT EXISTS schedule_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  default_hours_per_week DECIMAL(5,2),
  template_data TEXT, -- JSON: {days: [{day: 'Monday', start: '09:00', end: '17:00'},...]}
  is_active BOOLEAN DEFAULT 1,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_company ON schedule_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_active ON schedule_templates(is_active);

-- 2. Breaks Table
-- Separate break time tracking with type distinction
CREATE TABLE IF NOT EXISTS breaks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time_entry_id INTEGER NOT NULL,
  break_type TEXT CHECK(break_type IN ('break', 'lunch', 'personal')) DEFAULT 'break',
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_minutes INTEGER,
  is_paid BOOLEAN DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(time_entry_id) REFERENCES time_entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_breaks_time_entry ON breaks(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_breaks_type ON breaks(break_type);
CREATE INDEX IF NOT EXISTS idx_breaks_start ON breaks(start_time);

-- 3. Timesheet Approvals Table
-- Manager approval workflow for timesheets
CREATE TABLE IF NOT EXISTS timesheet_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timesheet_id INTEGER NOT NULL,
  approver_id INTEGER NOT NULL,
  approval_status TEXT CHECK(approval_status IN ('pending', 'approved', 'rejected', 'requires_changes')) DEFAULT 'pending',
  comments TEXT,
  approved_at DATETIME,
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(timesheet_id) REFERENCES employee_timesheets(id) ON DELETE CASCADE,
  FOREIGN KEY(approver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timesheet_approvals_timesheet ON timesheet_approvals(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_approvals_approver ON timesheet_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_approvals_status ON timesheet_approvals(approval_status);

-- 4. Time Off Balances Table
-- Track PTO/vacation/sick leave balances per employee
CREATE TABLE IF NOT EXISTS time_off_balances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  leave_type TEXT CHECK(leave_type IN ('pto', 'vacation', 'sick', 'personal', 'unpaid', 'bereavement', 'jury_duty')) NOT NULL,
  total_hours DECIMAL(10,2) DEFAULT 0,
  used_hours DECIMAL(10,2) DEFAULT 0,
  available_hours DECIMAL(10,2) DEFAULT 0,
  accrual_rate DECIMAL(5,2), -- Hours accrued per pay period
  year INTEGER NOT NULL,
  last_accrual_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE(employee_id, leave_type, year)
);

CREATE INDEX IF NOT EXISTS idx_time_off_balances_employee ON time_off_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_company ON time_off_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_time_off_balances_year ON time_off_balances(year);

-- 5. Time Off Requests Table
-- PTO, sick leave, vacation requests with approval status
CREATE TABLE IF NOT EXISTS time_off_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  leave_type TEXT CHECK(leave_type IN ('pto', 'vacation', 'sick', 'personal', 'unpaid', 'bereavement', 'jury_duty')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_hours DECIMAL(10,2) NOT NULL,
  reason TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'denied', 'cancelled')) DEFAULT 'pending',
  approved_by INTEGER,
  approved_at DATETIME,
  denial_reason TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_employee ON time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_company ON time_off_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON time_off_requests(status);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_dates ON time_off_requests(start_date, end_date);

-- 6. Hourly Rates History Table
-- Rate history for each employee with effective dates
CREATE TABLE IF NOT EXISTS hourly_rates_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  effective_date DATE NOT NULL,
  end_date DATE,
  reason TEXT,
  changed_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hourly_rates_history_employee ON hourly_rates_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_hourly_rates_history_company ON hourly_rates_history(company_id);
CREATE INDEX IF NOT EXISTS idx_hourly_rates_history_effective ON hourly_rates_history(effective_date);

-- 7. Add missing columns to existing tables if needed
-- Note: SQLite doesn't support adding columns with constraints in ALTER TABLE easily,
-- so we'll handle this separately if needed
