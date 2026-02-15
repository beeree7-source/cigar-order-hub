-- ============================================
-- Employee Scheduling & Time Clock Payroll System
-- Migration 008
-- ============================================

-- 1. Companies Employees Table
CREATE TABLE IF NOT EXISTS companies_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  employee_id TEXT UNIQUE NOT NULL,
  department_id INTEGER,
  position TEXT,
  hire_date DATETIME,
  employment_type TEXT CHECK(employment_type IN ('full_time', 'part_time', 'contract', 'temporary')) DEFAULT 'full_time',
  hourly_rate DECIMAL(10,2),
  salary DECIMAL(12,2),
  manager_id INTEGER,
  status TEXT CHECK(status IN ('active', 'inactive', 'on_leave', 'terminated')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY(manager_id) REFERENCES companies_employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_employees_company ON companies_employees(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_employees_user ON companies_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_employees_department ON companies_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_companies_employees_status ON companies_employees(status);

-- 2. Employee Shifts Table
CREATE TABLE IF NOT EXISTS employee_shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  shift_name TEXT NOT NULL,
  start_time TIME,
  end_time TIME,
  break_duration INTEGER DEFAULT 0,
  lunch_duration INTEGER DEFAULT 0,
  days_of_week TEXT,
  is_recurring BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_shifts_company ON employee_shifts(company_id);

-- 3. Employee Schedules Table
CREATE TABLE IF NOT EXISTS employee_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  shift_id INTEGER,
  scheduled_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT CHECK(status IN ('scheduled', 'approved', 'completed', 'cancelled')) DEFAULT 'scheduled',
  published BOOLEAN DEFAULT 0,
  created_by INTEGER,
  approved_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(shift_id) REFERENCES employee_shifts(id) ON DELETE SET NULL,
  FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(employee_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_company ON employee_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_date ON employee_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_status ON employee_schedules(status);

-- 4. Time Entries Table
CREATE TABLE IF NOT EXISTS time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  clock_in_time DATETIME,
  clock_out_time DATETIME,
  break_start DATETIME,
  break_end DATETIME,
  location_latitude DECIMAL(10,8),
  location_longitude DECIMAL(11,8),
  device_type TEXT CHECK(device_type IN ('mobile', 'web', 'biometric', 'kiosk')),
  notes TEXT,
  status TEXT CHECK(status IN ('completed', 'pending_approval', 'edited')) DEFAULT 'completed',
  edited_by INTEGER,
  edited_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(edited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_time_entries_company ON time_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);

-- 5. Employee Timesheets Table
CREATE TABLE IF NOT EXISTS employee_timesheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_regular_hours DECIMAL(10,2) DEFAULT 0,
  total_overtime_hours DECIMAL(10,2) DEFAULT 0,
  breaks_deducted DECIMAL(10,2) DEFAULT 0,
  absences INTEGER DEFAULT 0,
  late_arrivals INTEGER DEFAULT 0,
  submitted_by INTEGER,
  submitted_at DATETIME,
  approved_by INTEGER,
  approved_at DATETIME,
  status TEXT CHECK(status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_employee_timesheets_company ON employee_timesheets(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_timesheets_employee ON employee_timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_timesheets_period ON employee_timesheets(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_employee_timesheets_status ON employee_timesheets(status);

-- 6. Overtime Records Table
CREATE TABLE IF NOT EXISTS overtime_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  timesheet_id INTEGER,
  overtime_date DATE NOT NULL,
  overtime_hours DECIMAL(10,2),
  rate_multiplier DECIMAL(3,2) DEFAULT 1.5,
  reason TEXT,
  approved_by INTEGER,
  approval_status TEXT CHECK(approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(timesheet_id) REFERENCES employee_timesheets(id) ON DELETE SET NULL,
  FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_overtime_records_company ON overtime_records(company_id);
CREATE INDEX IF NOT EXISTS idx_overtime_records_employee ON overtime_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_records_date ON overtime_records(overtime_date);
CREATE INDEX IF NOT EXISTS idx_overtime_records_status ON overtime_records(approval_status);

-- 7. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  attendance_date DATE NOT NULL,
  status TEXT CHECK(status IN ('present', 'absent', 'late', 'early_departure', 'sick', 'pto', 'unpaid_leave')) NOT NULL,
  check_in_time DATETIME,
  check_out_time DATETIME,
  reason TEXT,
  approved_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_records_company ON attendance_records(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

-- 8. Payroll Periods Table
CREATE TABLE IF NOT EXISTS payroll_periods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  pay_frequency TEXT CHECK(pay_frequency IN ('weekly', 'biweekly', 'monthly')) DEFAULT 'biweekly',
  total_employees INTEGER DEFAULT 0,
  total_hours DECIMAL(12,2) DEFAULT 0,
  total_payroll DECIMAL(15,2) DEFAULT 0,
  status TEXT CHECK(status IN ('open', 'closed', 'processed', 'finalized')) DEFAULT 'open',
  processed_date DATETIME,
  processed_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(processed_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(company_id, period_start_date)
);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_company ON payroll_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates ON payroll_periods(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);

-- 9. Payroll Records Table
CREATE TABLE IF NOT EXISTS payroll_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  payroll_period_id INTEGER NOT NULL,
  regular_hours DECIMAL(10,2) DEFAULT 0,
  regular_rate DECIMAL(10,2),
  regular_pay DECIMAL(12,2) DEFAULT 0,
  overtime_hours DECIMAL(10,2) DEFAULT 0,
  overtime_rate DECIMAL(10,2),
  overtime_pay DECIMAL(12,2) DEFAULT 0,
  gross_pay DECIMAL(12,2) DEFAULT 0,
  federal_tax DECIMAL(10,2) DEFAULT 0,
  state_tax DECIMAL(10,2) DEFAULT 0,
  social_security DECIMAL(10,2) DEFAULT 0,
  medicare DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  net_pay DECIMAL(12,2) DEFAULT 0,
  status TEXT CHECK(status IN ('draft', 'approved', 'paid', 'archived')) DEFAULT 'draft',
  approved_by INTEGER,
  approved_at DATETIME,
  paid_date DATETIME,
  payment_method TEXT CHECK(payment_method IN ('direct_deposit', 'check', 'cash')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
  FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payroll_records_company ON payroll_records(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON payroll_records(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_status ON payroll_records(status);

-- 10. Shift Swap Requests Table
CREATE TABLE IF NOT EXISTS shift_swap_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  requesting_employee_id INTEGER NOT NULL,
  target_schedule_id INTEGER NOT NULL,
  covering_employee_id INTEGER,
  swap_date DATE NOT NULL,
  status TEXT CHECK(status IN ('pending', 'approved', 'denied', 'completed')) DEFAULT 'pending',
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_by INTEGER,
  approved_at DATETIME,
  notes TEXT,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY(requesting_employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE,
  FOREIGN KEY(target_schedule_id) REFERENCES employee_schedules(id) ON DELETE CASCADE,
  FOREIGN KEY(covering_employee_id) REFERENCES companies_employees(id) ON DELETE SET NULL,
  FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_company ON shift_swap_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_requesting ON shift_swap_requests(requesting_employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_status ON shift_swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_shift_swap_requests_date ON shift_swap_requests(swap_date);

-- 11. Employee Preferences Table
CREATE TABLE IF NOT EXISTS employee_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL UNIQUE,
  available_days TEXT,
  preferred_shifts TEXT,
  max_hours_per_week INTEGER,
  days_off_requested TEXT,
  do_not_schedule_with TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  notifications_enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(employee_id) REFERENCES companies_employees(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_employee_preferences_employee ON employee_preferences(employee_id);

-- 12. Company Payroll Settings Table
CREATE TABLE IF NOT EXISTS company_payroll_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL UNIQUE,
  pay_frequency TEXT CHECK(pay_frequency IN ('weekly', 'biweekly', 'monthly')) DEFAULT 'biweekly',
  work_week_start INTEGER DEFAULT 0,
  work_week_end INTEGER DEFAULT 6,
  overtime_threshold_hours INTEGER DEFAULT 40,
  overtime_rate_multiplier DECIMAL(3,2) DEFAULT 1.5,
  double_time_threshold_hours INTEGER DEFAULT 60,
  double_time_multiplier DECIMAL(3,2) DEFAULT 2.0,
  break_deduction_daily DECIMAL(5,2) DEFAULT 0.5,
  lunch_deduction_daily DECIMAL(5,2) DEFAULT 0.5,
  gps_verification_required BOOLEAN DEFAULT 1,
  maximum_shift_length INTEGER DEFAULT 12,
  minimum_shift_length INTEGER DEFAULT 2,
  federal_tax_rate DECIMAL(5,2),
  state_tax_rate DECIMAL(5,2),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_company_payroll_settings_company ON company_payroll_settings(company_id);
