/**
 * Retailer Subscription Models
 * Model classes for all subscription-related tables
 */

const BaseModel = require('./BaseModel');

/**
 * SubscriptionTier Model
 * Manages subscription tier definitions
 */
class SubscriptionTierModel extends BaseModel {
  constructor() {
    super('retailer_subscription_tiers');
  }

  /**
   * Get tier by code
   * @param {string} code - Tier code (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
   * @returns {Promise<Object|null>}
   */
  async findByCode(code) {
    return this.findByField('tier_code', code);
  }

  /**
   * Get all active tiers ordered by display order
   * @returns {Promise<Array>}
   */
  async getActiveTiers() {
    return this.findAll({ is_active: 1 }, { orderBy: 'display_order ASC' });
  }

  /**
   * Get tier with features
   * @param {number} tierId - Tier ID
   * @returns {Promise<Object|null>}
   */
  async getTierWithFeatures(tierId) {
    const query = `
      SELECT 
        t.*,
        json_group_array(
          json_object(
            'id', f.id,
            'feature_code', f.feature_code,
            'feature_name', f.feature_name,
            'feature_description', f.feature_description,
            'is_enabled', f.is_enabled,
            'metadata', f.metadata
          )
        ) as features
      FROM retailer_subscription_tiers t
      LEFT JOIN retailer_subscription_features f ON t.id = f.tier_id AND f.is_enabled = 1
      WHERE t.id = ?
      GROUP BY t.id
    `;
    return this.queryOne(query, [tierId]);
  }
}

/**
 * Subscription Model
 * Manages retailer subscriptions
 */
class SubscriptionModel extends BaseModel {
  constructor() {
    super('retailer_subscriptions');
  }

  /**
   * Get active subscription for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Object|null>}
   */
  async getActiveSubscription(retailerId) {
    const query = `
      SELECT 
        s.*,
        t.tier_code,
        t.tier_name,
        t.monthly_price,
        t.annual_price,
        t.max_locations,
        t.max_api_calls_per_month,
        t.max_users
      FROM retailer_subscriptions s
      JOIN retailer_subscription_tiers t ON s.tier_id = t.id
      WHERE s.retailer_id = ? AND s.status = 'active'
      ORDER BY s.created_at DESC
      LIMIT 1
    `;
    return this.queryOne(query, [retailerId]);
  }

  /**
   * Get subscription with tier details
   * @param {number} subscriptionId - Subscription ID
   * @returns {Promise<Object|null>}
   */
  async getSubscriptionWithTier(subscriptionId) {
    const query = `
      SELECT 
        s.*,
        t.*,
        t.id as tier_id
      FROM retailer_subscriptions s
      JOIN retailer_subscription_tiers t ON s.tier_id = t.id
      WHERE s.id = ?
    `;
    return this.queryOne(query, [subscriptionId]);
  }

  /**
   * Cancel subscription at period end
   * @param {number} subscriptionId - Subscription ID
   * @returns {Promise<number>}
   */
  async cancelAtPeriodEnd(subscriptionId) {
    return this.update(subscriptionId, {
      cancel_at_period_end: 1,
      cancelled_at: new Date().toISOString()
    });
  }

  /**
   * Get subscriptions expiring soon
   * @param {number} daysAhead - Number of days to look ahead
   * @returns {Promise<Array>}
   */
  async getExpiringSubscriptions(daysAhead = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const query = `
      SELECT 
        s.*,
        t.tier_name,
        u.email,
        u.name as retailer_name
      FROM retailer_subscriptions s
      JOIN retailer_subscription_tiers t ON s.tier_id = t.id
      JOIN users u ON s.retailer_id = u.id
      WHERE s.status = 'active'
        AND s.current_period_end <= ?
        AND s.cancel_at_period_end = 0
    `;
    return this.query(query, [futureDate.toISOString()]);
  }
}

/**
 * SubscriptionFeature Model
 * Manages features available in each tier
 */
class SubscriptionFeatureModel extends BaseModel {
  constructor() {
    super('retailer_subscription_features');
  }

  /**
   * Get all features for a tier
   * @param {number} tierId - Tier ID
   * @returns {Promise<Array>}
   */
  async getFeaturesForTier(tierId) {
    return this.findAll({ tier_id: tierId, is_enabled: 1 });
  }

  /**
   * Check if a feature is enabled for a tier
   * @param {number} tierId - Tier ID
   * @param {string} featureCode - Feature code
   * @returns {Promise<boolean>}
   */
  async isFeatureEnabled(tierId, featureCode) {
    const query = `
      SELECT COUNT(*) as count
      FROM retailer_subscription_features
      WHERE tier_id = ? AND feature_code = ? AND is_enabled = 1
    `;
    const result = await this.queryOne(query, [tierId, featureCode]);
    return result.count > 0;
  }

  /**
   * Get feature details
   * @param {number} tierId - Tier ID
   * @param {string} featureCode - Feature code
   * @returns {Promise<Object|null>}
   */
  async getFeature(tierId, featureCode) {
    const query = `
      SELECT *
      FROM retailer_subscription_features
      WHERE tier_id = ? AND feature_code = ?
    `;
    return this.queryOne(query, [tierId, featureCode]);
  }
}

/**
 * Location Model
 * Manages retailer locations
 */
class LocationModel extends BaseModel {
  constructor() {
    super('retailer_locations');
  }

  /**
   * Get all locations for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Array>}
   */
  async getRetailerLocations(retailerId) {
    return this.findAll({ retailer_id: retailerId, is_active: 1 });
  }

  /**
   * Count active locations for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<number>}
   */
  async countActiveLocations(retailerId) {
    return this.count({ retailer_id: retailerId, is_active: 1 });
  }

  /**
   * Get primary location
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Object|null>}
   */
  async getPrimaryLocation(retailerId) {
    const query = `
      SELECT *
      FROM retailer_locations
      WHERE retailer_id = ? AND is_primary = 1 AND is_active = 1
      LIMIT 1
    `;
    return this.queryOne(query, [retailerId]);
  }

  /**
   * Set a location as primary (and unset others)
   * @param {number} locationId - Location ID
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<void>}
   */
  async setPrimaryLocation(locationId, retailerId) {
    await this.beginTransaction();
    try {
      // Unset all primary flags for this retailer
      await this.query(
        'UPDATE retailer_locations SET is_primary = 0 WHERE retailer_id = ?',
        [retailerId]
      );
      
      // Set the new primary
      await this.update(locationId, { is_primary: 1 });
      
      await this.commit();
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

/**
 * AddOn Model
 * Manages available add-ons
 */
class AddOnModel extends BaseModel {
  constructor() {
    super('retailer_add_ons');
  }

  /**
   * Get add-on by code
   * @param {string} code - Add-on code
   * @returns {Promise<Object|null>}
   */
  async findByCode(code) {
    return this.findByField('addon_code', code);
  }

  /**
   * Get all active add-ons
   * @returns {Promise<Array>}
   */
  async getActiveAddOns() {
    return this.findAll({ is_active: 1 });
  }
}

/**
 * ActiveAddOn Model
 * Manages active add-ons for retailers
 */
class ActiveAddOnModel extends BaseModel {
  constructor() {
    super('retailer_active_add_ons');
  }

  /**
   * Get active add-ons for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Array>}
   */
  async getRetailerAddOns(retailerId) {
    const query = `
      SELECT 
        aa.*,
        a.addon_code,
        a.addon_name,
        a.description,
        a.monthly_price,
        a.annual_price
      FROM retailer_active_add_ons aa
      JOIN retailer_add_ons a ON aa.addon_id = a.id
      WHERE aa.retailer_id = ? AND aa.status = 'active'
    `;
    return this.query(query, [retailerId]);
  }

  /**
   * Check if retailer has a specific add-on active
   * @param {number} retailerId - Retailer ID
   * @param {string} addonCode - Add-on code
   * @returns {Promise<boolean>}
   */
  async hasActiveAddOn(retailerId, addonCode) {
    const query = `
      SELECT COUNT(*) as count
      FROM retailer_active_add_ons aa
      JOIN retailer_add_ons a ON aa.addon_id = a.id
      WHERE aa.retailer_id = ? AND a.addon_code = ? AND aa.status = 'active'
    `;
    const result = await this.queryOne(query, [retailerId, addonCode]);
    return result.count > 0;
  }
}

/**
 * BillingHistory Model
 * Manages billing and invoice history
 */
class BillingHistoryModel extends BaseModel {
  constructor() {
    super('retailer_billing_history');
  }

  /**
   * Get billing history for a retailer
   * @param {number} retailerId - Retailer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getRetailerBillingHistory(retailerId, options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    const query = `
      SELECT *
      FROM retailer_billing_history
      WHERE retailer_id = ?
      ORDER BY invoice_date DESC
      LIMIT ? OFFSET ?
    `;
    return this.query(query, [retailerId, limit, offset]);
  }

  /**
   * Get unpaid invoices for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Array>}
   */
  async getUnpaidInvoices(retailerId) {
    return this.findAll({ 
      retailer_id: retailerId, 
      status: 'pending' 
    }, { orderBy: 'due_date ASC' });
  }

  /**
   * Get total revenue for a period
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<number>}
   */
  async getTotalRevenue(startDate, endDate) {
    const query = `
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM retailer_billing_history
      WHERE status = 'paid'
        AND paid_at >= ?
        AND paid_at <= ?
    `;
    const result = await this.queryOne(query, [startDate, endDate]);
    return result.revenue;
  }

  /**
   * Generate invoice number
   * @returns {Promise<string>}
   */
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const query = `
      SELECT COUNT(*) as count
      FROM retailer_billing_history
      WHERE invoice_number LIKE ?
    `;
    const result = await this.queryOne(query, [`INV-${year}-%`]);
    const nextNumber = (result.count + 1).toString().padStart(6, '0');
    return `INV-${year}-${nextNumber}`;
  }
}

/**
 * PaymentMethod Model
 * Manages payment methods
 */
class PaymentMethodModel extends BaseModel {
  constructor() {
    super('retailer_payment_methods');
  }

  /**
   * Get payment methods for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Array>}
   */
  async getRetailerPaymentMethods(retailerId) {
    return this.findAll({ 
      retailer_id: retailerId, 
      is_active: 1 
    });
  }

  /**
   * Get default payment method
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Object|null>}
   */
  async getDefaultPaymentMethod(retailerId) {
    const query = `
      SELECT *
      FROM retailer_payment_methods
      WHERE retailer_id = ? AND is_default = 1 AND is_active = 1
      LIMIT 1
    `;
    return this.queryOne(query, [retailerId]);
  }

  /**
   * Set a payment method as default
   * @param {number} paymentMethodId - Payment method ID
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<void>}
   */
  async setDefaultPaymentMethod(paymentMethodId, retailerId) {
    await this.beginTransaction();
    try {
      // Unset all defaults for this retailer
      await this.query(
        'UPDATE retailer_payment_methods SET is_default = 0 WHERE retailer_id = ?',
        [retailerId]
      );
      
      // Set the new default
      await this.update(paymentMethodId, { is_default: 1 });
      
      await this.commit();
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

/**
 * UsageTracking Model
 * Manages usage tracking and limits
 */
class UsageTrackingModel extends BaseModel {
  constructor() {
    super('retailer_usage_tracking');
  }

  /**
   * Get current usage for a retailer and metric
   * @param {number} retailerId - Retailer ID
   * @param {string} metricType - Metric type
   * @returns {Promise<Object|null>}
   */
  async getCurrentUsage(retailerId, metricType) {
    const now = new Date().toISOString();
    const query = `
      SELECT *
      FROM retailer_usage_tracking
      WHERE retailer_id = ? 
        AND metric_type = ?
        AND period_start <= ?
        AND period_end >= ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    return this.queryOne(query, [retailerId, metricType, now, now]);
  }

  /**
   * Increment usage metric
   * @param {number} retailerId - Retailer ID
   * @param {number} subscriptionId - Subscription ID
   * @param {string} metricType - Metric type
   * @param {number} incrementBy - Amount to increment
   * @returns {Promise<void>}
   */
  async incrementUsage(retailerId, subscriptionId, metricType, incrementBy = 1) {
    const current = await this.getCurrentUsage(retailerId, metricType);
    
    if (current) {
      // Update existing record
      await this.update(current.id, {
        metric_value: current.metric_value + incrementBy
      });
    } else {
      // Create new record for current period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      await this.create({
        retailer_id: retailerId,
        subscription_id: subscriptionId,
        metric_type: metricType,
        metric_value: incrementBy,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString()
      });
    }
  }

  /**
   * Check if usage limit is exceeded
   * @param {number} retailerId - Retailer ID
   * @param {string} metricType - Metric type
   * @returns {Promise<Object>} - {exceeded: boolean, current: number, limit: number}
   */
  async checkUsageLimit(retailerId, metricType) {
    const usage = await this.getCurrentUsage(retailerId, metricType);
    
    if (!usage) {
      return { exceeded: false, current: 0, limit: usage?.limit_value || 0 };
    }
    
    const limit = usage.limit_value;
    const current = usage.metric_value;
    
    // -1 means unlimited
    if (limit === -1) {
      return { exceeded: false, current, limit: -1 };
    }
    
    return {
      exceeded: current >= limit,
      current,
      limit
    };
  }
}

/**
 * SubscriptionHistory Model
 * Manages subscription change audit trail
 */
class SubscriptionHistoryModel extends BaseModel {
  constructor() {
    super('retailer_subscription_history');
  }

  /**
   * Log subscription change
   * @param {Object} data - History data
   * @returns {Promise<number>}
   */
  async logChange(data) {
    return this.create({
      retailer_id: data.retailerId,
      subscription_id: data.subscriptionId,
      action_type: data.actionType,
      from_tier_id: data.fromTierId || null,
      to_tier_id: data.toTierId || null,
      from_billing_cycle: data.fromBillingCycle || null,
      to_billing_cycle: data.toBillingCycle || null,
      reason: data.reason || null,
      performed_by: data.performedBy || data.retailerId,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null
    });
  }

  /**
   * Get subscription history for a retailer
   * @param {number} retailerId - Retailer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getRetailerHistory(retailerId, options = {}) {
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    
    const query = `
      SELECT 
        h.*,
        from_tier.tier_name as from_tier_name,
        to_tier.tier_name as to_tier_name,
        u.name as performed_by_name
      FROM retailer_subscription_history h
      LEFT JOIN retailer_subscription_tiers from_tier ON h.from_tier_id = from_tier.id
      LEFT JOIN retailer_subscription_tiers to_tier ON h.to_tier_id = to_tier.id
      LEFT JOIN users u ON h.performed_by = u.id
      WHERE h.retailer_id = ?
      ORDER BY h.created_at DESC
      LIMIT ? OFFSET ?
    `;
    return this.query(query, [retailerId, limit, offset]);
  }
}

module.exports = {
  SubscriptionTierModel,
  SubscriptionModel,
  SubscriptionFeatureModel,
  LocationModel,
  AddOnModel,
  ActiveAddOnModel,
  BillingHistoryModel,
  PaymentMethodModel,
  UsageTrackingModel,
  SubscriptionHistoryModel
};
