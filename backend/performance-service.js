const db = require('./database');

/**
 * Performance Service
 * Handles KPI calculation, dashboard metrics, and sales analytics for sales reps
 */

/**
 * Get rep dashboard
 */
const getRepDashboard = (req, res) => {
  const { sales_rep_id } = req.params;
  const { period = 'week' } = req.query; // day, week, month

  const today = new Date().toISOString().split('T')[0];
  let startDate;

  switch (period) {
    case 'day':
      startDate = today;
      break;
    case 'week':
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
      break;
    case 'month':
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
      break;
    default:
      startDate = today;
  }

  // Get metrics in parallel
  const queries = {
    visits: `
      SELECT COUNT(*) as count, AVG(visit_duration) as avg_duration
      FROM account_visits
      WHERE sales_rep_id = ? AND visit_date >= ?
    `,
    orders: `
      SELECT COUNT(*) as count
      FROM orders o
      JOIN rep_authorized_accounts raa ON o.retailer_id = raa.account_id
      WHERE raa.sales_rep_id = ? AND DATE(o.created_at) >= ?
    `,
    mileage: `
      SELECT SUM(total_miles) as total, SUM(reimbursement_amount) as reimbursement
      FROM mileage_logs
      WHERE sales_rep_id = ? AND trip_date >= ?
    `,
    photos: `
      SELECT COUNT(*) as count
      FROM account_visit_photos avp
      JOIN account_visits av ON avp.visit_id = av.id
      WHERE av.sales_rep_id = ? AND av.visit_date >= ?
    `,
    accounts: `
      SELECT COUNT(*) as total
      FROM rep_authorized_accounts
      WHERE sales_rep_id = ? AND is_active = 1
    `
  };

  const results = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  Object.keys(queries).forEach(key => {
    const params = key === 'accounts' ? [sales_rep_id] : [sales_rep_id, startDate];
    
    db.get(queries[key], params, (err, row) => {
      if (!err) {
        results[key] = row;
      }
      completed++;

      if (completed === totalQueries) {
        res.json({
          period,
          start_date: startDate,
          end_date: today,
          sales_rep_id,
          metrics: {
            visits: {
              count: results.visits?.count || 0,
              avg_duration_minutes: results.visits?.avg_duration ? Math.round(results.visits.avg_duration) : 0
            },
            orders: {
              count: results.orders?.count || 0
            },
            mileage: {
              total_miles: results.mileage?.total ? parseFloat(results.mileage.total.toFixed(2)) : 0,
              reimbursement: results.mileage?.reimbursement ? parseFloat(results.mileage.reimbursement.toFixed(2)) : 0
            },
            photos: {
              count: results.photos?.count || 0
            },
            accounts: {
              total: results.accounts?.total || 0
            }
          }
        });
      }
    });
  });
};

/**
 * Get daily metrics
 */
const getDailyMetrics = (req, res) => {
  const { sales_rep_id } = req.params;
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const queries = {
    checkIn: `
      SELECT * FROM daily_check_ins
      WHERE sales_rep_id = ? AND check_in_date = ?
    `,
    visits: `
      SELECT COUNT(*) as count, SUM(visit_duration) as total_duration
      FROM account_visits
      WHERE sales_rep_id = ? AND visit_date = ?
    `,
    orders: `
      SELECT COUNT(*) as count
      FROM orders o
      JOIN rep_authorized_accounts raa ON o.retailer_id = raa.account_id
      WHERE raa.sales_rep_id = ? AND DATE(o.created_at) = ?
    `,
    mileage: `
      SELECT SUM(total_miles) as total
      FROM mileage_logs
      WHERE sales_rep_id = ? AND trip_date = ?
    `,
    photos: `
      SELECT COUNT(*) as count
      FROM account_visit_photos avp
      JOIN account_visits av ON avp.visit_id = av.id
      WHERE av.sales_rep_id = ? AND av.visit_date = ?
    `
  };

  const results = {};
  let completed = 0;
  const totalQueries = Object.keys(queries).length;

  Object.keys(queries).forEach(key => {
    db.get(queries[key], [sales_rep_id, targetDate], (err, row) => {
      if (!err) {
        results[key] = row;
      }
      completed++;

      if (completed === totalQueries) {
        res.json({
          date: targetDate,
          sales_rep_id,
          check_in: results.checkIn || null,
          metrics: {
            visits: {
              count: results.visits?.count || 0,
              total_duration_minutes: results.visits?.total_duration || 0
            },
            orders: {
              count: results.orders?.count || 0
            },
            mileage: {
              total_miles: results.mileage?.total ? parseFloat(results.mileage.total.toFixed(2)) : 0
            },
            photos: {
              count: results.photos?.count || 0
            }
          }
        });
      }
    });
  });
};

/**
 * Get weekly summary
 */
const getWeeklySummary = (req, res) => {
  const { sales_rep_id } = req.params;
  const { week_start } = req.query;
  
  const startDate = week_start || (() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
    return d.toISOString().split('T')[0];
  })();
  
  const endDate = (() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 6); // End of week (Saturday)
    return d.toISOString().split('T')[0];
  })();

  const query = `
    SELECT 
      DATE(av.visit_date) as date,
      COUNT(DISTINCT av.id) as visits,
      COUNT(DISTINCT av.account_id) as accounts_visited,
      SUM(av.visit_duration) as total_duration,
      COUNT(DISTINCT avp.id) as photos_taken
    FROM account_visits av
    LEFT JOIN account_visit_photos avp ON av.id = avp.visit_id
    WHERE av.sales_rep_id = ?
    AND av.visit_date >= ? AND av.visit_date <= ?
    GROUP BY DATE(av.visit_date)
    ORDER BY date
  `;

  db.all(query, [sales_rep_id, startDate, endDate], (err, dailyStats) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Get mileage data
    const mileageQuery = `
      SELECT 
        trip_date as date,
        SUM(total_miles) as miles,
        SUM(reimbursement_amount) as reimbursement
      FROM mileage_logs
      WHERE sales_rep_id = ? AND trip_date >= ? AND trip_date <= ?
      GROUP BY trip_date
      ORDER BY trip_date
    `;

    db.all(mileageQuery, [sales_rep_id, startDate, endDate], (err, mileageStats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Get orders data
      const ordersQuery = `
        SELECT 
          DATE(o.created_at) as date,
          COUNT(*) as orders
        FROM orders o
        JOIN rep_authorized_accounts raa ON o.retailer_id = raa.account_id
        WHERE raa.sales_rep_id = ?
        AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
        GROUP BY DATE(o.created_at)
        ORDER BY date
      `;

      db.all(ordersQuery, [sales_rep_id, startDate, endDate], (err, ordersStats) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Merge all stats by date
        const allDates = new Set([
          ...dailyStats.map(d => d.date),
          ...mileageStats.map(d => d.date),
          ...ordersStats.map(d => d.date)
        ]);

        const byDate = {};
        allDates.forEach(date => {
          const visit = dailyStats.find(d => d.date === date) || {};
          const mileage = mileageStats.find(d => d.date === date) || {};
          const orders = ordersStats.find(d => d.date === date) || {};

          byDate[date] = {
            date,
            visits: visit.visits || 0,
            accounts_visited: visit.accounts_visited || 0,
            total_duration_minutes: visit.total_duration || 0,
            photos_taken: visit.photos_taken || 0,
            miles: mileage.miles ? parseFloat(mileage.miles.toFixed(2)) : 0,
            reimbursement: mileage.reimbursement ? parseFloat(mileage.reimbursement.toFixed(2)) : 0,
            orders: orders.orders || 0
          };
        });

        // Calculate totals
        const summary = {
          total_visits: dailyStats.reduce((sum, d) => sum + (d.visits || 0), 0),
          total_accounts_visited: new Set(dailyStats.map(d => d.accounts_visited)).size,
          total_photos: dailyStats.reduce((sum, d) => sum + (d.photos_taken || 0), 0),
          total_miles: parseFloat(mileageStats.reduce((sum, d) => sum + (d.miles || 0), 0).toFixed(2)),
          total_reimbursement: parseFloat(mileageStats.reduce((sum, d) => sum + (d.reimbursement || 0), 0).toFixed(2)),
          total_orders: ordersStats.reduce((sum, d) => sum + (d.orders || 0), 0)
        };

        res.json({
          week_start: startDate,
          week_end: endDate,
          sales_rep_id,
          by_date: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)),
          summary
        });
      });
    });
  });
};

/**
 * Get monthly summary
 */
const getMonthlySummary = (req, res) => {
  const { sales_rep_id } = req.params;
  const { year, month } = req.query;
  
  const currentDate = new Date();
  const targetYear = year || currentDate.getFullYear();
  const targetMonth = month || (currentDate.getMonth() + 1);
  
  const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
  const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

  // Get or create performance metrics
  const metricsQuery = `
    SELECT * FROM rep_performance_metrics
    WHERE sales_rep_id = ? AND period_start_date = ?
  `;

  db.get(metricsQuery, [sales_rep_id, startDate], (err, existingMetrics) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existingMetrics) {
      return res.json(existingMetrics);
    }

    // Calculate metrics
    const queries = {
      accounts: `
        SELECT COUNT(*) as total FROM rep_authorized_accounts
        WHERE sales_rep_id = ? AND is_active = 1
      `,
      visits: `
        SELECT COUNT(*) as total, COUNT(DISTINCT account_id) as unique_accounts
        FROM account_visits
        WHERE sales_rep_id = ? AND visit_date >= ? AND visit_date <= ?
      `,
      orders: `
        SELECT COUNT(*) as total
        FROM orders o
        JOIN rep_authorized_accounts raa ON o.retailer_id = raa.account_id
        WHERE raa.sales_rep_id = ? AND DATE(o.created_at) >= ? AND DATE(o.created_at) <= ?
      `,
      photos: `
        SELECT COUNT(*) as total
        FROM account_visit_photos avp
        JOIN account_visits av ON avp.visit_id = av.id
        WHERE av.sales_rep_id = ? AND av.visit_date >= ? AND av.visit_date <= ?
      `,
      mileage: `
        SELECT SUM(total_miles) as total
        FROM mileage_logs
        WHERE sales_rep_id = ? AND trip_date >= ? AND trip_date <= ?
      `
    };

    const results = {};
    let completed = 0;
    const totalQueries = Object.keys(queries).length;

    Object.keys(queries).forEach(key => {
      const params = key === 'accounts' 
        ? [sales_rep_id]
        : [sales_rep_id, startDate, endDate];
      
      db.get(queries[key], params, (err, row) => {
        if (!err) {
          results[key] = row;
        }
        completed++;

        if (completed === totalQueries) {
          // Calculate visit completion rate
          const totalAccounts = results.accounts?.total || 0;
          const accountsVisited = results.visits?.unique_accounts || 0;
          const visitCompletionRate = totalAccounts > 0 
            ? (accountsVisited / totalAccounts * 100).toFixed(2)
            : 0;

          // Save metrics
          const insertQuery = `
            INSERT INTO rep_performance_metrics (
              sales_rep_id, period_start_date, period_end_date,
              total_accounts, accounts_visited, total_orders,
              photos_taken, total_miles, visit_completion_rate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.run(
            insertQuery,
            [
              sales_rep_id, startDate, endDate,
              totalAccounts, accountsVisited, results.orders?.total || 0,
              results.photos?.total || 0, results.mileage?.total || 0,
              visitCompletionRate
            ],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              res.json({
                id: this.lastID,
                sales_rep_id,
                period_start_date: startDate,
                period_end_date: endDate,
                total_accounts: totalAccounts,
                accounts_visited: accountsVisited,
                total_orders: results.orders?.total || 0,
                photos_taken: results.photos?.total || 0,
                total_miles: results.mileage?.total ? parseFloat(results.mileage.total.toFixed(2)) : 0,
                visit_completion_rate: parseFloat(visitCompletionRate)
              });
            }
          );
        }
      });
    });
  });
};

/**
 * Get account-level metrics
 */
const getAccountMetrics = (req, res) => {
  const { sales_rep_id } = req.params;
  const { account_id, start_date, end_date } = req.query;

  let query = `
    SELECT 
      av.account_id,
      u.name as account_name,
      COUNT(av.id) as visit_count,
      MAX(av.visit_date) as last_visit,
      AVG(av.visit_duration) as avg_visit_duration,
      COUNT(DISTINCT avp.id) as photos_count
    FROM account_visits av
    JOIN users u ON av.account_id = u.id
    LEFT JOIN account_visit_photos avp ON av.id = avp.visit_id
    WHERE av.sales_rep_id = ?
  `;
  const params = [sales_rep_id];

  if (account_id) {
    query += ` AND av.account_id = ?`;
    params.push(account_id);
  }

  if (start_date) {
    query += ` AND av.visit_date >= ?`;
    params.push(start_date);
  }

  if (end_date) {
    query += ` AND av.visit_date <= ?`;
    params.push(end_date);
  }

  query += ` GROUP BY av.account_id ORDER BY visit_count DESC`;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json({
      sales_rep_id,
      accounts: rows.map(row => ({
        ...row,
        avg_visit_duration_minutes: row.avg_visit_duration ? Math.round(row.avg_visit_duration) : 0
      })),
      count: rows.length
    });
  });
};

/**
 * Get rep comparison (for managers)
 */
const getRepComparison = (req, res) => {
  const { manager_id } = req.params;
  const { start_date, end_date } = req.query;

  // Get all reps managed by this manager
  const repsQuery = `
    SELECT sr.id, sr.employee_id, u.name
    FROM sales_reps sr
    JOIN users u ON sr.user_id = u.id
    WHERE sr.manager_id = ? AND sr.status = 'active'
  `;

  db.all(repsQuery, [manager_id], (err, reps) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (reps.length === 0) {
      return res.json({ message: 'No active reps found for this manager', reps: [] });
    }

    // Get metrics for each rep
    const repIds = reps.map(r => r.id);
    const placeholders = repIds.map(() => '?').join(',');

    const metricsQuery = `
      SELECT 
        av.sales_rep_id,
        COUNT(DISTINCT av.id) as visits,
        COUNT(DISTINCT av.account_id) as accounts_visited,
        COUNT(DISTINCT avp.id) as photos
      FROM account_visits av
      LEFT JOIN account_visit_photos avp ON av.id = avp.visit_id
      WHERE av.sales_rep_id IN (${placeholders})
      ${start_date ? 'AND av.visit_date >= ?' : ''}
      ${end_date ? 'AND av.visit_date <= ?' : ''}
      GROUP BY av.sales_rep_id
    `;

    const params = [...repIds];
    if (start_date) params.push(start_date);
    if (end_date) params.push(end_date);

    db.all(metricsQuery, params, (err, metrics) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Merge rep info with metrics
      const comparison = reps.map(rep => {
        const repMetrics = metrics.find(m => m.sales_rep_id === rep.id) || {};
        return {
          sales_rep_id: rep.id,
          employee_id: rep.employee_id,
          name: rep.name,
          visits: repMetrics.visits || 0,
          accounts_visited: repMetrics.accounts_visited || 0,
          photos: repMetrics.photos || 0
        };
      });

      res.json({
        manager_id,
        start_date,
        end_date,
        reps: comparison,
        count: comparison.length
      });
    });
  });
};

module.exports = {
  getRepDashboard,
  getDailyMetrics,
  getWeeklySummary,
  getMonthlySummary,
  getAccountMetrics,
  getRepComparison
};
