# Retailer Subscription Management System - Setup Guide

## Overview

This guide will walk you through setting up and using the Retailer Subscription Management System in the Cigar Order Hub application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Configuration](#configuration)
5. [Testing the System](#testing-the-system)
6. [Integration Guide](#integration-guide)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up the subscription system, ensure you have:

- Node.js v14+ installed
- SQLite3 installed
- Backend dependencies installed (`npm install`)
- Basic understanding of Express.js and JWT authentication

## Installation

The subscription system is already integrated into the backend. No additional packages are required beyond the standard dependencies listed in `package.json`.

### Required Dependencies

All dependencies are already included:
- `sqlite3` - Database
- `express` - Web framework
- `jsonwebtoken` - JWT authentication

## Database Setup

### 1. Initialize the Database

The database schema is managed through migrations. Run the migrations to set up all required tables:

```bash
cd backend
npm run migrate
```

This will create:
- 10 subscription-related tables
- Seed default subscription tiers (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
- Seed 31 features across all tiers
- Seed 5 add-on options

### 2. Verify Database Setup

Check that tables were created successfully:

```bash
sqlite3 cigar-hub.db ".tables" | grep retailer
```

You should see:
```
retailer_active_add_ons
retailer_add_ons
retailer_billing_history
retailer_locations
retailer_payment_methods
retailer_subscription_features
retailer_subscription_history
retailer_subscription_tiers
retailer_subscriptions
retailer_usage_tracking
```

### 3. Verify Seed Data

Check subscription tiers:

```bash
sqlite3 cigar-hub.db "SELECT tier_code, tier_name, monthly_price FROM retailer_subscription_tiers;"
```

Expected output:
```
FREE|Free Plan|0
STARTER|Starter Plan|29.99
PROFESSIONAL|Professional Plan|99.99
ENTERPRISE|Enterprise Plan|299.99
```

## Configuration

### Environment Variables

Add these to your `.env` file (if not already present):

```env
# Stripe Configuration (for payment processing)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_PATH=./cigar-hub.db
```

### Stripe Setup (Optional but Recommended)

1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Dashboard
3. Create Products and Prices in Stripe for each tier
4. Update the `stripe_monthly_price_id` and `stripe_annual_price_id` in the `retailer_subscription_tiers` table

```sql
UPDATE retailer_subscription_tiers 
SET stripe_monthly_price_id = 'price_xxx', 
    stripe_annual_price_id = 'price_yyy'
WHERE tier_code = 'STARTER';
```

## Testing the System

### 1. Start the Server

```bash
cd backend
npm start
```

Server should start on port 4000 (or your configured PORT).

### 2. Test Public Endpoints

Get available tiers (no authentication required):

```bash
curl http://localhost:4000/api/retailer-subscription/tiers
```

Get available add-ons:

```bash
curl http://localhost:4000/api/retailer-subscription/add-ons
```

### 3. Create a Test User

First, register a test retailer user:

```bash
curl -X POST http://localhost:4000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Retailer",
    "email": "test@retailer.com",
    "password": "password123",
    "role": "retailer"
  }'
```

### 4. Login and Get JWT Token

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@retailer.com",
    "password": "password123"
  }'
```

Save the returned JWT token for authenticated requests.

### 5. Subscribe to a Tier

```bash
curl -X POST http://localhost:4000/api/retailer-subscription/subscribe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tierCode": "FREE",
    "billingCycle": "monthly"
  }'
```

### 6. Get Current Subscription

```bash
curl http://localhost:4000/api/retailer-subscription/current \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. Check Feature Access

```bash
curl http://localhost:4000/api/retailer-subscription/features/api_access \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 8. Add a Location

```bash
curl -X POST http://localhost:4000/api/retailer-subscription/locations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "locationName": "Main Store",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "isPrimary": true
  }'
```

## Integration Guide

### Protecting Routes with Feature Access

Use the `requireFeature` middleware to protect routes:

```javascript
const { requireFeature } = require('./retailer-subscription-controller');
const { authenticateToken } = require('./auth');

// Only accessible to users with 'api_access' feature
app.get('/api/protected/advanced-data', 
  authenticateToken,
  requireFeature('api_access'),
  (req, res) => {
    // Your route logic here
    res.json({ data: 'Advanced data' });
  }
);
```

### Tracking API Usage

Use the `trackApiUsage` middleware to automatically track API calls:

```javascript
const { trackApiUsage } = require('./retailer-subscription-controller');

// Track all API calls under /api/protected/
app.use('/api/protected/*', authenticateToken, trackApiUsage());
```

This middleware:
- Increments API call count
- Enforces limits based on subscription tier
- Returns 429 Too Many Requests when limit exceeded
- Adds `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers

### Checking Limits Programmatically

In your service layer, check limits before allowing actions:

```javascript
const FeatureAccessService = require('./services/FeatureAccessService');
const featureService = new FeatureAccessService();

async function addUser(retailerId, userData) {
  // Get current user count
  const currentUsers = await getUserCount(retailerId);
  
  // Check if they can add another user
  const limitCheck = await featureService.checkLimit(
    retailerId, 
    'users', 
    currentUsers
  );
  
  if (!limitCheck.allowed) {
    throw new Error(
      `User limit reached (${limitCheck.current}/${limitCheck.limit}). ` +
      `Please upgrade your plan.`
    );
  }
  
  // Proceed with adding user
  return await createUser(userData);
}
```

### Enforcing Feature Access

Use the feature service to validate access:

```javascript
const FeatureAccessService = require('./services/FeatureAccessService');
const featureService = new FeatureAccessService();

async function exportData(retailerId) {
  // This will throw an error if feature is not available
  await featureService.requireFeature(retailerId, 'advanced_analytics');
  
  // Feature is guaranteed to be available here
  return await generateAdvancedReport();
}
```

### Handling Subscription Changes

Listen for subscription events:

```javascript
const SubscriptionService = require('./services/SubscriptionService');
const subscriptionService = new SubscriptionService();

// When a user upgrades
const subscription = await subscriptionService.changeSubscriptionTier({
  retailerId: userId,
  newTierCode: 'PROFESSIONAL',
  performedBy: userId,
  reason: 'User requested upgrade'
});

// Notify user
await sendUpgradeConfirmationEmail(userId, subscription);
```

## Default Subscription Tiers

### FREE Tier
- **Price:** $0/month
- **Features:**
  - Place orders
  - Track orders
  - Basic analytics
  - Email support (community)
- **Limits:**
  - 1 location
  - 1 user
  - No API access

### STARTER Tier
- **Price:** $29.99/month or $299.99/year
- **Features:**
  - All FREE features
  - API access (10,000 calls/month)
  - Multi-user (up to 3 users)
  - Basic support (48-hour response)
- **Limits:**
  - 1 location
  - 3 users
  - 10,000 API calls/month

### PROFESSIONAL Tier
- **Price:** $99.99/month or $999.99/year
- **Features:**
  - All STARTER features
  - Unlimited locations
  - Advanced analytics
  - Priority support (24-hour response)
  - Inventory management
  - Custom reports
- **Limits:**
  - Unlimited locations
  - 10 users
  - 100,000 API calls/month

### ENTERPRISE Tier
- **Price:** $299.99/month or $2,999.99/year
- **Features:**
  - All PROFESSIONAL features
  - Unlimited everything
  - Dedicated support (4-hour SLA)
  - White glove onboarding
  - Custom integrations
  - Training sessions
  - 99.9% uptime SLA
- **Limits:**
  - Unlimited locations
  - Unlimited users
  - Unlimited API calls

## Available Add-Ons

1. **Additional Locations (5-pack)** - $14.99/month
   - Add 5 more locations to STARTER tier
   
2. **API Call Boost** - $19.99/month
   - Add 50,000 API calls/month
   
3. **Premium Support Upgrade** - $49.99/month
   - Upgrade to priority support with phone access
   
4. **Extended Data Retention** - $29.99/month
   - Keep data for 5 years instead of 1 year
   
5. **Custom Branding** - $99.99/month
   - White-label with custom logo, colors, and domain

## Troubleshooting

### Issue: Migrations fail with "no such table: users"

**Solution:** Run `node database.js` first to create base tables, then run migrations.

```bash
node database.js
npm run migrate
```

### Issue: "Module not found" errors

**Solution:** Install dependencies:

```bash
npm install
```

### Issue: Feature access always returns false

**Solution:** Ensure the user has an active subscription:

1. Check subscription status in database
2. Verify subscription hasn't expired
3. Ensure features are seeded for the tier

```sql
SELECT * FROM retailer_subscriptions WHERE retailer_id = YOUR_USER_ID;
SELECT * FROM retailer_subscription_features WHERE tier_id = YOUR_TIER_ID;
```

### Issue: Usage tracking not working

**Solution:** Ensure usage tracking records exist:

```sql
SELECT * FROM retailer_usage_tracking WHERE retailer_id = YOUR_USER_ID;
```

If missing, create a subscription which will auto-initialize usage tracking.

### Issue: Cannot add location - "limit reached"

**Solution:** Check current tier limits:

```sql
SELECT rst.max_locations, COUNT(rl.id) as current_locations
FROM retailer_subscriptions rs
JOIN retailer_subscription_tiers rst ON rs.tier_id = rst.id
LEFT JOIN retailer_locations rl ON rs.retailer_id = rl.retailer_id AND rl.is_active = 1
WHERE rs.retailer_id = YOUR_USER_ID
GROUP BY rst.max_locations;
```

Upgrade to a tier with higher limits if needed.

## Advanced Configuration

### Custom Features

To add custom features to existing tiers:

```sql
INSERT INTO retailer_subscription_features (
  tier_id, feature_code, feature_name, feature_description, is_enabled, metadata
) 
SELECT id, 'custom_feature', 'Custom Feature', 'Description here', 1, '{}'
FROM retailer_subscription_tiers 
WHERE tier_code = 'ENTERPRISE';
```

### Adjusting Pricing

Update tier pricing:

```sql
UPDATE retailer_subscription_tiers 
SET monthly_price = 39.99, annual_price = 399.99
WHERE tier_code = 'STARTER';
```

### Creating Custom Tiers

Add a new tier:

```sql
INSERT INTO retailer_subscription_tiers (
  tier_code, tier_name, description,
  monthly_price, annual_price,
  max_locations, max_api_calls_per_month, max_users,
  display_order, is_active
) VALUES (
  'CUSTOM', 'Custom Plan', 'Custom plan description',
  199.99, 1999.99,
  5, 50000, 20,
  5, 1
);
```

## Production Deployment Checklist

- [ ] Environment variables configured (Stripe keys, etc.)
- [ ] Database backed up before migration
- [ ] Migrations run successfully
- [ ] Seed data verified
- [ ] Stripe webhooks configured
- [ ] Email notifications configured
- [ ] Error logging and monitoring set up
- [ ] Rate limiting configured
- [ ] SSL/TLS enabled
- [ ] Payment method security reviewed
- [ ] GDPR compliance verified
- [ ] Terms of service and privacy policy updated

## Support and Documentation

- **API Documentation:** See `RETAILER_SUBSCRIPTION_API_DOCUMENTATION.md`
- **Model Documentation:** See code comments in `backend/models/SubscriptionModels.js`
- **Service Documentation:** See code comments in `backend/services/`
- **Migration Files:** See `backend/migrations/012_*.sql` and `013_*.sql`

## Next Steps

1. Integrate payment processing with Stripe
2. Set up webhook handlers for Stripe events
3. Implement email notifications for subscription events
4. Create admin dashboard for managing subscriptions
5. Set up cron jobs for:
   - Processing subscription renewals
   - Checking for expired subscriptions
   - Resetting monthly usage metrics
   - Sending usage alerts

For questions or issues, please contact the development team or refer to the API documentation.
