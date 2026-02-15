# Shipping Integration Setup Guide

## Overview
This guide will walk you through setting up the complete UPS and USPS shipping integration system for the Cigar Order Hub platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [UPS Account Setup](#ups-account-setup)
5. [USPS Account Setup](#usps-account-setup)
6. [Testing the Integration](#testing-the-integration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- **UPS Account**: You need a UPS account with API access
  - Account Number
  - User ID / Username
  - Password
  - Meter Number (for label generation)
  - API Access Key

- **USPS Account**: You need a USPS Web Tools account
  - User ID
  - API Key / Password
  - Account Number

### Software Requirements
- Node.js 14.x or higher
- SQLite3
- Active backend server

## Environment Configuration

### Step 1: Configure Environment Variables

Add the following variables to your `.env` file in the `backend` directory:

```bash
# UPS Integration
UPS_ENABLED=true
UPS_ACCOUNT_NUMBER=your_ups_account_number
UPS_USER_ID=your_ups_user_id
UPS_PASSWORD=your_ups_password
UPS_METER_NUMBER=your_ups_meter_number
UPS_API_URL=https://onlinetools.ups.com/ship/v1
UPS_TRACK_URL=https://onlinetools.ups.com/track/v1

# USPS Integration
USPS_ENABLED=true
USPS_USER_ID=your_usps_user_id
USPS_API_KEY=your_usps_api_key
USPS_API_URL=https://secure.shippingapis.com

# Encryption for Shipping Credentials
ENCRYPTION_KEY=your-secure-32-character-encryption-key-here
ENCRYPTION_ALGORITHM=aes-256-cbc
```

### Step 2: Generate Encryption Key

The encryption key is used to securely store supplier credentials in the database. Generate a secure 32-character key:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using OpenSSL
openssl rand -hex 32
```

Update the `ENCRYPTION_KEY` in your `.env` file with the generated key.

## Database Setup

### Step 1: Run Database Migrations

The shipping integration requires three new database tables. Run the migration:

```bash
cd backend
npm run migrate
```

This will create:
- `supplier_shipping_accounts` - Stores carrier account credentials
- `shipment_tracking` - Stores shipment and tracking information
- `shipment_events` - Stores tracking event history

### Step 2: Verify Tables Created

Connect to your SQLite database and verify the tables:

```bash
sqlite3 backend/cigar-hub.db ".tables"
```

You should see:
- supplier_shipping_accounts
- shipment_tracking
- shipment_events

## UPS Account Setup

### Step 1: Obtain UPS API Credentials

1. Go to [UPS Developer Portal](https://www.ups.com/upsdeveloperkit)
2. Register for a developer account
3. Create a new application
4. Note down your credentials:
   - Account Number
   - User ID
   - Password
   - Meter Number
   - API Access Key

### Step 2: Configure UPS in Platform

For **development/testing**, you can use the mock implementation that's already built-in.

For **production**, update the UPS API endpoints in your environment:

```bash
# Production UPS endpoints
UPS_API_URL=https://onlinetools.ups.com/ship/v1
UPS_TRACK_URL=https://onlinetools.ups.com/track/v1
```

### Step 3: Link UPS Account for a Supplier

Use the API to link a supplier's UPS account:

```bash
POST /api/suppliers/:supplierId/shipping/ups/connect
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "accountNumber": "YOUR_UPS_ACCOUNT",
  "userId": "YOUR_UPS_USER_ID",
  "password": "YOUR_UPS_PASSWORD",
  "meterNumber": "YOUR_UPS_METER",
  "apiKey": "YOUR_UPS_API_KEY"
}
```

### Step 4: Verify UPS Connection

```bash
GET /api/suppliers/:supplierId/shipping/ups/status
Authorization: Bearer <jwt_token>
```

Expected response:
```json
{
  "connected": true,
  "carrier": "UPS",
  "accountNumber": "******123",
  "status": "active",
  "lastVerified": "2026-02-15T21:00:00Z"
}
```

## USPS Account Setup

### Step 1: Obtain USPS API Credentials

1. Go to [USPS Web Tools](https://www.usps.com/business/web-tools-apis/)
2. Register for a Web Tools account
3. Request production access (initially you'll have test credentials)
4. Note down your credentials:
   - User ID
   - API Key
   - Account Number

### Step 2: Configure USPS in Platform

For **development/testing**, the mock implementation is ready to use.

For **production**, ensure your environment variables are set:

```bash
USPS_API_URL=https://secure.shippingapis.com
```

### Step 3: Link USPS Account for a Supplier

```bash
POST /api/suppliers/:supplierId/shipping/usps/connect
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "accountNumber": "YOUR_USPS_ACCOUNT",
  "userId": "YOUR_USPS_USER_ID",
  "apiKey": "YOUR_USPS_API_KEY"
}
```

### Step 4: Verify USPS Connection

```bash
GET /api/suppliers/:supplierId/shipping/usps/status
Authorization: Bearer <jwt_token>
```

## Testing the Integration

### Test 1: Generate a UPS Label

```bash
POST /api/suppliers/:supplierId/shipping/labels/ups
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "orderId": 123,
  "weight": 2.5,
  "serviceType": "ground",
  "shipFrom": {
    "name": "Test Supplier",
    "address": "123 Main St",
    "city": "Louisville",
    "state": "KY",
    "postalCode": "40202",
    "country": "US"
  },
  "shipTo": {
    "name": "Test Customer",
    "address": "456 Oak Ave",
    "city": "Chicago",
    "state": "IL",
    "postalCode": "60601",
    "country": "US"
  }
}
```

### Test 2: Track a Shipment

```bash
GET /api/shipping/track/:trackingNumber
Authorization: Bearer <jwt_token>
```

### Test 3: Generate Cost Estimate

```bash
POST /api/shipping/estimate-cost
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "carrier": "UPS",
  "weight": 2.5,
  "serviceType": "ground",
  "origin": "40202",
  "destination": "60601"
}
```

### Test 4: View Shipping Analytics

```bash
GET /api/suppliers/:supplierId/shipping/analytics
Authorization: Bearer <jwt_token>
```

## Advanced Features

### Batch Label Generation

Generate labels for multiple shipments at once:

```bash
POST /api/shipping/labels/batch-generate
Authorization: Bearer <jwt_token>
Content-Type: application/json

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

### Schedule Pickup

Schedule a pickup with the carrier:

```bash
POST /api/suppliers/:supplierId/shipping/shipments/pickup/schedule
Authorization: Bearer <jwt_token>
Content-Type: application/json

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
  "trackingNumbers": ["1Z123...", "1Z456..."]
}
```

### Real-Time Tracking Updates

Subscribe to real-time tracking updates:

```bash
POST /api/shipping/track/:trackingNumber/subscribe
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "webhookUrl": "https://your-domain.com/webhook/tracking",
  "email": "notifications@your-company.com"
}
```

## Troubleshooting

### Issue: "Invalid UPS credentials"

**Solution:**
1. Verify your UPS credentials in the UPS Developer Portal
2. Ensure the account has API access enabled
3. Check that the meter number matches your account
4. For production, ensure you're using production credentials (not test)

### Issue: "Failed to encrypt data"

**Solution:**
1. Verify the `ENCRYPTION_KEY` is set in your `.env` file
2. Ensure the key is exactly 32 characters (for AES-256)
3. Restart the backend server after updating environment variables

### Issue: "Tracking number not found"

**Solution:**
1. Verify the tracking number is correct
2. Allow 24-48 hours for tracking to become active after label generation
3. Check that the shipment was actually picked up by the carrier

### Issue: "Database tables not found"

**Solution:**
1. Run the migration: `npm run migrate`
2. Verify the migration file exists: `backend/migrations/006_create_shipping_tables.sql`
3. Check database file permissions

### Issue: "Rate limit exceeded"

**Solution:**
1. Implement rate limiting on your API calls
2. Cache tracking data for frequently checked shipments
3. Use batch operations when possible
4. Contact carrier support to increase API limits

## Security Best Practices

### 1. Credential Storage
- ✅ All credentials are encrypted using AES-256
- ✅ Encryption keys are stored in environment variables
- ✅ Never commit credentials to version control

### 2. API Access
- ✅ All endpoints require JWT authentication
- ✅ Verify supplier ownership before accessing accounts
- ✅ Use HTTPS in production
- ✅ Implement rate limiting

### 3. Data Protection
- ✅ Mask sensitive data in logs
- ✅ Use secure connections to carrier APIs
- ✅ Regularly rotate encryption keys
- ✅ Audit all access to shipping accounts

## Production Deployment Checklist

- [ ] Update all environment variables with production values
- [ ] Generate a secure encryption key (32+ characters)
- [ ] Configure production UPS API credentials
- [ ] Configure production USPS API credentials
- [ ] Run database migrations
- [ ] Test account connection for each carrier
- [ ] Test label generation
- [ ] Test tracking functionality
- [ ] Set up monitoring and alerting
- [ ] Configure backup for shipping data
- [ ] Review security settings
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure error logging

## Support and Resources

### UPS Resources
- [UPS Developer Portal](https://www.ups.com/upsdeveloperkit)
- [UPS API Documentation](https://www.ups.com/upsdeveloperkit/downloadresource)
- UPS Support: 1-800-742-5877

### USPS Resources
- [USPS Web Tools](https://www.usps.com/business/web-tools-apis/)
- [USPS API Documentation](https://www.usps.com/business/web-tools-apis/documentation-updates.htm)
- USPS Support: 1-800-344-7779

### Platform Support
For issues with the Cigar Order Hub shipping integration:
1. Check this setup guide
2. Review the API documentation (SHIPPING_API_DOCUMENTATION.md)
3. Check server logs for detailed error messages
4. Contact your platform administrator

## Next Steps

After completing the setup:
1. Review the [Shipping API Documentation](SHIPPING_API_DOCUMENTATION.md)
2. Read the [Implementation Summary](SHIPPING_IMPLEMENTATION_SUMMARY.md)
3. Integrate shipping features into your frontend application
4. Set up monitoring and alerts for shipping operations
5. Train your team on using the shipping features

## Changelog

### Version 1.0.0 (2026-02-15)
- Initial release
- UPS integration support
- USPS integration support
- Label generation
- Real-time tracking
- Analytics and reporting
- Batch operations
- Cost estimation
