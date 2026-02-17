/**
 * Warehouse Analytics Service
 * Provides KPIs, reports, and analytics for warehouse operations
 */

const db = require('./database');

/**
 * Get warehouse dashboard KPIs
 */
const getDashboardKPIs = (filters = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { start_date, end_date, zone } = filters;
      
      // Get receiving stats
      const receivingStats = await new Promise((resolve, reject) => {
        let query = `
          SELECT 
            COUNT(*) as total_shipments,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_shipments,
            SUM(total_items) as total_items_expected,
            SUM(items_received) as total_items_received
          FROM receiving_shipments
          WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date && end_date) {
          query += ' AND created_at BETWEEN ? AND ?';
          params.push(start_date, end_date);
        } else {
          query += ' AND DATE(created_at) = DATE(?)';
          params.push('now');
        }
        
        db.get(query, params, (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
      
      // Get picking stats
      const pickingStats = await new Promise((resolve, reject) => {
        let query = `
          SELECT 
            COUNT(*) as total_pick_lists,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_pick_lists,
            SUM(total_items) as total_items,
            SUM(items_picked) as items_picked,
            AVG(actual_time) as avg_pick_time
          FROM pick_lists
          WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date && end_date) {
          query += ' AND created_at BETWEEN ? AND ?';
          params.push(start_date, end_date);
        } else {
          query += ' AND DATE(created_at) = DATE(?)';
          params.push('now');
        }
        
        if (zone) {
          query += ' AND zone = ?';
          params.push(zone);
        }
        
        db.get(query, params, (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
      
      // Get scanning stats
      const scanningStats = await new Promise((resolve, reject) => {
        let query = `
          SELECT 
            COUNT(*) as total_scans,
            SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_scans,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_scans,
            scan_type
          FROM inventory_scans
          WHERE 1=1
        `;
        
        const params = [];
        
        if (start_date && end_date) {
          query += ' AND scanned_at BETWEEN ? AND ?';
          params.push(start_date, end_date);
        } else {
          query += ' AND DATE(scanned_at) = DATE(?)';
          params.push('now');
        }
        
        query += ' GROUP BY scan_type';
        
        db.all(query, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
      
      // Get inventory stats
      const inventoryStats = await new Promise((resolve, reject) => {
        const query = `
          SELECT 
            COUNT(DISTINCT product_id) as unique_products,
            SUM(quantity) as total_units,
            COUNT(DISTINCT location_id) as locations_used
          FROM product_locations
          WHERE quantity > 0
        `;
        
        db.get(query, [], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
      
      // Calculate accuracy rates
      const receiving_accuracy = receivingStats.total_items_expected > 0 ?
        (receivingStats.total_items_received / receivingStats.total_items_expected * 100).toFixed(2) : 0;
      
      const picking_accuracy = pickingStats.total_items > 0 ?
        (pickingStats.items_picked / pickingStats.total_items * 100).toFixed(2) : 0;
      
      const totalScans = scanningStats.reduce((acc, s) => acc + s.total_scans, 0);
      const successfulScans = scanningStats.reduce((acc, s) => acc + s.successful_scans, 0);
      const scan_success_rate = totalScans > 0 ? (successfulScans / totalScans * 100).toFixed(2) : "0.00";
      
      resolve({
        throughput: {
          receiving: receivingStats,
          picking: pickingStats,
          scanning: scanningStats
        },
        accuracy: {
          receiving_accuracy: parseFloat(receiving_accuracy),
          picking_accuracy: parseFloat(picking_accuracy),
          scan_success_rate: scan_success_rate.toFixed(2)
        },
        inventory: inventoryStats,
        productivity: {
          avg_pick_time: pickingStats.avg_pick_time ? pickingStats.avg_pick_time.toFixed(2) : 0,
          picks_per_hour: pickingStats.avg_pick_time ? (60 / pickingStats.avg_pick_time).toFixed(2) : 0
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Get worker productivity metrics
 */
const getWorkerProductivity = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const { user_id, start_date, end_date } = filters;
    
    let query = `
      SELECT 
        u.id as user_id,
        u.name,
        u.email,
        wu.shift,
        wu.zone_assignment,
        COUNT(DISTINCT is1.id) as total_scans,
        COUNT(DISTINCT CASE WHEN pl.status = 'completed' THEN pl.id END) as completed_picks,
        COUNT(DISTINCT CASE WHEN rs.status = 'completed' THEN rs.id END) as completed_receives,
        AVG(pl.actual_time) as avg_pick_time,
        SUM(pli.quantity_picked) as total_units_picked
      FROM users u
      LEFT JOIN warehouse_users wu ON u.id = wu.user_id
      LEFT JOIN inventory_scans is1 ON u.id = is1.user_id
      LEFT JOIN pick_lists pl ON u.id = pl.assigned_to
      LEFT JOIN pick_list_items pli ON pl.id = pli.pick_list_id AND pli.picked_by = u.id
      LEFT JOIN receiving_shipments rs ON u.id = rs.received_by
      WHERE wu.user_id IS NOT NULL
    `;
    
    const params = [];
    
    if (user_id) {
      query += ' AND u.id = ?';
      params.push(user_id);
    }
    if (start_date) {
      query += ' AND is1.scanned_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND is1.scanned_at <= ?';
      params.push(end_date);
    }
    
    query += ' GROUP BY u.id, u.name, u.email, wu.shift, wu.zone_assignment';
    query += ' ORDER BY total_scans DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Get inventory aging report
 */
const getInventoryAging = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        pl.product_id,
        wl.location_code,
        wl.zone,
        pl.quantity,
        pl.created_at,
        CAST((julianday('now') - julianday(pl.created_at)) AS INTEGER) as days_in_location
      FROM product_locations pl
      JOIN warehouse_locations wl ON pl.location_id = wl.id
      WHERE pl.quantity > 0
      ORDER BY days_in_location DESC
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) return reject(err);
      
      // Categorize by age
      const aged = rows.map(row => ({
        ...row,
        age_category: row.days_in_location > 90 ? 'slow_moving' :
                     row.days_in_location > 60 ? 'aging' :
                     row.days_in_location > 30 ? 'moderate' : 'fresh'
      }));
      
      resolve(aged);
    });
  });
};

/**
 * Get SKU velocity analysis
 */
const getSKUVelocity = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const { start_date, end_date, limit = 50 } = filters;
    
    let query = `
      SELECT 
        product_id,
        COUNT(*) as pick_count,
        SUM(quantity_picked) as total_picked,
        COUNT(DISTINCT pick_list_id) as pick_lists,
        AVG(quantity_picked) as avg_quantity
      FROM pick_list_items
      WHERE status = 'picked'
    `;
    
    const params = [];
    
    if (start_date) {
      query += ' AND picked_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND picked_at <= ?';
      params.push(end_date);
    }
    
    query += ' GROUP BY product_id';
    query += ' ORDER BY total_picked DESC';
    query += ' LIMIT ?';
    params.push(limit);
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      
      // Classify velocity
      const classified = rows.map((row, index) => ({
        ...row,
        velocity_class: index < limit * 0.2 ? 'A' : // Top 20%
                       index < limit * 0.5 ? 'B' : // Next 30%
                       'C', // Rest 50%
        rank: index + 1
      }));
      
      resolve(classified);
    });
  });
};

/**
 * Get cycle count discrepancies
 */
const getCycleCountDiscrepancies = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const { location_id, threshold = 5 } = filters;
    
    let query = `
      SELECT 
        cci.*,
        cc.count_number,
        wl.location_code,
        wl.zone,
        u.name as counted_by_name
      FROM cycle_count_items cci
      JOIN cycle_counts cc ON cci.cycle_count_id = cc.id
      JOIN warehouse_locations wl ON cci.location_id = wl.id
      LEFT JOIN users u ON cci.counted_by = u.id
      WHERE ABS(cci.variance) >= ? AND cc.status = 'completed'
    `;
    
    const params = [threshold];
    
    if (location_id) {
      query += ' AND cci.location_id = ?';
      params.push(location_id);
    }
    
    query += ' ORDER BY ABS(cci.variance) DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Get real-time inventory snapshot
 */
const getInventorySnapshot = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const { zone, location_id, product_id } = filters;
    
    let query = `
      SELECT 
        pl.product_id,
        pl.location_id,
        pl.quantity,
        pl.is_primary,
        wl.location_code,
        wl.aisle,
        wl.shelf,
        wl.position,
        wl.zone,
        pl.updated_at as last_updated
      FROM product_locations pl
      JOIN warehouse_locations wl ON pl.location_id = wl.id
      WHERE pl.quantity > 0
    `;
    
    const params = [];
    
    if (zone) {
      query += ' AND wl.zone = ?';
      params.push(zone);
    }
    if (location_id) {
      query += ' AND pl.location_id = ?';
      params.push(location_id);
    }
    if (product_id) {
      query += ' AND pl.product_id = ?';
      params.push(product_id);
    }
    
    query += ' ORDER BY wl.zone, wl.aisle, wl.shelf, wl.position';
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Get warehouse performance trends
 */
const getPerformanceTrends = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const { days = 30 } = filters;
    
    const query = `
      SELECT 
        DATE(scanned_at) as date,
        scan_type,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(quantity) as total_quantity
      FROM inventory_scans
      WHERE scanned_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(scanned_at), scan_type
      ORDER BY date DESC, scan_type
    `;
    
    db.all(query, [days], (err, rows) => {
      if (err) return reject(err);
      
      // Group by date
      const byDate = {};
      rows.forEach(row => {
        if (!byDate[row.date]) {
          byDate[row.date] = { date: row.date, scans: {} };
        }
        byDate[row.date].scans[row.scan_type] = {
          count: row.count,
          successful: row.successful,
          total_quantity: row.total_quantity,
          success_rate: (row.successful / row.count * 100).toFixed(2)
        };
      });
      
      resolve(Object.values(byDate));
    });
  });
};

/**
 * Get location utilization
 */
const getLocationUtilization = (filters = {}) => {
  return new Promise((resolve, reject) => {
    const { zone } = filters;
    
    let query = `
      SELECT 
        wl.id,
        wl.location_code,
        wl.zone,
        wl.location_type,
        wl.capacity,
        wl.current_capacity,
        CAST(wl.current_capacity AS FLOAT) / wl.capacity * 100 as utilization_pct,
        COUNT(pl.id) as products_stored
      FROM warehouse_locations wl
      LEFT JOIN product_locations pl ON wl.id = pl.location_id AND pl.quantity > 0
      WHERE wl.is_active = 1
    `;
    
    const params = [];
    
    if (zone) {
      query += ' AND wl.zone = ?';
      params.push(zone);
    }
    
    query += ' GROUP BY wl.id';
    query += ' ORDER BY utilization_pct DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

module.exports = {
  getDashboardKPIs,
  getWorkerProductivity,
  getInventoryAging,
  getSKUVelocity,
  getCycleCountDiscrepancies,
  getInventorySnapshot,
  getPerformanceTrends,
  getLocationUtilization
};
