-- Seed data for Retailer Subscription Management System
-- Default tiers, features, and add-ons
-- Created: 2026-02-16

-- ============================================================================
-- SEED SUBSCRIPTION TIERS
-- ============================================================================

-- FREE Tier
INSERT INTO retailer_subscription_tiers (
    tier_code, tier_name, description, 
    monthly_price, annual_price, annual_discount_percent,
    is_active, max_locations, max_api_calls_per_month, max_users, display_order,
    metadata
) VALUES (
    'FREE',
    'Free Plan',
    'Perfect for getting started with basic order management and tracking',
    0.00,
    0.00,
    0.00,
    1,
    1, -- Single location
    0, -- No API access
    1, -- Single user
    1,
    '{"support_level": "community", "onboarding": "self_service", "sla_response_time": "none"}'
);

-- STARTER Tier
INSERT INTO retailer_subscription_tiers (
    tier_code, tier_name, description, 
    monthly_price, annual_price, annual_discount_percent,
    is_active, max_locations, max_api_calls_per_month, max_users, display_order,
    metadata
) VALUES (
    'STARTER',
    'Starter Plan',
    'Ideal for small retailers who need API access and basic support',
    29.99,
    299.99, -- ~17% discount for annual
    16.67,
    1,
    1, -- Single location
    10000, -- 10k API calls per month
    3, -- Up to 3 users
    2,
    '{"support_level": "email", "onboarding": "guided", "sla_response_time": "48_hours", "api_rate_limit": "100_per_minute"}'
);

-- PROFESSIONAL Tier
INSERT INTO retailer_subscription_tiers (
    tier_code, tier_name, description, 
    monthly_price, annual_price, annual_discount_percent,
    is_active, max_locations, max_api_calls_per_month, max_users, display_order,
    metadata
) VALUES (
    'PROFESSIONAL',
    'Professional Plan',
    'For growing businesses with multiple locations and advanced needs',
    99.99,
    999.99, -- ~17% discount for annual
    16.67,
    1,
    -1, -- Unlimited locations
    100000, -- 100k API calls per month
    10, -- Up to 10 users
    3,
    '{"support_level": "priority", "onboarding": "dedicated", "sla_response_time": "24_hours", "api_rate_limit": "500_per_minute", "advanced_analytics": true, "custom_reports": true}'
);

-- ENTERPRISE Tier
INSERT INTO retailer_subscription_tiers (
    tier_code, tier_name, description, 
    monthly_price, annual_price, annual_discount_percent,
    is_active, max_locations, max_api_calls_per_month, max_users, display_order,
    metadata
) VALUES (
    'ENTERPRISE',
    'Enterprise Plan',
    'Custom solution for large retailers with dedicated support and unlimited access',
    299.99,
    2999.99, -- ~17% discount for annual
    16.67,
    1,
    -1, -- Unlimited locations
    -1, -- Unlimited API calls
    -1, -- Unlimited users
    4,
    '{"support_level": "dedicated", "onboarding": "white_glove", "sla_response_time": "4_hours", "api_rate_limit": "unlimited", "advanced_analytics": true, "custom_reports": true, "custom_integrations": true, "dedicated_account_manager": true, "training_sessions": true}'
);

-- ============================================================================
-- SEED SUBSCRIPTION FEATURES
-- ============================================================================

-- Get tier IDs (these will be auto-incremented, so we need to reference them)
-- In a real migration, we'd use subqueries or handle this programmatically

-- FREE Tier Features
INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'place_orders', 'Place Orders', 'Ability to create and submit orders', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'FREE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'track_orders', 'Track Orders', 'Monitor order status and delivery', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'FREE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'basic_analytics', 'Basic Analytics', 'View basic sales and order statistics', 1, '{"category": "analytics"}'
FROM retailer_subscription_tiers WHERE tier_code = 'FREE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'email_support', 'Email Support', 'Community and email support', 1, '{"category": "support", "response_time": "best_effort"}'
FROM retailer_subscription_tiers WHERE tier_code = 'FREE';

-- STARTER Tier Features (includes all FREE features)
INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'place_orders', 'Place Orders', 'Ability to create and submit orders', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'STARTER';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'track_orders', 'Track Orders', 'Monitor order status and delivery', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'STARTER';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'basic_analytics', 'Basic Analytics', 'View basic sales and order statistics', 1, '{"category": "analytics"}'
FROM retailer_subscription_tiers WHERE tier_code = 'STARTER';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'api_access', 'API Access', 'Access to REST API for integrations', 1, '{"category": "integration", "rate_limit": "10000_per_month"}'
FROM retailer_subscription_tiers WHERE tier_code = 'STARTER';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'basic_support', 'Basic Support', 'Email support with 48-hour response time', 1, '{"category": "support", "response_time": "48_hours"}'
FROM retailer_subscription_tiers WHERE tier_code = 'STARTER';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'multi_user', 'Multi-User Access', 'Up to 3 user accounts', 1, '{"category": "core", "max_users": 3}'
FROM retailer_subscription_tiers WHERE tier_code = 'STARTER';

-- PROFESSIONAL Tier Features (includes all STARTER features + more)
INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'place_orders', 'Place Orders', 'Ability to create and submit orders', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'track_orders', 'Track Orders', 'Monitor order status and delivery', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'basic_analytics', 'Basic Analytics', 'View basic sales and order statistics', 1, '{"category": "analytics"}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'api_access', 'API Access', 'Access to REST API for integrations', 1, '{"category": "integration", "rate_limit": "100000_per_month"}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'advanced_analytics', 'Advanced Analytics', 'Detailed analytics with custom reports and forecasting', 1, '{"category": "analytics", "includes": ["forecasting", "custom_reports", "data_export"]}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'unlimited_locations', 'Unlimited Locations', 'Manage unlimited store locations', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'priority_support', 'Priority Support', 'Priority email and chat support with 24-hour response', 1, '{"category": "support", "response_time": "24_hours", "channels": ["email", "chat"]}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'multi_user', 'Multi-User Access', 'Up to 10 user accounts', 1, '{"category": "core", "max_users": 10}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'inventory_management', 'Inventory Management', 'Advanced inventory tracking and management', 1, '{"category": "operations"}'
FROM retailer_subscription_tiers WHERE tier_code = 'PROFESSIONAL';

-- ENTERPRISE Tier Features (includes all PROFESSIONAL features + more)
INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'place_orders', 'Place Orders', 'Ability to create and submit orders', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'track_orders', 'Track Orders', 'Monitor order status and delivery', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'basic_analytics', 'Basic Analytics', 'View basic sales and order statistics', 1, '{"category": "analytics"}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'api_access', 'API Access', 'Unlimited API access with no rate limits', 1, '{"category": "integration", "rate_limit": "unlimited"}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'advanced_analytics', 'Advanced Analytics', 'Detailed analytics with custom reports and forecasting', 1, '{"category": "analytics", "includes": ["forecasting", "custom_reports", "data_export", "predictive_analytics"]}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'unlimited_locations', 'Unlimited Locations', 'Manage unlimited store locations', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'dedicated_support', 'Dedicated Support', 'Dedicated account manager with 4-hour SLA', 1, '{"category": "support", "response_time": "4_hours", "channels": ["email", "chat", "phone", "dedicated_manager"]}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'unlimited_users', 'Unlimited Users', 'Unlimited user accounts', 1, '{"category": "core"}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'inventory_management', 'Inventory Management', 'Advanced inventory tracking and management', 1, '{"category": "operations"}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'custom_integrations', 'Custom Integrations', 'Custom API integrations and webhooks', 1, '{"category": "integration", "includes": ["webhooks", "custom_endpoints", "white_label"]}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'white_glove_onboarding', 'White Glove Onboarding', 'Personalized onboarding and training', 1, '{"category": "support", "includes": ["dedicated_onboarding", "training_sessions", "documentation"]}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

INSERT INTO retailer_subscription_features (tier_id, feature_code, feature_name, feature_description, is_enabled, metadata)
SELECT id, 'sla_guarantee', 'SLA Guarantee', '99.9% uptime SLA with credit guarantees', 1, '{"category": "support", "uptime": "99.9", "credits": true}'
FROM retailer_subscription_tiers WHERE tier_code = 'ENTERPRISE';

-- ============================================================================
-- SEED ADD-ONS
-- ============================================================================

-- Extra Locations Add-on
INSERT INTO retailer_add_ons (
    addon_code, addon_name, description,
    monthly_price, annual_price, is_active, metadata
) VALUES (
    'extra_locations',
    'Additional Locations (5-pack)',
    'Add 5 more locations to your account',
    14.99,
    149.99,
    1,
    '{"quantity_included": 5, "applicable_tiers": ["STARTER"]}'
);

-- API Boost Add-on
INSERT INTO retailer_add_ons (
    addon_code, addon_name, description,
    monthly_price, annual_price, is_active, metadata
) VALUES (
    'api_boost',
    'API Call Boost',
    'Additional 50,000 API calls per month',
    19.99,
    199.99,
    1,
    '{"api_calls_included": 50000, "applicable_tiers": ["STARTER", "PROFESSIONAL"]}'
);

-- Premium Support Add-on
INSERT INTO retailer_add_ons (
    addon_code, addon_name, description,
    monthly_price, annual_price, is_active, metadata
) VALUES (
    'premium_support',
    'Premium Support Upgrade',
    'Upgrade to priority support with phone access',
    49.99,
    499.99,
    1,
    '{"response_time": "12_hours", "channels": ["email", "chat", "phone"], "applicable_tiers": ["STARTER", "PROFESSIONAL"]}'
);

-- Data Retention Add-on
INSERT INTO retailer_add_ons (
    addon_code, addon_name, description,
    monthly_price, annual_price, is_active, metadata
) VALUES (
    'extended_data_retention',
    'Extended Data Retention',
    'Keep historical data for 5 years instead of 1 year',
    29.99,
    299.99,
    1,
    '{"retention_period_years": 5, "applicable_tiers": ["PROFESSIONAL", "ENTERPRISE"]}'
);

-- Custom Branding Add-on
INSERT INTO retailer_add_ons (
    addon_code, addon_name, description,
    monthly_price, annual_price, is_active, metadata
) VALUES (
    'custom_branding',
    'Custom Branding',
    'White-label the platform with your branding',
    99.99,
    999.99,
    1,
    '{"includes": ["custom_logo", "custom_colors", "custom_domain"], "applicable_tiers": ["PROFESSIONAL", "ENTERPRISE"]}'
);
