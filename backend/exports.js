const db = require('./database');

// Helper function to escape CSV fields
const escapeCSV = (field) => {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

// Helper function to convert array of objects to CSV
const arrayToCSV = (data, headers) => {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }
  
  const headerRow = headers.join(',');
  const dataRows = data.map(row => {
    return headers.map(header => escapeCSV(row[header])).join(',');
  }).join('\n');
  
  return headerRow + '\n' + dataRows;
};

// GET /api/protected/export/orders - Export orders as CSV
const exportOrders = (req, res) => {
  const { startDate, endDate, status } = req.query;
  
  let query = `
    SELECT 
      o.id,
      r.name as retailerName,
      s.name as supplierName,
      o.items,
      o.status,
      o.created_at
    FROM orders o
    LEFT JOIN users r ON o.retailer_id = r.id
    LEFT JOIN users s ON o.supplier_id = s.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (startDate) {
    query += ` AND DATE(o.created_at) >= ?`;
    params.push(startDate);
  }
  
  if (endDate) {
    query += ` AND DATE(o.created_at) <= ?`;
    params.push(endDate);
  }
  
  if (status && status !== 'all') {
    query += ` AND o.status = ?`;
    params.push(status);
  }
  
  query += ` ORDER BY o.created_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Process orders and calculate total value
    const processedOrders = rows.map(row => {
      let totalValue = 0;
      let itemsDescription = '';
      
      try {
        const items = JSON.parse(row.items);
        itemsDescription = items.map(item => 
          `${item.name || 'Product'} x${item.quantity || 1}`
        ).join('; ');
        
        totalValue = items.reduce((sum, item) => 
          sum + ((item.price || 0) * (item.quantity || 0)), 0
        );
      } catch (e) {
        console.error('Error parsing order items:', e);
        itemsDescription = 'Error parsing items';
      }
      
      return {
        'Order ID': row.id,
        'Retailer': row.retailerName || 'N/A',
        'Supplier': row.supplierName || 'N/A',
        'Items': itemsDescription,
        'Status': row.status,
        'Created Date': row.created_at,
        'Total Value': totalValue.toFixed(2)
      };
    });
    
    const headers = ['Order ID', 'Retailer', 'Supplier', 'Items', 'Status', 'Created Date', 'Total Value'];
    const csv = arrayToCSV(processedOrders, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });
};

// GET /api/protected/export/users - Export users as CSV
const exportUsers = (req, res) => {
  const { role } = req.query;
  
  let query = `SELECT id, name, email, role, approved, created_at FROM users WHERE 1=1`;
  const params = [];
  
  if (role && role !== 'all') {
    query += ` AND role = ?`;
    params.push(role);
  }
  
  query += ` ORDER BY created_at DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const processedUsers = rows.map(row => ({
      'User ID': row.id,
      'Name': row.name,
      'Email': row.email,
      'Role': row.role,
      'Status': row.approved ? 'Approved' : 'Pending',
      'Created Date': row.created_at
    }));
    
    const headers = ['User ID', 'Name', 'Email', 'Role', 'Status', 'Created Date'];
    const csv = arrayToCSV(processedUsers, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });
};

// GET /api/protected/export/products - Export products as CSV
const exportProducts = (req, res) => {
  const { supplierId } = req.query;
  
  let query = `
    SELECT 
      p.*,
      u.name as supplierName
    FROM products p
    LEFT JOIN users u ON p.supplierId = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (supplierId && supplierId !== 'all') {
    query += ` AND p.supplierId = ?`;
    params.push(supplierId);
  }
  
  query += ` ORDER BY p.id DESC`;
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    const processedProducts = rows.map(row => ({
      'Product ID': row.id,
      'Name': row.name,
      'SKU': row.sku,
      'Price': row.price ? row.price.toFixed(2) : '0.00',
      'Stock': row.stock,
      'Supplier': row.supplierName || 'N/A',
      'Description': row.description || ''
    }));
    
    const headers = ['Product ID', 'Name', 'SKU', 'Price', 'Stock', 'Supplier', 'Description'];
    const csv = arrayToCSV(processedProducts, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products-export-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });
};

// GET /api/protected/export/monthly-revenue - Monthly revenue report
const exportMonthlyRevenue = (req, res) => {
  const { months = 12 } = req.query;
  
  db.all(`
    SELECT 
      strftime('%Y-%m', created_at) as month,
      items
    FROM orders
    WHERE created_at >= date('now', '-${parseInt(months)} months')
    ORDER BY month ASC
  `, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Calculate revenue by month
    const revenueByMonth = {};
    rows.forEach(row => {
      try {
        const items = JSON.parse(row.items);
        const monthRevenue = items.reduce((sum, item) => 
          sum + ((item.price || 0) * (item.quantity || 0)), 0
        );
        
        if (revenueByMonth[row.month]) {
          revenueByMonth[row.month] += monthRevenue;
        } else {
          revenueByMonth[row.month] = monthRevenue;
        }
      } catch (e) {
        console.error('Error parsing order items:', e);
      }
    });
    
    const processedData = Object.keys(revenueByMonth).map(month => ({
      'Month': month,
      'Revenue': revenueByMonth[month].toFixed(2)
    }));
    
    const headers = ['Month', 'Revenue'];
    const csv = arrayToCSV(processedData, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=monthly-revenue-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });
};

// GET /api/protected/export/low-stock - Low stock report
const exportLowStock = (req, res) => {
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
    
    const processedProducts = rows.map(row => ({
      'Product ID': row.id,
      'Name': row.name,
      'SKU': row.sku,
      'Current Stock': row.stock,
      'Price': row.price ? row.price.toFixed(2) : '0.00',
      'Supplier': row.supplierName || 'N/A',
      'Reorder Quantity': Math.max(0, parseInt(threshold) - row.stock)
    }));
    
    const headers = ['Product ID', 'Name', 'SKU', 'Current Stock', 'Price', 'Supplier', 'Reorder Quantity'];
    const csv = arrayToCSV(processedProducts, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=low-stock-report-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });
};

// GET /api/protected/export/top-products - Top performing products report
const exportTopProducts = (req, res) => {
  const { limit = 20 } = req.query;
  
  db.all("SELECT items FROM orders", (err, orders) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Calculate revenue per product
    const productStats = {};
    orders.forEach(order => {
      try {
        const items = JSON.parse(order.items);
        items.forEach(item => {
          const productId = item.productId || item.id || item.sku;
          const revenue = (item.price || 0) * (item.quantity || 0);
          
          if (productStats[productId]) {
            productStats[productId].revenue += revenue;
            productStats[productId].quantity += item.quantity || 0;
            productStats[productId].orders += 1;
          } else {
            productStats[productId] = {
              name: item.name || `Product ${productId}`,
              revenue,
              quantity: item.quantity || 0,
              orders: 1,
              price: item.price || 0
            };
          }
        });
      } catch (e) {
        console.error("Error parsing order items:", e);
      }
    });

    // Convert to array and sort by revenue
    const topProducts = Object.entries(productStats)
      .map(([id, stats]) => ({
        'Product': stats.name,
        'Total Revenue': stats.revenue.toFixed(2),
        'Units Sold': stats.quantity,
        'Number of Orders': stats.orders,
        'Average Price': stats.price.toFixed(2)
      }))
      .sort((a, b) => parseFloat(b['Total Revenue']) - parseFloat(a['Total Revenue']))
      .slice(0, parseInt(limit));

    const headers = ['Product', 'Total Revenue', 'Units Sold', 'Number of Orders', 'Average Price'];
    const csv = arrayToCSV(topProducts, headers);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=top-products-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });
};

module.exports = {
  exportOrders,
  exportUsers,
  exportProducts,
  exportMonthlyRevenue,
  exportLowStock,
  exportTopProducts
};
