const db = require('./database');

/**
 * Mobile Orders Service
 * Handles order creation and management for authorized accounts by sales reps
 */

/**
 * Create order for authorized account
 */
const createOrder = (req, res) => {
  const { sales_rep_id, account_id, supplier_id, items, notes } = req.body;

  // Verify authorization
  const authQuery = `
    SELECT * FROM rep_authorized_accounts 
    WHERE sales_rep_id = ? AND account_id = ? AND is_active = 1
    AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)
  `;

  db.get(authQuery, [sales_rep_id, account_id], (err, auth) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!auth) {
      return res.status(403).json({ error: 'Not authorized to create orders for this account' });
    }

    // Check if order placement is allowed
    db.get('SELECT allow_order_placement FROM account_preferences WHERE account_id = ?', [account_id], (err, prefs) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      if (prefs && !prefs.allow_order_placement) {
        return res.status(403).json({ error: 'Order placement not allowed for this account' });
      }

      // Create the order
      const orderQuery = `
        INSERT INTO orders (retailer_id, supplier_id, items, status)
        VALUES (?, ?, ?, 'pending')
      `;

      db.run(orderQuery, [account_id, supplier_id, JSON.stringify(items)], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Log the order creation activity
        const activityNote = `Order created by sales rep (Rep ID: ${sales_rep_id})${notes ? ': ' + notes : ''}`;
        
        res.status(201).json({
          message: 'Order created successfully',
          order_id: this.lastID,
          retailer_id: account_id,
          supplier_id,
          status: 'pending',
          created_by: 'sales_rep',
          sales_rep_id,
          note: activityNote
        });
      });
    });
  });
};

/**
 * Get orders for an account
 */
const getAccountOrders = (req, res) => {
  const { account_id } = req.params;
  const { sales_rep_id } = req.query;
  const { status, limit = 50, offset = 0 } = req.query;

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
      return res.status(403).json({ error: 'Not authorized to view orders for this account' });
    }

    let query = `
      SELECT o.*, u.name as supplier_name
      FROM orders o
      LEFT JOIN users u ON o.supplier_id = u.id
      WHERE o.retailer_id = ?
    `;
    const params = [account_id];

    if (status) {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(query, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Parse items JSON
      const orders = rows.map(order => ({
        ...order,
        items: JSON.parse(order.items)
      }));

      res.json({
        account_id,
        orders,
        count: orders.length,
        offset,
        limit
      });
    });
  });
};

/**
 * Get today's orders for a sales rep
 */
const getTodayOrders = (req, res) => {
  const { sales_rep_id } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const query = `
    SELECT o.*, u.name as retailer_name, s.name as supplier_name
    FROM orders o
    JOIN users u ON o.retailer_id = u.id
    LEFT JOIN users s ON o.supplier_id = s.id
    JOIN rep_authorized_accounts raa ON o.retailer_id = raa.account_id
    WHERE raa.sales_rep_id = ? 
    AND DATE(o.created_at) = ?
    ORDER BY o.created_at DESC
  `;

  db.all(query, [sales_rep_id, today], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Parse items JSON
    const orders = rows.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));

    // Calculate total value
    const totalValue = orders.reduce((sum, order) => {
      const orderTotal = order.items.reduce((itemSum, item) => {
        return itemSum + (item.price * item.quantity);
      }, 0);
      return sum + orderTotal;
    }, 0);

    res.json({
      date: today,
      orders,
      count: orders.length,
      total_value: parseFloat(totalValue.toFixed(2))
    });
  });
};

/**
 * Get order details
 */
const getOrderDetails = (req, res) => {
  const { order_id } = req.params;
  const { sales_rep_id } = req.query;

  const query = `
    SELECT o.*, 
           u.name as retailer_name, u.email as retailer_email,
           s.name as supplier_name, s.email as supplier_email
    FROM orders o
    JOIN users u ON o.retailer_id = u.id
    LEFT JOIN users s ON o.supplier_id = s.id
    WHERE o.id = ?
  `;

  db.get(query, [order_id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify authorization if sales_rep_id is provided
    if (sales_rep_id) {
      const authQuery = `
        SELECT * FROM rep_authorized_accounts 
        WHERE sales_rep_id = ? AND account_id = ? AND is_active = 1
      `;

      db.get(authQuery, [sales_rep_id, order.retailer_id], (err, auth) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!auth) {
          return res.status(403).json({ error: 'Not authorized to view this order' });
        }

        res.json({
          ...order,
          items: JSON.parse(order.items)
        });
      });
    } else {
      res.json({
        ...order,
        items: JSON.parse(order.items)
      });
    }
  });
};

/**
 * Update order
 */
const updateOrder = (req, res) => {
  const { order_id } = req.params;
  const { sales_rep_id, items, status, notes } = req.body;

  // First verify the order exists and check authorization
  const checkQuery = `
    SELECT o.*, raa.sales_rep_id
    FROM orders o
    JOIN rep_authorized_accounts raa ON o.retailer_id = raa.account_id
    WHERE o.id = ? AND raa.sales_rep_id = ? AND raa.is_active = 1
  `;

  db.get(checkQuery, [order_id, sales_rep_id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found or not authorized' });
    }

    // Only allow updates to pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Can only update pending orders' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (items !== undefined) {
      updates.push('items = ?');
      params.push(JSON.stringify(items));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(order_id);

    const updateQuery = `
      UPDATE orders 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    db.run(updateQuery, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        message: 'Order updated successfully',
        order_id,
        note: notes
      });
    });
  });
};

/**
 * Get order history for an account
 */
const getOrderHistory = (req, res) => {
  const { account_id } = req.params;
  const { sales_rep_id } = req.query;
  const { limit = 100, offset = 0 } = req.query;

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
      return res.status(403).json({ error: 'Not authorized to view order history for this account' });
    }

    const query = `
      SELECT o.*, u.name as supplier_name
      FROM orders o
      LEFT JOIN users u ON o.supplier_id = u.id
      WHERE o.retailer_id = ?
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.all(query, [account_id, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Parse items and calculate statistics
      const orders = rows.map(order => ({
        ...order,
        items: JSON.parse(order.items)
      }));

      const totalValue = orders.reduce((sum, order) => {
        const orderTotal = order.items.reduce((itemSum, item) => {
          return itemSum + (item.price * item.quantity);
        }, 0);
        return sum + orderTotal;
      }, 0);

      res.json({
        account_id,
        orders,
        count: orders.length,
        total_value: parseFloat(totalValue.toFixed(2)),
        offset,
        limit
      });
    });
  });
};

/**
 * Quick reorder - Create order based on previous order
 */
const quickReorder = (req, res) => {
  const { order_id } = req.params;
  const { sales_rep_id, account_id } = req.body;

  // Get the original order
  db.get('SELECT * FROM orders WHERE id = ?', [order_id], (err, originalOrder) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!originalOrder) {
      return res.status(404).json({ error: 'Original order not found' });
    }

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
        return res.status(403).json({ error: 'Not authorized to create orders for this account' });
      }

      // Create new order with same items
      const orderQuery = `
        INSERT INTO orders (retailer_id, supplier_id, items, status)
        VALUES (?, ?, ?, 'pending')
      `;

      db.run(orderQuery, [account_id, originalOrder.supplier_id, originalOrder.items], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          message: 'Order created successfully (reorder)',
          order_id: this.lastID,
          original_order_id: order_id,
          retailer_id: account_id,
          supplier_id: originalOrder.supplier_id,
          status: 'pending',
          items: JSON.parse(originalOrder.items)
        });
      });
    });
  });
};

module.exports = {
  createOrder,
  getAccountOrders,
  getTodayOrders,
  getOrderDetails,
  updateOrder,
  getOrderHistory,
  quickReorder
};
