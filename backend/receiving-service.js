/**
 * Receiving Service
 * Handles inbound shipment receiving operations
 */

const db = require('./database');
const { logAuditEvent, updateProductLocation } = require('./warehouse-service');
const { logScan } = require('./scanning-service');

/**
 * Create a new receiving shipment
 */
const createReceivingShipment = (shipmentData, userId) => {
  return new Promise((resolve, reject) => {
    const { supplier_id, po_number, expected_arrival, notes, items = [] } = shipmentData;
    
    // Generate shipment number
    const shipment_number = `RCV-${Date.now()}`;
    
    const query = `
      INSERT INTO receiving_shipments 
      (shipment_number, supplier_id, po_number, expected_arrival, notes, total_items)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [shipment_number, supplier_id, po_number, expected_arrival, notes, items.length], function(err) {
      if (err) return reject(err);
      
      const shipmentId = this.lastID;
      
      // Insert items if provided
      if (items.length > 0) {
        const itemPromises = items.map(item => 
          createReceivingItem(shipmentId, item)
        );
        
        Promise.all(itemPromises)
          .then(() => {
            logAuditEvent(userId, 'create_shipment', 'receiving_shipments', shipmentId, {
              shipment_number,
              supplier_id,
              po_number,
              total_items: items.length
            }).catch(console.error);
            
            resolve({ id: shipmentId, shipment_number });
          })
          .catch(reject);
      } else {
        logAuditEvent(userId, 'create_shipment', 'receiving_shipments', shipmentId, {
          shipment_number,
          supplier_id,
          po_number
        }).catch(console.error);
        
        resolve({ id: shipmentId, shipment_number });
      }
    });
  });
};

/**
 * Create receiving item
 */
const createReceivingItem = (shipmentId, itemData) => {
  return new Promise((resolve, reject) => {
    const { product_id, sku, upc_code, expected_quantity } = itemData;
    
    const query = `
      INSERT INTO receiving_items 
      (shipment_id, product_id, sku, upc_code, expected_quantity)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [shipmentId, product_id, sku, upc_code, expected_quantity], function(err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
};

/**
 * Get receiving shipments with filtering
 */
const getReceivingShipments = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        rs.*,
        u.name as supplier_name
      FROM receiving_shipments rs
      LEFT JOIN users u ON rs.supplier_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.status) {
      query += ' AND rs.status = ?';
      params.push(filters.status);
    }
    if (filters.supplier_id) {
      query += ' AND rs.supplier_id = ?';
      params.push(filters.supplier_id);
    }
    
    query += ' ORDER BY rs.created_at DESC';
    
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
 * Get shipment details with items
 */
const getReceivingShipmentDetails = (shipmentId) => {
  return new Promise((resolve, reject) => {
    const shipmentQuery = `
      SELECT 
        rs.*,
        u.name as supplier_name,
        u2.name as received_by_name
      FROM receiving_shipments rs
      LEFT JOIN users u ON rs.supplier_id = u.id
      LEFT JOIN users u2 ON rs.received_by = u2.id
      WHERE rs.id = ?
    `;
    
    db.get(shipmentQuery, [shipmentId], (err, shipment) => {
      if (err) return reject(err);
      if (!shipment) return reject(new Error('Shipment not found'));
      
      const itemsQuery = `
        SELECT 
          ri.*,
          u.name as received_by_name
        FROM receiving_items ri
        LEFT JOIN users u ON ri.received_by = u.id
        WHERE ri.shipment_id = ?
      `;
      
      db.all(itemsQuery, [shipmentId], (err, items) => {
        if (err) return reject(err);
        
        shipment.items = items;
        resolve(shipment);
      });
    });
  });
};

/**
 * Process scan during receiving
 */
const processScanReceiving = async (shipmentId, scanData, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { upc_code, sku, quantity = 1, location_id } = scanData;
      
      // Get shipment
      const shipment = await getReceivingShipmentDetails(shipmentId);
      if (!shipment) {
        return reject(new Error('Shipment not found'));
      }
      
      if (shipment.status === 'completed') {
        return reject(new Error('Shipment already completed'));
      }
      
      // Find matching item in shipment
      const item = shipment.items.find(i => 
        i.upc_code === upc_code || i.sku === sku
      );
      
      if (!item) {
        return reject(new Error('Item not found in shipment'));
      }
      
      // Update received quantity
      const newReceivedQty = (item.received_quantity || 0) + quantity;
      const match_status = newReceivedQty === item.expected_quantity ? 'matched' : 
                          newReceivedQty > item.expected_quantity ? 'excess' : 'pending';
      
      const updateQuery = `
        UPDATE receiving_items 
        SET received_quantity = ?, 
            match_status = ?,
            location_id = ?,
            received_by = ?,
            received_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      db.run(updateQuery, [newReceivedQty, match_status, location_id, userId, item.id], async (err) => {
        if (err) return reject(err);
        
        // Update product location inventory
        if (item.product_id && location_id) {
          await updateProductLocation(item.product_id, location_id, quantity, userId);
        }
        
        // Log scan
        await logScan({
          scan_type: 'receiving',
          user_id: userId,
          product_id: item.product_id,
          upc_code,
          sku,
          location_id,
          quantity,
          status: 'success',
          metadata: JSON.stringify({ shipment_id: shipmentId, item_id: item.id })
        });
        
        // Update shipment items_received count
        const countQuery = `
          UPDATE receiving_shipments 
          SET items_received = (
            SELECT COUNT(*) FROM receiving_items 
            WHERE shipment_id = ? AND match_status IN ('matched', 'excess')
          ),
          status = CASE 
            WHEN (SELECT COUNT(*) FROM receiving_items WHERE shipment_id = ? AND match_status NOT IN ('matched', 'excess')) = 0 
            THEN 'completed' 
            ELSE 'in_progress' 
          END
          WHERE id = ?
        `;
        
        db.run(countQuery, [shipmentId, shipmentId, shipmentId], (err) => {
          if (err) return reject(err);
          
          resolve({
            item_id: item.id,
            product_id: item.product_id,
            received_quantity: newReceivedQty,
            expected_quantity: item.expected_quantity,
            match_status,
            location_id
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Complete receiving shipment
 */
const completeReceivingShipment = (shipmentId, userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      UPDATE receiving_shipments 
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          actual_arrival = CURRENT_TIMESTAMP,
          received_by = ?
      WHERE id = ?
    `;
    
    db.run(query, [userId, shipmentId], function(err) {
      if (err) return reject(err);
      
      logAuditEvent(userId, 'complete_shipment', 'receiving_shipments', shipmentId, {
        status: 'completed'
      }).catch(console.error);
      
      resolve({ id: shipmentId, changes: this.changes });
    });
  });
};

/**
 * Report discrepancy during receiving
 */
const reportDiscrepancy = (shipmentId, itemId, discrepancyData, userId) => {
  return new Promise((resolve, reject) => {
    const { type, notes, quantity } = discrepancyData; // type: 'damage', 'mismatch', 'missing'
    
    const query = `
      UPDATE receiving_items 
      SET match_status = ?,
          notes = ?
      WHERE id = ? AND shipment_id = ?
    `;
    
    db.run(query, [type, notes, itemId, shipmentId], function(err) {
      if (err) return reject(err);
      
      logAuditEvent(userId, 'report_discrepancy', 'receiving_items', itemId, {
        shipment_id: shipmentId,
        type,
        notes,
        quantity
      }).catch(console.error);
      
      resolve({ id: itemId, changes: this.changes });
    });
  });
};

module.exports = {
  createReceivingShipment,
  createReceivingItem,
  getReceivingShipments,
  getReceivingShipmentDetails,
  processScanReceiving,
  completeReceivingShipment,
  reportDiscrepancy
};
