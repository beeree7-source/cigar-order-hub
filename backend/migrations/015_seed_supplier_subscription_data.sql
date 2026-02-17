-- Seed supplier SaaS tiers and features
-- Created: 2026-02-17

INSERT OR IGNORE INTO supplier_subscription_tiers (
  tier_code, tier_name, description,
  monthly_price, annual_price, annual_discount_percent,
  is_active, max_products, max_retailers, max_team_members, max_api_calls_per_month,
  display_order, metadata
) VALUES
(
  'SUPPLIER_FREE',
  'Free Supplier',
  'Start selling with core catalog and order management tools',
  0.00,
  0.00,
  0.00,
  1, 25, 5, 1, 0,
  1,
  '{"support_level":"community","analytics":"basic"}'
),
(
  'SUPPLIER_STARTER',
  'Starter Supplier',
  'For small suppliers managing a growing product line',
  49.99,
  499.99,
  16.67,
  1, 250, 50, 5, 25000,
  2,
  '{"support_level":"email","analytics":"standard","sla_response_time":"48_hours"}'
),
(
  'SUPPLIER_PRO',
  'Pro Supplier',
  'Scale operations with advanced analytics and larger teams',
  149.99,
  1499.99,
  16.67,
  1, 2000, 500, 20, 150000,
  3,
  '{"support_level":"priority","analytics":"advanced","sla_response_time":"24_hours"}'
),
(
  'SUPPLIER_ENTERPRISE',
  'Enterprise Supplier',
  'Enterprise-grade plan with unlimited growth and premium support',
  399.99,
  3999.99,
  16.67,
  1, -1, -1, -1, -1,
  4,
  '{"support_level":"dedicated","analytics":"enterprise","sla_response_time":"4_hours","account_manager":true}'
);

-- Core features across all tiers
INSERT OR IGNORE INTO supplier_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'catalog_management', 'Catalog Management', 'Manage product catalog and pricing', 1, '{"category":"core"}'
FROM supplier_subscription_tiers;

INSERT OR IGNORE INTO supplier_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'order_management', 'Order Management', 'Manage incoming retailer orders', 1, '{"category":"core"}'
FROM supplier_subscription_tiers;

-- Tier-specific features
INSERT OR IGNORE INTO supplier_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'api_access', 'API Access', 'Programmatic API access for integrations', 1, '{"category":"integration","limit":"25000_per_month"}'
FROM supplier_subscription_tiers WHERE tier_code IN ('SUPPLIER_STARTER', 'SUPPLIER_PRO', 'SUPPLIER_ENTERPRISE');

INSERT OR IGNORE INTO supplier_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'advanced_analytics', 'Advanced Analytics', 'Performance dashboards and retailer insights', 1, '{"category":"analytics"}'
FROM supplier_subscription_tiers WHERE tier_code IN ('SUPPLIER_PRO', 'SUPPLIER_ENTERPRISE');

INSERT OR IGNORE INTO supplier_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'team_roles', 'Team Roles', 'Role-based team permissions', 1, '{"category":"team"}'
FROM supplier_subscription_tiers WHERE tier_code IN ('SUPPLIER_STARTER', 'SUPPLIER_PRO', 'SUPPLIER_ENTERPRISE');

INSERT OR IGNORE INTO supplier_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'dedicated_support', 'Dedicated Support', 'Dedicated account support', 1, '{"category":"support"}'
FROM supplier_subscription_tiers WHERE tier_code = 'SUPPLIER_ENTERPRISE';
