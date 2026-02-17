/**
 * Subscription Service
 * Handles subscription tier management, upgrades, downgrades, and billing
 */

const {
  SubscriptionTierModel,
  SubscriptionModel,
  SubscriptionFeatureModel,
  SubscriptionHistoryModel,
  BillingHistoryModel,
  UsageTrackingModel
} = require('../models/SubscriptionModels');

class SubscriptionService {
  constructor() {
    this.tierModel = new SubscriptionTierModel();
    this.subscriptionModel = new SubscriptionModel();
    this.featureModel = new SubscriptionFeatureModel();
    this.historyModel = new SubscriptionHistoryModel();
    this.billingModel = new BillingHistoryModel();
    this.usageModel = new UsageTrackingModel();
  }

  /**
   * Get all available subscription tiers
   * @returns {Promise<Array>}
   */
  async getAvailableTiers() {
    try {
      const tiers = await this.tierModel.getActiveTiers();
      
      // Parse metadata JSON for each tier
      return tiers.map(tier => ({
        ...tier,
        metadata: tier.metadata ? JSON.parse(tier.metadata) : {}
      }));
    } catch (error) {
      throw new Error(`Failed to get tiers: ${error.message}`);
    }
  }

  /**
   * Get tier with all features
   * @param {number} tierId - Tier ID
   * @returns {Promise<Object>}
   */
  async getTierWithFeatures(tierId) {
    try {
      const tier = await this.tierModel.getTierWithFeatures(tierId);
      if (!tier) {
        throw new Error('Tier not found');
      }

      // Parse JSON fields
      tier.metadata = tier.metadata ? JSON.parse(tier.metadata) : {};
      tier.features = tier.features ? JSON.parse(tier.features) : [];
      
      return tier;
    } catch (error) {
      throw new Error(`Failed to get tier with features: ${error.message}`);
    }
  }

  /**
   * Get current subscription for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Object|null>}
   */
  async getCurrentSubscription(retailerId) {
    try {
      const subscription = await this.subscriptionModel.getActiveSubscription(retailerId);
      
      if (!subscription) {
        return null;
      }

      // Get features for this tier
      const features = await this.featureModel.getFeaturesForTier(subscription.tier_id);
      
      return {
        ...subscription,
        features: features.map(f => ({
          ...f,
          metadata: f.metadata ? JSON.parse(f.metadata) : {}
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get current subscription: ${error.message}`);
    }
  }

  /**
   * Create a new subscription for a retailer
   * @param {Object} data - Subscription data
   * @returns {Promise<Object>}
   */
  async createSubscription(data) {
    try {
      const { retailerId, tierCode, billingCycle = 'monthly', performedBy } = data;

      // Validate tier exists
      const tier = await this.tierModel.findByCode(tierCode);
      if (!tier) {
        throw new Error(`Tier ${tierCode} not found`);
      }

      // Check if retailer already has an active subscription
      const existing = await this.subscriptionModel.getActiveSubscription(retailerId);
      if (existing) {
        throw new Error('Retailer already has an active subscription');
      }

      // Calculate period dates
      const now = new Date();
      const periodEnd = new Date(now);
      if (billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      // Determine if this is a trial
      const isTrial = tierCode === 'FREE';
      let trialEndsAt = null;
      if (isTrial) {
        trialEndsAt = new Date(now);
        trialEndsAt.setDate(trialEndsAt.getDate() + 30); // 30-day trial
      }

      // Create subscription
      const subscriptionId = await this.subscriptionModel.create({
        retailer_id: retailerId,
        tier_id: tier.id,
        billing_cycle: billingCycle,
        status: isTrial ? 'trial' : 'active',
        trial_ends_at: trialEndsAt ? trialEndsAt.toISOString() : null,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: 0
      });

      // Log history
      await this.historyModel.logChange({
        retailerId,
        subscriptionId,
        actionType: isTrial ? 'trial_started' : 'created',
        toTierId: tier.id,
        toBillingCycle: billingCycle,
        performedBy: performedBy || retailerId,
        reason: 'Initial subscription'
      });

      // Initialize usage tracking for this period
      await this._initializeUsageTracking(retailerId, subscriptionId, tier);

      // Create billing record if not free
      if (tier.monthly_price > 0 || tier.annual_price > 0) {
        const amount = billingCycle === 'monthly' ? tier.monthly_price : tier.annual_price;
        const invoiceNumber = await this.billingModel.generateInvoiceNumber();
        
        await this.billingModel.create({
          retailer_id: retailerId,
          subscription_id: subscriptionId,
          invoice_number: invoiceNumber,
          invoice_type: 'subscription',
          amount: amount,
          tax_amount: 0,
          total_amount: amount,
          currency: 'USD',
          status: 'pending',
          invoice_date: now.toISOString(),
          due_date: now.toISOString(),
          description: `${tier.tier_name} - ${billingCycle} billing`
        });
      }

      return await this.getCurrentSubscription(retailerId);
    } catch (error) {
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Upgrade or downgrade subscription
   * @param {Object} data - Upgrade data
   * @returns {Promise<Object>}
   */
  async changeSubscriptionTier(data) {
    try {
      const { retailerId, newTierCode, performedBy, reason } = data;

      // Get current subscription
      const current = await this.subscriptionModel.getActiveSubscription(retailerId);
      if (!current) {
        throw new Error('No active subscription found');
      }

      // Get new tier
      const newTier = await this.tierModel.findByCode(newTierCode);
      if (!newTier) {
        throw new Error(`Tier ${newTierCode} not found`);
      }

      // Don't allow "upgrade" to same tier
      if (current.tier_id === newTier.id) {
        throw new Error('Already subscribed to this tier');
      }

      // Determine if upgrade or downgrade
      const isUpgrade = newTier.monthly_price > current.monthly_price;
      const actionType = isUpgrade ? 'upgraded' : 'downgraded';

      // Update subscription
      await this.subscriptionModel.update(current.id, {
        tier_id: newTier.id,
        status: 'active'
      });

      // Log history
      await this.historyModel.logChange({
        retailerId,
        subscriptionId: current.id,
        actionType,
        fromTierId: current.tier_id,
        toTierId: newTier.id,
        fromBillingCycle: current.billing_cycle,
        toBillingCycle: current.billing_cycle,
        performedBy: performedBy || retailerId,
        reason: reason || `Changed from ${current.tier_name} to ${newTier.tier_name}`
      });

      // Update usage tracking limits
      await this._updateUsageTrackingLimits(retailerId, current.id, newTier);

      // Handle billing - prorate if upgrade, credit if downgrade
      if (isUpgrade) {
        await this._handleUpgradeBilling(retailerId, current, newTier);
      }

      return await this.getCurrentSubscription(retailerId);
    } catch (error) {
      throw new Error(`Failed to change subscription tier: ${error.message}`);
    }
  }

  /**
   * Cancel subscription
   * @param {Object} data - Cancel data
   * @returns {Promise<Object>}
   */
  async cancelSubscription(data) {
    try {
      const { retailerId, immediate = false, performedBy, reason } = data;

      // Get current subscription
      const current = await this.subscriptionModel.getActiveSubscription(retailerId);
      if (!current) {
        throw new Error('No active subscription found');
      }

      if (immediate) {
        // Cancel immediately
        await this.subscriptionModel.update(current.id, {
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        });

        await this.historyModel.logChange({
          retailerId,
          subscriptionId: current.id,
          actionType: 'cancelled',
          fromTierId: current.tier_id,
          performedBy: performedBy || retailerId,
          reason: reason || 'Immediate cancellation'
        });
      } else {
        // Cancel at period end
        await this.subscriptionModel.cancelAtPeriodEnd(current.id);

        await this.historyModel.logChange({
          retailerId,
          subscriptionId: current.id,
          actionType: 'cancelled',
          fromTierId: current.tier_id,
          performedBy: performedBy || retailerId,
          reason: reason || 'Cancelled at period end'
        });
      }

      return await this.getCurrentSubscription(retailerId);
    } catch (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Reactivate a cancelled subscription
   * @param {number} retailerId - Retailer ID
   * @param {number} performedBy - User performing the action
   * @returns {Promise<Object>}
   */
  async reactivateSubscription(retailerId, performedBy) {
    try {
      const current = await this.subscriptionModel.getActiveSubscription(retailerId);
      if (!current) {
        throw new Error('No subscription found');
      }

      if (current.status !== 'cancelled' && !current.cancel_at_period_end) {
        throw new Error('Subscription is not cancelled');
      }

      // Reactivate
      await this.subscriptionModel.update(current.id, {
        status: 'active',
        cancel_at_period_end: 0,
        cancelled_at: null
      });

      await this.historyModel.logChange({
        retailerId,
        subscriptionId: current.id,
        actionType: 'reactivated',
        toTierId: current.tier_id,
        performedBy: performedBy || retailerId,
        reason: 'Subscription reactivated'
      });

      return await this.getCurrentSubscription(retailerId);
    } catch (error) {
      throw new Error(`Failed to reactivate subscription: ${error.message}`);
    }
  }

  /**
   * Get subscription history for a retailer
   * @param {number} retailerId - Retailer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getSubscriptionHistory(retailerId, options = {}) {
    try {
      return await this.historyModel.getRetailerHistory(retailerId, options);
    } catch (error) {
      throw new Error(`Failed to get subscription history: ${error.message}`);
    }
  }

  /**
   * Process subscription renewals (called by cron job)
   * @returns {Promise<Object>}
   */
  async processRenewals() {
    try {
      const expiring = await this.subscriptionModel.getExpiringSubscriptions(1);
      const results = { renewed: 0, failed: 0, errors: [] };

      for (const subscription of expiring) {
        try {
          await this._renewSubscription(subscription);
          results.renewed++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            subscriptionId: subscription.id,
            retailerId: subscription.retailer_id,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to process renewals: ${error.message}`);
    }
  }

  // Private helper methods

  /**
   * Initialize usage tracking for a new subscription
   * @private
   */
  async _initializeUsageTracking(retailerId, subscriptionId, tier) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const metrics = [
      { type: 'api_calls', limit: tier.max_api_calls_per_month },
      { type: 'locations', limit: tier.max_locations },
      { type: 'users', limit: tier.max_users }
    ];

    for (const metric of metrics) {
      await this.usageModel.create({
        retailer_id: retailerId,
        subscription_id: subscriptionId,
        metric_type: metric.type,
        metric_value: 0,
        limit_value: metric.limit,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString()
      });
    }
  }

  /**
   * Update usage tracking limits after tier change
   * @private
   */
  async _updateUsageTrackingLimits(retailerId, subscriptionId, newTier) {
    const limits = {
      api_calls: newTier.max_api_calls_per_month,
      locations: newTier.max_locations,
      users: newTier.max_users
    };

    for (const [metricType, limitValue] of Object.entries(limits)) {
      const usage = await this.usageModel.getCurrentUsage(retailerId, metricType);
      if (usage) {
        await this.usageModel.update(usage.id, { limit_value: limitValue });
      }
    }
  }

  /**
   * Handle billing for upgrades (prorated)
   * @private
   */
  async _handleUpgradeBilling(retailerId, currentSubscription, newTier) {
    // Calculate prorated amount based on remaining days in period
    const now = new Date();
    const periodEnd = new Date(currentSubscription.current_period_end);
    const daysRemaining = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));
    const totalDays = currentSubscription.billing_cycle === 'monthly' ? 30 : 365;
    
    const newPrice = currentSubscription.billing_cycle === 'monthly' 
      ? newTier.monthly_price 
      : newTier.annual_price;
    const oldPrice = currentSubscription.billing_cycle === 'monthly'
      ? currentSubscription.monthly_price
      : currentSubscription.annual_price;
    
    const proratedAmount = ((newPrice - oldPrice) / totalDays) * daysRemaining;

    if (proratedAmount > 0) {
      const invoiceNumber = await this.billingModel.generateInvoiceNumber();
      
      await this.billingModel.create({
        retailer_id: retailerId,
        subscription_id: currentSubscription.id,
        invoice_number: invoiceNumber,
        invoice_type: 'subscription',
        amount: proratedAmount,
        tax_amount: 0,
        total_amount: proratedAmount,
        currency: 'USD',
        status: 'pending',
        invoice_date: now.toISOString(),
        due_date: now.toISOString(),
        description: `Prorated upgrade to ${newTier.tier_name}`
      });
    }
  }

  /**
   * Renew a subscription
   * @private
   */
  async _renewSubscription(subscription) {
    const tier = await this.tierModel.findById(subscription.tier_id);
    const amount = subscription.billing_cycle === 'monthly' 
      ? tier.monthly_price 
      : tier.annual_price;

    // Update subscription period
    const newPeriodStart = new Date(subscription.current_period_end);
    const newPeriodEnd = new Date(newPeriodStart);
    if (subscription.billing_cycle === 'monthly') {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
    } else {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
    }

    await this.subscriptionModel.update(subscription.id, {
      current_period_start: newPeriodStart.toISOString(),
      current_period_end: newPeriodEnd.toISOString()
    });

    // Create invoice
    const invoiceNumber = await this.billingModel.generateInvoiceNumber();
    await this.billingModel.create({
      retailer_id: subscription.retailer_id,
      subscription_id: subscription.id,
      invoice_number: invoiceNumber,
      invoice_type: 'subscription',
      amount: amount,
      tax_amount: 0,
      total_amount: amount,
      currency: 'USD',
      status: 'pending',
      invoice_date: newPeriodStart.toISOString(),
      due_date: newPeriodStart.toISOString(),
      description: `${tier.tier_name} renewal - ${subscription.billing_cycle}`
    });

    // Log history
    await this.historyModel.logChange({
      retailerId: subscription.retailer_id,
      subscriptionId: subscription.id,
      actionType: 'renewed',
      toTierId: tier.id,
      performedBy: subscription.retailer_id,
      reason: 'Automatic renewal'
    });
  }
}

module.exports = SubscriptionService;
