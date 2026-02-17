-- Retailer Subscription Management System
-- Comprehensive migration for production-ready subscription management
-- Created: 2026-02-16

-- ============================================================================
-- 1. RETAILER SUBSCRIPTION TIERS TABLE
-- Stores flexible tier definitions with configurable pricing
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_subscription_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tier_code TEXT UNIQUE NOT NULL, -- 'FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'
    tier_name TEXT NOT NULL,
    description TEXT,
    monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    annual_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    annual_discount_percent DECIMAL(5, 2) DEFAULT 0.00, -- Percentage discount for annual billing
    stripe_monthly_price_id TEXT, -- Stripe price ID for monthly billing
    stripe_annual_price_id TEXT, -- Stripe price ID for annual billing
    is_active BOOLEAN DEFAULT 1,
    max_locations INTEGER DEFAULT 1, -- -1 for unlimited
    max_api_calls_per_month INTEGER DEFAULT 0, -- 0 for no access, -1 for unlimited
    max_users INTEGER DEFAULT 1, -- -1 for unlimited
    display_order INTEGER DEFAULT 0, -- For UI sorting
    metadata TEXT, -- JSON for additional flexible configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_retailer_subscription_tiers_code ON retailer_subscription_tiers(tier_code);
CREATE INDEX IF NOT EXISTS idx_retailer_subscription_tiers_active ON retailer_subscription_tiers(is_active);

-- ============================================================================
-- 2. RETAILER SUBSCRIPTIONS TABLE
-- Tracks active subscriptions per retailer
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retailer_id INTEGER NOT NULL,
    tier_id INTEGER NOT NULL,
    billing_cycle TEXT CHECK(billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly',
    status TEXT CHECK(status IN ('active', 'cancelled', 'expired', 'suspended', 'trial')) DEFAULT 'active',
    trial_ends_at DATETIME, -- For trial periods
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT 0,
    cancelled_at DATETIME,
    stripe_subscription_id TEXT, -- Stripe subscription ID
    stripe_customer_id TEXT, -- Stripe customer ID
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(tier_id) REFERENCES retailer_subscription_tiers(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_retailer_subscriptions_retailer ON retailer_subscriptions(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_subscriptions_status ON retailer_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_retailer_subscriptions_tier ON retailer_subscriptions(tier_id);
CREATE INDEX IF NOT EXISTS idx_retailer_subscriptions_stripe_sub ON retailer_subscriptions(stripe_subscription_id);

-- ============================================================================
-- 3. RETAILER SUBSCRIPTION FEATURES TABLE
-- Maps features to tiers (flexible feature toggling)
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_subscription_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tier_id INTEGER NOT NULL,
    feature_code TEXT NOT NULL, -- 'api_access', 'advanced_analytics', 'priority_support', etc.
    feature_name TEXT NOT NULL,
    feature_description TEXT,
    is_enabled BOOLEAN DEFAULT 1,
    metadata TEXT, -- JSON for feature-specific configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tier_id) REFERENCES retailer_subscription_tiers(id) ON DELETE CASCADE,
    UNIQUE(tier_id, feature_code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retailer_subscription_features_tier ON retailer_subscription_features(tier_id);
CREATE INDEX IF NOT EXISTS idx_retailer_subscription_features_code ON retailer_subscription_features(feature_code);

-- ============================================================================
-- 4. RETAILER LOCATIONS TABLE
-- Store retailer location data
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retailer_id INTEGER NOT NULL,
    location_name TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'USA',
    phone TEXT,
    email TEXT,
    is_primary BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    metadata TEXT, -- JSON for additional location data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retailer_locations_retailer ON retailer_locations(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_locations_active ON retailer_locations(is_active);

-- ============================================================================
-- 5. RETAILER ADD-ONS TABLE
-- Define add-on services with configurable pricing
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_add_ons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    addon_code TEXT UNIQUE NOT NULL, -- 'extra_locations', 'api_boost', 'dedicated_support', etc.
    addon_name TEXT NOT NULL,
    description TEXT,
    monthly_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    annual_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stripe_monthly_price_id TEXT,
    stripe_annual_price_id TEXT,
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT, -- JSON for add-on configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_retailer_add_ons_code ON retailer_add_ons(addon_code);
CREATE INDEX IF NOT EXISTS idx_retailer_add_ons_active ON retailer_add_ons(is_active);

-- ============================================================================
-- 6. RETAILER ACTIVE ADD-ONS TABLE
-- Track active add-ons per retailer
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_active_add_ons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retailer_id INTEGER NOT NULL,
    addon_id INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL, -- Link to main subscription
    quantity INTEGER DEFAULT 1, -- For add-ons that can be purchased multiple times
    billing_cycle TEXT CHECK(billing_cycle IN ('monthly', 'annual')) DEFAULT 'monthly',
    status TEXT CHECK(status IN ('active', 'cancelled', 'expired')) DEFAULT 'active',
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    stripe_subscription_item_id TEXT, -- Stripe subscription item ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(addon_id) REFERENCES retailer_add_ons(id) ON DELETE CASCADE,
    FOREIGN KEY(subscription_id) REFERENCES retailer_subscriptions(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retailer_active_add_ons_retailer ON retailer_active_add_ons(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_active_add_ons_addon ON retailer_active_add_ons(addon_id);
CREATE INDEX IF NOT EXISTS idx_retailer_active_add_ons_subscription ON retailer_active_add_ons(subscription_id);

-- ============================================================================
-- 7. RETAILER BILLING HISTORY TABLE
-- Track invoices and payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_billing_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retailer_id INTEGER NOT NULL,
    subscription_id INTEGER,
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_type TEXT CHECK(invoice_type IN ('subscription', 'add_on', 'one_time', 'refund')) DEFAULT 'subscription',
    amount DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT CHECK(status IN ('draft', 'pending', 'paid', 'failed', 'refunded', 'voided')) DEFAULT 'pending',
    payment_method TEXT, -- 'card', 'bank_transfer', 'check', etc.
    stripe_invoice_id TEXT,
    stripe_payment_intent_id TEXT,
    invoice_date DATETIME NOT NULL,
    due_date DATETIME,
    paid_at DATETIME,
    description TEXT,
    metadata TEXT, -- JSON for additional billing data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(subscription_id) REFERENCES retailer_subscriptions(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retailer_billing_history_retailer ON retailer_billing_history(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_billing_history_subscription ON retailer_billing_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_retailer_billing_history_status ON retailer_billing_history(status);
CREATE INDEX IF NOT EXISTS idx_retailer_billing_history_invoice_number ON retailer_billing_history(invoice_number);

-- ============================================================================
-- 8. RETAILER PAYMENT METHODS TABLE
-- Secure payment method storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retailer_id INTEGER NOT NULL,
    payment_type TEXT CHECK(payment_type IN ('card', 'bank_account', 'paypal')) DEFAULT 'card',
    is_default BOOLEAN DEFAULT 0,
    stripe_payment_method_id TEXT,
    -- Card details (last 4 digits only for security)
    card_brand TEXT, -- 'visa', 'mastercard', 'amex', etc.
    card_last4 TEXT,
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    -- Bank account details (last 4 only)
    bank_name TEXT,
    bank_last4 TEXT,
    bank_account_type TEXT, -- 'checking', 'savings'
    -- General
    billing_name TEXT,
    billing_email TEXT,
    billing_address TEXT, -- JSON for full address
    is_active BOOLEAN DEFAULT 1,
    metadata TEXT, -- JSON for additional payment method data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retailer_payment_methods_retailer ON retailer_payment_methods(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_payment_methods_default ON retailer_payment_methods(is_default);

-- ============================================================================
-- 9. RETAILER USAGE TRACKING TABLE
-- Monitor usage against tier limits
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_usage_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retailer_id INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL,
    metric_type TEXT NOT NULL, -- 'api_calls', 'storage', 'users', 'locations', etc.
    metric_value INTEGER NOT NULL DEFAULT 0,
    period_start DATETIME NOT NULL,
    period_end DATETIME NOT NULL,
    limit_value INTEGER, -- Current limit from tier
    metadata TEXT, -- JSON for detailed usage breakdown
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(subscription_id) REFERENCES retailer_subscriptions(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retailer_usage_tracking_retailer ON retailer_usage_tracking(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_usage_tracking_subscription ON retailer_usage_tracking(subscription_id);
CREATE INDEX IF NOT EXISTS idx_retailer_usage_tracking_metric ON retailer_usage_tracking(metric_type);
CREATE INDEX IF NOT EXISTS idx_retailer_usage_tracking_period ON retailer_usage_tracking(period_start, period_end);

-- ============================================================================
-- 10. RETAILER SUBSCRIPTION HISTORY TABLE
-- Audit trail of subscription changes
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer_subscription_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    retailer_id INTEGER NOT NULL,
    subscription_id INTEGER,
    action_type TEXT CHECK(action_type IN ('created', 'upgraded', 'downgraded', 'cancelled', 'reactivated', 'expired', 'suspended', 'resumed', 'trial_started', 'trial_ended')) NOT NULL,
    from_tier_id INTEGER,
    to_tier_id INTEGER,
    from_billing_cycle TEXT,
    to_billing_cycle TEXT,
    reason TEXT,
    performed_by INTEGER, -- User ID who performed the action (admin or retailer)
    metadata TEXT, -- JSON for additional change data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(retailer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(subscription_id) REFERENCES retailer_subscriptions(id) ON DELETE SET NULL,
    FOREIGN KEY(from_tier_id) REFERENCES retailer_subscription_tiers(id),
    FOREIGN KEY(to_tier_id) REFERENCES retailer_subscription_tiers(id),
    FOREIGN KEY(performed_by) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_retailer_subscription_history_retailer ON retailer_subscription_history(retailer_id);
CREATE INDEX IF NOT EXISTS idx_retailer_subscription_history_subscription ON retailer_subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_retailer_subscription_history_action ON retailer_subscription_history(action_type);
CREATE INDEX IF NOT EXISTS idx_retailer_subscription_history_created ON retailer_subscription_history(created_at);
