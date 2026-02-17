# Shipping Integration API Documentation

## Overview
Complete API reference for the UPS and USPS shipping integration system. This document covers all 30+ endpoints for account management, label generation, tracking, shipment management, and analytics.

## Base URL
```
Production: https://api.cigar-order-hub.com
Development: http://localhost:4000
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Table of Contents
1. [UPS Account Management](#ups-account-management)
2. [USPS Account Management](#usps-account-management)
3. [Label Generation](#label-generation)
4. [Tracking](#tracking)
5. [Shipment Management](#shipment-management)
6. [Analytics & Reporting](#analytics--reporting)
7. [Error Codes](#error-codes)
8. [Data Models](#data-models)

---

## UPS Account Management

### 1.1 Connect UPS Account

Connect a supplier's UPS account to the platform.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/ups/connect`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Request Body:**
```json
{
  "accountNumber": "string",
  "userId": "string",
  "password": "string",
  "meterNumber": "string",
  "apiKey": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "UPS account linked successfully",
  "accountId": 1,
  "carrier": "UPS",
  "accountNumber": "******123",
  "status": "active"
}
```

**Errors:**
- `400 Bad Request` - Missing required credentials
- `400 Bad Request` - Invalid UPS credentials
- `500 Internal Server Error` - Server error

---

### 1.2 Get UPS Account Status

Get the status of a supplier's UPS account connection.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/ups/status`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "connected": true,
  "carrier": "UPS",
  "accountNumber": "******123",
  "status": "active",
  "lastVerified": "2026-02-15T21:00:00Z",
  "connectedAt": "2026-02-10T10:00:00Z",
  "updatedAt": "2026-02-15T21:00:00Z"
}
```

**Response (Not Connected):** `404 Not Found`
```json
{
  "connected": false,
  "message": "UPS account not connected"
}
```

---

### 1.3 Verify UPS Credentials

Verify UPS credentials without connecting the account.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/ups/verify`

**Request Body:**
```json
{
  "accountNumber": "string",
  "userId": "string",
  "password": "string",
  "meterNumber": "string",
  "apiKey": "string"
}
```

**Response:** `200 OK`
```json
{
  "verified": true,
  "message": "UPS credentials verified"
}
```

**Errors:**
- `400 Bad Request` - Invalid credentials

---

### 1.4 Disconnect UPS Account

Disconnect and remove a supplier's UPS account.

**Endpoint:** `DELETE /api/suppliers/:supplierId/shipping/ups/disconnect`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "UPS account unlinked successfully"
}
```

**Errors:**
- `404 Not Found` - UPS account not found

---

### 1.5 Refresh UPS Connection

Refresh and verify the UPS account connection.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/ups/refresh`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "UPS connection refreshed successfully",
  "status": "active",
  "lastVerified": "2026-02-15T21:00:00Z"
}
```

---

## USPS Account Management

### 2.1 Connect USPS Account

Connect a supplier's USPS account to the platform.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/usps/connect`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Request Body:**
```json
{
  "accountNumber": "string",
  "userId": "string",
  "apiKey": "string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "USPS account linked successfully",
  "accountId": 2,
  "carrier": "USPS",
  "accountNumber": "******456",
  "status": "active"
}
```

---

### 2.2 Get USPS Account Status

Get the status of a supplier's USPS account connection.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/usps/status`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "connected": true,
  "carrier": "USPS",
  "accountNumber": "******456",
  "status": "active",
  "lastVerified": "2026-02-15T21:00:00Z",
  "connectedAt": "2026-02-10T10:00:00Z",
  "updatedAt": "2026-02-15T21:00:00Z"
}
```

---

### 2.3 Verify USPS Credentials

Verify USPS credentials without connecting the account.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/usps/verify`

**Request Body:**
```json
{
  "accountNumber": "string",
  "userId": "string",
  "apiKey": "string"
}
```

**Response:** `200 OK`
```json
{
  "verified": true,
  "message": "USPS credentials verified"
}
```

---

### 2.4 Disconnect USPS Account

Disconnect and remove a supplier's USPS account.

**Endpoint:** `DELETE /api/suppliers/:supplierId/shipping/usps/disconnect`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "USPS account unlinked successfully"
}
```

---

### 2.5 Refresh USPS Connection

Refresh and verify the USPS account connection.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/usps/refresh`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "USPS connection refreshed successfully",
  "status": "active",
  "lastVerified": "2026-02-15T21:00:00Z"
}
```

---

## Label Generation

### 3.1 Generate UPS Label

Generate a UPS shipping label for an order.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/labels/ups`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Request Body:**
```json
{
  "orderId": 123,
  "weight": 2.5,
  "serviceType": "ground",
  "shipFrom": {
    "name": "Supplier Name",
    "address": "123 Main St",
    "city": "Louisville",
    "state": "KY",
    "postalCode": "40202",
    "country": "US",
    "phone": "555-0100"
  },
  "shipTo": {
    "name": "Customer Name",
    "address": "456 Oak Ave",
    "city": "Chicago",
    "state": "IL",
    "postalCode": "60601",
    "country": "US",
    "phone": "555-0200"
  },
  "packageDetails": {
    "length": 12,
    "width": 10,
    "height": 8,
    "description": "Cigars"
  },
  "options": {
    "signature": false,
    "insurance": 100,
    "referenceNumber": "ORDER-123"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "UPS label generated successfully",
  "trackingNumber": "1Z999AA10123456784",
  "labelUrl": "https://mock-ups-api.com/labels/1Z999AA10123456784.pdf",
  "labelId": "UPS-1708028400000",
  "carrier": "UPS",
  "serviceType": "ground",
  "estimatedDelivery": "2026-02-20T17:00:00Z"
}
```

**Service Types:**
- `ground` - UPS Ground
- `express` - UPS Express
- `next_day_air` - UPS Next Day Air
- `2nd_day_air` - UPS 2nd Day Air

---

### 3.2 Generate USPS Label

Generate a USPS shipping label for an order.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/labels/usps`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Request Body:**
```json
{
  "orderId": 124,
  "weight": 1.5,
  "serviceType": "priority_mail",
  "shipFrom": {
    "name": "Supplier Name",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US"
  },
  "shipTo": {
    "name": "Customer Name",
    "address": "789 Pine St",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "US"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "USPS label generated successfully",
  "trackingNumber": "9400111899562719823456",
  "labelUrl": "https://mock-usps-api.com/labels/9400111899562719823456.pdf",
  "labelId": "USPS-1708028400000",
  "carrier": "USPS",
  "serviceType": "priority_mail",
  "estimatedDelivery": "2026-02-18T17:00:00Z"
}
```

**Service Types:**
- `priority_mail` - USPS Priority Mail
- `priority_mail_express` - USPS Priority Mail Express
- `first_class` - USPS First-Class Mail
- `ground_advantage` - USPS Ground Advantage

---

### 3.3 Get Label

Retrieve label information by tracking number.

**Endpoint:** `GET /api/shipping/labels/:trackingNumber`

**Parameters:**
- `trackingNumber` (path) - Tracking number

**Response:** `200 OK`
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "labelUrl": "https://mock-ups-api.com/labels/1Z999AA10123456784.pdf",
  "labelId": "UPS-1708028400000",
  "status": "label_generated",
  "serviceType": "ground",
  "createdAt": "2026-02-15T21:00:00Z"
}
```

---

### 3.4 Reprint Label

Reprint an existing shipping label.

**Endpoint:** `POST /api/shipping/labels/:trackingNumber/reprint`

**Parameters:**
- `trackingNumber` (path) - Tracking number

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Label ready for reprint",
  "trackingNumber": "1Z999AA10123456784",
  "labelUrl": "https://mock-ups-api.com/labels/1Z999AA10123456784.pdf",
  "carrier": "UPS"
}
```

---

### 3.5 Download Label

Download a shipping label.

**Endpoint:** `POST /api/shipping/labels/:trackingNumber/download`

**Parameters:**
- `trackingNumber` (path) - Tracking number

**Response:** `200 OK`
```json
{
  "success": true,
  "downloadUrl": "https://mock-ups-api.com/labels/1Z999AA10123456784.pdf",
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "format": "PDF"
}
```

---

### 3.6 Batch Generate Labels

Generate multiple labels at once.

**Endpoint:** `POST /api/shipping/labels/batch-generate`

**Request Body:**
```json
{
  "shipments": [
    {
      "orderId": 123,
      "carrier": "UPS",
      "weight": 2.5,
      "serviceType": "ground",
      "shipFrom": {...},
      "shipTo": {...}
    },
    {
      "orderId": 124,
      "carrier": "USPS",
      "weight": 1.0,
      "serviceType": "priority_mail",
      "shipFrom": {...},
      "shipTo": {...}
    }
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Processed 2 shipments",
  "results": [
    {
      "orderId": 123,
      "trackingNumber": "1Z999AA10123456784",
      "carrier": "UPS",
      "success": true
    },
    {
      "orderId": 124,
      "trackingNumber": "9400111899562719823456",
      "carrier": "USPS",
      "success": true
    }
  ],
  "errors": [],
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  }
}
```

---

## Tracking

### 4.1 Track Shipment

Get current tracking information for a shipment.

**Endpoint:** `GET /api/shipping/track/:trackingNumber`

**Parameters:**
- `trackingNumber` (path) - Tracking number

**Response:** `200 OK`
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "status": "in_transit",
  "currentLocation": "Memphis, TN",
  "estimatedDelivery": "2026-02-17T17:00:00Z",
  "events": [
    {
      "type": "in_transit",
      "location": "Memphis, TN",
      "timestamp": "2026-02-15T14:30:00Z",
      "details": "Package in transit"
    },
    {
      "type": "picked_up",
      "location": "Louisville, KY",
      "timestamp": "2026-02-14T10:15:00Z",
      "details": "Package picked up"
    }
  ]
}
```

**Status Values:**
- `label_generated` - Label created, not yet picked up
- `picked_up` - Package picked up by carrier
- `in_transit` - Package in transit
- `out_for_delivery` - Out for delivery
- `delivered` - Successfully delivered
- `exception` - Exception or delay

---

### 4.2 Get Tracking Summary

Get tracking summary for all shipments of a supplier.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/track/summary`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "total": 150,
  "byStatus": {
    "label_generated": 10,
    "picked_up": 5,
    "in_transit": 25,
    "out_for_delivery": 8,
    "delivered": 100,
    "exception": 2
  },
  "byCarrier": {
    "UPS": 90,
    "USPS": 60
  },
  "recent": [
    {
      "id": 1,
      "tracking_number": "1Z999AA10123456784",
      "carrier": "UPS",
      "status": "in_transit",
      "created_at": "2026-02-15T10:00:00Z"
    }
  ]
}
```

---

### 4.3 Get Tracking History

Get full tracking history with all events.

**Endpoint:** `GET /api/shipping/track/:trackingNumber/history`

**Parameters:**
- `trackingNumber` (path) - Tracking number

**Response:** `200 OK`
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "status": "delivered",
  "currentLocation": "Chicago, IL",
  "estimatedDelivery": "2026-02-17T17:00:00Z",
  "actualDelivery": "2026-02-17T15:30:00Z",
  "events": [
    {
      "type": "delivered",
      "location": "Chicago, IL",
      "timestamp": "2026-02-17T15:30:00Z",
      "details": "Delivered to recipient"
    },
    {
      "type": "out_for_delivery",
      "location": "Chicago, IL",
      "timestamp": "2026-02-17T08:00:00Z",
      "details": "Out for delivery"
    },
    {
      "type": "in_transit",
      "location": "Memphis, TN",
      "timestamp": "2026-02-15T14:30:00Z",
      "details": "Package in transit"
    },
    {
      "type": "picked_up",
      "location": "Louisville, KY",
      "timestamp": "2026-02-14T10:15:00Z",
      "details": "Package picked up"
    },
    {
      "type": "label_generated",
      "location": "Louisville, KY",
      "timestamp": "2026-02-14T09:00:00Z",
      "details": "Shipping label created"
    }
  ]
}
```

---

### 4.4 Subscribe to Tracking Updates

Subscribe to real-time tracking updates via webhook or email.

**Endpoint:** `POST /api/shipping/track/:trackingNumber/subscribe`

**Parameters:**
- `trackingNumber` (path) - Tracking number

**Request Body:**
```json
{
  "webhookUrl": "https://your-domain.com/webhook/tracking",
  "email": "notifications@your-company.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Subscribed to tracking updates",
  "trackingNumber": "1Z999AA10123456784",
  "webhookUrl": "https://your-domain.com/webhook/tracking",
  "email": "notifications@your-company.com",
  "subscriptionId": "SUB-1708028400000"
}
```

---

### 4.5 Get Tracking Events

Get all tracking events for a shipment.

**Endpoint:** `GET /api/shipping/track/:trackingNumber/events`

**Parameters:**
- `trackingNumber` (path) - Tracking number

**Response:** `200 OK`
```json
{
  "trackingNumber": "1Z999AA10123456784",
  "events": [
    {
      "id": 1,
      "type": "delivered",
      "location": "Chicago, IL",
      "timestamp": "2026-02-17T15:30:00Z",
      "details": "{\"signature\":\"John Doe\"}",
      "createdAt": "2026-02-17T15:35:00Z"
    }
  ]
}
```

---

### 4.6 Batch Track Shipments

Track multiple shipments at once.

**Endpoint:** `POST /api/shipping/track/batch-track`

**Request Body:**
```json
{
  "trackingNumbers": [
    "1Z999AA10123456784",
    "9400111899562719823456"
  ]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "count": 2,
  "shipments": [
    {
      "trackingNumber": "1Z999AA10123456784",
      "carrier": "UPS",
      "status": "in_transit",
      "currentLocation": "Memphis, TN",
      "estimatedDelivery": "2026-02-17T17:00:00Z"
    },
    {
      "trackingNumber": "9400111899562719823456",
      "carrier": "USPS",
      "status": "delivered",
      "currentLocation": "Los Angeles, CA",
      "estimatedDelivery": "2026-02-16T17:00:00Z"
    }
  ]
}
```

---

## Shipment Management

### 5.1 Get Supplier Shipments

Get all shipments for a supplier with filtering options.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/shipments`

**Parameters:**
- `supplierId` (path) - Supplier ID
- `status` (query, optional) - Filter by status
- `carrier` (query, optional) - Filter by carrier (UPS, USPS)
- `startDate` (query, optional) - Start date filter (ISO 8601)
- `endDate` (query, optional) - End date filter (ISO 8601)
- `limit` (query, optional) - Results per page (default: 50)
- `offset` (query, optional) - Offset for pagination (default: 0)

**Response:** `200 OK`
```json
{
  "shipments": [
    {
      "id": 1,
      "order_id": 123,
      "carrier": "UPS",
      "tracking_number": "1Z999AA10123456784",
      "status": "delivered",
      "weight": 2.5,
      "service_type": "ground",
      "created_at": "2026-02-14T09:00:00Z"
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}
```

---

### 5.2 Get Shipment Details

Get detailed information about a specific shipment.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/shipments/:trackingNumber`

**Parameters:**
- `supplierId` (path) - Supplier ID
- `trackingNumber` (path) - Tracking number

**Response:** `200 OK`
```json
{
  "id": 1,
  "order_id": 123,
  "carrier": "UPS",
  "tracking_number": "1Z999AA10123456784",
  "label_url": "https://mock-ups-api.com/labels/1Z999AA10123456784.pdf",
  "label_id": "UPS-1708028400000",
  "status": "delivered",
  "current_location": "Chicago, IL",
  "estimated_delivery": "2026-02-17T17:00:00Z",
  "actual_delivery": "2026-02-17T15:30:00Z",
  "weight": 2.5,
  "service_type": "ground",
  "created_at": "2026-02-14T09:00:00Z",
  "updated_at": "2026-02-17T15:35:00Z",
  "events": [
    {
      "type": "delivered",
      "location": "Chicago, IL",
      "timestamp": "2026-02-17T15:30:00Z",
      "details": "{\"signature\":\"John Doe\"}"
    }
  ]
}
```

---

### 5.3 Cancel Shipment

Cancel a shipment before delivery.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/shipments/:trackingNumber/cancel`

**Parameters:**
- `supplierId` (path) - Supplier ID
- `trackingNumber` (path) - Tracking number

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Shipment cancelled successfully",
  "trackingNumber": "1Z999AA10123456784"
}
```

**Errors:**
- `400 Bad Request` - Cannot cancel delivered shipment
- `404 Not Found` - Shipment not found

---

### 5.4 Hold Shipment

Put a shipment on hold.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/shipments/:trackingNumber/hold`

**Parameters:**
- `supplierId` (path) - Supplier ID
- `trackingNumber` (path) - Tracking number

**Request Body:**
```json
{
  "reason": "Customer requested hold"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Shipment placed on hold",
  "trackingNumber": "1Z999AA10123456784",
  "reason": "Customer requested hold"
}
```

---

### 5.5 Schedule Pickup

Schedule a carrier pickup.

**Endpoint:** `POST /api/suppliers/:supplierId/shipping/shipments/pickup/schedule`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Request Body:**
```json
{
  "carrier": "UPS",
  "date": "2026-02-16",
  "location": {
    "address": "123 Main St",
    "city": "Louisville",
    "state": "KY",
    "postalCode": "40202"
  },
  "instructions": "Ring doorbell",
  "trackingNumbers": ["1Z999AA10123456784", "1Z999AA10123456789"]
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Pickup scheduled successfully",
  "pickupId": "PICKUP-1708028400000",
  "carrier": "UPS",
  "date": "2026-02-16",
  "location": {
    "address": "123 Main St",
    "city": "Louisville",
    "state": "KY",
    "postalCode": "40202"
  },
  "instructions": "Ring doorbell",
  "trackingNumbers": ["1Z999AA10123456784", "1Z999AA10123456789"],
  "confirmationNumber": "CONF-ABC123XY"
}
```

---

## Analytics & Reporting

### 6.1 Get Shipping Metrics

Get comprehensive shipping metrics for a supplier.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/metrics`

**Parameters:**
- `supplierId` (path) - Supplier ID
- `startDate` (query, optional) - Start date (ISO 8601)
- `endDate` (query, optional) - End date (ISO 8601)

**Response:** `200 OK`
```json
{
  "totalShipments": 150,
  "byCarrier": {
    "UPS": 90,
    "USPS": 60
  },
  "byStatus": {
    "label_generated": 10,
    "in_transit": 25,
    "delivered": 100,
    "exception": 2
  },
  "averageWeight": 2.3,
  "onTimeDeliveryRate": 95.5,
  "estimatedCost": 1275.50
}
```

---

### 6.2 Get Shipping Analytics

Get detailed analytics dashboard data.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/analytics`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "overview": {
    "totalShipments": 150,
    "activeShipments": 35,
    "deliveredShipments": 100,
    "exceptionShipments": 2
  },
  "carriers": {
    "UPS": 90,
    "USPS": 60
  },
  "performance": {
    "averageDeliveryTime": 3.2,
    "onTimeRate": 95.5,
    "exceptionRate": 1.3
  },
  "costs": {
    "totalEstimated": 1275.50,
    "averagePerShipment": 8.50
  }
}
```

---

### 6.3 Estimate Shipping Cost

Estimate the cost of shipping a package.

**Endpoint:** `POST /api/shipping/estimate-cost`

**Request Body:**
```json
{
  "carrier": "UPS",
  "weight": 2.5,
  "serviceType": "ground",
  "origin": "40202",
  "destination": "60601"
}
```

**Response:** `200 OK`
```json
{
  "carrier": "UPS",
  "weight": 2.5,
  "serviceType": "ground",
  "estimatedCost": 21.25,
  "currency": "USD",
  "estimatedDeliveryDays": "2026-02-20T17:00:00Z",
  "note": "This is an estimate. Actual cost may vary based on dimensions and additional services."
}
```

---

### 6.4 Get Carrier Comparison

Compare performance and costs between UPS and USPS.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/carrier-comparison`

**Parameters:**
- `supplierId` (path) - Supplier ID

**Response:** `200 OK`
```json
{
  "UPS": {
    "totalShipments": 90,
    "averageWeight": 2.8,
    "onTimeRate": 96.5,
    "averageCost": 23.80,
    "delivered": 85
  },
  "USPS": {
    "totalShipments": 60,
    "averageWeight": 1.5,
    "onTimeRate": 94.0,
    "averageCost": 10.80,
    "delivered": 55
  }
}
```

---

### 6.5 Get Delivery Trends

Get delivery performance trends over time.

**Endpoint:** `GET /api/suppliers/:supplierId/shipping/delivery-trends`

**Parameters:**
- `supplierId` (path) - Supplier ID
- `period` (query, optional) - Time period (week, month, quarter, year)

**Response:** `200 OK`
```json
{
  "period": "month",
  "totalDelivered": 100,
  "onTimeDeliveries": 95,
  "lateDeliveries": 5,
  "averageDeliveryTime": 3.2,
  "exceptionRate": 1.3,
  "onTimeRate": 95.0
}
```

---

## Error Codes

### HTTP Status Codes

- `200 OK` - Request successful
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": "Error message description",
  "details": "Additional error details (optional)"
}
```

---

## Data Models

### ShipmentData Model

```typescript
interface ShipmentData {
  orderId: number;
  weight: number;
  serviceType: string;
  shipFrom: Address;
  shipTo: Address;
  packageDetails?: PackageDetails;
  options?: ShipmentOptions;
}

interface Address {
  name: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

interface PackageDetails {
  length?: number;
  width?: number;
  height?: number;
  description?: string;
}

interface ShipmentOptions {
  signature?: boolean;
  insurance?: number;
  referenceNumber?: string;
}
```

### TrackingEvent Model

```typescript
interface TrackingEvent {
  type: string;
  location: string;
  timestamp: string;
  details: string | object;
}
```

### ShipmentStatus

```typescript
type ShipmentStatus = 
  | 'label_generated'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'exception';
```

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

- **Default Limit:** 1000 requests per hour per API key
- **Label Generation:** 100 requests per hour
- **Tracking:** 500 requests per hour

When rate limit is exceeded, you'll receive:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}
```

---

## Webhooks

### Tracking Update Webhook

When subscribed to tracking updates, the system will POST to your webhook URL:

```json
{
  "trackingNumber": "1Z999AA10123456784",
  "carrier": "UPS",
  "status": "delivered",
  "event": {
    "type": "delivered",
    "location": "Chicago, IL",
    "timestamp": "2026-02-17T15:30:00Z",
    "details": "Delivered to recipient"
  }
}
```

---

## Best Practices

1. **Authentication:** Always include valid JWT token in requests
2. **Error Handling:** Handle all error codes appropriately
3. **Rate Limiting:** Cache frequently accessed data
4. **Batch Operations:** Use batch endpoints when processing multiple items
5. **Webhooks:** Use webhooks for real-time tracking instead of polling
6. **Security:** Never expose API credentials in frontend code
7. **Testing:** Use mock credentials in development environment

---

## Support

For API support or questions:
- Email: api-support@cigar-order-hub.com
- Documentation: https://docs.cigar-order-hub.com
- GitHub Issues: https://github.com/beeree7-source/cigar-order-hub/issues

---

## Changelog

### Version 1.0.0 (2026-02-15)
- Initial API release
- UPS integration
- USPS integration
- 30+ endpoints
- Real-time tracking
- Analytics and reporting
