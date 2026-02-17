const db = require('./database');

/**
 * Advanced Reporting Service
 * Provides business intelligence and analytics
 */

/**
 * Get quarterly revenue
 */
const getQuarterlyRevenue = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const quarters = [
      { name: 'Q1', months: ['01', '02', '03'] },
      { name: 'Q2', months: ['04', '05', '06'] },
      { name: 'Q3', months: ['07', '08', '09'] },
      { name: 'Q4', months: ['10', '11', '12'] }
    ];

    const quarterlyData = [];

    // Calculate revenue for each quarter
    for (const quarter of quarters) {
      const monthConditions = quarter.months.map(m => `'${year}-${m}'`).join(',');
      
      await new Promise((resolve) => {
        db.get(
          `SELECT 
             COUNT(*) as order_count,
             SUM(CAST(json_extract(value, '$.quantity') AS INTEGER) * 
                 CAST(json_extract(value, '$.price') AS REAL)) as revenue
           FROM orders o,
           json_each(o.items)
           WHERE strftime('%Y-%m', o.created_at) IN (${monthConditions})
             AND o.status != 'cancelled'`,
          (err, result) => {
            quarterlyData.push({
              quarter: quarter.name,
              year: parseInt(year),
              revenue: result?.revenue || 0,
              order_count: result?.order_count || 0
            });
            resolve();
          }
        );
      });
    }

    res.json({
      year: parseInt(year),
      quarters: quarterlyData,
      total: quarterlyData.reduce((sum, q) => sum + (q.revenue || 0), 0)
    });
  } catch (error) {
    console.error('Error calculating quarterly revenue:', error);
    res.status(500).json({ error: 'Failed to calculate quarterly revenue' });
  }
};

/**
 * Get supplier performance analysis
 */
const getSupplierPerformance = async (req, res) => {
  try {
    db.all(
      `SELECT 
         u.id, u.name, u.email,
         COUNT(o.id) as total_orders,
         SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
         CAST(SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS REAL) / 
           NULLIF(COUNT(o.id), 0) * 100 as completion_rate,
         sm.on_time_percentage,
         sm.quality_rating,
         sm.total_revenue
       FROM users u
       LEFT JOIN orders o ON u.id = o.supplier_id
       LEFT JOIN supplier_metrics sm ON u.id = sm.supplier_id
       WHERE u.role = 'supplier'
       GROUP BY u.id
       ORDER BY total_orders DESC`,
      (err, suppliers) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          suppliers: suppliers.map(s => ({
            ...s,
            completion_rate: Math.round(s.completion_rate || 0),
            on_time_percentage: s.on_time_percentage || 100,
            quality_rating: s.quality_rating || 5.0,
            total_revenue: s.total_revenue || 0
          })),
          summary: {
            total_suppliers: suppliers.length,
            avg_completion_rate: suppliers.reduce((sum, s) => 
              sum + (s.completion_rate || 0), 0) / suppliers.length,
            avg_quality_rating: suppliers.reduce((sum, s) => 
              sum + (s.quality_rating || 5.0), 0) / suppliers.length
          }
        });
      }
    );
  } catch (error) {
    console.error('Error analyzing supplier performance:', error);
    res.status(500).json({ error: 'Failed to analyze supplier performance' });
  }
};

/**
 * Get customer lifetime value (LTV)
 */
const getCustomerLTV = async (req, res) => {
  try {
    db.all(
      `SELECT 
         u.id, u.name, u.email, u.created_at,
         COUNT(o.id) as total_orders,
         SUM(CAST(json_extract(value, '$.quantity') AS INTEGER) * 
             CAST(json_extract(value, '$.price') AS REAL)) as lifetime_value,
         AVG(CAST(json_extract(value, '$.quantity') AS INTEGER) * 
             CAST(json_extract(value, '$.price') AS REAL)) as avg_order_value,
         julianday('now') - julianday(u.created_at) as days_as_customer
       FROM users u
       LEFT JOIN orders o ON u.id = o.retailer_id
       LEFT JOIN json_each(o.items) ON 1=1
       WHERE u.role = 'retailer'
       GROUP BY u.id
       ORDER BY lifetime_value DESC`,
      (err, customers) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          customers: customers.map(c => ({
            ...c,
            lifetime_value: Math.round((c.lifetime_value || 0) * 100) / 100,
            avg_order_value: Math.round((c.avg_order_value || 0) * 100) / 100,
            days_as_customer: Math.round(c.days_as_customer || 0),
            orders_per_month: c.days_as_customer > 0 ? 
              Math.round((c.total_orders / (c.days_as_customer / 30)) * 100) / 100 : 0
          })),
          summary: {
            total_customers: customers.length,
            avg_ltv: customers.reduce((sum, c) => 
              sum + (c.lifetime_value || 0), 0) / customers.length,
            total_revenue: customers.reduce((sum, c) => 
              sum + (c.lifetime_value || 0), 0)
          }
        });
      }
    );
  } catch (error) {
    console.error('Error calculating customer LTV:', error);
    res.status(500).json({ error: 'Failed to calculate customer LTV' });
  }
};

/**
 * Get profit margin analysis
 */
const getProfitAnalysis = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];
    
    if (startDate && endDate) {
      dateFilter = 'WHERE o.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    db.all(
      `SELECT 
         p.id, p.name, p.sku, p.supplierId,
         u.name as supplier_name,
         COUNT(DISTINCT o.id) as times_ordered,
         SUM(CAST(json_extract(value, '$.quantity') AS INTEGER)) as total_quantity_sold,
         p.price as current_price,
         SUM(CAST(json_extract(value, '$.quantity') AS INTEGER) * 
             CAST(json_extract(value, '$.price') AS REAL)) as total_revenue,
         p.stock as current_stock
       FROM products p
       LEFT JOIN users u ON p.supplierId = u.id
       LEFT JOIN orders o ON 1=1 ${dateFilter}
       LEFT JOIN json_each(o.items) ON json_extract(value, '$.sku') = p.sku
       GROUP BY p.id
       HAVING total_quantity_sold > 0
       ORDER BY total_revenue DESC`,
      params,
      (err, products) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        // Calculate profit margins (mock calculation)
        // Assumes Cost of Goods Sold (COGS) is 70% of selling price
        // This gives a 30% gross profit margin
        const productsWithMargin = products.map(p => {
          const cost = p.current_price * 0.7; // COGS = 70% of price
          const revenue = p.total_revenue || 0;
          const profit = revenue - (cost * (p.total_quantity_sold || 0));
          const margin_percentage = revenue > 0 ? (profit / revenue) * 100 : 0;

          return {
            ...p,
            estimated_cost: Math.round(cost * 100) / 100,
            estimated_profit: Math.round(profit * 100) / 100,
            margin_percentage: Math.round(margin_percentage * 100) / 100,
            total_revenue: Math.round(revenue * 100) / 100
          };
        });

        res.json({
          products: productsWithMargin,
          summary: {
            total_revenue: productsWithMargin.reduce((sum, p) => 
              sum + (p.total_revenue || 0), 0),
            total_profit: productsWithMargin.reduce((sum, p) => 
              sum + (p.estimated_profit || 0), 0),
            avg_margin: productsWithMargin.reduce((sum, p) => 
              sum + (p.margin_percentage || 0), 0) / productsWithMargin.length
          }
        });
      }
    );
  } catch (error) {
    console.error('Error calculating profit analysis:', error);
    res.status(500).json({ error: 'Failed to calculate profit analysis' });
  }
};

/**
 * Get tax summary
 */
const getTaxSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    db.all(
      `SELECT 
         strftime('%m', i.created_at) as month,
         SUM(i.subtotal) as gross_sales,
         SUM(i.tax) as sales_tax,
         SUM(i.discount) as total_discounts,
         SUM(i.total) as net_revenue,
         COUNT(*) as invoice_count
       FROM invoices i
       WHERE strftime('%Y', i.created_at) = ?
       GROUP BY month
       ORDER BY month`,
      [year.toString()],
      (err, monthlyData) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const summary = monthlyData.map(m => ({
          month: months[parseInt(m.month) - 1],
          month_num: m.month,
          gross_sales: Math.round((m.gross_sales || 0) * 100) / 100,
          sales_tax: Math.round((m.sales_tax || 0) * 100) / 100,
          total_discounts: Math.round((m.total_discounts || 0) * 100) / 100,
          net_revenue: Math.round((m.net_revenue || 0) * 100) / 100,
          invoice_count: m.invoice_count
        }));

        res.json({
          year: parseInt(year),
          monthly: summary,
          annual_totals: {
            gross_sales: summary.reduce((sum, m) => sum + m.gross_sales, 0),
            sales_tax: summary.reduce((sum, m) => sum + m.sales_tax, 0),
            total_discounts: summary.reduce((sum, m) => sum + m.total_discounts, 0),
            net_revenue: summary.reduce((sum, m) => sum + m.net_revenue, 0),
            invoice_count: summary.reduce((sum, m) => sum + m.invoice_count, 0)
          }
        });
      }
    );
  } catch (error) {
    console.error('Error generating tax summary:', error);
    res.status(500).json({ error: 'Failed to generate tax summary' });
  }
};

/**
 * Get year-over-year comparison
 */
const getYoYComparison = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const getYearData = (year) => {
      return new Promise((resolve) => {
        db.get(
          `SELECT 
             COUNT(DISTINCT o.id) as total_orders,
             COUNT(DISTINCT u.id) as unique_customers,
             SUM(CAST(json_extract(value, '$.quantity') AS INTEGER) * 
                 CAST(json_extract(value, '$.price') AS REAL)) as revenue
           FROM orders o
           LEFT JOIN users u ON o.retailer_id = u.id
           LEFT JOIN json_each(o.items) ON 1=1
           WHERE strftime('%Y', o.created_at) = ?
             AND o.status != 'cancelled'`,
          [year.toString()],
          (err, data) => {
            resolve(data || { total_orders: 0, unique_customers: 0, revenue: 0 });
          }
        );
      });
    };

    const [currentData, previousData] = await Promise.all([
      getYearData(currentYear),
      getYearData(previousYear)
    ]);

    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    res.json({
      current_year: {
        year: currentYear,
        ...currentData,
        revenue: Math.round((currentData.revenue || 0) * 100) / 100
      },
      previous_year: {
        year: previousYear,
        ...previousData,
        revenue: Math.round((previousData.revenue || 0) * 100) / 100
      },
      growth: {
        orders: Math.round(calculateGrowth(
          currentData.total_orders, previousData.total_orders) * 100) / 100,
        customers: Math.round(calculateGrowth(
          currentData.unique_customers, previousData.unique_customers) * 100) / 100,
        revenue: Math.round(calculateGrowth(
          currentData.revenue, previousData.revenue) * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error generating YoY comparison:', error);
    res.status(500).json({ error: 'Failed to generate YoY comparison' });
  }
};

module.exports = {
  getQuarterlyRevenue,
  getSupplierPerformance,
  getCustomerLTV,
  getProfitAnalysis,
  getTaxSummary,
  getYoYComparison
};
