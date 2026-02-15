const db = require('./database');

/**
 * Multi-Supplier Dashboard Service
 * Handles supplier analytics, performance metrics, and management
 */

/**
 * Get all suppliers
 */
const getSuppliers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT u.id, u.name, u.email, u.approved, u.created_at,
              sm.total_orders, sm.on_time_percentage, sm.quality_rating,
              sm.total_revenue, sm.outstanding_balance, sm.credit_limit,
              sm.payment_terms, sm.last_order_date
       FROM users u
       LEFT JOIN supplier_metrics sm ON u.id = sm.supplier_id
       WHERE u.role = 'supplier'
       ORDER BY u.name
       LIMIT ? OFFSET ?`,
      [parseInt(limit), offset],
      (err, suppliers) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Get total count
        db.get(
          `SELECT COUNT(*) as total FROM users WHERE role = 'supplier'`,
          (err, result) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            res.json({
              suppliers,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.total,
                pages: Math.ceil(result.total / limit)
              }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

/**
 * Get supplier-specific analytics
 */
const getSupplierAnalytics = async (req, res) => {
  try {
    const { id: supplierId } = req.params;

    // Get supplier info
    db.get(
      `SELECT u.*, sm.*
       FROM users u
       LEFT JOIN supplier_metrics sm ON u.id = sm.supplier_id
       WHERE u.id = ? AND u.role = 'supplier'`,
      [supplierId],
      (err, supplier) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!supplier) {
          return res.status(404).json({ error: 'Supplier not found' });
        }

        // Get order statistics
        db.all(
          `SELECT 
             COUNT(*) as total_orders,
             SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
             SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
             SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
           FROM orders
           WHERE supplier_id = ?`,
          [supplierId],
          (err, orderStats) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            // Get monthly revenue trend (last 6 months)
            db.all(
              `SELECT 
                 strftime('%Y-%m', created_at) as month,
                 COUNT(*) as order_count
               FROM orders
               WHERE supplier_id = ? 
                 AND created_at >= date('now', '-6 months')
               GROUP BY month
               ORDER BY month DESC`,
              [supplierId],
              (err, monthlyTrend) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }

                // Get top products
                db.all(
                  `SELECT id, name, sku, price, stock, description
                   FROM products
                   WHERE supplierId = ?
                   ORDER BY stock DESC
                   LIMIT 10`,
                  [supplierId],
                  (err, topProducts) => {
                    if (err) {
                      return res.status(500).json({ error: 'Database error' });
                    }

                    res.json({
                      supplier,
                      analytics: {
                        orders: orderStats[0] || {},
                        monthlyTrend,
                        topProducts,
                        performance: {
                          on_time_percentage: supplier.on_time_percentage || 100,
                          quality_rating: supplier.quality_rating || 5.0,
                          total_revenue: supplier.total_revenue || 0,
                          outstanding_balance: supplier.outstanding_balance || 0
                        }
                      }
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Error fetching supplier analytics:', error);
    res.status(500).json({ error: 'Failed to fetch supplier analytics' });
  }
};

/**
 * Get orders from a specific supplier
 */
const getSupplierOrders = async (req, res) => {
  try {
    const { id: supplierId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*, u.name as retailer_name, u.email as retailer_email
      FROM orders o
      JOIN users u ON o.retailer_id = u.id
      WHERE o.supplier_id = ?
    `;
    const params = [supplierId];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    db.all(query, params, (err, orders) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Parse items for each order
      orders = orders.map(order => ({
        ...order,
        items: JSON.parse(order.items)
      }));

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM orders WHERE supplier_id = ?`;
      const countParams = [supplierId];
      if (status) {
        countQuery += ` AND status = ?`;
        countParams.push(status);
      }

      db.get(countQuery, countParams, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          orders,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        });
      });
    });
  } catch (error) {
    console.error('Error fetching supplier orders:', error);
    res.status(500).json({ error: 'Failed to fetch supplier orders' });
  }
};

/**
 * Get supplier balance and credits
 */
const getSupplierBalance = async (req, res) => {
  try {
    const { id: supplierId } = req.params;

    db.get(
      `SELECT u.name, u.email,
              sm.outstanding_balance, sm.credit_limit, sm.payment_terms,
              (sm.credit_limit - sm.outstanding_balance) as available_credit
       FROM users u
       LEFT JOIN supplier_metrics sm ON u.id = sm.supplier_id
       WHERE u.id = ? AND u.role = 'supplier'`,
      [supplierId],
      (err, balance) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!balance) {
          return res.status(404).json({ error: 'Supplier not found' });
        }

        // Get payment history
        db.all(
          `SELECT * FROM supplier_payments
           WHERE supplier_id = ?
           ORDER BY payment_date DESC
           LIMIT 10`,
          [supplierId],
          (err, payments) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            res.json({
              balance,
              payments
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error fetching supplier balance:', error);
    res.status(500).json({ error: 'Failed to fetch supplier balance' });
  }
};

/**
 * Update supplier payment terms
 */
const updateSupplierTerms = async (req, res) => {
  try {
    const { id: supplierId } = req.params;
    const { credit_limit, payment_terms } = req.body;

    // Check if supplier metrics exist
    db.get(
      `SELECT id FROM supplier_metrics WHERE supplier_id = ?`,
      [supplierId],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          // Update existing metrics
          db.run(
            `UPDATE supplier_metrics 
             SET credit_limit = ?, payment_terms = ?, updated_at = CURRENT_TIMESTAMP
             WHERE supplier_id = ?`,
            [credit_limit, payment_terms, supplierId],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to update terms' });
              }

              res.json({ 
                success: true, 
                message: 'Payment terms updated successfully' 
              });
            }
          );
        } else {
          // Create new metrics record
          db.run(
            `INSERT INTO supplier_metrics (supplier_id, credit_limit, payment_terms)
             VALUES (?, ?, ?)`,
            [supplierId, credit_limit, payment_terms],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to create terms' });
              }

              res.json({ 
                success: true, 
                message: 'Payment terms created successfully' 
              });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Error updating supplier terms:', error);
    res.status(500).json({ error: 'Failed to update supplier terms' });
  }
};

/**
 * Initialize supplier metrics (helper function)
 */
const initializeSupplierMetrics = (supplierId, callback) => {
  db.get(
    `SELECT id FROM supplier_metrics WHERE supplier_id = ?`,
    [supplierId],
    (err, existing) => {
      if (err || existing) {
        return callback && callback(err);
      }

      // Create initial metrics
      db.run(
        `INSERT INTO supplier_metrics (supplier_id) VALUES (?)`,
        [supplierId],
        callback
      );
    }
  );
};

module.exports = {
  getSuppliers,
  getSupplierAnalytics,
  getSupplierOrders,
  getSupplierBalance,
  updateSupplierTerms,
  initializeSupplierMetrics
};
