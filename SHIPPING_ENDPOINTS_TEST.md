# Shipping Endpoints Testing Guide - Phase 5

## Overview
Phase 5 adds complete shipping account management and automatic label generation for warehouse fulfillment.

## New Endpoints Added

### 1. Supplier Shipping Account Management

#### POST /api/suppliers/:supplierId/shipping/account
**Add shipping account (UPS or USPS)**

```bash
curl -X POST http://localhost:10000/api/suppliers/1/shipping/account \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier": "UPS",
    "account_number": "1Z123456789",
    "password": "shipping_password",
    "meter_number": "METER123",
    "api_key": "api_key_123"
  }'
```

**Response:**
```json
{
  "message": "UPS account added successfully. Verification pending.",
  "account": {
    "id": 1,
    "carrier": "UPS",
    "account_number_masked": "*****789",
    "status": "pending_verification",
    "connected_at": "2026-02-16T14:00:00Z"
  }
}
```

---

#### GET /api/suppliers/:supplierId/shipping/accounts
**List all shipping accounts for supplier**

```bash
curl http://localhost:10000/api/suppliers/1/shipping/accounts \
  -H "Authorization: Bearer TOKEN"
```

**Response:**
```json
{
  "supplier_id": 1,
  "accounts": [
    {
      "id": 1,
      "carrier": "UPS",
      "status": "active",
      "account_number_masked": "*****789",
      "last_verified": "2026-02-15T10:30:00Z",
      "connected_at": "2026-01-20T08:00:00Z",
      "meter_number": "METER123"
    }
  ],
  "total": 1,
  "active_carriers": ["UPS"]
}
```

---

#### PUT /api/suppliers/:supplierId/shipping/account/:accountId
**Update shipping account credentials**

```bash
curl -X PUT http://localhost:10000/api/suppliers/1/shipping/account/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_number": "1Z987654321",
    "password": "new_password"
  }'
```

---

#### DELETE /api/suppliers/:supplierId/shipping/account/:accountId
**Disconnect shipping account**

```bash
curl -X DELETE http://localhost:10000/api/suppliers/1/shipping/account/1 \
  -H "Authorization: Bearer TOKEN"
```

---

#### POST /api/suppliers/:supplierId/shipping/account/:accountId/verify (Admin Only)
**Admin verifies shipping account connection**

```bash
curl -X POST http://localhost:10000/api/suppliers/1/shipping/account/1/verify \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

### 2. Label Generation & Print Queue

#### POST /api/orders/:orderId/shipping/label/generate
**Generate shipping label (triggered when warehouse marks order as ready_to_ship)**

```bash
curl -X POST http://localhost:10000/api/orders/1/shipping/label/generate \
  -H "Authorization: Bearer WAREHOUSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier": "UPS",
    "service_type": "ground",
    "weight": 2.5
  }'
```

**Response:**
```json
{
  "message": "Shipping label generated successfully",
  "label": {
    "id": 1,
    "order_id": 1,
    "label_id": "LBL-1708108000000",
    "carrier": "UPS",
    "tracking_number": "1Z4A6G9B2C8D5E1F",
    "service_type": "ground",
    "status": "ready_to_print",
    "label_url": "/uploads/labels/label_1_ups.pdf"
  }
}
```

---

#### GET /api/warehouse/shipping-labels/queue
**Get print queue for warehouse staff**

```bash
curl "http://localhost:10000/api/warehouse/shipping-labels/queue?status=ready_to_print&limit=50" \
  -H "Authorization: Bearer WAREHOUSE_TOKEN"
```

**Response:**
```json
{
  "queue": [
    {
      "id": 1,
      "order_id": 1,
      "label_id": "LBL-1708108000000",
      "carrier": "UPS",
      "tracking_number": "1Z4A6G9B2C8D5E1F",
      "service_type": "ground",
      "label_url": "/uploads/labels/label_1_ups.pdf",
      "printer_name": null,
      "status": "ready_to_print",
      "created_by": 1,
      "created_at": "2026-02-16T10:00:00Z",
      "printed_at": null,
      "printed_by": null,
      "retailer_name": "John Doe",
      "printer_status": "Ready"
    }
  ],
  "total": 2,
  "ready_to_print": 2,
  "printed": 0
}
```

---

#### POST /api/warehouse/shipping-labels/:labelId/printed
**Mark label as printed (confirm warehouse printed label)**

```bash
curl -X POST http://localhost:10000/api/warehouse/shipping-labels/1/printed \
  -H "Authorization: Bearer WAREHOUSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "printer_name": "Thermal Printer 1"
  }'
```

**Response:**
```json
{
  "message": "Label marked as printed",
  "label": {
    "id": 1,
    "order_id": 1,
    "tracking_number": "1Z4A6G9B2C8D5E1F",
    "status": "printed",
    "printed_at": "2026-02-16T14:15:00Z"
  }
}
```

---

#### GET /api/warehouse/shipping-labels/:labelId
**Get label details**

```bash
curl http://localhost:10000/api/warehouse/shipping-labels/1 \
  -H "Authorization: Bearer WAREHOUSE_TOKEN"
```

---

#### GET /api/orders/:orderId/shipping/labels
**Get all labels for an order**

```bash
curl http://localhost:10000/api/orders/1/shipping/labels \
  -H "Authorization: Bearer TOKEN"
```

---

## Test Workflow

### Complete Order Fulfillment Flow:

1. **Retailer places order** → Order created with supplier
2. **Warehouse receives order** → Pick list generated
3. **Warehouse staff picks items** → Items scanned and verified
4. **Warehouse staff packs order** → Order marked as "ready_to_ship"
5. **System generates label** → POST `/api/orders/:orderId/shipping/label/generate`
6. **Label appears in print queue** → GET `/api/warehouse/shipping-labels/queue`
7. **Warehouse staff prints label** → POST `/api/warehouse/shipping-labels/:labelId/printed`
8. **Order ready for pickup** → Carrier collects package with tracking number

---

## Error Scenarios

### Missing Shipping Account
```json
{
  "error": "Supplier does not have an active UPS account. Please add and verify shipping account first."
}
```

### Duplicate Label
```json
{
  "error": "Label already exists for this order"
}
```

### Unauthorized Access
```json
{
  "error": "Not authorized to add accounts for this supplier"
}
```

---

## Mock Data

### Pre-configured Accounts:
- **Supplier 1 (Premium Cigars Inc)**
  - UPS: Active (verified, meter_number: UPS_METER_001)
  - USPS: Active (verified)

- **Print Queue**: 2 ready-to-print labels

---

## Database Schema (Already Created)

### supplier_shipping_accounts
- id, supplier_id, carrier, account_number (encrypted), password (encrypted), meter_number, api_key (encrypted), status, last_verified, connected_at, verified_by, created_at, updated_at
- Unique constraint: (supplier_id, carrier)

### shipment_tracking
- id, order_id, carrier, tracking_number (unique), label_url, label_id, status, current_location, estimated_delivery, actual_delivery, weight, service_type, created_at, updated_at, last_tracked

### shipment_events
- id, tracking_id (FK shipment_tracking), event_type, location, timestamp, details, created_at

---

## Production Integration Notes

- [ ] Replace mock account encryption with real crypto
- [ ] Integrate actual UPS/USPS API calls
- [ ] Set up printer management system
- [ ] Configure webhook handlers for carrier status updates
- [ ] Add rate limiting for label generation (100/hour/supplier)
- [ ] Implement webhook callbacks from carriers for delivery updates
- [ ] Add email notifications for tracking numbers to customers

---

## Security Checklist

✅ Account credentials encrypted (mock: AES-256-CBC)
✅ Supplier ownership validation
✅ Admin-only verification endpoint
✅ JWT authentication on all endpoints
✅ Audit logging for all account changes
✅ Rate limiting configured for critical endpoints

