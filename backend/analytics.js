const db = require('./database');

// GET /api/protected/analytics/summary - Return key metrics
const getAnalyticsSummary = (req, res) => {
  const summary = {};
  let pending = 0;

  // Get total revenue from orders
  db.all("SELECT items FROM orders", (err, orders) => {
    if (err) {
      console.error("Error fetching orders:", err);
      summary.totalRevenue = 0;
      summary.totalOrders = 0;
    } else {
      summary.totalOrders = orders.length;
      
      // Calculate total revenue
      let totalRevenue = 0;
      orders.forEach(order => {
        try {
          const items = JSON.parse(order.items);
          items.forEach(item => {
            totalRevenue += (item.price || 0) * (item.quantity || 0);
          });
        } catch (e) {
          console.error("Error parsing order items:", e);
        }
      });
      summary.totalRevenue = totalRevenue;
      summary.averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    }

    pending++;
    checkComplete();
  });

  // Get total products
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    summary.totalProducts = err ? 0 : row.count;
    pending++;
    checkComplete();
  });

  // Get total users
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    summary.totalUsers = err ? 0 : row.count;
    pending++;
    checkComplete();
  });

  // Get total suppliers
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'supplier'", (err, row) => {
    summary.totalSuppliers = err ? 0 : row.count;
    pending++;
    checkComplete();
  });

  // Get total retailers
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'retailer'", (err, row) => {
    summary.totalRetailers = err ? 0 : row.count;
    pending++;
    checkComplete();
  });

  // Get orders by status
  db.all("SELECT status, COUNT(*) as count FROM orders GROUP BY status", (err, rows) => {
    summary.pendingOrders = 0;
    summary.shippedOrders = 0;
    summary.deliveredOrders = 0;
    
    if (!err && rows) {
      rows.forEach(row => {
        if (row.status === 'pending') summary.pendingOrders = row.count;
        if (row.status === 'shipped') summary.shippedOrders = row.count;
        if (row.status === 'delivered') summary.deliveredOrders = row.count;
      });
    }
    pending++;
    checkComplete();
  });

  // Get orders this month vs last month
  db.all(`
    SELECT 
      COUNT(*) as count,
      strftime('%Y-%m', created_at) as month
    FROM orders
    WHERE created_at >= date('now', '-2 months')
    GROUP BY month
    ORDER BY month DESC
    LIMIT 2
  `, (err, rows) => {
    if (!err && rows) {
      summary.ordersThisMonth = rows.length > 0 ? rows[0].count : 0;
      summary.ordersLastMonth = rows.length > 1 ? rows[1].count : 0;
    } else {
      summary.ordersThisMonth = 0;
      summary.ordersLastMonth = 0;
    }
    pending++;
    checkComplete();
  });

  function checkComplete() {
    if (pending === 7) {
      res.json(summary);
    }
  }
};

// GET /api/protected/analytics/revenue - Revenue data by date
const getRevenueData = (req, res) => {
  const { days = 7 } = req.query;
  
  db.all(`
    SELECT 
      DATE(created_at) as date,
      items
    FROM orders
    WHERE created_at >= date('now', '-${parseInt(days)} days')
    ORDER BY date ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Group revenue by date
    const revenueByDate = {};
    rows.forEach(row => {
      try {
        const items = JSON.parse(row.items);
        let dayRevenue = 0;
        items.forEach(item => {
          dayRevenue += (item.price || 0) * (item.quantity || 0);
        });
        
        if (revenueByDate[row.date]) {
          revenueByDate[row.date] += dayRevenue;
        } else {
          revenueByDate[row.date] = dayRevenue;
        }
      } catch (e) {
        console.error("Error parsing order items:", e);
      }
    });

    // Convert to array format
    const data = Object.keys(revenueByDate).map(date => ({
      date,
      revenue: revenueByDate[date]
    }));

    res.json(data);
  });
};

// GET /api/protected/analytics/top-products - Top products by revenue
const getTopProducts = (req, res) => {
  db.all("SELECT items FROM orders", (err, orders) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate revenue per product
    const productRevenue = {};
    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items);
        items.forEach(item => {
          const productId = item.productId || item.id;
          const revenue = (item.price || 0) * (item.quantity || 0);
          
          if (productRevenue[productId]) {
            productRevenue[productId].revenue += revenue;
            productRevenue[productId].quantity += item.quantity || 0;
          } else {
            productRevenue[productId] = {
              productId,
              name: item.name || `Product ${productId}`,
              revenue,
              quantity: item.quantity || 0
            };
          }
        });
      } catch (e) {
        console.error("Error parsing order items:", e);
      }
    });

    // Convert to array and sort by revenue
    const topProducts = Object.values(productRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json(topProducts);
  });
};

// GET /api/protected/analytics/top-suppliers - Top 5 suppliers by revenue
const getTopSuppliers = (req, res) => {
  db.all(`
    SELECT 
      u.id,
      u.name,
      o.items
    FROM orders o
    JOIN users u ON o.supplier_id = u.id
    WHERE u.role = 'supplier'
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate revenue per supplier
    const supplierRevenue = {};
    rows.forEach(row => {
      try {
        const items = JSON.parse(row.items);
        let orderRevenue = 0;
        items.forEach(item => {
          orderRevenue += (item.price || 0) * (item.quantity || 0);
        });

        if (supplierRevenue[row.id]) {
          supplierRevenue[row.id].revenue += orderRevenue;
        } else {
          supplierRevenue[row.id] = {
            supplierId: row.id,
            name: row.name,
            revenue: orderRevenue
          };
        }
      } catch (e) {
        console.error("Error parsing order items:", e);
      }
    });

    // Convert to array and sort
    const topSuppliers = Object.values(supplierRevenue)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    res.json(topSuppliers);
  });
};

// GET /api/protected/analytics/orders-over-time - Orders over time
const getOrdersOverTime = (req, res) => {
  const { days = 30 } = req.query;
  
  db.all(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count,
      status
    FROM orders
    WHERE created_at >= date('now', '-${parseInt(days)} days')
    GROUP BY date, status
    ORDER BY date ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Group by date
    const ordersByDate = {};
    rows.forEach(row => {
      if (!ordersByDate[row.date]) {
        ordersByDate[row.date] = {
          date: row.date,
          pending: 0,
          shipped: 0,
          delivered: 0,
          total: 0
        };
      }
      ordersByDate[row.date][row.status] = row.count;
      ordersByDate[row.date].total += row.count;
    });

    const data = Object.values(ordersByDate);
    res.json(data);
  });
};

// GET /api/protected/products/low-stock - Low stock products
const getLowStockProducts = (req, res) => {
  const { threshold = 5 } = req.query;
  
  db.all(`
    SELECT 
      p.*,
      u.name as supplierName
    FROM products p
    LEFT JOIN users u ON p.supplierId = u.id
    WHERE p.stock < ?
    ORDER BY p.stock ASC
  `, [parseInt(threshold)], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

// GET /api/protected/analytics/order-status-breakdown - Order status breakdown
const getOrderStatusBreakdown = (req, res) => {
  db.all(`
    SELECT 
      status,
      COUNT(*) as count
    FROM orders
    GROUP BY status
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

// POST /api/protected/products/:id/adjust-stock - Adjust stock with history tracking
const adjustStock = (req, res) => {
  const productId = req.params.id;
  const { adjustment, reason, userId } = req.body;

  if (!adjustment || adjustment === 0) {
    return res.status(400).json({ error: 'Adjustment value is required' });
  }

  // Update product stock
  db.run(
    `UPDATE products SET stock = stock + ? WHERE id = ?`,
    [adjustment, productId],
    function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Record in stock history
      db.run(
        `INSERT INTO stock_history (product_id, user_id, adjustment, reason) VALUES (?, ?, ?, ?)`,
        [productId, userId, adjustment, reason || 'Manual adjustment'],
        (histErr) => {
          if (histErr) {
            console.error('Failed to record stock history:', histErr);
          }

          // Get updated stock
          db.get(
            `SELECT stock FROM products WHERE id = ?`,
            [productId],
            (err, row) => {
              if (err || !row) {
                return res.status(404).json({ error: 'Product not found' });
              }
              res.json({ 
                message: 'Stock updated successfully',
                newStock: row.stock 
              });
            }
          );
        }
      );
    }
  );
};

// GET /api/protected/products/:id/stock-history - Get stock history for a product
const getStockHistory = (req, res) => {
  const productId = req.params.id;
  
  db.all(`
    SELECT 
      sh.*,
      u.name as userName,
      u.email as userEmail
    FROM stock_history sh
    LEFT JOIN users u ON sh.user_id = u.id
    WHERE sh.product_id = ?
    ORDER BY sh.created_at DESC
    LIMIT 50
  `, [productId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
};

module.exports = {
  getAnalyticsSummary,
  getRevenueData,
  getTopProducts,
  getTopSuppliers,
  getOrdersOverTime,
  getLowStockProducts,
  getOrderStatusBreakdown,
  adjustStock,
  getStockHistory
};
