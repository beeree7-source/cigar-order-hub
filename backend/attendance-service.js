const db = require('./database');

/**
 * Attendance Service
 * Handles employee attendance tracking, absence management, and approval workflows
 */

// ==================== Attendance Management ====================

/**
 * Mark attendance for an employee
 */
const markAttendance = (req, res) => {
  const { company_id, employee_id, attendance_date, status, check_in_time, check_out_time, reason, approved_by } = req.body;

  if (!company_id || !employee_id || !attendance_date || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO attendance_records (
      company_id, employee_id, attendance_date, status, check_in_time, 
      check_out_time, reason, approved_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [company_id, employee_id, attendance_date, status, check_in_time, check_out_time, reason, approved_by],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Attendance already recorded for this date' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({
        message: 'Attendance marked successfully',
        attendance_id: this.lastID
      });
    }
  );
};

/**
 * Get today's attendance for company
 */
const getTodayAttendance = (req, res) => {
  const { company_id } = req.params;

  const query = `
    SELECT 
      ar.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      d.name as department_name
    FROM attendance_records ar
    JOIN companies_employees ce ON ar.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ar.company_id = ? AND DATE(ar.attendance_date) = DATE('now')
    ORDER BY u.name
  `;

  db.all(query, [company_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get monthly attendance for employee or company
 */
const getMonthlyAttendance = (req, res) => {
  const { company_id } = req.params;
  const { employee_id, month, year } = req.query;

  let query = `
    SELECT 
      ar.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      d.name as department_name
    FROM attendance_records ar
    JOIN companies_employees ce ON ar.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE ar.company_id = ?
  `;

  const params = [company_id];

  if (employee_id) {
    query += ' AND ar.employee_id = ?';
    params.push(employee_id);
  }

  if (month && year) {
    query += ' AND strftime(\'%Y-%m\', ar.attendance_date) = ?';
    params.push(`${year}-${month.padStart(2, '0')}`);
  }

  query += ' ORDER BY ar.attendance_date DESC, u.name';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Bulk mark attendance
 */
const bulkMarkAttendance = (req, res) => {
  const { attendance_records } = req.body;

  if (!attendance_records || !Array.isArray(attendance_records) || attendance_records.length === 0) {
    return res.status(400).json({ error: 'No attendance records provided' });
  }

  const query = `
    INSERT OR IGNORE INTO attendance_records (
      company_id, employee_id, attendance_date, status, check_in_time, 
      check_out_time, reason, approved_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let completed = 0;
  let errors = [];
  let processedCount = 0;

  attendance_records.forEach((record, index) => {
    db.run(
      query,
      [
        record.company_id,
        record.employee_id,
        record.attendance_date,
        record.status,
        record.check_in_time || null,
        record.check_out_time || null,
        record.reason || null,
        record.approved_by || null
      ],
      function(err) {
        processedCount++;
        
        if (err) {
          errors.push({ index, error: err.message });
        } else {
          completed++;
        }

        // Send response only after all operations complete
        if (processedCount === attendance_records.length) {
          res.json({
            message: 'Bulk attendance marking completed',
            total: attendance_records.length,
            completed,
            errors: errors.length > 0 ? errors : undefined
          });
        }
      }
    );
  });
};

/**
 * Generate attendance report
 */
const getAttendanceReport = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date, department_id } = req.query;

  let query = `
    SELECT 
      ce.employee_id as emp_number,
      u.name as employee_name,
      d.name as department_name,
      COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_days,
      COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_days,
      COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_days,
      COUNT(CASE WHEN ar.status = 'sick' THEN 1 END) as sick_days,
      COUNT(CASE WHEN ar.status = 'pto' THEN 1 END) as pto_days,
      COUNT(*) as total_days
    FROM companies_employees ce
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    LEFT JOIN attendance_records ar ON ce.id = ar.employee_id 
      AND ar.attendance_date >= ? 
      AND ar.attendance_date <= ?
    WHERE ce.company_id = ? AND ce.status = 'active'
  `;

  const params = [start_date, end_date, company_id];

  if (department_id) {
    query += ' AND ce.department_id = ?';
    params.push(department_id);
  }

  query += ' GROUP BY ce.id ORDER BY u.name';

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Submit absence request
 */
const submitAbsenceRequest = (req, res) => {
  const { company_id, employee_id, attendance_date, status, reason } = req.body;

  if (!company_id || !employee_id || !attendance_date || !status || !reason) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO attendance_records (
      company_id, employee_id, attendance_date, status, reason
    ) VALUES (?, ?, ?, ?, ?)
  `;

  db.run(query, [company_id, employee_id, attendance_date, status, reason], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Attendance request already exists for this date' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Absence request submitted successfully',
      request_id: this.lastID
    });
  });
};

/**
 * Approve/reject absence request
 */
const approveAbsenceRequest = (req, res) => {
  const { id } = req.params;
  const { approved_by, approved } = req.body;

  if (!approved_by) {
    return res.status(400).json({ error: 'Missing approved_by' });
  }

  const query = `
    UPDATE attendance_records 
    SET approved_by = ?
    WHERE id = ?
  `;

  db.run(query, [approved_by, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ 
      message: approved ? 'Absence request approved' : 'Absence request processed',
      approved
    });
  });
};

/**
 * Detect attendance patterns (e.g., frequent absences)
 */
const detectAttendancePatterns = (req, res) => {
  const { company_id } = req.params;
  const { days = 30 } = req.query;

  const query = `
    SELECT 
      ce.employee_id as emp_number,
      u.name as employee_name,
      COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absences,
      COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_arrivals,
      COUNT(*) as total_records,
      ROUND(COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) * 100.0 / COUNT(*), 2) as absence_rate
    FROM companies_employees ce
    JOIN users u ON ce.user_id = u.id
    JOIN attendance_records ar ON ce.id = ar.employee_id
    WHERE ce.company_id = ? 
    AND ar.attendance_date >= DATE('now', '-' || ? || ' days')
    AND ce.status = 'active'
    GROUP BY ce.id
    HAVING absences > 3 OR late_arrivals > 5
    ORDER BY absences DESC, late_arrivals DESC
  `;

  db.all(query, [company_id, days], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get attendance summary statistics
 */
const getAttendanceSummary = (req, res) => {
  const { company_id } = req.params;
  const { start_date, end_date } = req.query;

  const query = `
    SELECT 
      COUNT(DISTINCT ar.employee_id) as total_employees,
      COUNT(CASE WHEN ar.status = 'present' THEN 1 END) as present_count,
      COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) as absent_count,
      COUNT(CASE WHEN ar.status = 'late' THEN 1 END) as late_count,
      COUNT(CASE WHEN ar.status = 'sick' THEN 1 END) as sick_count,
      COUNT(CASE WHEN ar.status = 'pto' THEN 1 END) as pto_count,
      ROUND(COUNT(CASE WHEN ar.status = 'present' THEN 1 END) * 100.0 / COUNT(*), 2) as attendance_rate
    FROM attendance_records ar
    WHERE ar.company_id = ?
    AND ar.attendance_date >= ?
    AND ar.attendance_date <= ?
  `;

  db.get(query, [company_id, start_date, end_date], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
};

module.exports = {
  markAttendance,
  getTodayAttendance,
  getMonthlyAttendance,
  bulkMarkAttendance,
  getAttendanceReport,
  submitAbsenceRequest,
  approveAbsenceRequest,
  detectAttendancePatterns,
  getAttendanceSummary
};
