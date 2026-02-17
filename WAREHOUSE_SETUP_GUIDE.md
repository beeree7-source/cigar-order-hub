# Warehouse Management System - Setup Guide

Complete setup instructions for the Cigar Order Hub Warehouse Management System with barcode scanning and real-time updates.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [Backend Configuration](#backend-configuration)
- [Frontend Setup](#frontend-setup)
- [Testing the System](#testing-the-system)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 14+ and npm
- SQLite3
- Basic understanding of REST APIs and WebSockets
- Camera-enabled device for barcode scanning (optional for testing)

---

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Run Database Migration

```bash
# Run warehouse migration
sqlite3 cigar-hub.db < migrations/009_create_warehouse_tables.sql

# Verify tables were created
sqlite3 cigar-hub.db ".tables" | grep warehouse
```

Expected output:
```
cycle_counts          product_locations     warehouse_audit_logs
inventory_scans       receiving_items       warehouse_locations 
pick_list_items       receiving_shipments   warehouse_users
pick_lists            shipment_batches      cycle_count_items
```

### 3. Configure Environment

Create or update `backend/.env`:

```env
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key-here

# WebSocket Configuration
WS_PORT=4000

# Optional: Configure rate limiting for scans
SCAN_RATE_LIMIT=100  # scans per minute per user
```

### 4. Start Backend Server

```bash
cd backend
npm start
```

You should see:
```
Backend running on port 4000
WebSocket server initialized
```

### 5. Verify Installation

Test the API:

```bash
curl http://localhost:4000/
```

Expected response:
```json
{
  "message": "Cigar Order Hub with JWT auth & SQLite"
}
```

---

## Database Setup

### Initial Data

The migration automatically creates 12 default warehouse locations:

**Receiving Zone:**
- RCV-01, RCV-02

**Storage Zones:**
- ZONE-A: A1-01-01, A1-01-02, A1-02-01
- ZONE-B: A2-01-01, A2-01-02, A2-02-01

**Shipping Zone:**
- SHP-01, SHP-02

**Quality Zone:**
- QA-01, QA-02

### Add Custom Locations

```bash
curl -X POST http://localhost:4000/api/protected/warehouse/locations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location_code": "A3-01-01",
    "aisle": "A3",
    "shelf": "01",
    "position": "01",
    "zone": "ZONE-C",
    "location_type": "standard",
    "capacity": 100
  }'
```

---

## Backend Configuration

### Warehouse Roles

Three warehouse-specific roles are pre-configured:

1. **Warehouse Worker** (ID: 8)
   - Scan operations (receiving, picking, shipping)
   - View assigned location inventory

2. **Warehouse Supervisor** (ID: 9)
   - All worker permissions
   - Pick list management
   - Location management
   - Real-time dashboard access

3. **Warehouse Manager** (ID: 10)
   - All supervisor permissions
   - Analytics and reporting
   - Audit logs
   - User management

### Assign Warehouse Role to User

```bash
# First, get the user's ID
curl -X GET http://localhost:4000/api/protected/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# Assign warehouse worker role (role_id: 8)
curl -X POST http://localhost:4000/api/rbac/users/USER_ID/roles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": 8,
    "department_id": null
  }'
```

### Create Warehouse User Profile

```bash
curl -X POST http://localhost:4000/api/protected/warehouse/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": "WH-001",
    "shift": "morning",
    "zone_assignment": "ZONE-A",
    "default_operation": "picking",
    "employee_number": "EMP-001"
  }'
```

---

## Frontend Setup

### Install Dependencies

```bash
cd frontend
npm install socket.io-client  # For WebSocket connection
npm install quagga             # For barcode scanning (web)
```

### WebSocket Connection

Create `frontend/lib/websocket.js`:

```javascript
import io from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

export const connectWebSocket = () => {
  socket.connect();
};

export const disconnectWebSocket = () => {
  socket.disconnect();
};

// Join warehouse zone
export const joinZone = (zone) => {
  socket.emit('join_zone', zone);
};

// Join user room
export const joinUser = (userId) => {
  socket.emit('join_user', userId);
};

// Listen for scan events
export const onScanEvent = (callback) => {
  socket.on('scan_event', callback);
};

// Listen for inventory updates
export const onInventoryUpdate = (callback) => {
  socket.on('inventory_update', callback);
};

// Listen for pick list updates
export const onPickListUpdate = (callback) => {
  socket.on('pick_list_update', callback);
};

// Clean up listeners
export const removeAllListeners = () => {
  socket.removeAllListeners();
};
```

### Usage Example

```javascript
import { useEffect } from 'react';
import { connectWebSocket, joinZone, onScanEvent } from '@/lib/websocket';

export default function WarehouseDashboard() {
  useEffect(() => {
    // Connect to WebSocket
    connectWebSocket();
    
    // Join zone room
    joinZone('ZONE-A');
    
    // Listen for scans
    onScanEvent((data) => {
      console.log('Scan event:', data);
      // Update UI with scan data
    });
    
    return () => {
      // Clean up on unmount
      removeAllListeners();
    };
  }, []);
  
  return <div>Warehouse Dashboard</div>;
}
```

---

## Testing the System

### 1. Create Test Products

Products need UPC codes for scanning:

```bash
curl -X POST http://localhost:4000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Cigar",
    "sku": "TEST-001",
    "upc": "123456789012",
    "price": 10.00,
    "supplierId": 1
  }'
```

### 2. Test Receiving Flow

**Step 1: Create receiving shipment**

```bash
curl -X POST http://localhost:4000/api/protected/warehouse/receiving/shipments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "supplier_id": 1,
    "po_number": "PO-TEST-001",
    "expected_arrival": "2026-02-20",
    "items": [
      {
        "product_id": 1,
        "sku": "TEST-001",
        "upc_code": "123456789012",
        "expected_quantity": 100
      }
    ]
  }'
```

**Step 2: Scan items**

```bash
curl -X POST http://localhost:4000/api/protected/warehouse/receiving/1/scan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "upc_code": "123456789012",
    "quantity": 10,
    "location_id": 3
  }'
```

**Step 3: Complete shipment**

```bash
curl -X PUT http://localhost:4000/api/protected/warehouse/receiving/1/complete \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Test Picking Flow

**Step 1: Create order (if not exists)**

```bash
curl -X POST http://localhost:4000/api/protected/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "retailerId": 1,
    "supplierId": 1,
    "items": [
      {"product_id": 1, "sku": "TEST-001", "quantity": 5}
    ]
  }'
```

**Step 2: Create pick list**

```bash
curl -X POST http://localhost:4000/api/protected/warehouse/pick-lists \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 1,
    "assigned_to": 1,
    "priority": "normal",
    "zone": "ZONE-A"
  }'
```

**Step 3: Get optimized route**

```bash
curl -X GET http://localhost:4000/api/protected/warehouse/pick-lists/1/suggested-route \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Step 4: Scan items during picking**

```bash
curl -X POST http://localhost:4000/api/protected/warehouse/pick-lists/1/scan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "upc_code": "123456789012",
    "quantity": 5,
    "location_id": 3
  }'
```

### 4. Test Dashboard KPIs

```bash
curl -X GET http://localhost:4000/api/protected/warehouse/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Test WebSocket Events

Create a test client (`test-websocket.js`):

```javascript
const io = require('socket.io-client');

const socket = io('http://localhost:4000');

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
  
  // Join zone
  socket.emit('join_zone', 'ZONE-A');
  
  // Listen for scans
  socket.on('scan_event', (data) => {
    console.log('Scan event received:', data);
  });
  
  socket.on('inventory_update', (data) => {
    console.log('Inventory update:', data);
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});
```

Run: `node test-websocket.js`

---

## Production Deployment

### Environment Variables

Set these in production:

```env
# Production API URL
FRONTEND_URL=https://your-domain.com

# Strong JWT secret
JWT_SECRET=generate-a-strong-secret-key-here

# WebSocket configuration
WS_PORT=4000

# Rate limiting
SCAN_RATE_LIMIT=100

# Database
DATABASE_PATH=/path/to/production/cigar-hub.db
```

### Security Checklist

- [ ] Enable HTTPS for API and WebSocket connections
- [ ] Set strong JWT secret (32+ characters)
- [ ] Configure rate limiting on scan endpoints
- [ ] Enable audit logging for all warehouse operations
- [ ] Implement session timeouts (15 minutes for workers)
- [ ] Set up database backups
- [ ] Configure CORS for production domain only
- [ ] Enable input validation on all endpoints
- [ ] Set up monitoring and alerting

### Database Backup

```bash
# Backup database
sqlite3 cigar-hub.db ".backup cigar-hub-backup-$(date +%Y%m%d).db"

# Automated daily backup (add to crontab)
0 2 * * * cd /path/to/backend && sqlite3 cigar-hub.db ".backup backups/cigar-hub-$(date +\%Y\%m\%d).db"
```

---

## Troubleshooting

### WebSocket Connection Fails

**Issue:** Client cannot connect to WebSocket server

**Solutions:**
1. Check that backend server is running
2. Verify FRONTEND_URL is correct in backend .env
3. Check firewall allows WebSocket connections (port 4000)
4. Ensure CORS is configured properly

```javascript
// Test WebSocket connection
const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling']
});
```

### Scan Endpoint Returns "Product not found"

**Issue:** Products don't have UPC codes

**Solution:** Add UPC codes to products:

```bash
curl -X PUT http://localhost:4000/api/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"upc": "123456789012"}'
```

### Migration Errors

**Issue:** Migration fails due to existing tables

**Solution:** Check if tables exist:

```bash
sqlite3 cigar-hub.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'warehouse%'"
```

If tables exist, migration already ran. To reset (WARNING: destroys data):

```bash
# Drop warehouse tables
sqlite3 cigar-hub.db "DROP TABLE IF EXISTS warehouse_locations"
# ... repeat for all tables

# Re-run migration
sqlite3 cigar-hub.db < migrations/009_create_warehouse_tables.sql
```

### Permission Denied Errors

**Issue:** User doesn't have warehouse permissions

**Solution:** Verify user has correct role:

```bash
# Check user roles
curl -X GET http://localhost:4000/api/rbac/users/USER_ID/roles \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should include role_id: 8, 9, or 10 for warehouse access
```

### Real-time Updates Not Working

**Issue:** Dashboard not updating in real-time

**Checklist:**
1. WebSocket connection established
2. Client joined appropriate rooms (zone, user, etc.)
3. Event listeners registered before actions occur
4. Backend emitting events (check server logs)

```javascript
// Debug WebSocket
socket.on('connect', () => console.log('Connected'));
socket.on('disconnect', () => console.log('Disconnected'));
socket.on('scan_event', (data) => console.log('Scan:', data));
```

---

## Support

For additional help:
- API Documentation: [WAREHOUSE_API_DOCUMENTATION.md](./WAREHOUSE_API_DOCUMENTATION.md)
- Implementation Details: [WAREHOUSE_IMPLEMENTATION_SUMMARY.md](./WAREHOUSE_IMPLEMENTATION_SUMMARY.md)
- Main README: [README.md](./README.md)

---

**Version:** 1.0.0  
**Last Updated:** February 16, 2026
