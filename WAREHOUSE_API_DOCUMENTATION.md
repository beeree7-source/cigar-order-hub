# Warehouse Management System - API Documentation

Complete API reference for the Cigar Order Hub Warehouse Management System with camera-based scanning, role-based access control, and real-time updates.

## Table of Contents
- [Authentication](#authentication)
- [Scanning Operations](#scanning-operations)
- [Receiving Module](#receiving-module)
- [Picking Module](#picking-module)
- [Inventory Module](#inventory-module)
- [Locations Module](#locations-module)
- [Analytics & Reporting](#analytics--reporting)
- [Warehouse Users](#warehouse-users)
- [WebSocket Events](#websocket-events)

---

## Authentication

All warehouse endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

### Warehouse Roles

- **Warehouse Worker**: Scan operations (receiving, picking, shipping), view assigned location inventory
- **Warehouse Supervisor**: Workers + pick list management, location management, real-time dashboard
- **Warehouse Manager**: Supervisors + analytics, reports, audit logs, user management
- **Admin**: Full system access

---

## Scanning Operations

### Universal Scan Endpoint

**POST** `/api/protected/warehouse/scan`

Process any type of warehouse scan with automatic routing.

**Request Body:**
```json
{
  "scan_type": "receiving|picking|shipping|cycle_count|adjustment",
  "upc_code": "123456789012",
  "sku": "CIGAR-001",
  "location_id": 5,
  "quantity": 1,
  "session_id": "scan-session-123",
  "metadata": {
    "shipment_id": 1,
    "pick_list_id": 2
  }
}
```

**Response:**
```json
{
  "scan_id": 123,
  "product": {
    "id": 15,
    "sku": "CIGAR-001",
    "name": "Romeo y Julieta Churchill",
    "upc": "123456789012"
  },
  "location_id": 5,
  "current_inventory": {
    "quantity": 50,
    "location_code": "A1-01-01"
  },
  "quantity_scanned": 1,
  "next_action": "confirm_receive",
  "expected_location": {
    "id": 5,
    "location_code": "A1-01-01",
    "zone": "ZONE-A"
  }
}
```

**Real-time Event Emitted:** `scan_event`

### Get Scan History

**GET** `/api/protected/warehouse/scan-history`

Retrieve scan history with filtering.

**Query Parameters:**
- `session_id` - Filter by scan session
- `user_id` - Filter by user
- `scan_type` - Filter by type (receiving, picking, etc.)
- `status` - Filter by status (success, error)
- `limit` - Number of results (default: 50)

**Response:**
```json
[
  {
    "id": 123,
    "scan_type": "receiving",
    "user_id": 5,
    "user_name": "John Doe",
    "product_id": 15,
    "upc_code": "123456789012",
    "sku": "CIGAR-001",
    "location_id": 5,
    "quantity": 1,
    "status": "success",
    "scanned_at": "2026-02-16T10:30:00Z"
  }
]
```

### Get Scan Statistics

**GET** `/api/protected/warehouse/scan-stats`

Get aggregated scan statistics.

**Query Parameters:**
- `user_id` - Filter by user
- `start_date` - Start date (ISO format)
- `end_date` - End date (ISO format)

**Response:**
```json
[
  {
    "scan_type": "receiving",
    "status": "success",
    "count": 150,
    "scan_date": "2026-02-16"
  }
]
```

---

## Receiving Module

### Create Receiving Shipment

**POST** `/api/protected/warehouse/receiving/shipments`

Create a new inbound shipment.

**Request Body:**
```json
{
  "supplier_id": 3,
  "po_number": "PO-2026-001",
  "expected_arrival": "2026-02-20",
  "notes": "Fragile items",
  "items": [
    {
      "product_id": 15,
      "sku": "CIGAR-001",
      "upc_code": "123456789012",
      "expected_quantity": 100
    }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "shipment_number": "RCV-1708070400000"
}
```

### List Receiving Shipments

**GET** `/api/protected/warehouse/receiving/shipments`

List all receiving shipments.

**Query Parameters:**
- `status` - Filter by status (pending, in_progress, completed)
- `supplier_id` - Filter by supplier
- `limit` - Number of results

**Response:**
```json
[
  {
    "id": 1,
    "shipment_number": "RCV-1708070400000",
    "supplier_id": 3,
    "supplier_name": "Premium Cigars Inc",
    "po_number": "PO-2026-001",
    "status": "in_progress",
    "total_items": 5,
    "items_received": 3,
    "created_at": "2026-02-16T08:00:00Z"
  }
]
```

### Get Shipment Details

**GET** `/api/protected/warehouse/receiving/shipments/:id`

Get detailed information about a shipment including items.

**Response:**
```json
{
  "id": 1,
  "shipment_number": "RCV-1708070400000",
  "supplier_id": 3,
  "supplier_name": "Premium Cigars Inc",
  "po_number": "PO-2026-001",
  "status": "in_progress",
  "total_items": 5,
  "items_received": 3,
  "items": [
    {
      "id": 1,
      "product_id": 15,
      "sku": "CIGAR-001",
      "upc_code": "123456789012",
      "expected_quantity": 100,
      "received_quantity": 95,
      "match_status": "mismatch",
      "location_id": 5,
      "received_by": 5,
      "received_by_name": "John Doe",
      "received_at": "2026-02-16T10:30:00Z"
    }
  ]
}
```

### Scan Item During Receiving

**POST** `/api/protected/warehouse/receiving/:shipmentId/scan`

Scan and receive an item.

**Request Body:**
```json
{
  "upc_code": "123456789012",
  "sku": "CIGAR-001",
  "quantity": 1,
  "location_id": 5
}
```

**Response:**
```json
{
  "item_id": 1,
  "product_id": 15,
  "received_quantity": 96,
  "expected_quantity": 100,
  "match_status": "pending",
  "location_id": 5
}
```

**Real-time Event Emitted:** `receiving_update`, `inventory_update`

### Complete Receiving Shipment

**PUT** `/api/protected/warehouse/receiving/:shipmentId/complete`

Mark shipment as complete.

**Response:**
```json
{
  "id": 1,
  "changes": 1
}
```

**Real-time Event Emitted:** `shipment_completed`

### Report Discrepancy

**POST** `/api/protected/warehouse/receiving/:shipmentId/discrepancy`

Report damage, mismatch, or missing items.

**Request Body:**
```json
{
  "item_id": 1,
  "type": "damage|mismatch|missing",
  "notes": "Box was damaged during shipping",
  "quantity": 5
}
```

**Response:**
```json
{
  "id": 1,
  "changes": 1
}
```

---

## Picking Module

### Create Pick List

**POST** `/api/protected/warehouse/pick-lists`

Generate a pick list from an order.

**Request Body:**
```json
{
  "order_id": 10,
  "assigned_to": 5,
  "priority": "normal|high|urgent",
  "zone": "ZONE-A"
}
```

**Response:**
```json
{
  "id": 1,
  "pick_list_number": "PICK-1708070400000"
}
```

### List Pick Lists

**GET** `/api/protected/warehouse/pick-lists`

List pick lists with filtering.

**Query Parameters:**
- `status` - Filter by status (pending, in_progress, completed)
- `assigned_to` - Filter by user
- `zone` - Filter by zone
- `priority` - Filter by priority
- `limit` - Number of results

**Response:**
```json
[
  {
    "id": 1,
    "pick_list_number": "PICK-1708070400000",
    "order_id": 10,
    "assigned_to": 5,
    "assigned_to_name": "John Doe",
    "priority": "normal",
    "status": "in_progress",
    "zone": "ZONE-A",
    "total_items": 10,
    "items_picked": 7,
    "created_at": "2026-02-16T09:00:00Z"
  }
]
```

### Get Pick List Details

**GET** `/api/protected/warehouse/pick-lists/:id`

Get detailed pick list with items and route.

**Response:**
```json
{
  "id": 1,
  "pick_list_number": "PICK-1708070400000",
  "order_id": 10,
  "assigned_to": 5,
  "assigned_to_name": "John Doe",
  "status": "in_progress",
  "total_items": 10,
  "items_picked": 7,
  "route_data": {
    "optimized": true,
    "zones": ["ZONE-A", "ZONE-B"],
    "total_locations": 10
  },
  "items": [
    {
      "id": 1,
      "product_id": 15,
      "sku": "CIGAR-001",
      "quantity_requested": 5,
      "quantity_picked": 5,
      "location_id": 5,
      "location_code": "A1-01-01",
      "aisle": "A1",
      "shelf": "01",
      "zone": "ZONE-A",
      "sequence_number": 1,
      "status": "picked",
      "picked_by_name": "John Doe"
    }
  ]
}
```

### Scan Item During Picking

**POST** `/api/protected/warehouse/pick-lists/:id/scan`

Scan and pick an item.

**Request Body:**
```json
{
  "upc_code": "123456789012",
  "sku": "CIGAR-001",
  "quantity": 1,
  "location_id": 5
}
```

**Response:**
```json
{
  "item_id": 1,
  "product_id": 15,
  "quantity_picked": 5,
  "quantity_requested": 5,
  "status": "picked",
  "location_id": 5
}
```

**Real-time Event Emitted:** `pick_list_update`, `inventory_update`

### Complete Pick List

**PUT** `/api/protected/warehouse/pick-lists/:id/complete`

Mark pick list as complete.

**Response:**
```json
{
  "id": 1,
  "changes": 1
}
```

**Real-time Event Emitted:** `pick_list_completed`

### Get Optimized Pick Route

**GET** `/api/protected/warehouse/pick-lists/:id/suggested-route`

Get the optimized picking route.

**Response:**
```json
{
  "pick_list_id": 1,
  "total_items": 10,
  "route": [
    {
      "step": 1,
      "item_id": 1,
      "product_id": 15,
      "sku": "CIGAR-001",
      "quantity": 5,
      "location_code": "A1-01-01",
      "aisle": "A1",
      "shelf": "01",
      "zone": "ZONE-A",
      "status": "pending"
    }
  ],
  "estimated_time": 25
}
```

---

## Inventory Module

### Get Real-Time Inventory

**GET** `/api/protected/warehouse/inventory`

Get current inventory snapshot.

**Query Parameters:**
- `zone` - Filter by zone
- `location_id` - Filter by location
- `product_id` - Filter by product

**Response:**
```json
[
  {
    "product_id": 15,
    "location_id": 5,
    "quantity": 50,
    "is_primary": 1,
    "location_code": "A1-01-01",
    "aisle": "A1",
    "shelf": "01",
    "position": "01",
    "zone": "ZONE-A",
    "last_updated": "2026-02-16T10:30:00Z"
  }
]
```

### Get Inventory by Location

**GET** `/api/protected/warehouse/inventory/by-location/:locationId`

Get all products at a specific location.

**Response:**
```json
[
  {
    "id": 1,
    "product_id": 15,
    "location_id": 5,
    "quantity": 50,
    "is_primary": 1,
    "location_code": "A1-01-01",
    "zone": "ZONE-A"
  }
]
```

### Manual Inventory Adjustment

**POST** `/api/protected/warehouse/inventory/adjust`

Manually adjust inventory quantity.

**Request Body:**
```json
{
  "product_id": 15,
  "location_id": 5,
  "quantity": -5
}
```

**Response:**
```json
{
  "id": 1,
  "changes": 1
}
```

**Real-time Event Emitted:** `inventory_update`

### Get Cycle Count Discrepancies

**GET** `/api/protected/warehouse/inventory/discrepancies`

Get inventory discrepancies from cycle counts.

**Query Parameters:**
- `location_id` - Filter by location
- `threshold` - Minimum variance threshold (default: 5)

**Response:**
```json
[
  {
    "id": 1,
    "cycle_count_id": 1,
    "count_number": "CC-001",
    "product_id": 15,
    "location_id": 5,
    "location_code": "A1-01-01",
    "zone": "ZONE-A",
    "expected_quantity": 50,
    "actual_quantity": 45,
    "variance": -5,
    "status": "counted",
    "counted_by_name": "John Doe"
  }
]
```

---

## Locations Module

### Create Warehouse Location

**POST** `/api/protected/warehouse/locations`

Create a new warehouse location.

**Request Body:**
```json
{
  "location_code": "A3-01-01",
  "aisle": "A3",
  "shelf": "01",
  "position": "01",
  "zone": "ZONE-A",
  "location_type": "standard",
  "capacity": 100
}
```

**Response:**
```json
{
  "id": 13,
  "location_code": "A3-01-01"
}
```

### List Warehouse Locations

**GET** `/api/protected/warehouse/locations`

List all warehouse locations.

**Query Parameters:**
- `zone` - Filter by zone
- `location_type` - Filter by type (standard, receiving, shipping, quarantine)
- `is_active` - Filter by active status

**Response:**
```json
[
  {
    "id": 1,
    "location_code": "A1-01-01",
    "aisle": "A1",
    "shelf": "01",
    "position": "01",
    "zone": "ZONE-A",
    "location_type": "standard",
    "capacity": 100,
    "current_capacity": 50,
    "is_active": 1,
    "created_at": "2026-02-16T00:00:00Z"
  }
]
```

### Get Specific Location

**GET** `/api/protected/warehouse/locations/:id`

Get location by ID or code.

**Response:**
```json
{
  "id": 1,
  "location_code": "A1-01-01",
  "aisle": "A1",
  "shelf": "01",
  "position": "01",
  "zone": "ZONE-A",
  "location_type": "standard",
  "capacity": 100,
  "current_capacity": 50,
  "is_active": 1
}
```

### Update Warehouse Location

**PUT** `/api/protected/warehouse/locations/:id`

Update location information.

**Request Body:**
```json
{
  "zone": "ZONE-B",
  "capacity": 150,
  "is_active": 1
}
```

**Response:**
```json
{
  "id": 1,
  "changes": 1
}
```

---

## Analytics & Reporting

### Warehouse Dashboard KPIs

**GET** `/api/protected/warehouse/dashboard`

Get real-time warehouse KPIs.

**Query Parameters:**
- `start_date` - Start date (ISO format)
- `end_date` - End date (ISO format)
- `zone` - Filter by zone

**Response:**
```json
{
  "throughput": {
    "receiving": {
      "total_shipments": 25,
      "completed_shipments": 20,
      "total_items_expected": 500,
      "total_items_received": 480
    },
    "picking": {
      "total_pick_lists": 40,
      "completed_pick_lists": 35,
      "total_items": 400,
      "items_picked": 390,
      "avg_pick_time": 15.5
    },
    "scanning": [
      {
        "scan_type": "receiving",
        "total_scans": 480,
        "successful_scans": 475,
        "failed_scans": 5
      }
    ]
  },
  "accuracy": {
    "receiving_accuracy": 96.0,
    "picking_accuracy": 97.5,
    "scan_success_rate": "98.96"
  },
  "inventory": {
    "unique_products": 150,
    "total_units": 5000,
    "locations_used": 50
  },
  "productivity": {
    "avg_pick_time": "15.50",
    "picks_per_hour": "3.87"
  }
}
```

**Real-time Event Emitted:** `dashboard_update`

### Audit Log

**GET** `/api/protected/warehouse/reports/audit-log`

Get warehouse audit trail.

**Query Parameters:**
- `user_id` - Filter by user
- `action` - Filter by action type
- `resource_type` - Filter by resource
- `start_date` - Start date
- `end_date` - End date
- `limit` - Number of results

**Response:**
```json
[
  {
    "id": 1,
    "user_id": 5,
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "action": "create_pick_list",
    "resource_type": "pick_lists",
    "resource_id": 1,
    "new_value": "{\"pick_list_number\":\"PICK-001\"}",
    "created_at": "2026-02-16T10:00:00Z"
  }
]
```

### Inventory Aging Report

**GET** `/api/protected/warehouse/reports/inventory-aging`

Get inventory aging analysis.

**Response:**
```json
[
  {
    "product_id": 15,
    "location_code": "A1-01-01",
    "zone": "ZONE-A",
    "quantity": 50,
    "created_at": "2025-11-16T00:00:00Z",
    "days_in_location": 92,
    "age_category": "aging"
  }
]
```

### SKU Velocity Report

**GET** `/api/protected/warehouse/reports/sku-velocity`

Get product movement analysis.

**Query Parameters:**
- `start_date` - Start date
- `end_date` - End date
- `limit` - Number of results (default: 50)

**Response:**
```json
[
  {
    "product_id": 15,
    "pick_count": 50,
    "total_picked": 250,
    "pick_lists": 45,
    "avg_quantity": 5.0,
    "velocity_class": "A",
    "rank": 1
  }
]
```

### Worker Productivity Report

**GET** `/api/protected/warehouse/reports/worker-productivity`

Get worker performance metrics.

**Query Parameters:**
- `user_id` - Specific user
- `start_date` - Start date
- `end_date` - End date

**Response:**
```json
[
  {
    "user_id": 5,
    "name": "John Doe",
    "email": "john@example.com",
    "shift": "morning",
    "zone_assignment": "ZONE-A",
    "total_scans": 480,
    "completed_picks": 35,
    "completed_receives": 20,
    "avg_pick_time": 15.5,
    "total_units_picked": 390
  }
]
```

### Performance Trends

**GET** `/api/protected/warehouse/reports/performance-trends`

Get warehouse performance over time.

**Query Parameters:**
- `days` - Number of days (default: 30)

**Response:**
```json
[
  {
    "date": "2026-02-16",
    "scans": {
      "receiving": {
        "count": 100,
        "successful": 98,
        "total_quantity": 500,
        "success_rate": "98.00"
      },
      "picking": {
        "count": 150,
        "successful": 148,
        "total_quantity": 750,
        "success_rate": "98.67"
      }
    }
  }
]
```

### Location Utilization

**GET** `/api/protected/warehouse/reports/location-utilization`

Get warehouse space utilization.

**Query Parameters:**
- `zone` - Filter by zone

**Response:**
```json
[
  {
    "id": 1,
    "location_code": "A1-01-01",
    "zone": "ZONE-A",
    "location_type": "standard",
    "capacity": 100,
    "current_capacity": 75,
    "utilization_pct": 75.0,
    "products_stored": 3
  }
]
```

---

## Warehouse Users

### Get Warehouse User Info

**GET** `/api/protected/warehouse/users/:userId`

Get warehouse-specific user information.

**Response:**
```json
{
  "id": 1,
  "user_id": 5,
  "name": "John Doe",
  "email": "john@example.com",
  "warehouse_id": "WH-001",
  "shift": "morning",
  "zone_assignment": "ZONE-A",
  "default_operation": "picking",
  "is_active": 1,
  "employee_number": "EMP-001"
}
```

### Create/Update Warehouse User

**POST** `/api/protected/warehouse/users/:userId`

Create or update warehouse user profile.

**Request Body:**
```json
{
  "warehouse_id": "WH-001",
  "shift": "morning|afternoon|night",
  "zone_assignment": "ZONE-A",
  "default_operation": "receiving|picking|shipping|all",
  "employee_number": "EMP-001"
}
```

**Response:**
```json
{
  "userId": 5,
  "changes": 1
}
```

---

## WebSocket Events

Connect to the WebSocket server at `ws://localhost:4000` (or your server URL).

### Client Events (Emit)

Join specific rooms for targeted updates:

```javascript
socket.emit('join_zone', 'ZONE-A');
socket.emit('join_location', 5);
socket.emit('join_user', 5);
socket.emit('join_pick_list', 1);
socket.emit('join_shipment', 1);
```

### Server Events (Listen)

Listen for real-time updates:

**Global Events:**
```javascript
socket.on('scan_event', (data) => {
  // All scan events
});

socket.on('inventory_update', (data) => {
  // Inventory changes
});

socket.on('pick_list_update', (data) => {
  // Pick list status updates
});

socket.on('receiving_update', (data) => {
  // Receiving shipment updates
});

socket.on('warehouse_alert', (data) => {
  // System alerts
});

socket.on('dashboard_update', (data) => {
  // Dashboard KPI updates
});

socket.on('notification', (data) => {
  // System notifications
});
```

**Zone-Specific Events:**
```javascript
socket.on('zone_scan', (data) => {
  // Scans in joined zone
});

socket.on('zone_inventory_update', (data) => {
  // Inventory updates in zone
});

socket.on('zone_alert', (data) => {
  // Alerts for zone
});
```

**User-Specific Events:**
```javascript
socket.on('user_scan', (data) => {
  // User's own scans
});

socket.on('assigned_pick_list_update', (data) => {
  // Updates for assigned pick lists
});
```

**Completion Events:**
```javascript
socket.on('pick_list_completed', (data) => {
  // Pick list completed
});

socket.on('shipment_completed', (data) => {
  // Shipment completed
});

socket.on('low_stock_alert', (data) => {
  // Low stock warnings
});
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Scan endpoints are rate-limited to prevent abuse:
- Default: 100 scans per minute per user
- Adjust in environment configuration

---

## Example Usage

### Complete Receiving Flow

```javascript
// 1. Create receiving shipment
const shipment = await fetch('/api/protected/warehouse/receiving/shipments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    supplier_id: 3,
    po_number: 'PO-001',
    items: [{ product_id: 15, sku: 'CIGAR-001', expected_quantity: 100 }]
  })
});

// 2. Scan items as they arrive
const scanResult = await fetch(`/api/protected/warehouse/receiving/${shipment.id}/scan`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    upc_code: '123456789012',
    quantity: 10,
    location_id: 5
  })
});

// 3. Complete shipment
await fetch(`/api/protected/warehouse/receiving/${shipment.id}/complete`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Complete Picking Flow

```javascript
// 1. Create pick list from order
const pickList = await fetch('/api/protected/warehouse/pick-lists', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    order_id: 10,
    assigned_to: 5,
    priority: 'normal'
  })
});

// 2. Get optimized route
const route = await fetch(`/api/protected/warehouse/pick-lists/${pickList.id}/suggested-route`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Scan items during picking
const pickResult = await fetch(`/api/protected/warehouse/pick-lists/${pickList.id}/scan`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    upc_code: '123456789012',
    quantity: 5,
    location_id: 5
  })
});

// 4. Complete pick list
await fetch(`/api/protected/warehouse/pick-lists/${pickList.id}/complete`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Version

**API Version:** 1.0.0  
**Last Updated:** February 16, 2026
