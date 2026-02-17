const db = require('./database');

/**
 * Time Clock Service
 * Handles employee clock in/out, break tracking, and time entry management
 */

// ==================== Clock In/Out ====================

/**
 * Clock in an employee
 */
const clockIn = (req, res) => {
  const { company_id, employee_id, location_latitude, location_longitude, device_type, notes } = req.body;

  if (!company_id || !employee_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if employee is already clocked in
  const checkQuery = `
    SELECT id FROM time_entries 
    WHERE employee_id = ? AND clock_out_time IS NULL
    ORDER BY clock_in_time DESC LIMIT 1
  `;

  db.get(checkQuery, [employee_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(400).json({ error: 'Employee is already clocked in' });
    }

    // Verify GPS if required
    if (location_latitude && location_longitude) {
      const settingsQuery = 'SELECT gps_verification_required FROM company_payroll_settings WHERE company_id = ?';
      db.get(settingsQuery, [company_id], (err, settings) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Proceed with clock in
        performClockIn();
      });
    } else {
      performClockIn();
    }

    function performClockIn() {
      const query = `
        INSERT INTO time_entries (
          company_id, employee_id, clock_in_time, location_latitude, 
          location_longitude, device_type, notes, status
        ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, 'completed')
      `;

      db.run(query, [company_id, employee_id, location_latitude, location_longitude, device_type, notes], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // Get the created entry
        db.get('SELECT * FROM time_entries WHERE id = ?', [this.lastID], (err, entry) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json({
            message: 'Clocked in successfully',
            entry
          });
        });
      });
    }
  });
};

/**
 * Clock out an employee
 */
const clockOut = (req, res) => {
  const { entry_id, location_latitude, location_longitude, notes } = req.body;

  if (!entry_id) {
    return res.status(400).json({ error: 'Missing entry_id' });
  }

  // Check if entry exists and is not already clocked out
  const checkQuery = 'SELECT * FROM time_entries WHERE id = ? AND clock_out_time IS NULL';

  db.get(checkQuery, [entry_id], (err, entry) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!entry) {
      return res.status(404).json({ error: 'Active time entry not found' });
    }

    const query = `
      UPDATE time_entries 
      SET clock_out_time = CURRENT_TIMESTAMP,
          location_latitude = COALESCE(?, location_latitude),
          location_longitude = COALESCE(?, location_longitude),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `;

    db.run(query, [location_latitude, location_longitude, notes, entry_id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get updated entry with calculated hours
      db.get(`
        SELECT *,
          ROUND((julianday(clock_out_time) - julianday(clock_in_time)) * 24, 2) as hours_worked
        FROM time_entries 
        WHERE id = ?
      `, [entry_id], (err, updatedEntry) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({
          message: 'Clocked out successfully',
          entry: updatedEntry
        });
      });
    });
  });
};

/**
 * Start break
 */
const startBreak = (req, res) => {
  const { entry_id } = req.body;

  if (!entry_id) {
    return res.status(400).json({ error: 'Missing entry_id' });
  }

  const query = `
    UPDATE time_entries 
    SET break_start = CURRENT_TIMESTAMP
    WHERE id = ? AND clock_out_time IS NULL AND break_start IS NULL
  `;

  db.run(query, [entry_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(400).json({ error: 'Cannot start break - entry not found or already on break' });
    }
    res.json({ message: 'Break started successfully' });
  });
};

/**
 * End break
 */
const endBreak = (req, res) => {
  const { entry_id } = req.body;

  if (!entry_id) {
    return res.status(400).json({ error: 'Missing entry_id' });
  }

  const query = `
    UPDATE time_entries 
    SET break_end = CURRENT_TIMESTAMP
    WHERE id = ? AND break_start IS NOT NULL AND break_end IS NULL
  `;

  db.run(query, [entry_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(400).json({ error: 'Cannot end break - entry not found or break not started' });
    }

    // Get break duration
    db.get(`
      SELECT 
        ROUND((julianday(break_end) - julianday(break_start)) * 24 * 60, 0) as break_minutes
      FROM time_entries 
      WHERE id = ?
    `, [entry_id], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ 
        message: 'Break ended successfully',
        break_minutes: result.break_minutes
      });
    });
  });
};

/**
 * Get current clock status for employee
 */
const getClockStatus = (req, res) => {
  const { employee_id } = req.params;

  const query = `
    SELECT 
      te.*,
      CASE 
        WHEN te.clock_out_time IS NULL THEN 
          ROUND((julianday('now') - julianday(te.clock_in_time)) * 24, 2)
        ELSE 
          ROUND((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24, 2)
      END as hours_worked,
      CASE 
        WHEN te.break_start IS NOT NULL AND te.break_end IS NULL THEN 1
        ELSE 0
      END as on_break
    FROM time_entries te
    WHERE te.employee_id = ? AND te.clock_out_time IS NULL
    ORDER BY te.clock_in_time DESC
    LIMIT 1
  `;

  db.get(query, [employee_id], (err, entry) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!entry) {
      return res.json({ 
        clocked_in: false,
        message: 'Employee is not clocked in'
      });
    }

    res.json({
      clocked_in: true,
      entry
    });
  });
};

/**
 * Get today's time entries for employee
 */
const getTodayEntries = (req, res) => {
  const { employee_id } = req.params;

  const query = `
    SELECT 
      te.*,
      ROUND((julianday(COALESCE(te.clock_out_time, 'now')) - julianday(te.clock_in_time)) * 24, 2) as hours_worked,
      CASE 
        WHEN te.break_start IS NOT NULL AND te.break_end IS NOT NULL THEN
          ROUND((julianday(te.break_end) - julianday(te.break_start)) * 60, 0)
        ELSE 0
      END as break_minutes
    FROM time_entries te
    WHERE te.employee_id = ? 
    AND DATE(te.clock_in_time) = DATE('now')
    ORDER BY te.clock_in_time DESC
  `;

  db.all(query, [employee_id], (err, entries) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const totalHours = entries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
    
    res.json({
      entries,
      total_hours: totalHours.toFixed(2)
    });
  });
};

/**
 * Get time entries for date range
 */
const getEntriesInRange = (req, res) => {
  const { employee_id, start_date, end_date } = req.query;
  const { company_id } = req.params;

  let query = `
    SELECT 
      te.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ROUND((julianday(COALESCE(te.clock_out_time, 'now')) - julianday(te.clock_in_time)) * 24, 2) as hours_worked,
      CASE 
        WHEN te.break_start IS NOT NULL AND te.break_end IS NOT NULL THEN
          ROUND((julianday(te.break_end) - julianday(te.break_start)) * 60, 0)
        ELSE 0
      END as break_minutes
    FROM time_entries te
    JOIN companies_employees ce ON te.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    WHERE te.company_id = ?
  `;

  const params = [company_id];

  if (employee_id) {
    query += ' AND te.employee_id = ?';
    params.push(employee_id);
  }

  if (start_date) {
    query += ' AND DATE(te.clock_in_time) >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND DATE(te.clock_in_time) <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY te.clock_in_time DESC';

  db.all(query, params, (err, entries) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(entries);
  });
};

/**
 * Adjust time entry (requires approval)
 */
const adjustTimeEntry = (req, res) => {
  const { entry_id, clock_in_time, clock_out_time, break_start, break_end, edited_reason, edited_by } = req.body;

  if (!entry_id || !edited_by || !edited_reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    UPDATE time_entries 
    SET clock_in_time = COALESCE(?, clock_in_time),
        clock_out_time = COALESCE(?, clock_out_time),
        break_start = COALESCE(?, break_start),
        break_end = COALESCE(?, break_end),
        status = 'edited',
        edited_by = ?,
        edited_reason = ?
    WHERE id = ?
  `;

  db.run(query, [clock_in_time, clock_out_time, break_start, break_end, edited_by, edited_reason, entry_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    res.json({ message: 'Time entry adjusted successfully' });
  });
};

/**
 * Delete time entry
 */
const deleteTimeEntry = (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM time_entries WHERE id = ?';

  db.run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Time entry not found' });
    }
    res.json({ message: 'Time entry deleted successfully' });
  });
};

/**
 * Bulk import time entries
 */
const bulkImportEntries = (req, res) => {
  const { entries } = req.body;

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: 'No entries provided' });
  }

  const query = `
    INSERT INTO time_entries (
      company_id, employee_id, clock_in_time, clock_out_time, 
      break_start, break_end, device_type, notes, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
  `;

  let completed = 0;
  let errors = [];
  let processedCount = 0;

  entries.forEach((entry, index) => {
    db.run(
      query,
      [
        entry.company_id, 
        entry.employee_id, 
        entry.clock_in_time, 
        entry.clock_out_time,
        entry.break_start || null,
        entry.break_end || null,
        entry.device_type || 'web',
        entry.notes || null
      ],
      function(err) {
        processedCount++;
        
        if (err) {
          errors.push({ index, error: err.message });
        } else {
          completed++;
        }

        // Send response only after all operations complete
        if (processedCount === entries.length) {
          res.json({
            message: 'Bulk import completed',
            total: entries.length,
            completed,
            errors: errors.length > 0 ? errors : undefined
          });
        }
      }
    );
  });
};

/**
 * Get late arrivals for company
 */
const getLateArrivals = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  const query = `
    SELECT 
      te.id,
      te.clock_in_time,
      es.start_time as scheduled_start,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ROUND((julianday(time(te.clock_in_time)) - julianday(es.start_time)) * 24 * 60, 0) as minutes_late
    FROM time_entries te
    JOIN companies_employees ce ON te.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    JOIN employee_schedules es ON te.employee_id = es.employee_id 
      AND DATE(te.clock_in_time) = es.scheduled_date
    WHERE te.company_id = ?
    AND time(te.clock_in_time) > es.start_time
    AND DATE(te.clock_in_time) >= ?
    AND DATE(te.clock_in_time) <= ?
    ORDER BY te.clock_in_time DESC
  `;

  db.all(query, [company_id, start_date, end_date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Calculate hours for timesheet period
 */
const calculateTimesheetHours = (req, res) => {
  const { employee_id, start_date, end_date } = req.query;

  const query = `
    SELECT 
      COUNT(*) as total_entries,
      ROUND(SUM((julianday(clock_out_time) - julianday(clock_in_time)) * 24), 2) as total_hours,
      ROUND(SUM(
        CASE 
          WHEN break_start IS NOT NULL AND break_end IS NOT NULL THEN
            (julianday(break_end) - julianday(break_start)) * 24
          ELSE 0
        END
      ), 2) as total_break_hours
    FROM time_entries
    WHERE employee_id = ?
    AND clock_out_time IS NOT NULL
    AND DATE(clock_in_time) >= ?
    AND DATE(clock_in_time) <= ?
  `;

  db.get(query, [employee_id, start_date, end_date], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const netHours = (result.total_hours || 0) - (result.total_break_hours || 0);

    res.json({
      total_entries: result.total_entries || 0,
      total_hours: result.total_hours || 0,
      total_break_hours: result.total_break_hours || 0,
      net_hours: netHours.toFixed(2)
    });
  });
};

module.exports = {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getClockStatus,
  getTodayEntries,
  getEntriesInRange,
  adjustTimeEntry,
  deleteTimeEntry,
  bulkImportEntries,
  getLateArrivals,
  calculateTimesheetHours
};
