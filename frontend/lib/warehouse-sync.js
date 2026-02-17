/**
 * Warehouse Inventory Sync Manager
 * Manages WebSocket connection for real-time warehouse inventory updates
 */

class WarehouseInventorySyncManager {
  constructor(onUpdate) {
    this.ws = null;
    this.onUpdate = onUpdate;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.isConnected = false;
  }

  /**
   * Connect to warehouse inventory WebSocket
   */
  connect(userId, token) {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port || 10000}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[Warehouse Sync] Connected to inventory sync server');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Subscribe to inventory updates
        this.ws.send(JSON.stringify({
          type: 'subscribe',
          userId: userId
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'inventory_snapshot') {
            console.log('[Warehouse Sync] Received inventory snapshot');
            if (this.onUpdate) {
              this.onUpdate({
                type: 'snapshot',
                data: data.data
              });
            }
          } else if (data.type === 'inventory_update') {
            console.log(`[Warehouse Sync] Product ${data.product_id} updated to ${data.available_quantity}`);
            if (this.onUpdate) {
              this.onUpdate({
                type: 'single',
                productId: data.product_id,
                quantity: data.available_quantity,
                action: data.action,
                metadata: data.metadata
              });
            }
          } else if (data.type === 'inventory_batch_update') {
            console.log(`[Warehouse Sync] Batch update: ${data.updates.length} products`);
            if (this.onUpdate) {
              this.onUpdate({
                type: 'batch',
                updates: data.updates
              });
            }
          }
        } catch (error) {
          console.error('[Warehouse Sync] Message parsing error:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[Warehouse Sync] WebSocket error:', error);
        this.isConnected = false;
      };

      this.ws.onclose = () => {
        console.log('[Warehouse Sync] Disconnected from inventory sync server');
        this.isConnected = false;
        this.attemptReconnect(userId, token);
      };
    } catch (error) {
      console.error('[Warehouse Sync] Connection error:', error);
      this.attemptReconnect(userId, token);
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect(userId, token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[Warehouse Sync] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(userId, token);
      }, delay);
    } else {
      console.error('[Warehouse Sync] Max reconnection attempts reached');
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  connected() {
    return this.isConnected;
  }
}

export default WarehouseInventorySyncManager;
