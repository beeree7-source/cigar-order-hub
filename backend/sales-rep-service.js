const db = require('./database');

/**
 * Sales Rep Service
 * Handles sales representative operations including check-ins, visits, and account authorization
 */

// ==================== Daily Check-In Management ====================

/**
 * Morning check-in
 */
const checkIn = (req, res) => {
  const { sales_rep_id, check_in_location, notes, weather } = req.body;
  const check_in_date = new Date().toISOString().split('T')[0];

  const query = `
    INSERT INTO daily_check_ins (
      sales_rep_id, check_in_date, check_in_location, notes, weather, status
    ) VALUES (?, ?, ?, ?, ?, 'checked_in')
  `;

  db.run(query, [sales_rep_id, check_in_date, check_in_location, notes, weather], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Already checked in today' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      message: 'Checked in successfully',
      check_in_id: this.lastID,
      check_in_date,
      check_in_time: new Date().toISOString()
    });
  });
};

/**
 * Evening check-out
 */
const checkOut = (req, res) => {
  const { check_in_id, check_out_location, daily_miles } = req.body;

  const query = `
    UPDATE daily_check_ins 
    SET check_out_time = CURRENT_TIMESTAMP,
        check_out_location = ?,
        daily_miles = ?,
        status = 'checked_out',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [check_out_location, daily_miles, check_in_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Check-in not found' });
    }
    res.json({ 
      message: 'Checked out successfully',
      check_out_time: new Date().toISOString()
    });
  });
};

/**
 * Get today's check-in status
 */
const getTodayCheckIn = (req, res) => {
  const { sales_rep_id } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const query = `
    SELECT * FROM daily_check_ins 
    WHERE sales_rep_id = ? AND check_in_date = ?
  `;

  db.get(query, [sales_rep_id, today], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row || { message: 'No check-in for today' });
  });
};

/**
 * Get check-in history
 */
const getCheckInHistory = (req, res) => {
  const { sales_rep_id } = req.params;
  const { limit = 30, offset = 0 } = req.query;

  const query = `
    SELECT * FROM daily_check_ins 
    WHERE sales_rep_id = ?
    ORDER BY check_in_date DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [sales_rep_id, limit, offset], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Update check-in
 */
const updateCheckIn = (req, res) => {
  const { id } = req.params;
  const { notes, weather, daily_miles } = req.body;

  const query = `
    UPDATE daily_check_ins 
    SET notes = COALESCE(?, notes),
        weather = COALESCE(?, weather),
        daily_miles = COALESCE(?, daily_miles),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [notes, weather, daily_miles, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Check-in not found' });
    }
    res.json({ message: 'Check-in updated successfully' });
  });
};

// ==================== Account Visit Management ====================

/**
 * Check-in at account
 */
const checkInAtAccount = (req, res) => {
  const { sales_rep_id, account_id, check_in_id, notes, purpose, location_latitude, location_longitude } = req.body;
  const visit_date = new Date().toISOString().split('T')[0];
  const arrival_time = new Date().toISOString();

  const query = `
    INSERT INTO account_visits (
      sales_rep_id, account_id, check_in_id, visit_date, arrival_time,
      notes, purpose, location_latitude, location_longitude, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_progress')
  `;

  db.run(query, [sales_rep_id, account_id, check_in_id, visit_date, arrival_time, notes, purpose, location_latitude, location_longitude], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      message: 'Checked in at account',
      visit_id: this.lastID,
      arrival_time
    });
  });
};

/**
 * Check-out from account
 */
const checkOutFromAccount = (req, res) => {
  const { visit_id } = req.body;
  const departure_time = new Date().toISOString();

  const query = `
    UPDATE account_visits 
    SET departure_time = ?,
        visit_duration = CAST((julianday(?) - julianday(arrival_time)) * 24 * 60 AS INTEGER),
        status = 'completed',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [departure_time, departure_time, visit_id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json({ 
      message: 'Checked out from account',
      departure_time
    });
  });
};

/**
 * Get today's visits
 */
const getTodayVisits = (req, res) => {
  const { sales_rep_id } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const query = `
    SELECT av.*, u.name as account_name, u.email as account_email
    FROM account_visits av
    JOIN users u ON av.account_id = u.id
    WHERE av.sales_rep_id = ? AND av.visit_date = ?
    ORDER BY av.arrival_time DESC
  `;

  db.all(query, [sales_rep_id, today], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get account visit history
 */
const getAccountVisitHistory = (req, res) => {
  const { account_id } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const query = `
    SELECT av.*, sr.employee_id, u.name as rep_name
    FROM account_visits av
    JOIN sales_reps sr ON av.sales_rep_id = sr.id
    JOIN users u ON sr.user_id = u.id
    WHERE av.account_id = ?
    ORDER BY av.visit_date DESC, av.arrival_time DESC
    LIMIT ? OFFSET ?
  `;

  db.all(query, [account_id, limit, offset], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get scheduled visits
 */
const getScheduledVisits = (req, res) => {
  const { sales_rep_id } = req.params;

  const query = `
    SELECT av.*, u.name as account_name, u.email as account_email
    FROM account_visits av
    JOIN users u ON av.account_id = u.id
    WHERE av.sales_rep_id = ? AND av.status = 'scheduled'
    ORDER BY av.visit_date ASC
  `;

  db.all(query, [sales_rep_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Update visit notes
 */
const updateVisit = (req, res) => {
  const { id } = req.params;
  const { notes, purpose } = req.body;

  const query = `
    UPDATE account_visits 
    SET notes = COALESCE(?, notes),
        purpose = COALESCE(?, purpose),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [notes, purpose, id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json({ message: 'Visit updated successfully' });
  });
};

/**
 * Mark visit as complete
 */
const completeVisit = (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE account_visits 
    SET status = 'completed',
        departure_time = COALESCE(departure_time, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    res.json({ message: 'Visit marked as complete' });
  });
};

// ==================== Authorized Accounts Management ====================

/**
 * Get authorized accounts for a rep
 */
const getAuthorizedAccounts = (req, res) => {
  const { sales_rep_id } = req.params;

  const query = `
    SELECT raa.*, u.name, u.email, u.role, ap.*
    FROM rep_authorized_accounts raa
    JOIN users u ON raa.account_id = u.id
    LEFT JOIN account_preferences ap ON raa.account_id = ap.account_id
    WHERE raa.sales_rep_id = ? AND raa.is_active = 1
    AND (raa.end_date IS NULL OR raa.end_date > CURRENT_TIMESTAMP)
    ORDER BY u.name
  `;

  db.all(query, [sales_rep_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

/**
 * Get account details
 */
const getAccountDetails = (req, res) => {
  const { account_id } = req.params;
  const { sales_rep_id } = req.query;

  // Verify authorization
  const authQuery = `
    SELECT * FROM rep_authorized_accounts 
    WHERE sales_rep_id = ? AND account_id = ? AND is_active = 1
  `;

  db.get(authQuery, [sales_rep_id, account_id], (err, auth) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!auth) {
      return res.status(403).json({ error: 'Not authorized to access this account' });
    }

    const query = `
      SELECT u.*, ap.*
      FROM users u
      LEFT JOIN account_preferences ap ON u.id = ap.account_id
      WHERE u.id = ?
    `;

    db.get(query, [account_id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Account not found' });
      }
      res.json(row);
    });
  });
};

/**
 * Get account preferences
 */
const getAccountPreferences = (req, res) => {
  const { account_id } = req.params;

  const query = `
    SELECT * FROM account_preferences WHERE account_id = ?
  `;

  db.get(query, [account_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      // Return default preferences
      return res.json({
        account_id,
        allow_rep_photos: false,
        allow_location_tracking: false,
        allow_visit_notes: false,
        allow_order_placement: true,
        mileage_reimbursement_enabled: false,
        mileage_rate: 0.585,
        minimum_visit_duration: 0,
        required_visit_frequency: null,
        photo_approval_required: false
      });
    }
    res.json(row);
  });
};

/**
 * Schedule a visit
 */
const scheduleVisit = (req, res) => {
  const { account_id } = req.params;
  const { sales_rep_id, visit_date, notes, purpose } = req.body;

  const query = `
    INSERT INTO account_visits (
      sales_rep_id, account_id, visit_date, notes, purpose, status
    ) VALUES (?, ?, ?, ?, ?, 'scheduled')
  `;

  db.run(query, [sales_rep_id, account_id, visit_date, notes, purpose], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      message: 'Visit scheduled successfully',
      visit_id: this.lastID
    });
  });
};

// ==================== Sales Rep Management ====================

/**
 * Create sales rep
 */
const createSalesRep = (req, res) => {
  const { user_id, employee_id, company_id, territory, assigned_accounts, manager_id, hire_date, base_location } = req.body;

  const query = `
    INSERT INTO sales_reps (
      user_id, employee_id, company_id, territory, assigned_accounts, 
      manager_id, hire_date, base_location, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `;

  db.run(query, [user_id, employee_id, company_id, territory, JSON.stringify(assigned_accounts || []), manager_id, hire_date, base_location], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ 
      message: 'Sales rep created successfully',
      sales_rep_id: this.lastID
    });
  });
};

/**
 * Get sales rep by user ID
 */
const getSalesRepByUserId = (req, res) => {
  const { user_id } = req.params;

  const query = `
    SELECT sr.*, u.name, u.email, c.name as company_name
    FROM sales_reps sr
    JOIN users u ON sr.user_id = u.id
    LEFT JOIN companies c ON sr.company_id = c.id
    WHERE sr.user_id = ?
  `;

  db.get(query, [user_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }
    res.json(row);
  });
};

module.exports = {
  // Check-in/out
  checkIn,
  checkOut,
  getTodayCheckIn,
  getCheckInHistory,
  updateCheckIn,
  
  // Visits
  checkInAtAccount,
  checkOutFromAccount,
  getTodayVisits,
  getAccountVisitHistory,
  getScheduledVisits,
  updateVisit,
  completeVisit,
  
  // Authorized accounts
  getAuthorizedAccounts,
  getAccountDetails,
  getAccountPreferences,
  scheduleVisit,
  
  // Sales rep management
  createSalesRep,
  getSalesRepByUserId
};
