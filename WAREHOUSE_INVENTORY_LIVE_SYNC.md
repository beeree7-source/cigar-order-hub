# Warehouse Inventory Live Sync System

## Overview
The warehouse inventory is now **fully synchronized** with the main ordering page through real-time WebSocket updates. This ensures customers and retailers always see accurate, live inventory when browsing products and creating orders.

## Architecture

### Backend Components

#### 1. **Warehouse Sync Manager** (`backend/warehouse-sync.js`)
- Manages WebSocket server for real-time connections
- Broadcasts inventory updates to all connected clients
- Maintains inventory cache for snapshot delivery
- Handles reconnection logic with exponential backoff

#### 2. **API Endpoints**

**Live Inventory Endpoints:**
- `GET /api/warehouse/live-inventory` - Get all products with warehouse inventory totals
  - Response includes available quantity aggregated across all locations
  - Shows location breakdown for each product
  - Returns low-stock warnings
  
- `GET /api/warehouse/live-inventory/:productId` - Get specific product warehouse inventory
  - Returns detailed location breakdown
  - Includes primary location flag
  - Real-time availability status

- `GET /api/warehouse/sync-status` - Check WebSocket sync status
  - Returns number of connected clients
  - Confirms sync enabled

**Order Validation:**
- `POST /api/orders` - Enhanced with inventory validation
  - Validates warehouse stock before order creation
  - Returns insufficient inventory errors with details
  - Prevents overselling

#### 3. **Real-Time Broadcasts**
The warehouse scan endpoint (`POST /api/warehouse/scan`) now:
- Aggregates inventory changes across locations
- Broadcasts updates to all connected clients
- Includes metadata about the change (scan type, quantity change, location)

### Frontend Components

#### 1. **Warehouse Inventory Sync Manager** (`frontend/lib/warehouse-sync.js`)
- WebSocket client for real-time connection
- Automatic reconnection with exponential backoff
- Handles three types of updates:
  - **Inventory Snapshot**: Initial full inventory load on connect
  - **Single Update**: Real-time update for one product
  - **Batch Update**: Multiple products updated at once

#### 2. **Integration in Dashboard** (`frontend/app/page.tsx`)
- New `WarehouseLiveInventory` interface for type safety
- Real-time sync manager initialized on login
- Inventory state stored in Map<productId, WarehouseLiveInventory>
- Warehouse inventory synced updates automatically update state

#### 3. **Products Page Display**
- Added "Warehouse Stock" column showing live inventory (with 📦 icon)
- Live inventory badge with color coding:
  - **Green**: > 100 units
  - **Yellow**: 50-100 units
  - **Red**: < 50 units
- Sync status indicator shows connection state (● Live / ● Connecting)
- Fallback to product table data if warehouse not available

## Data Flow

```
┌─────────────────────┐
│ Warehouse Operation │
│  (Receiving/Picking)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────┐
│ POST /api/warehouse/scan│
│   (Validates & Updates) │
└──────────┬──────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Broadcast to Connected Clients│
│  (WebSocket syncManager)     │
└──────────┬───────────────────┘
           │
     ┌─────┴──────┐
     │            │
     ▼            ▼
┌──────────┐ ┌──────────┐
│ Frontend │ │ Frontend │
│  Users   │ │  Users   │
└──────────┘ └──────────┘
```

## Real-Time Update Types

### 1. Inventory Snapshot
Sent when client connects:
```json
{
  "type": "inventory_snapshot",
  "timestamp": "2026-02-16T21:30:00Z",
  "data": [
    {
      "product_id": 1,
      "available_quantity": 200,
      "sku": "SKU-1001",
      ...
    }
  ]
}
```

### 2. Single Product Update
When one product's inventory changes:
```json
{
  "type": "inventory_update",
  "product_id": 1,
  "available_quantity": 195,
  "action": "picking",
  "metadata": {
    "sku": "SKU-1001",
    "location_id": 3,
    "quantity_change": -5
  }
}
```

### 3. Batch Update
Multiple products updated at once:
```json
{
  "type": "inventory_batch_update",
  "timestamp": "2026-02-16T21:30:00Z",
  "updates": [
    {
      "product_id": 1,
      "available_quantity": 150,
      "action": "receiving"
    },
    {
      "product_id": 2,
      "available_quantity": 280,
      "action": "receiving"
    }
  ]
}
```

## Inventory Validation for Orders

When an order is created:

1. **Inventory Check**: System validates each product has sufficient warehouse stock
2. **Error Handling**: Returns 409 Conflict with details if insufficient
3. **Response Format**:
   ```json
   {
     "error": "Insufficient inventory for one or more items",
     "details": [
       {
         "product_id": 1,
         "sku": "SKU-1001",
         "requested": 100,
         "available": 50,
         "error": "Insufficient warehouse inventory"
       }
     ]
   }
   ```

## Client Connection Flow

1. **User Logs In**: 
   - WebSocket sync manager initialized
   - Connects to `ws://localhost:10000`
   
2. **Subscription**:
   - Sends: `{"type": "subscribe", "userId": 1}`
   - Receives: Complete inventory snapshot
   
3. **Real-Time Updates**:
   - Listens for inventory changes
   - Updates UI instantly
   - Maintains 3000ms reconnection with exponential backoff

4. **Disconnect/Logout**:
   - WebSocket closed
   - Sync manager cleaned up
   - Auto-reconnect pause

## Features

✅ **Real-Time Synchronization**
- WebSocket-based instant updates
- No polling overhead
- Efficient batch updates

✅ **Order Validation**
- Prevents overselling
- Validates against warehouse stock
- Clear error messaging

✅ **Multi-Location Aggregation**
- Inventory totals across all warehouse locations
- Location-level breakdown available
- Primary location tracking

✅ **Connection Management**
- Automatic reconnection
- Exponential backoff strategy
- 5 max reconnection attempts
- Connection status monitoring

✅ **Live Indicators**
- Sync status badge on products page
- Real-time inventory color coding
- Low-stock warnings
- 📦 Icon indicates warehouse tracked inventory

## Testing

###  Test Live Inventory Load
```bash
# Get all warehouse inventory
curl -H "Authorization: Bearer {token}" \
  http://localhost:10000/api/warehouse/live-inventory

# Get specific product
curl -H "Authorization: Bearer {token}" \
  http://localhost:10000/api/warehouse/live-inventory/1
```

### Test Inventory-Validated Order Creation
```bash
# Try to create order with insufficient inventory
curl -X POST \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"products": [{"product_id": 1, "quantity": 5000}]}' \
  http://localhost:10000/api/orders

# Response: 409 Conflict with insufficient inventory details
```

### Test Real-Time Sync
1. Login as warehouse staff (david.warehouse@premiumcigars.com)
2. Use scan endpoint to update inventory
3. Observe real-time updates on ordering page

## Configuration

**Sync Status Check:**
```
GET /api/warehouse/sync-status
```

Returns:
```json
{
  "sync_enabled": true,
  "connected_clients": 3,
  "sync_type": "websocket",
  "url": "ws://localhost:10000",
  "message": "Real-time inventory updates enabled..."
}
```

## Performance Considerations

- **Memory**: WebSocket connections held in memory (~1KB per connection)
- **Bandwidth**: Only inventory changes broadcast (delta updates)
- **CPU**: Minimal - only aggregation on scan operations
- **Database**: No polling required - event-driven architecture

## Future Enhancements

1. **Persistent Storage**: Store inventory snapshots in database
2. **Inventory Reservations**: Hold inventory for pending orders
3. **Advanced Analytics**: Track inventory velocity
4. **Mobile Support**: WebSocket works on mobile too
5. **GraphQL Subscription**: Alternative to WebSocket for compatibility
6. **Inventory Forecasting**: Predict stock levels

## Troubleshooting

**Inventory Not Syncing?**
- Check WebSocket connection: `GET /api/warehouse/sync-status`
- Verify backend running on port 10000
- Check browser console for connection errors

**Orders Failing Due to Inventory?**
- Verify warehouse has stock: `GET /api/warehouse/live-inventory/{productId}`
- Check scan operations are being processed
- Confirm product exists in warehouse system

**Slow Real-Time Updates?**
- Check network latency to backend
- Verify WebSocket not blocked by proxy/firewall
- Monitor connected client count

---

**Status**: ✅ **FULLY IMPLEMENTED AND TESTED**
**Last Updated**: February 16, 2026
**Version**: 1.0.0
