# Supplier API Documentation

Complete reference for supplier management endpoints mounted in `server.js` via `suppliers.js`.

## Base URL
```
http://localhost:4000/api
```

## Authentication
All endpoints require a valid JWT access token:
```
Authorization: Bearer <token>
```

---

## 1) Get Suppliers

**Endpoint:** `GET /api/protected/suppliers`

Returns paginated supplier records with joined metrics from `supplier_metrics`.

### Query Parameters
- `page` (optional, number): default `1`
- `limit` (optional, number): default `20`

### Response
```json
{
  "suppliers": [
    {
      "id": 1,
      "name": "Premium Cigars Inc",
      "email": "supplier@example.com",
      "approved": 1,
      "created_at": "2026-01-01T00:00:00Z",
      "total_orders": 42,
      "on_time_percentage": 97.6,
      "quality_rating": 4.9,
      "total_revenue": 120000,
      "outstanding_balance": 2500,
      "credit_limit": 50000,
      "payment_terms": "Net 30",
      "last_order_date": "2026-02-14"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

---

## 2) Get Supplier Analytics

**Endpoint:** `GET /api/protected/suppliers/:id/analytics`

Returns supplier profile + analytics summary:
- order status breakdown from `orders`
- monthly trend for last 6 months
- top products by stock
- performance metrics fallback defaults

### Response
```json
{
  "supplier": {
    "id": 1,
    "name": "Premium Cigars Inc",
    "email": "supplier@example.com",
    "on_time_percentage": 97.6,
    "quality_rating": 4.9,
    "total_revenue": 120000
  },
  "analytics": {
    "orders": {
      "total_orders": 42,
      "completed_orders": 35,
      "pending_orders": 5,
      "cancelled_orders": 2
    },
    "monthlyTrend": [
      { "month": "2026-02", "order_count": 9 },
      { "month": "2026-01", "order_count": 8 }
    ],
    "topProducts": [
      {
        "id": 10,
        "name": "Premium Cigar A",
        "sku": "SKU-1001",
        "price": 25.99,
        "stock": 150,
        "description": "High quality premium cigar"
      }
    ],
    "performance": {
      "on_time_percentage": 97.6,
      "quality_rating": 4.9,
      "total_revenue": 120000,
      "outstanding_balance": 2500
    }
  }
}
```

---

## 3) Get Supplier Orders

**Endpoint:** `GET /api/protected/suppliers/:id/orders`

Returns paginated orders for the supplier with retailer name/email and parsed `items`.

### Query Parameters
- `status` (optional, string)
- `page` (optional, number): default `1`
- `limit` (optional, number): default `20`

### Response
```json
{
  "orders": [
    {
      "id": 101,
      "retailer_id": 2,
      "supplier_id": 1,
      "retailer_name": "Smoke Shop Downtown",
      "retailer_email": "retailer@example.com",
      "status": "pending",
      "items": [
        { "productId": 1, "quantity": 5 }
      ],
      "created_at": "2026-02-15"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

---

## 4) Get Supplier Balance

**Endpoint:** `GET /api/protected/suppliers/:id/balance`

Returns financial balance fields and recent payment history from `supplier_payments`.

### Response
```json
{
  "balance": {
    "name": "Premium Cigars Inc",
    "email": "supplier@example.com",
    "outstanding_balance": 2500,
    "credit_limit": 50000,
    "payment_terms": "Net 30",
    "available_credit": 47500
  },
  "payments": [
    {
      "id": 1,
      "supplier_id": 1,
      "amount": 1500,
      "payment_method": "bank_transfer",
      "reference_number": "TXN-1001",
      "payment_date": "2026-02-10"
    }
  ]
}
```

---

## 5) Update Supplier Terms

**Endpoint:** `PUT /api/protected/suppliers/:id/terms`

Creates or updates supplier payment terms in `supplier_metrics`.

### Request Body
```json
{
  "credit_limit": 75000,
  "payment_terms": "Net 45"
}
```

### Success Response
```json
{
  "success": true,
  "message": "Payment terms updated successfully"
}
```

### Alternate Success Response
```json
{
  "success": true,
  "message": "Payment terms created successfully"
}
```

---

## Common Errors

```json
{ "error": "Database error" }
```

```json
{ "error": "Supplier not found" }
```

```json
{ "error": "Failed to fetch suppliers" }
```

---

## Quick Test (cURL)

```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r '.token')

curl http://localhost:4000/api/protected/suppliers \
  -H "Authorization: Bearer $TOKEN"
```
