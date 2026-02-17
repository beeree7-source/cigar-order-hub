const db = require('./database');

/**
 * Time Off Management Service
 * Handles PTO, vacation, sick leave requests and balance tracking
 */

// ==================== Time Off Balance Management ====================

/**
 * Get time off balance for an employee
 */
const getTimeOffBalance = (req, res) => {
  const { employee_id } = req.params;
  const { leave_type, year } = req.query;

  let query = `
    SELECT 
      tob.*,
      ce.employee_id as emp_number,
      u.name as employee_name
    FROM time_off_balances tob
    JOIN companies_employees ce ON tob.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    WHERE tob.employee_id = ?
  `;
  const params = [employee_id];

  if (leave_type) {
    query += ` AND tob.leave_type = ?`;
    params.push(leave_type);
  }

  if (year) {
    query += ` AND tob.year = ?`;
    params.push(year);
  } else {
    // Default to current year
    query += ` AND tob.year = ?`;
    params.push(new Date().getFullYear());
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Initialize time off balance for an employee
 */
const initializeTimeOffBalance = (req, res) => {
  const { employee_id, company_id, leave_type, total_hours, accrual_rate, year } = req.body;

  if (!employee_id || !company_id || !leave_type || total_hours === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const balanceYear = year || new Date().getFullYear();

  const query = `
    INSERT INTO time_off_balances (
      employee_id, company_id, leave_type, total_hours, 
      used_hours, available_hours, accrual_rate, year
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?)
  `;

  db.run(
    query,
    [employee_id, company_id, leave_type, total_hours, total_hours, accrual_rate, balanceYear],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Balance already exists for this employee, leave type, and year' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Time off balance initialized',
        balance_id: this.lastID
      });
    }
  );
};

/**
 * Update time off balance (for accruals or adjustments)
 */
const updateTimeOffBalance = (req, res) => {
  const { id } = req.params;
  const { total_hours, used_hours, accrual_rate } = req.body;

  let updates = [];
  let params = [];

  if (total_hours !== undefined) {
    updates.push('total_hours = ?');
    params.push(total_hours);
  }
  if (used_hours !== undefined) {
    updates.push('used_hours = ?');
    params.push(used_hours);
  }
  if (accrual_rate !== undefined) {
    updates.push('accrual_rate = ?');
    params.push(accrual_rate);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  // Always recalculate available hours
  updates.push('available_hours = total_hours - used_hours');
  updates.push('updated_at = CURRENT_TIMESTAMP');

  params.push(id);

  const query = `UPDATE time_off_balances SET ${updates.join(', ')} WHERE id = ?`;

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Balance not found' });
    }
    res.json({ message: 'Balance updated successfully' });
  });
};

// ==================== Time Off Requests ====================

/**
 * Submit a time off request
 */
const submitTimeOffRequest = (req, res) => {
  const { employee_id, company_id, leave_type, start_date, end_date, total_hours, reason } = req.body;

  if (!employee_id || !company_id || !leave_type || !start_date || !end_date || !total_hours) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if employee has sufficient balance
  const balanceQuery = `
    SELECT available_hours 
    FROM time_off_balances 
    WHERE employee_id = ? AND leave_type = ? AND year = ?
  `;

  db.get(balanceQuery, [employee_id, leave_type, new Date().getFullYear()], (err, balance) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Allow unpaid leave or if no balance tracking exists
    if (balance && leave_type !== 'unpaid' && balance.available_hours < total_hours) {
      return res.status(400).json({ 
        error: 'Insufficient time off balance',
        available: balance.available_hours,
        requested: total_hours
      });
    }

    const query = `
      INSERT INTO time_off_requests (
        employee_id, company_id, leave_type, start_date, end_date, 
        total_hours, reason, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    db.run(query, [employee_id, company_id, leave_type, start_date, end_date, total_hours, reason], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Time off request submitted',
        request_id: this.lastID
      });
    });
  });
};

/**
 * Get time off requests
 */
const getTimeOffRequests = (req, res) => {
  const { company_id } = req.params;
  const { employee_id, status, start_date, end_date } = req.query;

  let query = `
    SELECT 
      tor.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      approver.name as approver_name
    FROM time_off_requests tor
    JOIN companies_employees ce ON tor.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN users approver ON tor.approved_by = approver.id
    WHERE tor.company_id = ?
  `;
  const params = [company_id];

  if (employee_id) {
    query += ` AND tor.employee_id = ?`;
    params.push(employee_id);
  }

  if (status) {
    query += ` AND tor.status = ?`;
    params.push(status);
  }

  if (start_date && end_date) {
    query += ` AND tor.start_date >= ? AND tor.end_date <= ?`;
    params.push(start_date, end_date);
  }

  query += ` ORDER BY tor.start_date DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get a specific time off request
 */
const getTimeOffRequest = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      tor.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      approver.name as approver_name
    FROM time_off_requests tor
    JOIN companies_employees ce ON tor.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN users approver ON tor.approved_by = approver.id
    WHERE tor.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json(row);
  });
};

/**
 * Approve time off request
 */
const approveTimeOffRequest = (req, res) => {
  const { id } = req.params;
  const { approved_by, notes } = req.body;

  if (!approved_by) {
    return res.status(400).json({ error: 'approved_by is required' });
  }

  // Get request details
  db.get('SELECT * FROM time_off_requests WHERE id = ?', [id], (err, request) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    // Update request status
    // TODO: Wrap this and balance update in a database transaction for atomicity
    const updateQuery = `
      UPDATE time_off_requests 
      SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, notes = ?
      WHERE id = ?
    `;

    db.run(updateQuery, [approved_by, notes, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Update balance if not unpaid leave
      // Note: This should be in a transaction with the status update above
      if (request.leave_type !== 'unpaid') {
        const balanceQuery = `
          UPDATE time_off_balances 
          SET used_hours = used_hours + ?,
              available_hours = available_hours - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE employee_id = ? AND leave_type = ? AND year = ?
        `;

        db.run(
          balanceQuery,
          [request.total_hours, request.total_hours, request.employee_id, request.leave_type, new Date().getFullYear()],
          (err) => {
            if (err) {
              console.error('Error updating balance:', err);
              // Don't fail the approval, just log the error
            }
          }
        );
      }

      res.json({ message: 'Time off request approved' });
    });
  });
};

/**
 * Deny time off request
 */
const denyTimeOffRequest = (req, res) => {
  const { id } = req.params;
  const { approved_by, denial_reason } = req.body;

  if (!approved_by || !denial_reason) {
    return res.status(400).json({ error: 'approved_by and denial_reason are required' });
  }

  db.get('SELECT status FROM time_off_requests WHERE id = ?', [id], (err, request) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }

    const query = `
      UPDATE time_off_requests 
      SET status = 'denied', approved_by = ?, approved_at = CURRENT_TIMESTAMP, denial_reason = ?
      WHERE id = ?
    `;

    db.run(query, [approved_by, denial_reason, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Time off request denied' });
    });
  });
};

/**
 * Cancel time off request
 */
const cancelTimeOffRequest = (req, res) => {
  const { id } = req.params;
  // Note: In production, employee_id should come from authenticated user's JWT token
  // For now, we accept it from request body but this should be validated against auth token
  const { employee_id } = req.body;

  if (!employee_id) {
    return res.status(400).json({ error: 'employee_id is required' });
  }

  // Get request details
  db.get('SELECT * FROM time_off_requests WHERE id = ?', [id], (err, request) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    // TODO: In production, verify employee_id matches authenticated user from JWT token
    if (request.employee_id !== employee_id) {
      return res.status(403).json({ error: 'Unauthorized to cancel this request' });
    }
    if (request.status === 'cancelled') {
      return res.status(400).json({ error: 'Request is already cancelled' });
    }

    // If approved, need to restore balance
    // TODO: Wrap status update and balance restoration in a transaction
    if (request.status === 'approved' && request.leave_type !== 'unpaid') {
      const balanceQuery = `
        UPDATE time_off_balances 
        SET used_hours = used_hours - ?,
            available_hours = available_hours + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ? AND leave_type = ? AND year = ?
      `;

      db.run(
        balanceQuery,
        [request.total_hours, request.total_hours, request.employee_id, request.leave_type, new Date().getFullYear()],
        (err) => {
          if (err) {
            console.error('Error restoring balance:', err);
          }
        }
      );
    }

    const query = `UPDATE time_off_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(query, [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Time off request cancelled' });
    });
  });
};

/**
 * Get time off calendar (all requests in date range)
 */
const getTimeOffCalendar = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date, department_id } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  let query = `
    SELECT 
      tor.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.department_id,
      d.name as department_name
    FROM time_off_requests tor
    JOIN companies_employees ce ON tor.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE tor.company_id = ? 
      AND tor.status = 'approved'
      AND tor.start_date <= ? 
      AND tor.end_date >= ?
  `;
  const params = [company_id, end_date, start_date];

  if (department_id) {
    query += ` AND ce.department_id = ?`;
    params.push(department_id);
  }

  query += ` ORDER BY tor.start_date`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Process accruals for all employees
 */
const processAccruals = (req, res) => {
  const { company_id } = req.body;

  if (!company_id) {
    return res.status(400).json({ error: 'company_id is required' });
  }

  const query = `
    UPDATE time_off_balances
    SET total_hours = total_hours + COALESCE(accrual_rate, 0),
        available_hours = available_hours + COALESCE(accrual_rate, 0),
        last_accrual_date = DATE('now'),
        updated_at = CURRENT_TIMESTAMP
    WHERE company_id = ? 
      AND accrual_rate IS NOT NULL 
      AND accrual_rate > 0
  `;

  db.run(query, [company_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'Accruals processed',
      records_updated: this.changes
    });
  });
};

module.exports = {
  getTimeOffBalance,
  initializeTimeOffBalance,
  updateTimeOffBalance,
  submitTimeOffRequest,
  getTimeOffRequests,
  getTimeOffRequest,
  approveTimeOffRequest,
  denyTimeOffRequest,
  cancelTimeOffRequest,
  getTimeOffCalendar,
  processAccruals
};
