/**
 * Warehouse Management Service
 * Core warehouse operations including locations, inventory, and scanning
 */

const db = require('./database');

/**
 * Get all warehouse locations with optional filtering
 */
const getLocations = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM warehouse_locations WHERE 1=1';
    const params = [];

    if (filters.zone) {
      query += ' AND zone = ?';
      params.push(filters.zone);
    }
    if (filters.location_type) {
      query += ' AND location_type = ?';
      params.push(filters.location_type);
    }
    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      params.push(filters.is_active ? 1 : 0);
    }

    query += ' ORDER BY location_code';

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Get a specific location by ID or code
 */
const getLocation = (idOrCode) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM warehouse_locations WHERE id = ? OR location_code = ?';
    db.get(query, [idOrCode, idOrCode], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

/**
 * Create a new warehouse location
 */
const createLocation = (locationData, userId) => {
  return new Promise((resolve, reject) => {
    const { location_code, aisle, shelf, position, zone, location_type, capacity } = locationData;
    
    const query = `
      INSERT INTO warehouse_locations 
      (location_code, aisle, shelf, position, zone, location_type, capacity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [location_code, aisle, shelf, position, zone, location_type || 'standard', capacity || 100], function(err) {
      if (err) return reject(err);
      
      // Log audit event
      logAuditEvent(userId, 'create_location', 'warehouse_locations', this.lastID, {
        location_code,
        zone,
        location_type
      }).catch(console.error);
      
      resolve({ id: this.lastID, ...locationData });
    });
  });
};

/**
 * Update a warehouse location
 */
const updateLocation = (locationId, updates, userId) => {
  return new Promise((resolve, reject) => {
    const allowedFields = ['aisle', 'shelf', 'position', 'zone', 'location_type', 'capacity', 'is_active'];
    const updateFields = [];
    const params = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        params.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return reject(new Error('No valid fields to update'));
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(locationId);
    
    const query = `UPDATE warehouse_locations SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.run(query, params, function(err) {
      if (err) return reject(err);
      
      logAuditEvent(userId, 'update_location', 'warehouse_locations', locationId, updates).catch(console.error);
      
      resolve({ id: locationId, changes: this.changes });
    });
  });
};

/**
 * Get inventory at a specific location
 */
const getInventoryByLocation = (locationId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        pl.*,
        wl.location_code,
        wl.zone
      FROM product_locations pl
      JOIN warehouse_locations wl ON pl.location_id = wl.id
      WHERE pl.location_id = ? AND pl.quantity > 0
      ORDER BY pl.is_primary DESC, pl.quantity DESC
    `;
    
    db.all(query, [locationId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Get all locations for a product
 */
const getProductLocations = (productId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        pl.*,
        wl.location_code,
        wl.aisle,
        wl.shelf,
        wl.position,
        wl.zone
      FROM product_locations pl
      JOIN warehouse_locations wl ON pl.location_id = wl.id
      WHERE pl.product_id = ? AND pl.quantity > 0
      ORDER BY pl.is_primary DESC, pl.quantity DESC
    `;
    
    db.all(query, [productId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Update product quantity at a location
 */
const updateProductLocation = (productId, locationId, quantity, userId) => {
  return new Promise((resolve, reject) => {
    // Check if mapping exists
    const checkQuery = 'SELECT * FROM product_locations WHERE product_id = ? AND location_id = ?';
    
    db.get(checkQuery, [productId, locationId], (err, row) => {
      if (err) return reject(err);
      
      if (row) {
        // Update existing
        const updateQuery = `
          UPDATE product_locations 
          SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
          WHERE product_id = ? AND location_id = ?
        `;
        
        db.run(updateQuery, [quantity, productId, locationId], function(err) {
          if (err) return reject(err);
          
          logAuditEvent(userId, 'update_inventory', 'product_locations', row.id, {
            productId,
            locationId,
            quantityChange: quantity
          }).catch(console.error);
          
          resolve({ id: row.id, changes: this.changes });
        });
      } else {
        // Insert new
        const insertQuery = `
          INSERT INTO product_locations (product_id, location_id, quantity)
          VALUES (?, ?, ?)
        `;
        
        db.run(insertQuery, [productId, locationId, quantity], function(err) {
          if (err) return reject(err);
          
          logAuditEvent(userId, 'create_inventory', 'product_locations', this.lastID, {
            productId,
            locationId,
            quantity
          }).catch(console.error);
          
          resolve({ id: this.lastID });
        });
      }
    });
  });
};

/**
 * Get real-time inventory summary
 */
const getInventorySummary = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        pl.product_id,
        SUM(pl.quantity) as total_quantity,
        COUNT(DISTINCT pl.location_id) as location_count,
        GROUP_CONCAT(DISTINCT wl.zone) as zones
      FROM product_locations pl
      JOIN warehouse_locations wl ON pl.location_id = wl.id
      WHERE pl.quantity > 0
    `;
    
    const params = [];
    
    if (filters.zone) {
      query += ' AND wl.zone = ?';
      params.push(filters.zone);
    }
    
    query += ' GROUP BY pl.product_id ORDER BY total_quantity DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Log a warehouse audit event
 */
const logAuditEvent = (userId, action, resourceType, resourceId, data) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO warehouse_audit_logs 
      (user_id, action, resource_type, resource_id, new_value)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [userId, action, resourceType, resourceId, JSON.stringify(data)], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
};

/**
 * Get audit logs with filtering
 */
const getAuditLogs = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        wal.*,
        u.name as user_name,
        u.email as user_email
      FROM warehouse_audit_logs wal
      JOIN users u ON wal.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.user_id) {
      query += ' AND wal.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.action) {
      query += ' AND wal.action = ?';
      params.push(filters.action);
    }
    if (filters.resource_type) {
      query += ' AND wal.resource_type = ?';
      params.push(filters.resource_type);
    }
    if (filters.start_date) {
      query += ' AND wal.created_at >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND wal.created_at <= ?';
      params.push(filters.end_date);
    }
    
    query += ' ORDER BY wal.created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Get warehouse user info
 */
const getWarehouseUser = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        wu.*,
        u.name,
        u.email
      FROM warehouse_users wu
      JOIN users u ON wu.user_id = u.id
      WHERE wu.user_id = ?
    `;
    
    db.get(query, [userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

/**
 * Create or update warehouse user
 */
const upsertWarehouseUser = (userId, warehouseData) => {
  return new Promise((resolve, reject) => {
    const { warehouse_id, shift, zone_assignment, default_operation, employee_number } = warehouseData;
    
    const query = `
      INSERT INTO warehouse_users 
      (user_id, warehouse_id, shift, zone_assignment, default_operation, employee_number)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        warehouse_id = excluded.warehouse_id,
        shift = excluded.shift,
        zone_assignment = excluded.zone_assignment,
        default_operation = excluded.default_operation,
        employee_number = excluded.employee_number,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    db.run(query, [userId, warehouse_id, shift, zone_assignment, default_operation, employee_number], function(err) {
      if (err) return reject(err);
      resolve({ userId, changes: this.changes });
    });
  });
};

module.exports = {
  getLocations,
  getLocation,
  createLocation,
  updateLocation,
  getInventoryByLocation,
  getProductLocations,
  updateProductLocation,
  getInventorySummary,
  logAuditEvent,
  getAuditLogs,
  getWarehouseUser,
  upsertWarehouseUser
};
