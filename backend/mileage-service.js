const db = require('./database');
const { calculateDistance } = require('./location-service');

/**
 * Mileage Service
 * Handles mileage calculation, trip logging, and reimbursement tracking
 */

/**
 * Log trip mileage
 */
const logMileage = (req, res) => {
  const {
    sales_rep_id,
    check_in_id,
    start_odometer,
    end_odometer,
    total_miles,
    start_location,
    end_location,
    trip_date,
    trip_start_time,
    trip_end_time,
    purpose,
    notes
  } = req.body;

  // Calculate miles if not provided but odometer readings are
  let calculatedMiles = total_miles;
  if (!calculatedMiles && start_odometer && end_odometer) {
    calculatedMiles = end_odometer - start_odometer;
  }

  // Get mileage rate from account preferences (if available) or use default
  const getMileageRate = (callback) => {
    db.get(
      'SELECT mileage_rate FROM account_preferences LIMIT 1',
      [],
      (err, row) => {
        if (err || !row) {
          callback(0.585); // IRS standard rate
        } else {
          callback(row.mileage_rate || 0.585);
        }
      }
    );
  };

  getMileageRate((mileageRate) => {
    const reimbursementAmount = calculatedMiles ? (calculatedMiles * mileageRate).toFixed(2) : null;

    const query = `
      INSERT INTO mileage_logs (
        sales_rep_id, check_in_id, start_odometer, end_odometer, total_miles,
        start_location, end_location, trip_date, trip_start_time, trip_end_time,
        purpose, notes, reimbursement_amount, reimbursement_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    db.run(
      query,
      [
        sales_rep_id, check_in_id, start_odometer, end_odometer, calculatedMiles,
        start_location, end_location, trip_date, trip_start_time, trip_end_time,
        purpose, notes, reimbursementAmount
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({
          message: 'Mileage logged successfully',
          mileage_log_id: this.lastID,
          total_miles: calculatedMiles,
          reimbursement_amount: reimbursementAmount,
          mileage_rate: mileageRate
        });
      }
    );
  });
};

/**
 * Get today's mileage
 */
const getTodayMileage = (req, res) => {
  const { sales_rep_id } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const query = `
    SELECT * FROM mileage_logs 
    WHERE sales_rep_id = ? AND trip_date = ?
    ORDER BY trip_start_time ASC
  `;

  db.all(query, [sales_rep_id, today], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const totalMiles = rows.reduce((sum, log) => sum + (log.total_miles || 0), 0);
    const totalReimbursement = rows.reduce((sum, log) => sum + (parseFloat(log.reimbursement_amount) || 0), 0);

    res.json({
      date: today,
      trips: rows,
      total_miles: parseFloat(totalMiles.toFixed(2)),
      total_reimbursement: parseFloat(totalReimbursement.toFixed(2)),
      trip_count: rows.length
    });
  });
};

/**
 * Get monthly mileage summary
 */
const getMonthlyMileage = (req, res) => {
  const { sales_rep_id } = req.params;
  const { year, month } = req.query;
  
  const currentDate = new Date();
  const targetYear = year || currentDate.getFullYear();
  const targetMonth = month || (currentDate.getMonth() + 1);
  
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

  const query = `
    SELECT * FROM mileage_logs 
    WHERE sales_rep_id = ? 
    AND trip_date >= ? 
    AND trip_date <= ?
    ORDER BY trip_date ASC
  `;

  db.all(query, [sales_rep_id, startDate, endDate], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Group by date
    const byDate = {};
    let totalMiles = 0;
    let totalReimbursement = 0;

    rows.forEach(log => {
      const date = log.trip_date;
      if (!byDate[date]) {
        byDate[date] = {
          date,
          trips: [],
          daily_miles: 0,
          daily_reimbursement: 0
        };
      }
      byDate[date].trips.push(log);
      byDate[date].daily_miles += log.total_miles || 0;
      byDate[date].daily_reimbursement += parseFloat(log.reimbursement_amount) || 0;
      
      totalMiles += log.total_miles || 0;
      totalReimbursement += parseFloat(log.reimbursement_amount) || 0;
    });

    res.json({
      year: targetYear,
      month: targetMonth,
      start_date: startDate,
      end_date: endDate,
      by_date: Object.values(byDate),
      total_miles: parseFloat(totalMiles.toFixed(2)),
      total_reimbursement: parseFloat(totalReimbursement.toFixed(2)),
      trip_count: rows.length,
      days_with_mileage: Object.keys(byDate).length
    });
  });
};

/**
 * Calculate reimbursement
 */
const calculateReimbursement = (req, res) => {
  const { sales_rep_id } = req.params;
  const { start_date, end_date, status = 'pending' } = req.query;

  let query = `
    SELECT * FROM mileage_logs 
    WHERE sales_rep_id = ?
  `;
  const params = [sales_rep_id];

  if (status !== 'all') {
    query += ` AND reimbursement_status = ?`;
    params.push(status);
  }

  if (start_date) {
    query += ` AND trip_date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND trip_date <= ?`;
    params.push(end_date);
  }

  query += ` ORDER BY trip_date ASC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const summary = {
      pending: { miles: 0, amount: 0, count: 0 },
      approved: { miles: 0, amount: 0, count: 0 },
      paid: { miles: 0, amount: 0, count: 0 }
    };

    rows.forEach(log => {
      const status = log.reimbursement_status;
      if (summary[status]) {
        summary[status].miles += log.total_miles || 0;
        summary[status].amount += parseFloat(log.reimbursement_amount) || 0;
        summary[status].count += 1;
      }
    });

    // Round amounts
    Object.keys(summary).forEach(key => {
      summary[key].miles = parseFloat(summary[key].miles.toFixed(2));
      summary[key].amount = parseFloat(summary[key].amount.toFixed(2));
    });

    res.json({
      start_date,
      end_date,
      summary,
      logs: rows,
      total_miles: rows.reduce((sum, log) => sum + (log.total_miles || 0), 0),
      total_amount: parseFloat(rows.reduce((sum, log) => sum + (parseFloat(log.reimbursement_amount) || 0), 0).toFixed(2))
    });
  });
};

/**
 * Update mileage log
 */
const updateMileageLog = (req, res) => {
  const { id } = req.params;
  const {
    start_odometer,
    end_odometer,
    total_miles,
    purpose,
    notes,
    reimbursement_status
  } = req.body;

  // Build dynamic update query
  const updates = [];
  const params = [];

  if (start_odometer !== undefined) {
    updates.push('start_odometer = ?');
    params.push(start_odometer);
  }
  if (end_odometer !== undefined) {
    updates.push('end_odometer = ?');
    params.push(end_odometer);
  }
  if (total_miles !== undefined) {
    updates.push('total_miles = ?');
    params.push(total_miles);
  }
  if (purpose !== undefined) {
    updates.push('purpose = ?');
    params.push(purpose);
  }
  if (notes !== undefined) {
    updates.push('notes = ?');
    params.push(notes);
  }
  if (reimbursement_status !== undefined) {
    updates.push('reimbursement_status = ?');
    params.push(reimbursement_status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  const query = `
    UPDATE mileage_logs 
    SET ${updates.join(', ')}
    WHERE id = ?
  `;

  db.run(query, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Mileage log not found' });
    }
    res.json({ message: 'Mileage log updated successfully' });
  });
};

/**
 * Export mileage for accounting
 */
const exportMileageForAccounting = (req, res) => {
  const { sales_rep_id } = req.params;
  const { start_date, end_date, format = 'json' } = req.query;

  let query = `
    SELECT 
      ml.*,
      sr.employee_id,
      u.name as rep_name,
      u.email as rep_email
    FROM mileage_logs ml
    JOIN sales_reps sr ON ml.sales_rep_id = sr.id
    JOIN users u ON sr.user_id = u.id
    WHERE ml.sales_rep_id = ?
  `;
  const params = [sales_rep_id];

  if (start_date) {
    query += ` AND ml.trip_date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND ml.trip_date <= ?`;
    params.push(end_date);
  }

  query += ` ORDER BY ml.trip_date ASC, ml.trip_start_time ASC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Date', 'Employee ID', 'Rep Name', 'Start Location', 'End Location',
        'Start Time', 'End Time', 'Miles', 'Purpose', 'Reimbursement Amount', 'Status'
      ];
      
      const csvRows = [headers.join(',')];
      rows.forEach(row => {
        csvRows.push([
          row.trip_date,
          row.employee_id,
          row.rep_name,
          row.start_location || '',
          row.end_location || '',
          row.trip_start_time || '',
          row.trip_end_time || '',
          row.total_miles || 0,
          row.purpose || '',
          row.reimbursement_amount || 0,
          row.reimbursement_status
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=mileage_export_${sales_rep_id}_${Date.now()}.csv`);
      res.send(csvRows.join('\n'));
    } else {
      // Return JSON
      const totalMiles = rows.reduce((sum, row) => sum + (row.total_miles || 0), 0);
      const totalReimbursement = rows.reduce((sum, row) => sum + (parseFloat(row.reimbursement_amount) || 0), 0);

      res.json({
        export_date: new Date().toISOString(),
        start_date,
        end_date,
        sales_rep_id,
        employee_id: rows[0]?.employee_id,
        rep_name: rows[0]?.rep_name,
        logs: rows,
        summary: {
          total_trips: rows.length,
          total_miles: parseFloat(totalMiles.toFixed(2)),
          total_reimbursement: parseFloat(totalReimbursement.toFixed(2))
        }
      });
    }
  });
};

/**
 * Calculate mileage from location tracking
 */
const calculateMileageFromTracking = (req, res) => {
  const { sales_rep_id } = req.params;
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const query = `
    SELECT * FROM location_tracking 
    WHERE sales_rep_id = ? 
    AND DATE(timestamp) = ?
    ORDER BY timestamp ASC
  `;

  db.all(query, [sales_rep_id, targetDate], (err, locations) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (locations.length < 2) {
      return res.json({
        date: targetDate,
        total_miles: 0,
        message: 'Not enough location data to calculate mileage'
      });
    }

    // Calculate total distance
    let totalMiles = 0;
    const segments = [];

    for (let i = 1; i < locations.length; i++) {
      const distance = calculateDistance(
        locations[i-1].latitude, locations[i-1].longitude,
        locations[i].latitude, locations[i].longitude
      );
      totalMiles += distance;
      
      segments.push({
        from: locations[i-1].address || `${locations[i-1].latitude},${locations[i-1].longitude}`,
        to: locations[i].address || `${locations[i].latitude},${locations[i].longitude}`,
        distance: parseFloat(distance.toFixed(2)),
        time: locations[i].timestamp
      });
    }

    res.json({
      date: targetDate,
      total_miles: parseFloat(totalMiles.toFixed(2)),
      segments,
      location_count: locations.length,
      start_location: locations[0].address || `${locations[0].latitude},${locations[0].longitude}`,
      end_location: locations[locations.length-1].address || `${locations[locations.length-1].latitude},${locations[locations.length-1].longitude}`,
      start_time: locations[0].timestamp,
      end_time: locations[locations.length-1].timestamp
    });
  });
};

module.exports = {
  logMileage,
  getTodayMileage,
  getMonthlyMileage,
  calculateReimbursement,
  updateMileageLog,
  exportMileageForAccounting,
  calculateMileageFromTracking
};
