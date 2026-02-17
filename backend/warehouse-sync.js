const WebSocket = require('ws');

/**
 * Warehouse Inventory Real-Time Sync
 * Synchronizes warehouse inventory changes to connected clients
 */

class WarehouseSyncManager {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.inventoryCache = new Map(); // Cache of product_id -> total_quantity
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('[Warehouse Sync] Client connected');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'subscribe') {
            const userId = data.userId;
            if (!this.clients.has(userId)) {
              this.clients.set(userId, new Set());
            }
            this.clients.get(userId).add(ws);
            
            // Send initial inventory on connect
            this.sendInventorySnapshot(ws);
            console.log(`[Warehouse Sync] User ${userId} subscribed`);
          }
        } catch (error) {
          console.error('[Warehouse Sync] Message error:', error.message);
        }
      });

      ws.on('close', () => {
        console.log('[Warehouse Sync] Client disconnected');
        // Remove from all user sets
        for (let [userId, connections] of this.clients.entries()) {
          connections.delete(ws);
          if (connections.size === 0) {
            this.clients.delete(userId);
          }
        }
      });

      ws.on('error', (error) => {
        console.error('[Warehouse Sync] WebSocket error:', error.message);
      });
    });

    console.log('[Warehouse Sync] WebSocket server initialized');
  }

  /**
   * Send inventory snapshot to a WebSocket connection
   */
  sendInventorySnapshot(ws) {
    const snapshot = {
      type: 'inventory_snapshot',
      timestamp: new Date().toISOString(),
      data: Array.from(this.inventoryCache.entries()).map(([productId, quantity]) => ({
        product_id: productId,
        available_quantity: quantity
      }))
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(snapshot));
    }
  }

  /**
   * Broadcast inventory update to all connected clients
   */
  broadcastInventoryUpdate(productId, newQuantity, action, metadata = {}) {
    const update = {
      type: 'inventory_update',
      timestamp: new Date().toISOString(),
      product_id: productId,
      available_quantity: newQuantity,
      action, // 'receive', 'pick', 'cycle_count', 'reserve', 'release'
      metadata
    };

    // Update cache
    this.inventoryCache.set(productId, newQuantity);

    // Broadcast to all connected clients
    for (let connections of this.clients.values()) {
      for (let ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(update));
        }
      }
    }

    console.log(`[Warehouse Sync] Broadcast: Product ${productId} = ${newQuantity} units (${action})`);
  }

  /**
   * Broadcast multiple inventory updates
   */
  broadcastBatchUpdate(updates) {
    const batch = {
      type: 'inventory_batch_update',
      timestamp: new Date().toISOString(),
      updates: updates.map(u => ({
        product_id: u.productId,
        available_quantity: u.newQuantity,
        action: u.action,
        metadata: u.metadata || {}
      }))
    };

    // Update cache
    updates.forEach(u => {
      this.inventoryCache.set(u.productId, u.newQuantity);
    });

    // Broadcast to all connected clients
    for (let connections of this.clients.values()) {
      for (let ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(batch));
        }
      }
    }

    console.log(`[Warehouse Sync] Broadcast batch: ${updates.length} inventory updates`);
  }

  /**
   * Update inventory cache from warehouse data
   */
  updateInventoryCache(warehouseData) {
    // warehouseData should be array of { product_id, total_quantity }
    warehouseData.forEach(item => {
      this.inventoryCache.set(item.product_id, item.total_quantity);
    });
  }

  /**
   * Get current available quantity for a product
   */
  getAvailableQuantity(productId) {
    return this.inventoryCache.get(productId) || 0;
  }

  /**
   * Get client count (for monitoring)
   */
  getClientCount() {
    let total = 0;
    for (let connections of this.clients.values()) {
      total += connections.size;
    }
    return total;
  }
}

const syncManager = new WarehouseSyncManager();

module.exports = syncManager;
