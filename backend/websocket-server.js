/**
 * WebSocket Server for Real-Time Warehouse Updates
 * Provides real-time notifications for scanning, inventory, and warehouse operations
 */

const { Server } = require('socket.io');

let io = null;

/**
 * Initialize WebSocket server
 */
const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join warehouse zone room
    socket.on('join_zone', (zone) => {
      socket.join(`zone_${zone}`);
      console.log(`Client ${socket.id} joined zone: ${zone}`);
    });

    // Join warehouse location room
    socket.on('join_location', (locationId) => {
      socket.join(`location_${locationId}`);
      console.log(`Client ${socket.id} joined location: ${locationId}`);
    });

    // Join user-specific room
    socket.on('join_user', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`Client ${socket.id} joined user room: ${userId}`);
    });

    // Join pick list room
    socket.on('join_pick_list', (pickListId) => {
      socket.join(`pick_list_${pickListId}`);
      console.log(`Client ${socket.id} joined pick list: ${pickListId}`);
    });

    // Join receiving shipment room
    socket.on('join_shipment', (shipmentId) => {
      socket.join(`shipment_${shipmentId}`);
      console.log(`Client ${socket.id} joined shipment: ${shipmentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

/**
 * Get Socket.IO instance
 */
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeWebSocket first.');
  }
  return io;
};

/**
 * Emit scan event
 */
const emitScanEvent = (scanData) => {
  if (!io) return;

  const { user_id, location_id, zone, scan_type, product_id, status } = scanData;

  // Broadcast to all warehouse clients
  io.emit('scan_event', scanData);

  // Broadcast to specific zone if applicable
  if (zone) {
    io.to(`zone_${zone}`).emit('zone_scan', scanData);
  }

  // Broadcast to specific location
  if (location_id) {
    io.to(`location_${location_id}`).emit('location_scan', scanData);
  }

  // Broadcast to user's dashboard
  if (user_id) {
    io.to(`user_${user_id}`).emit('user_scan', scanData);
  }
};

/**
 * Emit inventory update
 */
const emitInventoryUpdate = (updateData) => {
  if (!io) return;

  const { product_id, location_id, zone, quantity, previous_quantity } = updateData;

  // Broadcast to all warehouse clients
  io.emit('inventory_update', updateData);

  // Broadcast to specific zone
  if (zone) {
    io.to(`zone_${zone}`).emit('zone_inventory_update', updateData);
  }

  // Broadcast to specific location
  if (location_id) {
    io.to(`location_${location_id}`).emit('location_inventory_update', updateData);
  }

  // Check for low stock alert
  if (quantity < 10 && previous_quantity >= 10) {
    io.emit('low_stock_alert', {
      product_id,
      location_id,
      quantity,
      alert_type: 'low_stock'
    });
  }
};

/**
 * Emit pick list update
 */
const emitPickListUpdate = (pickListData) => {
  if (!io) return;

  const { id, status, assigned_to, items_picked, total_items } = pickListData;

  // Broadcast to all warehouse clients
  io.emit('pick_list_update', pickListData);

  // Broadcast to specific pick list room
  io.to(`pick_list_${id}`).emit('pick_list_status', pickListData);

  // Notify assigned user
  if (assigned_to) {
    io.to(`user_${assigned_to}`).emit('assigned_pick_list_update', pickListData);
  }

  // Check if completed
  if (status === 'completed') {
    io.emit('pick_list_completed', {
      id,
      items_picked,
      total_items
    });
  }
};

/**
 * Emit receiving shipment update
 */
const emitReceivingUpdate = (shipmentData) => {
  if (!io) return;

  const { id, status, items_received, total_items } = shipmentData;

  // Broadcast to all warehouse clients
  io.emit('receiving_update', shipmentData);

  // Broadcast to specific shipment room
  io.to(`shipment_${id}`).emit('shipment_status', shipmentData);

  // Check if completed
  if (status === 'completed') {
    io.emit('shipment_completed', {
      id,
      items_received,
      total_items
    });
  }
};

/**
 * Emit warehouse alert
 */
const emitWarehouseAlert = (alertData) => {
  if (!io) return;

  const { type, severity, message, zone, location_id } = alertData;

  // Broadcast to all warehouse clients
  io.emit('warehouse_alert', alertData);

  // Broadcast to specific zone if applicable
  if (zone) {
    io.to(`zone_${zone}`).emit('zone_alert', alertData);
  }

  // Broadcast to specific location if applicable
  if (location_id) {
    io.to(`location_${location_id}`).emit('location_alert', alertData);
  }
};

/**
 * Emit worker activity update
 */
const emitWorkerActivity = (activityData) => {
  if (!io) return;

  const { user_id, action, zone, location_id } = activityData;

  // Broadcast to managers (could filter by permission)
  io.emit('worker_activity', activityData);

  // Broadcast to zone supervisors
  if (zone) {
    io.to(`zone_${zone}`).emit('zone_worker_activity', activityData);
  }
};

/**
 * Emit dashboard KPI update
 */
const emitDashboardUpdate = (kpiData) => {
  if (!io) return;

  // Broadcast to all dashboard clients
  io.emit('dashboard_update', kpiData);
};

/**
 * Broadcast system notification
 */
const broadcastNotification = (notification) => {
  if (!io) return;

  const { user_id, type, message, data } = notification;

  if (user_id) {
    // Send to specific user
    io.to(`user_${user_id}`).emit('notification', notification);
  } else {
    // Broadcast to all
    io.emit('notification', notification);
  }
};

module.exports = {
  initializeWebSocket,
  getIO,
  emitScanEvent,
  emitInventoryUpdate,
  emitPickListUpdate,
  emitReceivingUpdate,
  emitWarehouseAlert,
  emitWorkerActivity,
  emitDashboardUpdate,
  broadcastNotification
};
