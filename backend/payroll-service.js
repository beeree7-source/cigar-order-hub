const db = require('./database');

/**
 * Payroll Service
 * Handles payroll period management, payroll calculations, and payment processing
 */

// ==================== Payroll Period Management ====================

/**
 * Create a new payroll period
 */
const createPayrollPeriod = (req, res) => {
  const { company_id, period_start_date, period_end_date, pay_frequency } = req.body;

  if (!company_id || !period_start_date || !period_end_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO payroll_periods (
      company_id, period_start_date, period_end_date, pay_frequency, status
    ) VALUES (?, ?, ?, ?, 'open')
  `;

  db.run(query, [company_id, period_start_date, period_end_date, pay_frequency || 'biweekly'], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Payroll period already exists for this start date' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      message: 'Payroll period created successfully',
      period_id: this.lastID
    });
  });
};

/**
 * Get all payroll periods for a company
 */
const getPayrollPeriods = (req, res) => {
  const { company_id } = req.params;
  const { status, limit = 50 } = req.query;

  let query = `
    SELECT 
      pp.*,
      u.name as processed_by_name
    FROM payroll_periods pp
    LEFT JOIN users u ON pp.processed_by = u.id
    WHERE pp.company_id = ?
  `;

  const params = [company_id];

  if (status) {
    query += ' AND pp.status = ?';
    params.push(status);
  }

  query += ' ORDER BY pp.period_start_date DESC LIMIT ?';
  params.push(parseInt(limit));

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get payroll period by ID
 */
const getPayrollPeriod = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT 
      pp.*,
      u.name as processed_by_name,
      COUNT(DISTINCT pr.employee_id) as employee_count
    FROM payroll_periods pp
    LEFT JOIN users u ON pp.processed_by = u.id
    LEFT JOIN payroll_records pr ON pp.id = pr.payroll_period_id
    WHERE pp.id = ?
    GROUP BY pp.id
  `;

  db.get(query, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Payroll period not found' });
    }
    res.json(row);
  });
};

// ==================== Payroll Calculation ====================

/**
 * Calculate payroll for a period
 */
const calculatePayroll = (req, res) => {
  const { period_id } = req.params;
  const { processed_by } = req.body;

  // Get period details
  const periodQuery = 'SELECT * FROM payroll_periods WHERE id = ?';
  
  db.get(periodQuery, [period_id], (err, period) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!period) {
      return res.status(404).json({ error: 'Payroll period not found' });
    }
    if (period.status === 'finalized') {
      return res.status(400).json({ error: 'Payroll period is already finalized' });
    }

    // Get company payroll settings
    const settingsQuery = 'SELECT * FROM company_payroll_settings WHERE company_id = ?';
    
    db.get(settingsQuery, [period.company_id], (err, settings) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const overtimeThreshold = settings?.overtime_threshold_hours || 40;
      const overtimeMultiplier = settings?.overtime_rate_multiplier || 1.5;
      const federalTaxRate = settings?.federal_tax_rate || 0;
      const stateTaxRate = settings?.state_tax_rate || 0;

      // Get all active employees and their time entries
      const employeesQuery = `
        SELECT 
          ce.id as employee_id,
          ce.hourly_rate,
          ce.salary,
          ce.employment_type,
          SUM(
            ROUND((julianday(te.clock_out_time) - julianday(te.clock_in_time)) * 24, 2)
          ) as total_hours
        FROM companies_employees ce
        LEFT JOIN time_entries te ON ce.id = te.employee_id 
          AND DATE(te.clock_in_time) >= ? 
          AND DATE(te.clock_in_time) <= ?
          AND te.clock_out_time IS NOT NULL
        WHERE ce.company_id = ? AND ce.status = 'active'
        GROUP BY ce.id
      `;

      db.all(employeesQuery, [period.period_start_date, period.period_end_date, period.company_id], (err, employees) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        let totalPayroll = 0;
        let totalHours = 0;
        let recordsCreated = 0;
        let processedCount = 0;

        if (employees.length === 0) {
          return res.json({ 
            message: 'No active employees found for this period',
            records_created: 0
          });
        }

        employees.forEach((employee, index) => {
          const hours = employee.total_hours || 0;
          const rate = employee.hourly_rate || 0;

          let regularHours = 0;
          let overtimeHours = 0;
          let regularPay = 0;
          let overtimePay = 0;

          if (employee.employment_type === 'full_time' && employee.salary) {
            // Salaried employee
            regularPay = employee.salary / (52 / (period.pay_frequency === 'weekly' ? 1 : period.pay_frequency === 'biweekly' ? 2 : 4));
            regularHours = hours;
          } else {
            // Hourly employee
            if (hours > overtimeThreshold) {
              regularHours = overtimeThreshold;
              overtimeHours = hours - overtimeThreshold;
            } else {
              regularHours = hours;
              overtimeHours = 0;
            }

            regularPay = regularHours * rate;
            overtimePay = overtimeHours * rate * overtimeMultiplier;
          }

          const grossPay = regularPay + overtimePay;
          const federalTax = grossPay * (federalTaxRate / 100);
          const stateTax = grossPay * (stateTaxRate / 100);
          const socialSecurity = grossPay * 0.062; // 6.2%
          const medicare = grossPay * 0.0145; // 1.45%
          const netPay = grossPay - federalTax - stateTax - socialSecurity - medicare;

          totalPayroll += grossPay;
          totalHours += hours;

          // Insert or update payroll record
          const insertQuery = `
            INSERT OR REPLACE INTO payroll_records (
              company_id, employee_id, payroll_period_id, regular_hours, regular_rate,
              regular_pay, overtime_hours, overtime_rate, overtime_pay, gross_pay,
              federal_tax, state_tax, social_security, medicare, other_deductions,
              net_pay, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
          `;

          db.run(
            insertQuery,
            [
              period.company_id,
              employee.employee_id,
              period_id,
              regularHours.toFixed(2),
              rate,
              regularPay.toFixed(2),
              overtimeHours.toFixed(2),
              rate * overtimeMultiplier,
              overtimePay.toFixed(2),
              grossPay.toFixed(2),
              federalTax.toFixed(2),
              stateTax.toFixed(2),
              socialSecurity.toFixed(2),
              medicare.toFixed(2),
              0,
              netPay.toFixed(2)
            ],
            function(err) {
              processedCount++;
              
              if (err) {
                console.error('Error creating payroll record:', err);
              } else {
                recordsCreated++;
              }

              // If all employees processed, update period totals
              if (processedCount === employees.length) {
                const updatePeriodQuery = `
                  UPDATE payroll_periods 
                  SET total_employees = ?,
                      total_hours = ?,
                      total_payroll = ?,
                      status = 'processed',
                      processed_date = CURRENT_TIMESTAMP,
                      processed_by = ?
                  WHERE id = ?
                `;

                db.run(
                  updatePeriodQuery,
                  [employees.length, totalHours.toFixed(2), totalPayroll.toFixed(2), processed_by, period_id],
                  function(err) {
                    if (err) {
                      return res.status(500).json({ error: err.message });
                    }

                    res.json({
                      message: 'Payroll calculated successfully',
                      period_id,
                      total_employees: employees.length,
                      total_hours: totalHours.toFixed(2),
                      total_payroll: totalPayroll.toFixed(2),
                      records_created: recordsCreated
                    });
                  }
                );
              }
            }
          );
        });
      });
    });
  });
};

/**
 * Get payroll records for an employee
 */
const getEmployeePayrollRecords = (req, res) => {
  const { employee_id } = req.params;
  const { limit = 12 } = req.query;

  const query = `
    SELECT 
      pr.*,
      pp.period_start_date,
      pp.period_end_date,
      pp.pay_frequency,
      pp.status as period_status
    FROM payroll_records pr
    JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
    WHERE pr.employee_id = ?
    ORDER BY pp.period_start_date DESC
    LIMIT ?
  `;

  db.all(query, [employee_id, parseInt(limit)], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get all payroll records for a period
 */
const getPeriodPayrollRecords = (req, res) => {
  const { period_id } = req.params;

  const query = `
    SELECT 
      pr.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      ce.position,
      d.name as department_name
    FROM payroll_records pr
    JOIN companies_employees ce ON pr.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE pr.payroll_period_id = ?
    ORDER BY u.name
  `;

  db.all(query, [period_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Approve payroll record
 */
const approvePayrollRecord = (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  if (!approved_by) {
    return res.status(400).json({ error: 'Missing approved_by' });
  }

  const query = `
    UPDATE payroll_records 
    SET status = 'approved',
        approved_by = ?,
        approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [approved_by, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }
    res.json({ message: 'Payroll record approved successfully' });
  });
};

/**
 * Process payment for payroll record
 */
const processPayment = (req, res) => {
  const { record_id, payment_method } = req.body;

  if (!record_id || !payment_method) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Check if record is approved
  const checkQuery = 'SELECT status FROM payroll_records WHERE id = ?';
  
  db.get(checkQuery, [record_id], (err, record) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!record) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }
    if (record.status !== 'approved') {
      return res.status(400).json({ error: 'Payroll record must be approved before payment' });
    }

    const query = `
      UPDATE payroll_records 
      SET status = 'paid',
          paid_date = CURRENT_TIMESTAMP,
          payment_method = ?
      WHERE id = ?
    `;

    db.run(query, [payment_method, record_id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Payment processed successfully' });
    });
  });
};

/**
 * Export payroll data
 */
const exportPayroll = (req, res) => {
  const { period_id } = req.params;

  const query = `
    SELECT 
      ce.employee_id as 'Employee ID',
      u.name as 'Employee Name',
      ce.position as 'Position',
      d.name as 'Department',
      pr.regular_hours as 'Regular Hours',
      pr.regular_rate as 'Regular Rate',
      pr.regular_pay as 'Regular Pay',
      pr.overtime_hours as 'Overtime Hours',
      pr.overtime_rate as 'Overtime Rate',
      pr.overtime_pay as 'Overtime Pay',
      pr.gross_pay as 'Gross Pay',
      pr.federal_tax as 'Federal Tax',
      pr.state_tax as 'State Tax',
      pr.social_security as 'Social Security',
      pr.medicare as 'Medicare',
      pr.other_deductions as 'Other Deductions',
      pr.net_pay as 'Net Pay',
      pr.payment_method as 'Payment Method',
      pr.status as 'Status'
    FROM payroll_records pr
    JOIN companies_employees ce ON pr.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE pr.payroll_period_id = ?
    ORDER BY u.name
  `;

  db.all(query, [period_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'No payroll records found' });
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
    res.setHeader('Content-Disposition', `attachment; filename=payroll_period_${period_id}.csv`);
    res.send(csv);
  });
};

/**
 * Get payroll summary by department
 */
const getPayrollSummaryByDepartment = (req, res) => {
  const { company_id, period_id } = req.params;

  const query = `
    SELECT 
      d.name as department_name,
      COUNT(DISTINCT pr.employee_id) as employee_count,
      SUM(pr.regular_hours) as total_regular_hours,
      SUM(pr.overtime_hours) as total_overtime_hours,
      SUM(pr.gross_pay) as total_gross_pay,
      SUM(pr.net_pay) as total_net_pay,
      AVG(pr.gross_pay) as avg_gross_pay
    FROM payroll_records pr
    JOIN companies_employees ce ON pr.employee_id = ce.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE pr.company_id = ? AND pr.payroll_period_id = ?
    GROUP BY d.id
    ORDER BY total_gross_pay DESC
  `;

  db.all(query, [company_id, period_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Update payroll settings for company
 */
const updatePayrollSettings = (req, res) => {
  const { company_id } = req.params;
  const settings = req.body;

  // Check if settings exist
  const checkQuery = 'SELECT id FROM company_payroll_settings WHERE company_id = ?';
  
  db.get(checkQuery, [company_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (row) {
      // Update existing settings
      const updates = [];
      const params = [];

      Object.keys(settings).forEach(key => {
        if (settings[key] !== undefined) {
          updates.push(`${key} = ?`);
          params.push(settings[key]);
        }
      });

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(company_id);

      const query = `UPDATE company_payroll_settings SET ${updates.join(', ')} WHERE company_id = ?`;

      db.run(query, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Payroll settings updated successfully' });
      });
    } else {
      // Create new settings
      const query = `
        INSERT INTO company_payroll_settings (company_id) VALUES (?)
      `;

      db.run(query, [company_id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ 
          message: 'Payroll settings created successfully',
          settings_id: this.lastID
        });
      });
    }
  });
};

/**
 * Get payroll settings for company
 */
const getPayrollSettings = (req, res) => {
  const { company_id } = req.params;

  const query = 'SELECT * FROM company_payroll_settings WHERE company_id = ?';

  db.get(query, [company_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Payroll settings not found' });
    }
    res.json(row);
  });
};

/**
 * Generate paystub for employee payroll record
 */
const generatePaystub = (req, res) => {
  const { payroll_record_id } = req.params;
  const { format = 'json' } = req.query; // json or pdf (future)

  const query = `
    SELECT 
      pr.*,
      ce.employee_id as emp_number,
      u.name as employee_name,
      u.email as employee_email,
      ce.position,
      ce.department_id,
      d.name as department_name,
      pp.period_start_date,
      pp.period_end_date,
      pp.pay_frequency,
      c.name as company_name
    FROM payroll_records pr
    JOIN companies_employees ce ON pr.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
    JOIN companies c ON pr.company_id = c.id
    LEFT JOIN departments d ON ce.department_id = d.id
    WHERE pr.id = ?
  `;

  db.get(query, [payroll_record_id], (err, record) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!record) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // Build paystub object
    const paystub = {
      paystub_id: `PS-${record.id}-${Date.now()}`,
      company: {
        name: record.company_name
      },
      employee: {
        id: record.emp_number,
        name: record.employee_name,
        email: record.employee_email,
        position: record.position,
        department: record.department_name
      },
      pay_period: {
        start_date: record.period_start_date,
        end_date: record.period_end_date,
        frequency: record.pay_frequency,
        payment_date: record.paid_date || 'Pending'
      },
      earnings: {
        regular: {
          hours: parseFloat(record.regular_hours || 0),
          rate: parseFloat(record.regular_rate || 0),
          amount: parseFloat(record.regular_pay || 0)
        },
        overtime: {
          hours: parseFloat(record.overtime_hours || 0),
          rate: parseFloat(record.overtime_rate || 0),
          amount: parseFloat(record.overtime_pay || 0)
        },
        gross_pay: parseFloat(record.gross_pay || 0)
      },
      deductions: {
        federal_tax: parseFloat(record.federal_tax || 0),
        state_tax: parseFloat(record.state_tax || 0),
        social_security: parseFloat(record.social_security || 0),
        medicare: parseFloat(record.medicare || 0),
        other: parseFloat(record.other_deductions || 0),
        total: parseFloat(record.federal_tax || 0) + 
               parseFloat(record.state_tax || 0) + 
               parseFloat(record.social_security || 0) + 
               parseFloat(record.medicare || 0) + 
               parseFloat(record.other_deductions || 0)
      },
      net_pay: parseFloat(record.net_pay || 0),
      payment_method: record.payment_method || 'Pending',
      status: record.status,
      generated_at: new Date().toISOString()
    };

    if (format === 'pdf') {
      // Future: Generate PDF paystub
      return res.status(501).json({ 
        message: 'PDF generation not yet implemented',
        paystub_data: paystub
      });
    }

    res.json(paystub);
  });
};

/**
 * Email paystub to employee
 */
const emailPaystub = (req, res) => {
  const { payroll_record_id } = req.params;

  const query = `
    SELECT 
      u.email as employee_email,
      u.name as employee_name,
      pr.*,
      pp.period_start_date,
      pp.period_end_date
    FROM payroll_records pr
    JOIN companies_employees ce ON pr.employee_id = ce.id
    JOIN users u ON ce.user_id = u.id
    JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
    WHERE pr.id = ?
  `;

  db.get(query, [payroll_record_id], (err, record) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!record) {
      return res.status(404).json({ error: 'Payroll record not found' });
    }

    // TODO: Integrate with email service
    // For now, just return success message
    res.json({
      message: 'Paystub email queued for delivery',
      employee_email: record.employee_email,
      employee_name: record.employee_name,
      pay_period: `${record.period_start_date} to ${record.period_end_date}`,
      note: 'Email integration pending - implement with existing notifications system'
    });
  });
};

/**
 * Get all paystubs for an employee
 */
const getEmployeePaystubs = (req, res) => {
  const { employee_id } = req.params;
  const { limit = 12 } = req.query; // Default to last 12 pay periods

  const query = `
    SELECT 
      pr.id as payroll_record_id,
      pp.period_start_date,
      pp.period_end_date,
      pr.gross_pay,
      pr.net_pay,
      pr.status,
      pr.paid_date,
      pr.payment_method
    FROM payroll_records pr
    JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
    WHERE pr.employee_id = ?
    ORDER BY pp.period_start_date DESC
    LIMIT ?
  `;

  db.all(query, [employee_id, parseInt(limit)], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

module.exports = {
  createPayrollPeriod,
  getPayrollPeriods,
  getPayrollPeriod,
  calculatePayroll,
  getEmployeePayrollRecords,
  getPeriodPayrollRecords,
  approvePayrollRecord,
  processPayment,
  exportPayroll,
  getPayrollSummaryByDepartment,
  updatePayrollSettings,
  getPayrollSettings,
  generatePaystub,
  emailPaystub,
  getEmployeePaystubs
};
