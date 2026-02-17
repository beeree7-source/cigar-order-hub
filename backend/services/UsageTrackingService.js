/**
 * Usage Tracking Service
 * Handles usage monitoring and limit enforcement
 */

const {
  UsageTrackingModel,
  SubscriptionModel
} = require('../models/SubscriptionModels');

class UsageTrackingService {
  constructor() {
    this.usageModel = new UsageTrackingModel();
    this.subscriptionModel = new SubscriptionModel();
  }

  /**
   * Track API call usage
   * @param {number} retailerId - Retailer ID
   * @param {number} calls - Number of calls to add (default 1)
   * @returns {Promise<Object>}
   */
  async trackApiCall(retailerId, calls = 1) {
    try {
      const subscription = await this.subscriptionModel.getActiveSubscription(retailerId);
      
      if (!subscription) {
        throw new Error('No active subscription');
      }

      await this.usageModel.incrementUsage(
        retailerId,
        subscription.id,
        'api_calls',
        calls
      );

      return await this.getUsage(retailerId, 'api_calls');
    } catch (error) {
      throw new Error(`Failed to track API call: ${error.message}`);
    }
  }

  /**
   * Get current usage for a specific metric
   * @param {number} retailerId - Retailer ID
   * @param {string} metricType - Metric type
   * @returns {Promise<Object>}
   */
  async getUsage(retailerId, metricType) {
    try {
      const usage = await this.usageModel.getCurrentUsage(retailerId, metricType);
      
      if (!usage) {
        return {
          metric: metricType,
          current: 0,
          limit: 0,
          percentage: 0,
          isUnlimited: false
        };
      }

      const isUnlimited = usage.limit_value === -1;
      const percentage = isUnlimited 
        ? 0 
        : Math.round((usage.metric_value / usage.limit_value) * 100);

      return {
        metric: metricType,
        current: usage.metric_value,
        limit: usage.limit_value,
        percentage,
        isUnlimited,
        periodStart: usage.period_start,
        periodEnd: usage.period_end
      };
    } catch (error) {
      throw new Error(`Failed to get usage: ${error.message}`);
    }
  }

  /**
   * Get all usage metrics for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Object>}
   */
  async getAllUsage(retailerId) {
    try {
      const metrics = ['api_calls', 'locations', 'users'];
      const usage = {};

      for (const metric of metrics) {
        usage[metric] = await this.getUsage(retailerId, metric);
      }

      return usage;
    } catch (error) {
      throw new Error(`Failed to get all usage: ${error.message}`);
    }
  }

  /**
   * Check if usage limit is exceeded
   * @param {number} retailerId - Retailer ID
   * @param {string} metricType - Metric type
   * @returns {Promise<Object>}
   */
  async checkLimit(retailerId, metricType) {
    try {
      return await this.usageModel.checkUsageLimit(retailerId, metricType);
    } catch (error) {
      throw new Error(`Failed to check usage limit: ${error.message}`);
    }
  }

  /**
   * Enforce usage limit - throw error if exceeded
   * @param {number} retailerId - Retailer ID
   * @param {string} metricType - Metric type
   * @throws {Error} If limit is exceeded
   */
  async enforceLimit(retailerId, metricType) {
    const limitCheck = await this.checkLimit(retailerId, metricType);
    
    if (limitCheck.exceeded) {
      throw new Error(
        `Usage limit exceeded for ${metricType}. Current: ${limitCheck.current}, Limit: ${limitCheck.limit}. Please upgrade your plan.`
      );
    }
  }

  /**
   * Update usage for a metric (set absolute value)
   * @param {number} retailerId - Retailer ID
   * @param {string} metricType - Metric type
   * @param {number} value - New value
   * @returns {Promise<Object>}
   */
  async updateUsage(retailerId, metricType, value) {
    try {
      const usage = await this.usageModel.getCurrentUsage(retailerId, metricType);
      
      if (!usage) {
        throw new Error(`No usage record found for ${metricType}`);
      }

      await this.usageModel.update(usage.id, {
        metric_value: value
      });

      return await this.getUsage(retailerId, metricType);
    } catch (error) {
      throw new Error(`Failed to update usage: ${error.message}`);
    }
  }

  /**
   * Reset usage for a new billing period
   * Called by cron job at the start of each billing period
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<void>}
   */
  async resetUsageForNewPeriod(retailerId) {
    try {
      const subscription = await this.subscriptionModel.getActiveSubscription(retailerId);
      
      if (!subscription) {
        return;
      }

      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Only reset metrics that are period-based (like API calls)
      const periodicMetrics = ['api_calls'];
      
      for (const metric of periodicMetrics) {
        const current = await this.usageModel.getCurrentUsage(retailerId, metric);
        
        if (current) {
          // Create new period record
          await this.usageModel.create({
            retailer_id: retailerId,
            subscription_id: subscription.id,
            metric_type: metric,
            metric_value: 0,
            limit_value: current.limit_value,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString()
          });
        }
      }
    } catch (error) {
      throw new Error(`Failed to reset usage: ${error.message}`);
    }
  }

  /**
   * Get usage statistics and trends
   * @param {number} retailerId - Retailer ID
   * @param {string} metricType - Metric type
   * @param {number} months - Number of months to look back
   * @returns {Promise<Array>}
   */
  async getUsageHistory(retailerId, metricType, months = 6) {
    try {
      const query = `
        SELECT 
          metric_value,
          limit_value,
          period_start,
          period_end,
          strftime('%Y-%m', period_start) as month
        FROM retailer_usage_tracking
        WHERE retailer_id = ? 
          AND metric_type = ?
          AND period_start >= datetime('now', '-${months} months')
        ORDER BY period_start DESC
      `;
      
      return await this.usageModel.query(query, [retailerId, metricType]);
    } catch (error) {
      throw new Error(`Failed to get usage history: ${error.message}`);
    }
  }

  /**
   * Get usage alerts (when approaching limit)
   * @param {number} retailerId - Retailer ID
   * @param {number} threshold - Percentage threshold (default 80%)
   * @returns {Promise<Array>}
   */
  async getUsageAlerts(retailerId, threshold = 80) {
    try {
      const allUsage = await this.getAllUsage(retailerId);
      const alerts = [];

      for (const [metric, usage] of Object.entries(allUsage)) {
        if (!usage.isUnlimited && usage.percentage >= threshold) {
          alerts.push({
            metric,
            percentage: usage.percentage,
            current: usage.current,
            limit: usage.limit,
            severity: usage.percentage >= 90 ? 'critical' : 'warning',
            message: `${metric} usage is at ${usage.percentage}% (${usage.current}/${usage.limit})`
          });
        }
      }

      return alerts;
    } catch (error) {
      throw new Error(`Failed to get usage alerts: ${error.message}`);
    }
  }

  /**
   * Create middleware to track and enforce API usage
   * @returns {Function} Express middleware
   */
  apiUsageMiddleware() {
    return async (req, res, next) => {
      try {
        const retailerId = req.user?.id;
        
        if (!retailerId) {
          return next();
        }

        // Check if limit would be exceeded
        const limitCheck = await this.checkLimit(retailerId, 'api_calls');
        
        if (limitCheck.exceeded) {
          return res.status(429).json({
            error: 'API usage limit exceeded',
            current: limitCheck.current,
            limit: limitCheck.limit,
            message: 'You have reached your API call limit for this billing period. Please upgrade your plan or wait for the next billing cycle.'
          });
        }

        // Track the API call
        await this.trackApiCall(retailerId);

        // Add usage info to response headers
        res.set('X-RateLimit-Limit', limitCheck.limit.toString());
        res.set('X-RateLimit-Remaining', (limitCheck.limit - limitCheck.current - 1).toString());

        next();
      } catch (error) {
        // Don't fail the request if usage tracking fails
        console.error('Usage tracking error:', error);
        next();
      }
    };
  }
}

module.exports = UsageTrackingService;
