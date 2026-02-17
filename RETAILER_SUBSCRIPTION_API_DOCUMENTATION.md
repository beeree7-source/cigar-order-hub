# Retailer Subscription Management System - API Documentation

## Overview

The Retailer Subscription Management System provides a complete, production-ready solution for managing subscription tiers, features, usage tracking, billing, and add-ons for retailers.

## Base URL

```
http://localhost:4000/api
```

## Authentication

Most endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Subscription Tiers

### Get All Available Tiers

Retrieve all available subscription tiers with feature comparison.

**Endpoint:** `GET /retailer-subscription/tiers`

**Authentication:** Not required (public endpoint)

**Response:**
```json
{
  "success": true,
  "tiers": [
    {
      "id": 1,
      "tier_code": "FREE",
      "tier_name": "Free Plan",
      "description": "Perfect for getting started...",
      "monthly_price": 0.00,
      "annual_price": 0.00,
      "annual_discount_percent": 0.00,
      "max_locations": 1,
      "max_api_calls_per_month": 0,
      "max_users": 1,
      "metadata": {}
    }
  ],
  "featureComparison": {
    "tiers": [...],
    "features": {...}
  }
}
```

---

## Current Subscription

### Get Current Subscription

Get the authenticated retailer's current subscription with usage and billing info.

**Endpoint:** `GET /retailer-subscription/current`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": 1,
    "retailer_id": 5,
    "tier_id": 2,
    "tier_code": "STARTER",
    "tier_name": "Starter Plan",
    "billing_cycle": "monthly",
    "status": "active",
    "current_period_start": "2026-02-16T12:00:00.000Z",
    "current_period_end": "2026-03-16T12:00:00.000Z",
    "features": [...]
  },
  "usage": {
    "api_calls": {
      "metric": "api_calls",
      "current": 250,
      "limit": 10000,
      "percentage": 2.5,
      "isUnlimited": false
    },
    "locations": {...},
    "users": {...}
  },
  "billing": {
    "subscription": {...},
    "unpaidInvoices": 0,
    "totalOutstanding": 0,
    "paymentMethods": 1,
    "hasDefaultPayment": true
  }
}
```

---

## Subscription Management

### Subscribe to a Tier

Create a new subscription for the authenticated retailer.

**Endpoint:** `POST /retailer-subscription/subscribe`

**Authentication:** Required

**Request Body:**
```json
{
  "tierCode": "STARTER",
  "billingCycle": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription created successfully",
  "subscription": {...}
}
```

### Change Subscription Tier

Upgrade or downgrade to a different tier.

**Endpoint:** `POST /retailer-subscription/change-tier`

**Authentication:** Required

**Request Body:**
```json
{
  "newTierCode": "PROFESSIONAL",
  "reason": "Need more locations"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription tier changed successfully",
  "subscription": {...}
}
```

### Cancel Subscription

Cancel the current subscription.

**Endpoint:** `POST /retailer-subscription/cancel`

**Authentication:** Required

**Request Body:**
```json
{
  "immediate": false,
  "reason": "Switching providers"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription will cancel at end of billing period",
  "subscription": {...}
}
```

### Reactivate Subscription

Reactivate a cancelled subscription.

**Endpoint:** `POST /retailer-subscription/reactivate`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Subscription reactivated successfully",
  "subscription": {...}
}
```

### Get Subscription History

Get history of all subscription changes.

**Endpoint:** `GET /retailer-subscription/history`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": 1,
      "action_type": "upgraded",
      "from_tier_name": "STARTER",
      "to_tier_name": "PROFESSIONAL",
      "created_at": "2026-02-16T12:00:00.000Z",
      "reason": "Need more locations",
      "performed_by_name": "John Doe"
    }
  ]
}
```

---

## Feature Access

### Check Specific Feature Access

Check if retailer has access to a specific feature.

**Endpoint:** `GET /retailer-subscription/features/:featureCode`

**Authentication:** Required

**Example:** `GET /retailer-subscription/features/api_access`

**Response:**
```json
{
  "success": true,
  "hasAccess": true,
  "reason": "Access granted",
  "feature": {
    "id": 5,
    "feature_code": "api_access",
    "feature_name": "API Access",
    "feature_description": "Access to REST API...",
    "metadata": {}
  }
}
```

### Get All Available Features

Get all features available in the retailer's current tier.

**Endpoint:** `GET /retailer-subscription/features`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "features": [...],
  "categorized": {
    "core": [...],
    "analytics": [...],
    "integration": [...],
    "support": [...]
  }
}
```

---

## Usage Tracking

### Get Usage Statistics

Get current usage statistics for all metrics.

**Endpoint:** `GET /retailer-subscription/usage`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "usage": {
    "api_calls": {
      "metric": "api_calls",
      "current": 250,
      "limit": 10000,
      "percentage": 2.5,
      "isUnlimited": false,
      "periodStart": "2026-02-01T00:00:00.000Z",
      "periodEnd": "2026-02-28T23:59:59.000Z"
    },
    "locations": {...},
    "users": {...}
  },
  "alerts": [
    {
      "metric": "api_calls",
      "percentage": 85,
      "current": 8500,
      "limit": 10000,
      "severity": "warning",
      "message": "api_calls usage is at 85% (8500/10000)"
    }
  ]
}
```

### Get Usage History

Get historical usage data for a specific metric.

**Endpoint:** `GET /retailer-subscription/usage/:metricType/history`

**Authentication:** Required

**Query Parameters:**
- `months` (optional): Number of months to look back (default: 6)

**Example:** `GET /retailer-subscription/usage/api_calls/history?months=3`

**Response:**
```json
{
  "success": true,
  "metricType": "api_calls",
  "history": [
    {
      "metric_value": 8500,
      "limit_value": 10000,
      "period_start": "2026-02-01T00:00:00.000Z",
      "period_end": "2026-02-28T23:59:59.000Z",
      "month": "2026-02"
    }
  ]
}
```

---

## Billing

### Get Billing History

Get invoice and payment history.

**Endpoint:** `GET /retailer-subscription/billing/history`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "id": 1,
      "invoice_number": "INV-2026-000001",
      "invoice_type": "subscription",
      "amount": 29.99,
      "tax_amount": 0.00,
      "total_amount": 29.99,
      "currency": "USD",
      "status": "paid",
      "invoice_date": "2026-02-16T12:00:00.000Z",
      "due_date": "2026-02-16T12:00:00.000Z",
      "paid_at": "2026-02-16T12:05:00.000Z",
      "description": "Starter Plan - monthly billing"
    }
  ]
}
```

### Get Specific Invoice

Get details of a specific invoice.

**Endpoint:** `GET /retailer-subscription/billing/invoice/:invoiceId`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "invoice": {...}
}
```

---

## Payment Methods

### Get Payment Methods

Get all payment methods for the retailer.

**Endpoint:** `GET /retailer-subscription/payment-methods`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "paymentMethods": [
    {
      "id": 1,
      "payment_type": "card",
      "is_default": true,
      "card_brand": "visa",
      "card_last4": "4242",
      "card_exp_month": 12,
      "card_exp_year": 2027,
      "billing_name": "John Doe",
      "is_active": true
    }
  ]
}
```

### Add Payment Method

Add a new payment method.

**Endpoint:** `POST /retailer-subscription/payment-methods`

**Authentication:** Required

**Request Body:**
```json
{
  "stripePaymentMethodId": "pm_xxx",
  "cardBrand": "visa",
  "cardLast4": "4242",
  "cardExpMonth": 12,
  "cardExpYear": 2027,
  "billingName": "John Doe",
  "billingEmail": "john@example.com",
  "isDefault": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment method added successfully",
  "paymentMethodId": 2
}
```

### Set Default Payment Method

Set a payment method as the default.

**Endpoint:** `PUT /retailer-subscription/payment-methods/:paymentMethodId/default`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Default payment method updated"
}
```

### Remove Payment Method

Remove (soft delete) a payment method.

**Endpoint:** `DELETE /retailer-subscription/payment-methods/:paymentMethodId`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Payment method removed"
}
```

---

## Locations

### Get All Locations

Get all locations for the retailer.

**Endpoint:** `GET /retailer-subscription/locations`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "locations": [
    {
      "id": 1,
      "location_name": "Main Store",
      "address_line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "is_primary": true,
      "is_active": true
    }
  ]
}
```

### Add Location

Add a new location (subject to tier limits).

**Endpoint:** `POST /retailer-subscription/locations`

**Authentication:** Required

**Request Body:**
```json
{
  "locationName": "Branch Store",
  "addressLine1": "456 Oak Ave",
  "addressLine2": "Suite 200",
  "city": "Brooklyn",
  "state": "NY",
  "postalCode": "11201",
  "country": "USA",
  "phone": "555-0123",
  "email": "branch@example.com",
  "isPrimary": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location added successfully",
  "locationId": 2
}
```

---

## Add-Ons

### Get Available Add-Ons

Get all available add-on services.

**Endpoint:** `GET /retailer-subscription/add-ons`

**Authentication:** Not required (public endpoint)

**Response:**
```json
{
  "success": true,
  "addOns": [
    {
      "id": 1,
      "addon_code": "extra_locations",
      "addon_name": "Additional Locations (5-pack)",
      "description": "Add 5 more locations to your account",
      "monthly_price": 14.99,
      "annual_price": 149.99,
      "is_active": true,
      "metadata": {}
    }
  ]
}
```

### Get Active Add-Ons

Get add-ons currently subscribed by the retailer.

**Endpoint:** `GET /retailer-subscription/add-ons/active`

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "addOns": [
    {
      "id": 1,
      "addon_code": "api_boost",
      "addon_name": "API Call Boost",
      "quantity": 1,
      "status": "active",
      "billing_cycle": "monthly",
      "monthly_price": 19.99
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (no/invalid JWT token)
- `403` - Forbidden (insufficient permissions or limits exceeded)
- `404` - Not Found
- `500` - Internal Server Error

---

## Feature Access Control Example

To protect an endpoint that requires a specific feature:

```javascript
const { requireFeature } = require('./retailer-subscription-controller');

// Only allow access if retailer has 'api_access' feature
app.get('/api/protected/data', 
  authenticateToken, 
  requireFeature('api_access'), 
  (req, res) => {
    // Feature is guaranteed to be available here
    res.json({ data: '...' });
  }
);
```

---

## Usage Tracking Middleware Example

To automatically track API calls:

```javascript
const { trackApiUsage } = require('./retailer-subscription-controller');

// Automatically track and enforce API usage limits
app.use('/api/protected/*', authenticateToken, trackApiUsage());
```

This middleware:
- Tracks each API call
- Enforces usage limits
- Returns 429 status when limit is exceeded
- Adds rate limit headers to responses

---

## Subscription Tiers Overview

| Tier | Monthly | Annual | Locations | API Calls/Month | Users | Key Features |
|------|---------|--------|-----------|-----------------|-------|--------------|
| FREE | $0 | $0 | 1 | None | 1 | Basic ordering & tracking |
| STARTER | $29.99 | $299.99 | 1 | 10,000 | 3 | API access, basic support |
| PROFESSIONAL | $99.99 | $999.99 | Unlimited | 100,000 | 10 | Advanced analytics, priority support |
| ENTERPRISE | $299.99 | $2,999.99 | Unlimited | Unlimited | Unlimited | White glove service, custom features |

---

## Best Practices

1. **Always check feature access** before allowing feature-specific operations
2. **Monitor usage alerts** to notify users when approaching limits
3. **Implement proper error handling** for subscription-related errors
4. **Use transactions** when making multiple related database changes
5. **Log subscription changes** for audit purposes (automatic via SubscriptionHistoryModel)
6. **Test payment flows** thoroughly in sandbox environment before production
7. **Handle webhook events** from payment providers (Stripe, etc.)
8. **Provide clear upgrade paths** when users hit limits

---

## Support

For technical support or questions about the subscription system:
- Email: support@cigarorderhub.com
- Documentation: See SUBSCRIPTION_SETUP_GUIDE.md for setup instructions
