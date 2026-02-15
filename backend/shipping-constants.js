/**
 * Shipping Integration Constants
 * Shared constants for shipping operations
 */

// Tracking number validation patterns
const TRACKING_PATTERNS = {
  UPS: /^1Z[A-Z0-9]{16}$/,
  USPS: /^9\d{19,21}$/
};

// Service types by carrier
const SERVICE_TYPES = {
  UPS: [
    'ground',
    'express',
    'next_day_air',
    '2nd_day_air',
    'worldwide_express'
  ],
  USPS: [
    'priority_mail',
    'priority_mail_express',
    'first_class',
    'ground_advantage',
    'retail_ground'
  ]
};

// Shipment status values
const SHIPMENT_STATUS = [
  'label_generated',
  'picked_up',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'exception'
];

// Carrier account status values
const ACCOUNT_STATUS = [
  'active',
  'inactive',
  'expired',
  'pending_verification'
];

// Rate limits
const RATE_LIMITS = {
  LABEL_GENERATION: 100,  // per hour per supplier
  TRACKING_REQUESTS: 500,  // per hour per supplier
  ACCOUNT_OPERATIONS: 50   // per hour per supplier
};

// Estimated delivery days by service type
const DELIVERY_DAYS = {
  'ground': 5,
  'express': 2,
  'next_day_air': 1,
  '2nd_day_air': 2,
  'priority_mail': 3,
  'priority_mail_express': 2,
  'first_class': 5,
  'ground_advantage': 5,
  'retail_ground': 7,
  'worldwide_express': 3
};

// Cost multipliers by service type (relative to base)
const SERVICE_COST_MULTIPLIERS = {
  'ground': 1.0,
  'express': 1.5,
  'next_day_air': 2.5,
  '2nd_day_air': 1.8,
  'priority_mail': 1.2,
  'priority_mail_express': 1.7,
  'first_class': 0.8,
  'ground_advantage': 0.9,
  'retail_ground': 1.0,
  'worldwide_express': 3.0
};

module.exports = {
  TRACKING_PATTERNS,
  SERVICE_TYPES,
  SHIPMENT_STATUS,
  ACCOUNT_STATUS,
  RATE_LIMITS,
  DELIVERY_DAYS,
  SERVICE_COST_MULTIPLIERS
};
