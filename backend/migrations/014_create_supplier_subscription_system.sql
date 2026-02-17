-- Supplier Subscription System
-- Created: 2026-02-17

CREATE TABLE IF NOT EXISTS supplier_subscription_tiers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_code TEXT UNIQUE NOT NULL,
  tier_name TEXT NOT NULL,
  description TEXT,
  monthly_price REAL NOT NULL DEFAULT 0,
  annual_price REAL NOT NULL DEFAULT 0,
  annual_discount_percent REAL NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  max_products INTEGER DEFAULT 0,
  max_retailers INTEGER DEFAULT 0,
  max_team_members INTEGER DEFAULT 1,
  max_api_calls_per_month INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supplier_subscription_tiers_code
  ON supplier_subscription_tiers(tier_code);
CREATE INDEX IF NOT EXISTS idx_supplier_subscription_tiers_active
  ON supplier_subscription_tiers(is_active);

CREATE TABLE IF NOT EXISTS supplier_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL,
  tier_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  current_period_end DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT 0,
  cancelled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(supplier_id) REFERENCES users(id),
  FOREIGN KEY(tier_id) REFERENCES supplier_subscription_tiers(id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_supplier
  ON supplier_subscriptions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_subscriptions_status
  ON supplier_subscriptions(status);

CREATE TABLE IF NOT EXISTS supplier_subscription_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tier_id INTEGER NOT NULL,
  feature_code TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  feature_description TEXT,
  is_enabled BOOLEAN DEFAULT 1,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(tier_id) REFERENCES supplier_subscription_tiers(id) ON DELETE CASCADE,
  UNIQUE(tier_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_supplier_subscription_features_tier
  ON supplier_subscription_features(tier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_subscription_features_code
  ON supplier_subscription_features(feature_code);
