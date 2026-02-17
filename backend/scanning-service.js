/**
 * Scanning Service
 * Handles barcode/UPC scanning operations for warehouse
 */

const db = require('./database');
const { logAuditEvent, updateProductLocation } = require('./warehouse-service');
const websocket = require('./websocket-server');

/**
 * Process a scan (universal scan endpoint)
 */
const processScan = async (scanData, userId) => {
  return new Promise(async (resolve, reject) => {
    const { 
      scan_type, 
      upc_code, 
      sku, 
      location_id, 
      quantity = 1, 
      session_id,
      metadata = {}
    } = scanData;

    try {
      // Find product by UPC or SKU
      const product = await findProductByCode(upc_code, sku);
      
      if (!product) {
        // Log failed scan
        await logScan({
          scan_type,
          user_id: userId,
          upc_code,
          sku,
          location_id,
          quantity,
          status: 'error',
          error_message: 'Product not found',
          session_id,
          metadata: JSON.stringify(metadata)
        });
        
        // Emit scan event
        try {
          websocket.emitScanEvent({
            user_id: userId,
            scan_type,
            upc_code,
            sku,
            location_id,
            status: 'error',
            error_message: 'Product not found'
          });
        } catch (wsError) {
          console.error('WebSocket emit error:', wsError);
        }
        
        return reject(new Error('Product not found'));
      }

      // Log successful scan
      const scanLog = await logScan({
        scan_type,
        user_id: userId,
        product_id: product.id,
        upc_code: upc_code || product.upc,
        sku: sku || product.sku,
        location_id,
        quantity,
        status: 'success',
        session_id,
        metadata: JSON.stringify(metadata)
      });

      // Get current inventory at location
      let currentInventory = null;
      if (location_id) {
        currentInventory = await getLocationInventory(product.id, location_id);
      }

      // Route to appropriate handler based on scan type
      let result = {
        scan_id: scanLog.id,
        product,
        location_id,
        current_inventory: currentInventory,
        quantity_scanned: quantity
      };

      switch (scan_type) {
        case 'receiving':
          result.next_action = 'confirm_receive';
          result.expected_location = await suggestReceivingLocation(product.id);
          break;
        case 'picking':
          result.next_action = 'confirm_pick';
          result.pick_quantity = quantity;
          break;
        case 'shipping':
          result.next_action = 'confirm_ship';
          result.verification_status = 'pending';
          break;
        case 'cycle_count':
          result.next_action = 'enter_count';
          result.expected_quantity = currentInventory ? currentInventory.quantity : 0;
          break;
        case 'adjustment':
          result.next_action = 'enter_new_quantity';
          result.current_quantity = currentInventory ? currentInventory.quantity : 0;
          break;
        default:
          result.next_action = 'view_details';
      }

      // Emit successful scan event
      try {
        websocket.emitScanEvent({
          user_id: userId,
          scan_type,
          product_id: product.id,
          upc_code: upc_code || product.upc,
          sku: sku || product.sku,
          location_id,
          quantity,
          status: 'success'
        });
      } catch (wsError) {
        console.error('WebSocket emit error:', wsError);
      }

      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Find product by UPC or SKU
 */
const findProductByCode = (upc, sku) => {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (upc) {
      query += ' AND upc = ?';
      params.push(upc);
    } else if (sku) {
      query += ' AND sku = ?';
      params.push(sku);
    } else {
      return reject(new Error('UPC or SKU required'));
    }

    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

/**
 * Log a scan event
 */
const logScan = (scanData) => {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO inventory_scans 
      (scan_type, user_id, product_id, upc_code, sku, location_id, quantity, status, error_message, session_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const { scan_type, user_id, product_id, upc_code, sku, location_id, quantity, status, error_message, session_id, metadata } = scanData;
    
    db.run(query, [
      scan_type, 
      user_id, 
      product_id, 
      upc_code, 
      sku, 
      location_id, 
      quantity, 
      status, 
      error_message, 
      session_id, 
      metadata
    ], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
};

/**
 * Get scan history for a session or user
 */
const getScanHistory = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        s.*,
        u.name as user_name
      FROM inventory_scans s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.session_id) {
      query += ' AND s.session_id = ?';
      params.push(filters.session_id);
    }
    if (filters.user_id) {
      query += ' AND s.user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.scan_type) {
      query += ' AND s.scan_type = ?';
      params.push(filters.scan_type);
    }
    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }
    
    query += ' ORDER BY s.scanned_at DESC';
    
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
 * Get location inventory for a product
 */
const getLocationInventory = (productId, locationId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM product_locations 
      WHERE product_id = ? AND location_id = ?
    `;
    
    db.get(query, [productId, locationId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

/**
 * Suggest best receiving location for a product
 */
const suggestReceivingLocation = (productId) => {
  return new Promise((resolve, reject) => {
    // First check if product has a primary location
    const primaryQuery = `
      SELECT 
        wl.*
      FROM product_locations pl
      JOIN warehouse_locations wl ON pl.location_id = wl.id
      WHERE pl.product_id = ? AND pl.is_primary = 1 AND wl.is_active = 1
    `;
    
    db.get(primaryQuery, [productId], (err, row) => {
      if (err) return reject(err);
      
      if (row) {
        return resolve(row);
      }
      
      // Otherwise suggest receiving location with most capacity
      const receivingQuery = `
        SELECT * FROM warehouse_locations 
        WHERE location_type = 'receiving' AND is_active = 1 
        ORDER BY (capacity - current_capacity) DESC
        LIMIT 1
      `;
      
      db.get(receivingQuery, [], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  });
};

/**
 * Get scan statistics
 */
const getScanStats = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        scan_type,
        status,
        COUNT(*) as count,
        DATE(scanned_at) as scan_date
      FROM inventory_scans
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }
    if (filters.start_date) {
      query += ' AND scanned_at >= ?';
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      query += ' AND scanned_at <= ?';
      params.push(filters.end_date);
    }
    
    query += ' GROUP BY scan_type, status, scan_date ORDER BY scan_date DESC';
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};

/**
 * Validate scan code format
 */
const validateScanCode = (code, type = 'upc') => {
  if (!code) return false;
  
  if (type === 'upc') {
    // UPC-A is 12 digits, UPC-E is 8 digits
    return /^\d{8}$|^\d{12}$/.test(code);
  } else if (type === 'sku') {
    // SKU can be alphanumeric
    return /^[A-Za-z0-9-_]+$/.test(code);
  }
  
  return true;
};

module.exports = {
  processScan,
  findProductByCode,
  logScan,
  getScanHistory,
  getLocationInventory,
  suggestReceivingLocation,
  getScanStats,
  validateScanCode
};
