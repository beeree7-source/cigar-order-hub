const db = require('./database');

/**
 * Scheduling Service
 * Handles employee scheduling, shift management, and schedule operations
 */

// ==================== Shift Management ====================

/**
 * Create a new shift definition
 */
const createShift = (req, res) => {
  const { company_id, shift_name, start_time, end_time, break_duration, lunch_duration, days_of_week, is_recurring } = req.body;

  if (!company_id || !shift_name || !start_time || !end_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO employee_shifts (
      company_id, shift_name, start_time, end_time, break_duration, 
      lunch_duration, days_of_week, is_recurring
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const daysJson = days_of_week ? JSON.stringify(days_of_week) : null;

  db.run(
    query,
    [company_id, shift_name, start_time, end_time, break_duration || 0, lunch_duration || 0, daysJson, is_recurring !== false ? 1 : 0],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Shift created successfully',
        shift_id: this.lastID
      });
    }
  );
};

/**
 * Get all shifts for a company
 */
const getShifts = (req, res) => {
  const { company_id } = req.params;

  const query = 'SELECT * FROM employee_shifts WHERE company_id = ? ORDER BY shift_name';

  db.all(query, [company_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const shifts = rows.map(shift => ({
      ...shift,
      days_of_week: shift.days_of_week ? JSON.parse(shift.days_of_week) : null
    }));
    
    res.json(shifts);
  });
};

/**
 * Update shift definition
 */
const updateShift = (req, res) => {
  const { id } = req.params;
  const { shift_name, start_time, end_time, break_duration, lunch_duration, days_of_week, is_recurring } = req.body;

  const daysJson = days_of_week ? JSON.stringify(days_of_week) : null;

  const query = `
    UPDATE employee_shifts 
    SET shift_name = COALESCE(?, shift_name),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        break_duration = COALESCE(?, break_duration),
        lunch_duration = COALESCE(?, lunch_duration),
        days_of_week = COALESCE(?, days_of_week),
        is_recurring = COALESCE(?, is_recurring)
    WHERE id = ?
  `;

  db.run(query, [shift_name, start_time, end_time, break_duration, lunch_duration, daysJson, is_recurring, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift updated successfully' });
  });
};

/**
 * Delete shift definition
 */
const deleteShift = (req, res) => {
  const { id } = req.params;

  const query = 'DELETE FROM employee_shifts WHERE id = ?';

  db.run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }
    res.json({ message: 'Shift deleted successfully' });
  });
};

// ==================== Schedule Management ====================

/**
 * Create a new schedule for an employee
 */
const createSchedule = (req, res) => {
  const { company_id, employee_id, shift_id, scheduled_date, start_time, end_time, created_by } = req.body;

  if (!company_id || !employee_id || !scheduled_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check for conflicts
  const conflictQuery = `
    SELECT id FROM employee_schedules 
    WHERE employee_id = ? AND scheduled_date = ? AND status != 'cancelled'
  `;

  db.get(conflictQuery, [employee_id, scheduled_date], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      return res.status(409).json({ error: 'Schedule conflict: Employee already scheduled for this date' });
    }

    const query = `
      INSERT INTO employee_schedules (
        company_id, employee_id, shift_id, scheduled_date, start_time, 
        end_time, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `;

    db.run(query, [company_id, employee_id, shift_id, scheduled_date, start_time, end_time, created_by], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Schedule created successfully',
        schedule_id: this.lastID
      });
    });
  });
};

/**
 * Get schedule by ID
 */
const getSchedule = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      es.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      s.shift_name,
      s.start_time as shift_start,
      s.end_time as shift_end
    FROM employee_schedules es
    JOIN companies_employees ce ON es.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN employee_shifts s ON es.shift_id = s.id
    WHERE es.id = ?
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json(row);
  });
};

/**
 * Update schedule
 */
const updateSchedule = (req, res) => {
  const { id } = req.params;
  const { shift_id, scheduled_date, start_time, end_time, status, approved_by } = req.body;

  const query = `
    UPDATE employee_schedules 
    SET shift_id = COALESCE(?, shift_id),
        scheduled_date = COALESCE(?, scheduled_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        status = COALESCE(?, status),
        approved_by = COALESCE(?, approved_by)
    WHERE id = ?
  `;

  db.run(query, [shift_id, scheduled_date, start_time, end_time, status, approved_by, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule updated successfully' });
  });
};

/**
 * Delete schedule
 */
const deleteSchedule = (req, res) => {
  const { id } = req.params;

  const query = `UPDATE employee_schedules SET status = 'cancelled' WHERE id = ?`;

  db.run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.json({ message: 'Schedule cancelled successfully' });
  });
};

/**
 * Get weekly schedules
 */
const getWeeklySchedules = (req, res) => {
  const { company_id, date } = req.params;

  const query = `
    SELECT 
      es.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      d.name as department_name,
      s.shift_name
    FROM employee_schedules es
    JOIN companies_employees ce ON es.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    LEFT JOIN employee_shifts s ON es.shift_id = s.id
    WHERE es.company_id = ? 
    AND es.scheduled_date >= date(?, '-' || strftime('%w', ?) || ' days')
    AND es.scheduled_date < date(?, '+' || (7 - strftime('%w', ?)) || ' days')
    AND es.status != 'cancelled'
    ORDER BY es.scheduled_date, es.start_time
  `;

  db.all(query, [company_id, date, date, date, date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get monthly schedules
 */
const getMonthlySchedules = (req, res) => {
  const { company_id, date } = req.params;

  const query = `
    SELECT 
      es.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      d.name as department_name,
      s.shift_name
    FROM employee_schedules es
    JOIN companies_employees ce ON es.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    LEFT JOIN employee_shifts s ON es.shift_id = s.id
    WHERE es.company_id = ? 
    AND strftime('%Y-%m', es.scheduled_date) = strftime('%Y-%m', ?)
    AND es.status != 'cancelled'
    ORDER BY es.scheduled_date, es.start_time
  `;

  db.all(query, [company_id, date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Publish schedules
 */
const publishSchedules = (req, res) => {
  const { schedule_ids } = req.body;

  if (!schedule_ids || !Array.isArray(schedule_ids) || schedule_ids.length === 0) {
    return res.status(400).json({ error: 'No schedule IDs provided' });
  }

  const placeholders = schedule_ids.map(() => '?').join(',');
  const query = `UPDATE employee_schedules SET published = 1 WHERE id IN (${placeholders})`;

  db.run(query, schedule_ids, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ 
      message: 'Schedules published successfully',
      count: this.changes
    });
  });
};

/**
 * Detect schedule conflicts
 */
const detectConflicts = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  const query = `
    SELECT 
      e1.id as schedule1_id,
      e2.id as schedule2_id,
      e1.employee_id,
      e1.scheduled_date,
      e1.start_time as start1,
      e1.end_time as end1,
      e2.start_time as start2,
      e2.end_time as end2,
      u.name as employee_name
    FROM employee_schedules e1
    JOIN employee_schedules e2 ON e1.employee_id = e2.employee_id 
      AND e1.scheduled_date = e2.scheduled_date 
      AND e1.id < e2.id
    JOIN companies_employees ce ON e1.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    WHERE e1.company_id = ?
    AND e1.scheduled_date >= ?
    AND e1.scheduled_date <= ?
    AND e1.status != 'cancelled'
    AND e2.status != 'cancelled'
  `;

  db.all(query, [company_id, start_date, end_date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ conflicts: rows });
  });
};

/**
 * Create recurring schedules from template
 */
const createRecurringSchedules = (req, res) => {
  const { company_id, employee_id, shift_id, start_date, end_date, days_of_week, created_by } = req.body;

  if (!company_id || !employee_id || !shift_id || !start_date || !end_date || !days_of_week) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Get shift details
  const shiftQuery = 'SELECT start_time, end_time FROM employee_shifts WHERE id = ?';
  
  db.get(shiftQuery, [shift_id], (err, shift) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const schedules = [];
    const currentDate = new Date(start_date);
    const endDateObj = new Date(end_date);

    while (currentDate <= endDateObj) {
      const dayOfWeek = currentDate.getDay();
      if (days_of_week.includes(dayOfWeek)) {
        schedules.push({
          company_id,
          employee_id,
          shift_id,
          scheduled_date: currentDate.toISOString().split('T')[0],
          start_time: shift.start_time,
          end_time: shift.end_time,
          created_by
        });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (schedules.length === 0) {
      return res.json({ message: 'No schedules created', count: 0 });
    }

    const insertQuery = `
      INSERT INTO employee_schedules (
        company_id, employee_id, shift_id, scheduled_date, 
        start_time, end_time, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `;

    let completed = 0;
    let errors = [];

    schedules.forEach((schedule, index) => {
      db.run(
        insertQuery,
        [schedule.company_id, schedule.employee_id, schedule.shift_id, 
         schedule.scheduled_date, schedule.start_time, schedule.end_time, schedule.created_by],
        function(err) {
          if (err) {
            errors.push({ date: schedule.scheduled_date, error: err.message });
          } else {
            completed++;
          }

          if (index === schedules.length - 1) {
            res.json({
              message: 'Recurring schedules created',
              total: schedules.length,
              completed,
              errors: errors.length > 0 ? errors : undefined
            });
          }
        }
      );
    });
  });
};

/**
 * Get department coverage for date range
 */
const getDepartmentCoverage = (req, res) => {
  const { company_id, department_id } = req.params;
  const { start_date, end_date } = req.query;

  const query = `
    SELECT 
      es.scheduled_date,
      COUNT(DISTINCT es.employee_id) as scheduled_employees,
      COUNT(DISTINCT ce.id) as total_employees,
      GROUP_CONCAT(DISTINCT u.name) as scheduled_names
    FROM employee_schedules es
    JOIN companies_employees ce ON es.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    WHERE es.company_id = ?
    AND ce.department_id = ?
    AND es.scheduled_date >= ?
    AND es.scheduled_date <= ?
    AND es.status != 'cancelled'
    GROUP BY es.scheduled_date
    ORDER BY es.scheduled_date
  `;

  db.all(query, [company_id, department_id, start_date, end_date], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get employee schedules
 */
const getEmployeeSchedules = (req, res) => {
  const { employee_id } = req.params;
  const { start_date, end_date } = req.query;

  let query = `
    SELECT 
      es.*,
      s.shift_name,
      s.break_duration,
      s.lunch_duration
    FROM employee_schedules es
    LEFT JOIN employee_shifts s ON es.shift_id = s.id
    WHERE es.employee_id = ?
    AND es.status != 'cancelled'
  `;

  const params = [employee_id];

  if (start_date && end_date) {
    query += ' AND es.scheduled_date >= ? AND es.scheduled_date <= ?';
    params.push(start_date, end_date);
  }

  query += ' ORDER BY es.scheduled_date';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

module.exports = {
  // Shift management
  createShift,
  getShifts,
  updateShift,
  deleteShift,
  
  // Schedule management
  createSchedule,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  getWeeklySchedules,
  getMonthlySchedules,
  publishSchedules,
  detectConflicts,
  createRecurringSchedules,
  getDepartmentCoverage,
  getEmployeeSchedules
};
