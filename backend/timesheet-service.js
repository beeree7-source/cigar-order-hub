const db = require('./database');

/**
 * Timesheet Management Service
 * Handles timesheet generation, submission, approval workflow
 */

// ==================== Timesheet Generation ====================

/**
 * Generate timesheet for employee and period
 */
const generateTimesheet = (req, res) => {
  const { employee_id, company_id, period_start_date, period_end_date } = req.body;

  if (!employee_id || !company_id || !period_start_date || !period_end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if timesheet already exists
  const checkQuery = `
    SELECT id FROM employee_timesheets 
    WHERE employee_id = ? AND period_start_date = ? AND period_end_date = ?
  `;

  db.get(checkQuery, [employee_id, period_start_date, period_end_date], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (existing) {
      return res.status(400).json({ error: 'Timesheet already exists for this period' });
    }

    // Calculate hours from time entries
    // Note: Overtime should be calculated weekly, but for simplicity in this initial version,
    // we aggregate all hours in the period. Future enhancement: proper weekly overtime calculation.
    const hoursQuery = `
      SELECT 
        SUM((julianday(clock_out_time) - julianday(clock_in_time)) * 24) as total_hours,
        COUNT(DISTINCT DATE(clock_in_time)) as days_worked
      FROM time_entries
      WHERE employee_id = ? 
        AND company_id = ?
        AND DATE(clock_in_time) >= ? 
        AND DATE(clock_in_time) <= ?
        AND clock_out_time IS NOT NULL
    `;

    db.get(hoursQuery, [employee_id, company_id, period_start_date, period_end_date], (err, hours) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const totalHours = hours.total_hours || 0;
      // Simple calculation: anything over 80 hours in 2-week period is OT
      // TODO: Implement proper weekly overtime calculation per FLSA
      const regularHours = Math.min(totalHours, 80);
      const overtimeHours = Math.max(0, totalHours - 80);

      // Get attendance info
      const attendanceQuery = `
        SELECT 
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absences,
          COUNT(CASE WHEN status = 'late' THEN 1 END) as late_arrivals
        FROM attendance_records
        WHERE employee_id = ? 
          AND attendance_date >= ? 
          AND attendance_date <= ?
      `;

      db.get(attendanceQuery, [employee_id, period_start_date, period_end_date], (err, attendance) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const insertQuery = `
          INSERT INTO employee_timesheets (
            company_id, employee_id, period_start_date, period_end_date,
            total_regular_hours, total_overtime_hours, absences, late_arrivals,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
        `;

        db.run(
          insertQuery,
          [
            company_id,
            employee_id,
            period_start_date,
            period_end_date,
            regularHours.toFixed(2),
            overtimeHours.toFixed(2),
            attendance.absences || 0,
            attendance.late_arrivals || 0
          ],
          function(err) {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.status(201).json({
              message: 'Timesheet generated',
              timesheet_id: this.lastID,
              regular_hours: regularHours.toFixed(2),
              overtime_hours: overtimeHours.toFixed(2)
            });
          }
        );
      });
    });
  });
};

/**
 * Get timesheet by ID
 */
const getTimesheet = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      ts.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      submitter.name as submitted_by_name,
      approver.name as approved_by_name
    FROM employee_timesheets ts
    JOIN companies_employees ce ON ts.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN users submitter ON ts.submitted_by = submitter.id
    LEFT JOIN users approver ON ts.approved_by = approver.id
    WHERE ts.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }
    res.json(row);
  });
};

/**
 * Get employee timesheets
 */
const getEmployeeTimesheets = (req, res) => {
  const { employee_id } = req.params;
  const { status, limit = 10 } = req.query;

  let query = `
    SELECT 
      ts.*,
      ce.employee_id as emp_number,
      u.name as employee_name
    FROM employee_timesheets ts
    JOIN companies_employees ce ON ts.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    WHERE ts.employee_id = ?
  `;
  const params = [employee_id];

  if (status) {
    query += ` AND ts.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY ts.period_start_date DESC LIMIT ?`;
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get timesheets for a week
 */
const getWeekTimesheets = (req, res) => {
  const { company_id, week_of } = req.params;

  if (!week_of) {
    return res.status(400).json({ error: 'week_of date is required' });
  }

  const query = `
    SELECT 
      ts.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.department_id,
      d.name as department_name
    FROM employee_timesheets ts
    JOIN companies_employees ce ON ts.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ts.company_id = ? 
      AND ts.period_start_date = ?
    ORDER BY u.name
  `;

  db.all(query, [company_id, week_of], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Submit timesheet for approval
 */
const submitTimesheet = (req, res) => {
  const { id } = req.params;
  const { submitted_by } = req.body;

  if (!submitted_by) {
    return res.status(400).json({ error: 'submitted_by is required' });
  }

  db.get('SELECT status FROM employee_timesheets WHERE id = ?', [id], (err, timesheet) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }
    if (timesheet.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft timesheets can be submitted' });
    }

    const query = `
      UPDATE employee_timesheets 
      SET status = 'submitted', 
          submitted_by = ?, 
          submitted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [submitted_by, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Timesheet submitted for approval' });
    });
  });
};

/**
 * Approve timesheet
 */
const approveTimesheet = (req, res) => {
  const { id } = req.params;
  const { approved_by, comments } = req.body;

  if (!approved_by) {
    return res.status(400).json({ error: 'approved_by is required' });
  }

  db.get('SELECT * FROM employee_timesheets WHERE id = ?', [id], (err, timesheet) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }
    if (timesheet.status !== 'submitted') {
      return res.status(400).json({ error: 'Only submitted timesheets can be approved' });
    }

    const updateQuery = `
      UPDATE employee_timesheets 
      SET status = 'approved', 
          approved_by = ?, 
          approved_at = CURRENT_TIMESTAMP,
          comments = ?
      WHERE id = ?
    `;

    db.run(updateQuery, [approved_by, comments, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Create approval record
      // TODO: Wrap both updates in a database transaction for atomicity
      const approvalQuery = `
        INSERT INTO timesheet_approvals (
          timesheet_id, approver_id, approval_status, comments, approved_at
        ) VALUES (?, ?, 'approved', ?, CURRENT_TIMESTAMP)
      `;

      db.run(approvalQuery, [id, approved_by, comments], (err) => {
        if (err) {
          console.error('Error creating approval record:', err);
        }
      });

      res.json({ message: 'Timesheet approved' });
    });
  });
};

/**
 * Reject timesheet
 */
const rejectTimesheet = (req, res) => {
  const { id } = req.params;
  const { approved_by, rejection_reason } = req.body;

  if (!approved_by || !rejection_reason) {
    return res.status(400).json({ error: 'approved_by and rejection_reason are required' });
  }

  db.get('SELECT status FROM employee_timesheets WHERE id = ?', [id], (err, timesheet) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }
    if (timesheet.status !== 'submitted') {
      return res.status(400).json({ error: 'Only submitted timesheets can be rejected' });
    }

    const updateQuery = `
      UPDATE employee_timesheets 
      SET status = 'rejected', 
          comments = ?
      WHERE id = ?
    `;

    db.run(updateQuery, [rejection_reason, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Create approval record
      const approvalQuery = `
        INSERT INTO timesheet_approvals (
          timesheet_id, approver_id, approval_status, rejection_reason
        ) VALUES (?, ?, 'rejected', ?)
      `;

      db.run(approvalQuery, [id, approved_by, rejection_reason], (err) => {
        if (err) {
          console.error('Error creating approval record:', err);
        }
      });

      res.json({ message: 'Timesheet rejected' });
    });
  });
};

/**
 * Get pending timesheet approvals
 */
const getPendingApprovals = (req, res) => {
  const { company_id } = req.params;
  const { department_id } = req.query;

  let query = `
    SELECT 
      ts.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.department_id,
      d.name as department_name,
      submitter.name as submitted_by_name
    FROM employee_timesheets ts
    JOIN companies_employees ce ON ts.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    LEFT JOIN users submitter ON ts.submitted_by = submitter.id
    WHERE ts.company_id = ? AND ts.status = 'submitted'
  `;
  const params = [company_id];

  if (department_id) {
    query += ` AND ce.department_id = ?`;
    params.push(department_id);
  }

  query += ` ORDER BY ts.submitted_at ASC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Update timesheet hours manually
 */
const updateTimesheetHours = (req, res) => {
  const { id } = req.params;
  const { regular_hours, overtime_hours, breaks_deducted, comments } = req.body;

  db.get('SELECT status FROM employee_timesheets WHERE id = ?', [id], (err, timesheet) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }
    if (timesheet.status === 'approved') {
      return res.status(400).json({ error: 'Cannot edit approved timesheet' });
    }

    let updates = [];
    let params = [];

    if (regular_hours !== undefined) {
      updates.push('total_regular_hours = ?');
      params.push(regular_hours);
    }
    if (overtime_hours !== undefined) {
      updates.push('total_overtime_hours = ?');
      params.push(overtime_hours);
    }
    if (breaks_deducted !== undefined) {
      updates.push('breaks_deducted = ?');
      params.push(breaks_deducted);
    }
    if (comments !== undefined) {
      updates.push('comments = ?');
      params.push(comments);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    const query = `UPDATE employee_timesheets SET ${updates.join(', ')} WHERE id = ?`;

    db.run(query, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Timesheet updated' });
    });
  });
};

/**
 * Get timesheet details with time entries
 */
const getTimesheetDetails = (req, res) => {
  const { id } = req.params;

  // Get timesheet
  const timesheetQuery = `
    SELECT 
      ts.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.hourly_rate
    FROM employee_timesheets ts
    JOIN companies_employees ce ON ts.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    WHERE ts.id = ?
  `;

  db.get(timesheetQuery, [id], (err, timesheet) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }

    // Get time entries
    const entriesQuery = `
      SELECT * FROM time_entries
      WHERE employee_id = ? 
        AND DATE(clock_in_time) >= ? 
        AND DATE(clock_in_time) <= ?
      ORDER BY clock_in_time
    `;

    db.all(
      entriesQuery,
      [timesheet.employee_id, timesheet.period_start_date, timesheet.period_end_date],
      (err, entries) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          timesheet,
          time_entries: entries
        });
      }
    );
  });
};

module.exports = {
  generateTimesheet,
  getTimesheet,
  getEmployeeTimesheets,
  getWeekTimesheets,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  getPendingApprovals,
  updateTimesheetHours,
  getTimesheetDetails
};
