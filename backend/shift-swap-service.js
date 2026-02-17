const db = require('./database');

/**
 * Shift Swap Service
 * Handles shift swap requests, coverage validation, and approval workflows
 */

// ==================== Shift Swap Management ====================

/**
 * Create a shift swap request
 */
const createSwapRequest = (req, res) => {
  const { company_id, requesting_employee_id, target_schedule_id, covering_employee_id, notes } = req.body;

  if (!company_id || !requesting_employee_id || !target_schedule_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get schedule details
  const scheduleQuery = 'SELECT scheduled_date, employee_id FROM employee_schedules WHERE id = ?';
  
  db.get(scheduleQuery, [target_schedule_id], (err, schedule) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // Verify the requesting employee owns this schedule
    if (schedule.employee_id !== requesting_employee_id) {
      return res.status(403).json({ error: 'You can only swap your own shifts' });
    }

    const query = `
      INSERT INTO shift_swap_requests (
        company_id, requesting_employee_id, target_schedule_id, 
        covering_employee_id, swap_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `;

    db.run(
      query,
      [company_id, requesting_employee_id, target_schedule_id, covering_employee_id, schedule.scheduled_date, notes],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          message: 'Shift swap request created successfully',
          request_id: this.lastID
        });
      }
    );
  });
};

/**
 * Get all swap requests for a company
 */
const getSwapRequests = (req, res) => {
  const { company_id } = req.params;
  const { employee_id, status } = req.query;

  let query = `
    SELECT 
      ssr.*,
      req_emp.employee_id as requesting_emp_number,
      req_user.name as requesting_employee_name,
      cov_emp.employee_id as covering_emp_number,
      cov_user.name as covering_employee_name,
      es.scheduled_date,
      es.start_time,
      es.end_time,
      s.shift_name,
      approver.name as approved_by_name
    FROM shift_swap_requests ssr
    JOIN companies_employees req_emp ON ssr.requesting_employee_id = req_emp.id
    JOIN users req_user ON req_emp.user_id = req_user.id
    LEFT JOIN companies_employees cov_emp ON ssr.covering_employee_id = cov_emp.id
    LEFT JOIN users cov_user ON cov_emp.user_id = cov_user.id
    JOIN employee_schedules es ON ssr.target_schedule_id = es.id
    LEFT JOIN employee_shifts s ON es.shift_id = s.id
    LEFT JOIN users approver ON ssr.approved_by = approver.id
    WHERE ssr.company_id = ?
  `;

  const params = [company_id];

  if (employee_id) {
    query += ' AND (ssr.requesting_employee_id = ? OR ssr.covering_employee_id = ?)';
    params.push(employee_id, employee_id);
  }

  if (status) {
    query += ' AND ssr.status = ?';
    params.push(status);
  }

  query += ' ORDER BY ssr.requested_at DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Approve swap request
 */
const approveSwapRequest = (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  if (!approved_by) {
    return res.status(400).json({ error: 'Missing approved_by' });
  }

  // Get swap request details
  const getRequestQuery = `
    SELECT ssr.*, es.employee_id, es.scheduled_date, es.start_time, es.end_time
    FROM shift_swap_requests ssr
    JOIN employee_schedules es ON ssr.target_schedule_id = es.id
    WHERE ssr.id = ?
  `;

  db.get(getRequestQuery, [id], (err, request) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!request) {
      return res.status(404).json({ error: 'Swap request not found' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Swap request is not pending' });
    }

    // Check if covering employee has conflicts
    if (request.covering_employee_id) {
      const conflictQuery = `
        SELECT id FROM employee_schedules 
        WHERE employee_id = ? AND scheduled_date = ? AND status != 'cancelled'
      `;

      db.get(conflictQuery, [request.covering_employee_id, request.scheduled_date], (err, conflict) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (conflict) {
          return res.status(409).json({ error: 'Covering employee has a schedule conflict' });
        }

        performSwap();
      });
    } else {
      // No covering employee specified, just approve the swap
      performSwap();
    }

    function performSwap() {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Update swap request status
        db.run(
          `UPDATE shift_swap_requests 
           SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [approved_by, id],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
          }
        );

        if (request.covering_employee_id) {
          // Update the schedule to the covering employee
          db.run(
            `UPDATE employee_schedules 
             SET employee_id = ? 
             WHERE id = ?`,
            [request.covering_employee_id, request.target_schedule_id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
            }
          );

          // Mark as completed
          db.run(
            `UPDATE shift_swap_requests SET status = 'completed' WHERE id = ?`,
            [id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }

              db.run('COMMIT');
              res.json({ message: 'Shift swap approved and completed successfully' });
            }
          );
        } else {
          // Just cancel the schedule since no covering employee
          db.run(
            `UPDATE employee_schedules 
             SET status = 'cancelled' 
             WHERE id = ?`,
            [request.target_schedule_id],
            function(err) {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }

              db.run('COMMIT');
              res.json({ message: 'Shift swap approved - schedule cancelled' });
            }
          );
        }
      });
    }
  });
};

/**
 * Deny swap request
 */
const denySwapRequest = (req, res) => {
  const { id } = req.params;
  const { approved_by, notes } = req.body;

  if (!approved_by) {
    return res.status(400).json({ error: 'Missing approved_by' });
  }

  const query = `
    UPDATE shift_swap_requests 
    SET status = 'denied',
        approved_by = ?,
        approved_at = CURRENT_TIMESTAMP,
        notes = COALESCE(?, notes)
    WHERE id = ? AND status = 'pending'
  `;

  db.run(query, [approved_by, notes, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Swap request not found or not pending' });
    }
    res.json({ message: 'Shift swap request denied' });
  });
};

/**
 * Cancel swap request (by requesting employee)
 */
const cancelSwapRequest = (req, res) => {
  const { id } = req.params;
  const { employee_id } = req.body;

  if (!employee_id) {
    return res.status(400).json({ error: 'Missing employee_id' });
  }

  const query = `
    UPDATE shift_swap_requests 
    SET status = 'cancelled'
    WHERE id = ? AND requesting_employee_id = ? AND status = 'pending'
  `;

  db.run(query, [id, employee_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Swap request not found or cannot be cancelled' });
    }
    res.json({ message: 'Shift swap request cancelled' });
  });
};

/**
 * Get available shifts for swapping
 */
const getAvailableShifts = (req, res) => {
  const { company_id } = req.params;
  const { employee_id, date } = req.query;

  // Get shifts that other employees are willing to give up or need coverage
  const query = `
    SELECT DISTINCT
      es.id as schedule_id,
      es.scheduled_date,
      es.start_time,
      es.end_time,
      s.shift_name,
      ce.employee_id as emp_number,
      u.name as current_employee_name,
      d.name as department_name
    FROM employee_schedules es
    JOIN companies_employees ce ON es.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN employee_shifts s ON es.shift_id = s.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE es.company_id = ?
    AND es.status = 'scheduled'
    AND es.published = 1
    AND es.employee_id != COALESCE(?, 0)
    AND es.scheduled_date >= DATE('now')
    AND NOT EXISTS (
      SELECT 1 FROM shift_swap_requests ssr 
      WHERE ssr.target_schedule_id = es.id 
      AND ssr.status IN ('pending', 'approved')
    )
  `;

  const params = [company_id, employee_id];

  if (date) {
    params.push(date);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Request coverage for a shift (without specific covering employee)
 */
const requestCoverage = (req, res) => {
  const { company_id, requesting_employee_id, target_schedule_id, notes } = req.body;

  if (!company_id || !requesting_employee_id || !target_schedule_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get schedule details
  const scheduleQuery = 'SELECT scheduled_date, employee_id FROM employee_schedules WHERE id = ?';
  
  db.get(scheduleQuery, [target_schedule_id], (err, schedule) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    if (schedule.employee_id !== requesting_employee_id) {
      return res.status(403).json({ error: 'You can only request coverage for your own shifts' });
    }

    const query = `
      INSERT INTO shift_swap_requests (
        company_id, requesting_employee_id, target_schedule_id, 
        swap_date, status, notes
      ) VALUES (?, ?, ?, ?, 'pending', ?)
    `;

    db.run(
      query,
      [company_id, requesting_employee_id, target_schedule_id, schedule.scheduled_date, notes || 'Coverage requested'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          message: 'Coverage request created successfully',
          request_id: this.lastID
        });
      }
    );
  });
};

/**
 * Offer to cover a shift
 */
const offerToCover = (req, res) => {
  const { request_id, covering_employee_id } = req.body;

  if (!request_id || !covering_employee_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get swap request details
  const requestQuery = `SELECT * FROM shift_swap_requests WHERE id = ? AND status = 'pending'`;
  
  db.get(requestQuery, [request_id], (err, request) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!request) {
      return res.status(404).json({ error: 'Swap request not found or not pending' });
    }
    if (request.covering_employee_id) {
      return res.status(400).json({ error: 'This swap already has a covering employee' });
    }

    // Check for conflicts
    const conflictQuery = `
      SELECT id FROM employee_schedules 
      WHERE employee_id = ? AND scheduled_date = ? AND status != 'cancelled'
    `;

    db.get(conflictQuery, [covering_employee_id, request.swap_date], (err, conflict) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (conflict) {
        return res.status(409).json({ error: 'You have a schedule conflict on this date' });
      }

      const updateQuery = `
        UPDATE shift_swap_requests 
        SET covering_employee_id = ?
        WHERE id = ?
      `;

      db.run(updateQuery, [covering_employee_id, request_id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Offer to cover shift submitted successfully' });
      });
    });
  });
};

/**
 * Get swap request history for employee
 */
const getSwapHistory = (req, res) => {
  const { employee_id } = req.params;
  const { limit = 50 } = req.query;

  const query = `
    SELECT 
      ssr.*,
      req_user.name as requesting_employee_name,
      cov_user.name as covering_employee_name,
      es.scheduled_date,
      es.start_time,
      es.end_time,
      s.shift_name
    FROM shift_swap_requests ssr
    LEFT JOIN companies_employees req_emp ON ssr.requesting_employee_id = req_emp.id
    LEFT JOIN users req_user ON req_emp.user_id = req_user.id
    LEFT JOIN companies_employees cov_emp ON ssr.covering_employee_id = cov_emp.id
    LEFT JOIN users cov_user ON cov_emp.user_id = cov_user.id
    JOIN employee_schedules es ON ssr.target_schedule_id = es.id
    LEFT JOIN employee_shifts s ON es.shift_id = s.id
    WHERE ssr.requesting_employee_id = ? OR ssr.covering_employee_id = ?
    ORDER BY ssr.requested_at DESC
    LIMIT ?
  `;

  db.all(query, [employee_id, employee_id, parseInt(limit)], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

module.exports = {
  createSwapRequest,
  getSwapRequests,
  approveSwapRequest,
  denySwapRequest,
  cancelSwapRequest,
  getAvailableShifts,
  requestCoverage,
  offerToCover,
  getSwapHistory
};
