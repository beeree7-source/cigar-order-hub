const db = require('./database');

/**
 * Reporting & Analytics Service
 * Provides HR reports and analytics for labor costs, productivity, compliance
 */

// Configuration constants
const EXCESSIVE_OVERTIME_THRESHOLD = 60; // Hours - configurable per company policy
const PENDING_APPROVAL_DAYS_THRESHOLD = 7; // Days before flagging as compliance issue

// ==================== Labor Cost Reports ====================

/**
 * Get labor cost analysis by department/location
 */
const getLaborCostReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date, department_id } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  let query = `
    SELECT 
      ce.department_id,
      d.name as department_name,
      COUNT(DISTINCT ce.id) as employee_count,
      SUM(pr.regular_hours) as total_regular_hours,
      SUM(pr.overtime_hours) as total_overtime_hours,
      SUM(pr.regular_pay) as total_regular_pay,
      SUM(pr.overtime_pay) as total_overtime_pay,
      SUM(pr.gross_pay) as total_gross_pay,
      AVG(ce.hourly_rate) as avg_hourly_rate
    FROM payroll_records pr
    JOIN companies_employees ce ON pr.employee_id = ce.id
    LEFT JOIN departments d ON ce.department_id = d.id
    JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
    WHERE pr.company_id = ? 
      AND pp.period_start_date >= ? 
      AND pp.period_end_date <= ?
  `;
  const params = [company_id, start_date, end_date];

  if (department_id) {
    query += ` AND ce.department_id = ?`;
    params.push(department_id);
  }

  query += ` GROUP BY ce.department_id, d.name`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get productivity metrics
 */
const getProductivityReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const query = `
    SELECT 
      ce.id as employee_id,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.department_id,
      d.name as department_name,
      COUNT(DISTINCT DATE(te.clock_in_time)) as days_worked,
      SUM((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24) as total_hours,
      AVG((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24) as avg_hours_per_day,
      COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_arrivals,
      COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absences
    FROM companies_employees ce
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    LEFT JOIN time_entries te ON ce.id = te.employee_id 
      AND DATE(te.clock_in_time) >= ? 
      AND DATE(te.clock_in_time) <= ?
      AND te.clock_out_time IS NOT NULL
    LEFT JOIN attendance_records ar ON ce.id = ar.employee_id
      AND ar.attendance_date >= ?
      AND ar.attendance_date <= ?
    WHERE ce.company_id = ?
      AND ce.status = 'active'
    GROUP BY ce.id, ce.employee_id, u.name, ce.department_id, d.name
    ORDER BY total_hours DESC
  `;

  db.all(query, [start_date, end_date, start_date, end_date, company_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get overtime analysis
 */
const getOvertimeAnalysisReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const query = `
    SELECT 
      ce.id as employee_id,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.department_id,
      d.name as department_name,
      SUM(orec.overtime_hours) as total_overtime_hours,
      AVG(orec.rate_multiplier) as avg_multiplier,
      COUNT(*) as overtime_occurrences,
      SUM(CASE WHEN orec.approval_status = 'pending' THEN 1 ELSE 0 END) as pending_approvals
    FROM overtime_records orec
    JOIN companies_employees ce ON orec.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE orec.company_id = ? 
      AND orec.overtime_date >= ? 
      AND orec.overtime_date <= ?
    GROUP BY ce.id, ce.employee_id, u.name, ce.department_id, d.name
    ORDER BY total_overtime_hours DESC
  `;

  db.all(query, [company_id, start_date, end_date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get attendance summary
 */
const getAttendanceSummaryReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date, department_id } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  let query = `
    SELECT 
      ce.id as employee_id,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.department_id,
      d.name as department_name,
      COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_days,
      COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_days,
      COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_days,
      COUNT(CASE WHEN ar.status = 'sick' THEN 1 END) as sick_days,
      COUNT(CASE WHEN ar.status = 'pto' THEN 1 END) as pto_days,
      COUNT(*) as total_records,
      ROUND(COUNT(CASE WHEN ar.status = 'present' THEN 1 END) * 100.0 / COUNT(*), 2) as attendance_rate
    FROM companies_employees ce
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    LEFT JOIN attendance_records ar ON ce.id = ar.employee_id
      AND ar.attendance_date >= ?
      AND ar.attendance_date <= ?
    WHERE ce.company_id = ?
      AND ce.status = 'active'
  `;
  const params = [start_date, end_date, company_id];

  if (department_id) {
    query += ` AND ce.department_id = ?`;
    params.push(department_id);
  }

  query += ` GROUP BY ce.id, ce.employee_id, u.name, ce.department_id, d.name
    ORDER BY attendance_rate DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get tardiness/late arrival trends
 */
const getTardinessReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const query = `
    SELECT 
      ce.id as employee_id,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.department_id,
      d.name as department_name,
      COUNT(*) as late_count,
      GROUP_CONCAT(ar.attendance_date) as late_dates
    FROM attendance_records ar
    JOIN companies_employees ce ON ar.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ar.company_id = ? 
      AND ar.status = 'late'
      AND ar.attendance_date >= ? 
      AND ar.attendance_date <= ?
    GROUP BY ce.id, ce.employee_id, u.name, ce.department_id, d.name
    HAVING late_count > 0
    ORDER BY late_count DESC
  `;

  db.all(query, [company_id, start_date, end_date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get scheduling efficiency report
 */
const getSchedulingEfficiencyReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const query = `
    SELECT 
      ce.department_id,
      d.name as department_name,
      COUNT(DISTINCT es.id) as total_schedules,
      COUNT(CASE WHEN es.status = 'completed' THEN 1 END) as completed_schedules,
      COUNT(CASE WHEN es.status = 'cancelled' THEN 1 END) as cancelled_schedules,
      COUNT(DISTINCT es.employee_id) as scheduled_employees,
      ROUND(COUNT(CASE WHEN es.status = 'completed' THEN 1 END) * 100.0 / COUNT(*), 2) as completion_rate
    FROM employee_schedules es
    JOIN companies_employees ce ON es.employee_id = ce.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE es.company_id = ? 
      AND es.scheduled_date >= ? 
      AND es.scheduled_date <= ?
    GROUP BY ce.department_id, d.name
    ORDER BY completion_rate DESC
  `;

  db.all(query, [company_id, start_date, end_date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get compliance report (overtime, breaks, etc.)
 */
const getComplianceReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  // Check for potential compliance issues
  const query = `
    SELECT 
      'Overtime without approval' as issue_type,
      COUNT(*) as issue_count,
      GROUP_CONCAT(DISTINCT ce.employee_id) as affected_employees
    FROM overtime_records orec
    JOIN companies_employees ce ON orec.employee_id = ce.id
    WHERE orec.company_id = ? 
      AND orec.overtime_date >= ? 
      AND orec.overtime_date <= ?
      AND orec.approval_status = 'pending'
      AND orec.overtime_date < DATE('now', '-7 days')
    
    UNION ALL
    
    SELECT 
      'Excessive overtime' as issue_type,
      COUNT(*) as issue_count,
      GROUP_CONCAT(DISTINCT ce.employee_id) as affected_employees
    FROM (
      SELECT employee_id, SUM(overtime_hours) as total_ot
      FROM overtime_records
      WHERE company_id = ? 
        AND overtime_date >= ? 
        AND overtime_date <= ?
      GROUP BY employee_id
      HAVING total_ot > ?
    ) excessive_ot
    JOIN companies_employees ce ON excessive_ot.employee_id = ce.id
    
    UNION ALL
    
    SELECT 
      'Timesheet not submitted' as issue_type,
      COUNT(*) as issue_count,
      GROUP_CONCAT(DISTINCT ce.employee_id) as affected_employees
    FROM employee_timesheets ts
    JOIN companies_employees ce ON ts.employee_id = ce.id
    WHERE ts.company_id = ?
      AND ts.period_end_date < DATE('now', '-7 days')
      AND ts.status = 'draft'
  `;

  db.all(
    query,
    [
      company_id, start_date, end_date, 
      company_id, start_date, end_date, EXCESSIVE_OVERTIME_THRESHOLD,
      company_id
    ],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
};

/**
 * Get turnover metrics
 */
const getTurnoverReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const query = `
    SELECT 
      ce.department_id,
      d.name as department_name,
      COUNT(CASE WHEN ce.status = 'active' THEN 1 END) as active_employees,
      COUNT(CASE WHEN ce.status = 'terminated' AND ce.updated_at >= ? AND ce.updated_at <= ? THEN 1 END) as terminated_count,
      COUNT(CASE WHEN ce.hire_date >= ? AND ce.hire_date <= ? THEN 1 END) as new_hires,
      ROUND(
        COUNT(CASE WHEN ce.status = 'terminated' AND ce.updated_at >= ? AND ce.updated_at <= ? THEN 1 END) * 100.0 / 
        NULLIF(COUNT(CASE WHEN ce.status = 'active' THEN 1 END), 0), 
        2
      ) as turnover_rate
    FROM companies_employees ce
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ce.company_id = ?
    GROUP BY ce.department_id, d.name
  `;

  db.all(
    query,
    [start_date, end_date, start_date, end_date, start_date, end_date, company_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
};

/**
 * Get employee hours summary
 */
const getEmployeeHoursReport = (req, res) => {
  const { company_id } = req.params;
  const { employee_id, start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  let query = `
    SELECT 
      ce.id as employee_id,
      ce.employee_id as emp_number,
      u.name as employee_name,
      SUM((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24) as total_hours,
      COUNT(DISTINCT DATE(te.clock_in_time)) as days_worked,
      AVG((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24) as avg_hours_per_day
    FROM companies_employees ce
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN time_entries te ON ce.id = te.employee_id 
      AND DATE(te.clock_in_time) >= ? 
      AND DATE(te.clock_in_time) <= ?
      AND te.clock_out_time IS NOT NULL
    WHERE ce.company_id = ?
  `;
  const params = [start_date, end_date, company_id];

  if (employee_id) {
    query += ` AND ce.id = ?`;
    params.push(employee_id);
  }

  query += ` GROUP BY ce.id, ce.employee_id, u.name ORDER BY total_hours DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get department hours summary
 */
const getDepartmentHoursReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  const query = `
    SELECT 
      ce.department_id,
      d.name as department_name,
      COUNT(DISTINCT ce.id) as employee_count,
      SUM((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24) as total_hours,
      AVG((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24) as avg_hours_per_employee
    FROM companies_employees ce
    LEFT JOIN departments d ON ce.department_id = d.id
    LEFT JOIN time_entries te ON ce.id = te.employee_id 
      AND DATE(te.clock_in_time) >= ? 
      AND DATE(te.clock_in_time) <= ?
      AND te.clock_out_time IS NOT NULL
    WHERE ce.company_id = ?
      AND ce.status = 'active'
    GROUP BY ce.department_id, d.name
    ORDER BY total_hours DESC
  `;

  db.all(query, [start_date, end_date, company_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

module.exports = {
  getLaborCostReport,
  getProductivityReport,
  getOvertimeAnalysisReport,
  getAttendanceSummaryReport,
  getTardinessReport,
  getSchedulingEfficiencyReport,
  getComplianceReport,
  getTurnoverReport,
  getEmployeeHoursReport,
  getDepartmentHoursReport
};
