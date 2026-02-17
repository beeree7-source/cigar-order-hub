const db = require('./database');

/**
 * Overtime Service
 * Handles overtime detection, recording, approval, and compliance
 */

// ==================== Overtime Management ====================

/**
 * Record overtime manually
 */
const recordOvertime = (req, res) => {
  const { company_id, employee_id, timesheet_id, overtime_date, overtime_hours, rate_multiplier, reason } = req.body;

  if (!company_id || !employee_id || !overtime_date || !overtime_hours) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO overtime_records (
      company_id, employee_id, timesheet_id, overtime_date, 
      overtime_hours, rate_multiplier, reason, approval_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `;

  db.run(
    query,
    [company_id, employee_id, timesheet_id, overtime_date, overtime_hours, rate_multiplier || 1.5, reason],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Overtime recorded successfully',
        overtime_id: this.lastID
      });
    }
  );
};

/**
 * Get today's overtime for company
 */
const getTodayOvertime = (req, res) => {
  const { company_id } = req.params;

  const query = `
    SELECT 
      ot.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      ce.hourly_rate,
      ROUND(ot.overtime_hours * ce.hourly_rate * ot.rate_multiplier, 2) as overtime_pay
    FROM overtime_records ot
    JOIN companies_employees ce ON ot.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    WHERE ot.company_id = ? AND DATE(ot.overtime_date) = DATE('now')
    ORDER BY ot.overtime_hours DESC
  `;

  db.all(query, [company_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get monthly overtime
 */
const getMonthlyOvertime = (req, res) => {
  const { company_id } = req.params;
  const { month, year, employee_id } = req.query;

  let query = `
    SELECT 
      ot.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      ce.hourly_rate,
      d.name as department_name,
      ROUND(ot.overtime_hours * ce.hourly_rate * ot.rate_multiplier, 2) as overtime_pay
    FROM overtime_records ot
    JOIN companies_employees ce ON ot.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ot.company_id = ?
  `;

  const params = [company_id];

  if (employee_id) {
    query += ' AND ot.employee_id = ?';
    params.push(employee_id);
  }

  if (month && year) {
    query += ' AND strftime(\'%Y-%m\', ot.overtime_date) = ?';
    params.push(`${year}-${month.padStart(2, '0')}`);
  }

  query += ' ORDER BY ot.overtime_date DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const totalHours = rows.reduce((sum, row) => sum + (row.overtime_hours || 0), 0);
    const totalPay = rows.reduce((sum, row) => sum + (row.overtime_pay || 0), 0);

    res.json({
      records: rows,
      summary: {
        total_hours: totalHours.toFixed(2),
        total_pay: totalPay.toFixed(2),
        record_count: rows.length
      }
    });
  });
};

/**
 * Approve overtime record
 */
const approveOvertime = (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  if (!approved_by) {
    return res.status(400).json({ error: 'Missing approved_by' });
  }

  const query = `
    UPDATE overtime_records 
    SET approval_status = 'approved',
        approved_by = ?
    WHERE id = ?
  `;

  db.run(query, [approved_by, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Overtime record not found' });
    }
    res.json({ message: 'Overtime approved successfully' });
  });
};

/**
 * Reject overtime record
 */
const rejectOvertime = (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  if (!approved_by) {
    return res.status(400).json({ error: 'Missing approved_by' });
  }

  const query = `
    UPDATE overtime_records 
    SET approval_status = 'rejected',
        approved_by = ?
    WHERE id = ?
  `;

  db.run(query, [approved_by, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Overtime record not found' });
    }
    res.json({ message: 'Overtime rejected' });
  });
};

/**
 * Get pending overtime approvals
 */
const getPendingOvertime = (req, res) => {
  const { company_id } = req.params;

  const query = `
    SELECT 
      ot.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      ce.hourly_rate,
      d.name as department_name,
      ROUND(ot.overtime_hours * ce.hourly_rate * ot.rate_multiplier, 2) as overtime_pay
    FROM overtime_records ot
    JOIN companies_employees ce ON ot.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ot.company_id = ? AND ot.approval_status = 'pending'
    ORDER BY ot.overtime_date DESC
  `;

  db.all(query, [company_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Auto-detect overtime from time entries
 */
const autoDetectOvertime = (req, res) => {
  const { company_id, start_date, end_date } = req.body;

  if (!company_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get company overtime settings
  const settingsQuery = 'SELECT overtime_threshold_hours, overtime_rate_multiplier FROM company_payroll_settings WHERE company_id = ?';
  
  db.get(settingsQuery, [company_id], (err, settings) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const overtimeThreshold = settings?.overtime_threshold_hours || 40;
    const rateMultiplier = settings?.overtime_rate_multiplier || 1.5;

    // Calculate weekly hours and detect overtime
    const query = `
      SELECT 
        te.employee_id,
        DATE(te.clock_in_time, 'weekday 0', '-7 days') as week_start,
        SUM(ROUND((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24, 2)) as total_hours
      FROM time_entries te
      WHERE te.company_id = ?
      AND te.clock_out_time IS NOT NULL
      AND DATE(te.clock_in_time) >= ?
      AND DATE(te.clock_in_time) <= ?
      GROUP BY te.employee_id, week_start
      HAVING total_hours > ?
    `;

    db.all(query, [company_id, start_date, end_date, overtimeThreshold], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (rows.length === 0) {
        return res.json({ message: 'No overtime detected', records_created: 0 });
      }

      let recordsCreated = 0;
      let processedCount = 0;
      const insertQuery = `
        INSERT INTO overtime_records (
          company_id, employee_id, overtime_date, overtime_hours, 
          rate_multiplier, reason, approval_status
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
      `;

      rows.forEach((row, index) => {
        const overtimeHours = row.total_hours - overtimeThreshold;
        const overtimeDate = row.week_start;

        db.run(
          insertQuery,
          [
            company_id,
            row.employee_id,
            overtimeDate,
            overtimeHours.toFixed(2),
            rateMultiplier,
            'Auto-detected from weekly hours'
          ],
          function(err) {
            processedCount++;
            
            if (!err) {
              recordsCreated++;
            }

            // Send response only after all operations complete
            if (processedCount === rows.length) {
              res.json({
                message: 'Overtime detection completed',
                records_created: recordsCreated,
                potential_overtime: rows.length
              });
            }
          }
        );
      });
    });
  });
};

/**
 * Export overtime data
 */
const exportOvertime = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  const query = `
    SELECT 
      ce.employee_id as 'Employee ID',
      u.name as 'Employee Name',
      ce.position as 'Position',
      d.name as 'Department',
      ot.overtime_date as 'Date',
      ot.overtime_hours as 'Hours',
      ot.rate_multiplier as 'Rate Multiplier',
      ce.hourly_rate as 'Base Rate',
      ROUND(ot.overtime_hours * ce.hourly_rate * ot.rate_multiplier, 2) as 'Overtime Pay',
      ot.approval_status as 'Status',
      ot.reason as 'Reason'
    FROM overtime_records ot
    JOIN companies_employees ce ON ot.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ot.company_id = ?
    AND ot.overtime_date >= ?
    AND ot.overtime_date <= ?
    ORDER BY ot.overtime_date DESC
  `;

  db.all(query, [company_id, start_date, end_date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No overtime records found' });
    }

    // Convert to CSV
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
      }).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=overtime_${start_date}_${end_date}.csv`);
    res.send(csv);
  });
};

/**
 * Get overtime forecast
 */
const getOvertimeForecast = (req, res) => {
  const { company_id } = req.params;

  const query = `
    SELECT 
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      SUM(ROUND((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24, 2)) as hours_this_week,
      40 as standard_hours,
      MAX(0, SUM(ROUND((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24, 2)) - 40) as projected_overtime
    FROM companies_employees ce
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN time_entries te ON ce.id = te.employee_id 
      AND DATE(te.clock_in_time) >= DATE('now', 'weekday 0', '-7 days')
      AND te.clock_out_time IS NOT NULL
    WHERE ce.company_id = ? AND ce.status = 'active'
    GROUP BY ce.id
    HAVING hours_this_week > 35
    ORDER BY projected_overtime DESC
  `;

  db.all(query, [company_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get overtime summary by department
 */
const getOvertimeSummaryByDepartment = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  const query = `
    SELECT 
      d.name as department_name,
      COUNT(DISTINCT ot.employee_id) as employees_with_overtime,
      SUM(ot.overtime_hours) as total_overtime_hours,
      AVG(ot.overtime_hours) as avg_overtime_per_employee,
      SUM(ROUND(ot.overtime_hours * ce.hourly_rate * ot.rate_multiplier, 2)) as total_overtime_cost
    FROM overtime_records ot
    JOIN companies_employees ce ON ot.employee_id = ce.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ot.company_id = ?
    AND ot.overtime_date >= ?
    AND ot.overtime_date <= ?
    AND ot.approval_status = 'approved'
    GROUP BY d.id
    ORDER BY total_overtime_cost DESC
  `;

  db.all(query, [company_id, start_date, end_date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

module.exports = {
  recordOvertime,
  getTodayOvertime,
  getMonthlyOvertime,
  approveOvertime,
  rejectOvertime,
  getPendingOvertime,
  autoDetectOvertime,
  exportOvertime,
  getOvertimeForecast,
  getOvertimeSummaryByDepartment
};
