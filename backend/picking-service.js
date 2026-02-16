/**
 * Picking Service
 * Handles order picking operations and pick list management
 */

const db = require('./database');
const { logAuditEvent, updateProductLocation } = require('./warehouse-service');
const { logScan } = require('./scanning-service');

/**
 * Create a pick list from an order
 */
const createPickList = (orderData, userId) => {
  return new Promise((resolve, reject) => {
    const { order_id, assigned_to, priority = 'normal', zone } = orderData;
    
    // Generate pick list number
    const pick_list_number = `PICK-${Date.now()}`;
    
    // Get order details to create pick list items
    const orderQuery = 'SELECT * FROM orders WHERE id = ?';
    
    db.get(orderQuery, [order_id], (err, order) => {
      if (err) return reject(err);
      if (!order) return reject(new Error('Order not found'));
      
      let items = [];
      try {
        items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      } catch (e) {
        return reject(new Error('Invalid order items'));
      }
      
      const query = `
        INSERT INTO pick_lists 
        (pick_list_number, order_id, assigned_to, priority, zone, total_items)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [pick_list_number, order_id, assigned_to, priority, zone, items.length], function(err) {
        if (err) return reject(err);
        
        const pickListId = this.lastID;
        
        // Create pick list items
        const itemPromises = items.map((item, index) => 
          createPickListItem(pickListId, item, index + 1)
        );
        
        Promise.all(itemPromises)
          .then(() => {
            // Calculate route if possible
            optimizePickRoute(pickListId)
              .then(() => {
                logAuditEvent(userId, 'create_pick_list', 'pick_lists', pickListId, {
                  pick_list_number,
                  order_id,
                  total_items: items.length
                }).catch(console.error);
                
                resolve({ id: pickListId, pick_list_number });
              })
              .catch(err => {
                console.error('Route optimization failed:', err);
                resolve({ id: pickListId, pick_list_number });
              });
          })
          .catch(reject);
      });
    });
  });
};

/**
 * Create a pick list item
 */
const createPickListItem = (pickListId, itemData, sequence) => {
  return new Promise(async (resolve, reject) => {
    const { product_id, sku, quantity } = itemData;
    
    try {
      // Find primary location for this product
      const location = await findPrimaryLocation(product_id);
      
      const query = `
        INSERT INTO pick_list_items 
        (pick_list_id, product_id, sku, quantity_requested, location_id, sequence_number)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      db.run(query, [pickListId, product_id, sku, quantity, location ? location.id : null, sequence], function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Find primary location for a product
 */
const findPrimaryLocation = (productId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT wl.* 
      FROM product_locations pl
      JOIN warehouse_locations wl ON pl.location_id = wl.id
      WHERE pl.product_id = ? AND pl.is_primary = 1 AND pl.quantity > 0
      LIMIT 1
    `;
    
    db.get(query, [productId], (err, row) => {
      if (err) return reject(err);
      
      if (!row) {
        // If no primary, get location with most quantity
        const fallbackQuery = `
          SELECT wl.* 
          FROM product_locations pl
          JOIN warehouse_locations wl ON pl.location_id = wl.id
          WHERE pl.product_id = ? AND pl.quantity > 0
          ORDER BY pl.quantity DESC
          LIMIT 1
        `;
        
        db.get(fallbackQuery, [productId], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      } else {
        resolve(row);
      }
    });
  });
};

/**
 * Get pick lists with filtering
 */
const getPickLists = (filters = {}) => {
  return new Promise((resolve, reject) => {
    let query = `
      SELECT 
        pl.*,
        u.name as assigned_to_name
      FROM pick_lists pl
      LEFT JOIN users u ON pl.assigned_to = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.status) {
      query += ' AND pl.status = ?';
      params.push(filters.status);
    }
    if (filters.assigned_to) {
      query += ' AND pl.assigned_to = ?';
      params.push(filters.assigned_to);
    }
    if (filters.zone) {
      query += ' AND pl.zone = ?';
      params.push(filters.zone);
    }
    if (filters.priority) {
      query += ' AND pl.priority = ?';
      params.push(filters.priority);
    }
    
    query += ' ORDER BY pl.priority DESC, pl.created_at ASC';
    
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
 * Get pick list details with items
 */
const getPickListDetails = (pickListId) => {
  return new Promise((resolve, reject) => {
    const pickListQuery = `
      SELECT 
        pl.*,
        u.name as assigned_to_name,
        o.retailer_id
      FROM pick_lists pl
      LEFT JOIN users u ON pl.assigned_to = u.id
      LEFT JOIN orders o ON pl.order_id = o.id
      WHERE pl.id = ?
    `;
    
    db.get(pickListQuery, [pickListId], (err, pickList) => {
      if (err) return reject(err);
      if (!pickList) return reject(new Error('Pick list not found'));
      
      const itemsQuery = `
        SELECT 
          pli.*,
          wl.location_code,
          wl.aisle,
          wl.shelf,
          wl.zone,
          u.name as picked_by_name
        FROM pick_list_items pli
        LEFT JOIN warehouse_locations wl ON pli.location_id = wl.id
        LEFT JOIN users u ON pli.picked_by = u.id
        WHERE pli.pick_list_id = ?
        ORDER BY pli.sequence_number
      `;
      
      db.all(itemsQuery, [pickListId], (err, items) => {
        if (err) return reject(err);
        
        pickList.items = items;
        resolve(pickList);
      });
    });
  });
};

/**
 * Process scan during picking
 */
const processScanPicking = async (pickListId, scanData, userId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const { upc_code, sku, quantity = 1, location_id } = scanData;
      
      // Get pick list
      const pickList = await getPickListDetails(pickListId);
      if (!pickList) {
        return reject(new Error('Pick list not found'));
      }
      
      if (pickList.status === 'completed') {
        return reject(new Error('Pick list already completed'));
      }
      
      // Update status to in_progress if pending
      if (pickList.status === 'pending') {
        await updatePickListStatus(pickListId, 'in_progress', userId);
      }
      
      // Find matching item in pick list
      const item = pickList.items.find(i => 
        i.upc_code === upc_code || i.sku === sku
      );
      
      if (!item) {
        return reject(new Error('Item not found in pick list'));
      }
      
      if (item.status === 'picked') {
        return reject(new Error('Item already picked'));
      }
      
      // Update picked quantity
      const newPickedQty = (item.quantity_picked || 0) + quantity;
      const status = newPickedQty >= item.quantity_requested ? 'picked' : 
                     newPickedQty > 0 ? 'short_pick' : 'pending';
      
      const updateQuery = `
        UPDATE pick_list_items 
        SET quantity_picked = ?, 
            status = ?,
            picked_by = ?,
            picked_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      db.run(updateQuery, [newPickedQty, status, userId, item.id], async (err) => {
        if (err) return reject(err);
        
        // Reduce inventory at location
        if (item.product_id && location_id) {
          await updateProductLocation(item.product_id, location_id, -quantity, userId);
        }
        
        // Log scan
        await logScan({
          scan_type: 'picking',
          user_id: userId,
          product_id: item.product_id,
          upc_code,
          sku,
          location_id,
          quantity,
          status: 'success',
          metadata: JSON.stringify({ pick_list_id: pickListId, item_id: item.id })
        });
        
        // Update pick list items_picked count
        const countQuery = `
          UPDATE pick_lists 
          SET items_picked = (
            SELECT COUNT(*) FROM pick_list_items 
            WHERE pick_list_id = ? AND status = 'picked'
          ),
          status = CASE 
            WHEN (SELECT COUNT(*) FROM pick_list_items WHERE pick_list_id = ? AND status = 'pending') = 0 
            THEN 'completed' 
            ELSE 'in_progress' 
          END
          WHERE id = ?
        `;
        
        db.run(countQuery, [pickListId, pickListId, pickListId], (err) => {
          if (err) return reject(err);
          
          resolve({
            item_id: item.id,
            product_id: item.product_id,
            quantity_picked: newPickedQty,
            quantity_requested: item.quantity_requested,
            status,
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
 * Update pick list status
 */
const updatePickListStatus = (pickListId, status, userId) => {
  return new Promise((resolve, reject) => {
    let query = 'UPDATE pick_lists SET status = ?';
    const params = [status];
    
    if (status === 'in_progress') {
      query += ', started_at = CURRENT_TIMESTAMP';
    } else if (status === 'completed') {
      query += ', completed_at = CURRENT_TIMESTAMP';
    }
    
    query += ', updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    params.push(pickListId);
    
    db.run(query, params, function(err) {
      if (err) return reject(err);
      
      logAuditEvent(userId, 'update_pick_list', 'pick_lists', pickListId, {
        status
      }).catch(console.error);
      
      resolve({ id: pickListId, changes: this.changes });
    });
  });
};

/**
 * Complete pick list
 */
const completePickList = (pickListId, userId) => {
  return new Promise((resolve, reject) => {
    // Calculate actual time
    const query = `
      UPDATE pick_lists 
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          actual_time = CAST((julianday(CURRENT_TIMESTAMP) - julianday(started_at)) * 24 * 60 AS INTEGER)
      WHERE id = ?
    `;
    
    db.run(query, [pickListId], function(err) {
      if (err) return reject(err);
      
      logAuditEvent(userId, 'complete_pick_list', 'pick_lists', pickListId, {
        status: 'completed'
      }).catch(console.error);
      
      resolve({ id: pickListId, changes: this.changes });
    });
  });
};

/**
 * Optimize pick route (simple zone-based sorting)
 */
const optimizePickRoute = (pickListId) => {
  return new Promise((resolve, reject) => {
    // Get items with locations
    const query = `
      SELECT 
        pli.id,
        pli.sequence_number,
        wl.zone,
        wl.aisle,
        wl.shelf,
        wl.position
      FROM pick_list_items pli
      JOIN warehouse_locations wl ON pli.location_id = wl.id
      WHERE pli.pick_list_id = ?
    `;
    
    db.all(query, [pickListId], (err, items) => {
      if (err) return reject(err);
      
      // Sort by zone, aisle, shelf, position
      items.sort((a, b) => {
        if (a.zone !== b.zone) return a.zone.localeCompare(b.zone);
        if (a.aisle !== b.aisle) return a.aisle.localeCompare(b.aisle);
        if (a.shelf !== b.shelf) return a.shelf.localeCompare(b.shelf);
        return a.position.localeCompare(b.position);
      });
      
      // Update sequence numbers
      const updates = items.map((item, index) => {
        return new Promise((resolve, reject) => {
          const updateQuery = 'UPDATE pick_list_items SET sequence_number = ? WHERE id = ?';
          db.run(updateQuery, [index + 1, item.id], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });
      
      Promise.all(updates)
        .then(() => {
          // Save route data
          const routeData = {
            optimized: true,
            zones: [...new Set(items.map(i => i.zone))],
            total_locations: items.length
          };
          
          const routeQuery = 'UPDATE pick_lists SET route_data = ? WHERE id = ?';
          db.run(routeQuery, [JSON.stringify(routeData), pickListId], (err) => {
            if (err) return reject(err);
            resolve(routeData);
          });
        })
        .catch(reject);
    });
  });
};

/**
 * Get suggested pick route
 */
const getSuggestedRoute = (pickListId) => {
  return new Promise((resolve, reject) => {
    getPickListDetails(pickListId)
      .then(pickList => {
        const route = {
          pick_list_id: pickListId,
          total_items: pickList.items.length,
          route: pickList.items.map((item, index) => ({
            step: index + 1,
            item_id: item.id,
            product_id: item.product_id,
            sku: item.sku,
            quantity: item.quantity_requested,
            location_code: item.location_code,
            aisle: item.aisle,
            shelf: item.shelf,
            zone: item.zone,
            status: item.status
          })),
          estimated_time: Math.ceil(pickList.items.length * 2.5) // 2.5 min per item
        };
        
        resolve(route);
      })
      .catch(reject);
  });
};

module.exports = {
  createPickList,
  createPickListItem,
  getPickLists,
  getPickListDetails,
  processScanPicking,
  updatePickListStatus,
  completePickList,
  optimizePickRoute,
  getSuggestedRoute
};
