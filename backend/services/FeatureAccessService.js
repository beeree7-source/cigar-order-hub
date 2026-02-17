/**
 * Feature Access Service
 * Handles feature access checking and validation
 */

const {
  SubscriptionModel,
  SubscriptionFeatureModel,
  ActiveAddOnModel
} = require('../models/SubscriptionModels');

class FeatureAccessService {
  constructor() {
    this.subscriptionModel = new SubscriptionModel();
    this.featureModel = new SubscriptionFeatureModel();
    this.addOnModel = new ActiveAddOnModel();
  }

  /**
   * Check if a retailer has access to a specific feature
   * @param {number} retailerId - Retailer ID
   * @param {string} featureCode - Feature code to check
   * @returns {Promise<Object>} - {hasAccess: boolean, reason: string, feature: Object}
   */
  async checkFeatureAccess(retailerId, featureCode) {
    try {
      // Get active subscription
      const subscription = await this.subscriptionModel.getActiveSubscription(retailerId);
      
      if (!subscription) {
        return {
          hasAccess: false,
          reason: 'No active subscription',
          feature: null
        };
      }

      // Check if subscription is expired or suspended
      if (subscription.status !== 'active' && subscription.status !== 'trial') {
        return {
          hasAccess: false,
          reason: `Subscription is ${subscription.status}`,
          feature: null
        };
      }

      // Check if feature is enabled for this tier
      const feature = await this.featureModel.getFeature(subscription.tier_id, featureCode);
      
      if (!feature) {
        return {
          hasAccess: false,
          reason: 'Feature not available in current tier',
          feature: null
        };
      }

      if (!feature.is_enabled) {
        return {
          hasAccess: false,
          reason: 'Feature is disabled',
          feature: null
        };
      }

      // Parse metadata
      const metadata = feature.metadata ? JSON.parse(feature.metadata) : {};

      return {
        hasAccess: true,
        reason: 'Access granted',
        feature: {
          ...feature,
          metadata
        }
      };
    } catch (error) {
      throw new Error(`Failed to check feature access: ${error.message}`);
    }
  }

  /**
   * Check multiple features at once
   * @param {number} retailerId - Retailer ID
   * @param {Array<string>} featureCodes - Array of feature codes
   * @returns {Promise<Object>} - Map of feature code to access result
   */
  async checkMultipleFeatures(retailerId, featureCodes) {
    try {
      const results = {};
      
      for (const code of featureCodes) {
        results[code] = await this.checkFeatureAccess(retailerId, code);
      }
      
      return results;
    } catch (error) {
      throw new Error(`Failed to check multiple features: ${error.message}`);
    }
  }

  /**
   * Get all features available to a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Array>}
   */
  async getAvailableFeatures(retailerId) {
    try {
      const subscription = await this.subscriptionModel.getActiveSubscription(retailerId);
      
      if (!subscription) {
        return [];
      }

      const features = await this.featureModel.getFeaturesForTier(subscription.tier_id);
      
      return features.map(f => ({
        ...f,
        metadata: f.metadata ? JSON.parse(f.metadata) : {}
      }));
    } catch (error) {
      throw new Error(`Failed to get available features: ${error.message}`);
    }
  }

  /**
   * Get features organized by category
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Object>}
   */
  async getFeaturesByCategory(retailerId) {
    try {
      const features = await this.getAvailableFeatures(retailerId);
      
      const categorized = {};
      
      for (const feature of features) {
        const category = feature.metadata.category || 'general';
        
        if (!categorized[category]) {
          categorized[category] = [];
        }
        
        categorized[category].push(feature);
      }
      
      return categorized;
    } catch (error) {
      throw new Error(`Failed to get features by category: ${error.message}`);
    }
  }

  /**
   * Check if retailer has access through add-ons
   * @param {number} retailerId - Retailer ID
   * @param {string} addonCode - Add-on code
   * @returns {Promise<boolean>}
   */
  async hasAddOn(retailerId, addonCode) {
    try {
      return await this.addOnModel.hasActiveAddOn(retailerId, addonCode);
    } catch (error) {
      throw new Error(`Failed to check add-on access: ${error.message}`);
    }
  }

  /**
   * Validate feature access and throw error if not allowed
   * Used as middleware or in service methods
   * @param {number} retailerId - Retailer ID
   * @param {string} featureCode - Feature code
   * @throws {Error} If access is denied
   */
  async requireFeature(retailerId, featureCode) {
    const access = await this.checkFeatureAccess(retailerId, featureCode);
    
    if (!access.hasAccess) {
      throw new Error(`Access denied: ${access.reason}. Feature '${featureCode}' is not available in your current plan.`);
    }
    
    return access.feature;
  }

  /**
   * Get feature comparison across all tiers
   * Useful for displaying pricing/feature comparison tables
   * @returns {Promise<Object>}
   */
  async getFeatureComparison() {
    try {
      const TierModel = require('../models/SubscriptionModels').SubscriptionTierModel;
      const tierModel = new TierModel();
      
      const tiers = await tierModel.getActiveTiers();
      const comparison = {};
      
      // Get all unique feature codes across all tiers
      const allFeatures = new Set();
      for (const tier of tiers) {
        const features = await this.featureModel.getFeaturesForTier(tier.id);
        features.forEach(f => allFeatures.add(f.feature_code));
      }
      
      // Build comparison matrix
      for (const featureCode of allFeatures) {
        comparison[featureCode] = {
          name: '',
          description: '',
          tiers: {}
        };
        
        for (const tier of tiers) {
          const feature = await this.featureModel.getFeature(tier.id, featureCode);
          
          if (feature) {
            comparison[featureCode].name = feature.feature_name;
            comparison[featureCode].description = feature.feature_description;
            comparison[featureCode].tiers[tier.tier_code] = {
              enabled: feature.is_enabled,
              metadata: feature.metadata ? JSON.parse(feature.metadata) : {}
            };
          } else {
            comparison[featureCode].tiers[tier.tier_code] = {
              enabled: false,
              metadata: {}
            };
          }
        }
      }
      
      return {
        tiers: tiers.map(t => ({
          code: t.tier_code,
          name: t.tier_name,
          monthly_price: t.monthly_price,
          annual_price: t.annual_price
        })),
        features: comparison
      };
    } catch (error) {
      throw new Error(`Failed to get feature comparison: ${error.message}`);
    }
  }

  /**
   * Create middleware for Express routes to check feature access
   * @param {string} featureCode - Required feature code
   * @returns {Function} Express middleware
   */
  requireFeatureMiddleware(featureCode) {
    return async (req, res, next) => {
      try {
        const retailerId = req.user?.id;
        
        if (!retailerId) {
          return res.status(401).json({ 
            error: 'Authentication required' 
          });
        }

        const access = await this.checkFeatureAccess(retailerId, featureCode);
        
        if (!access.hasAccess) {
          return res.status(403).json({ 
            error: 'Access denied',
            reason: access.reason,
            feature: featureCode,
            message: `This feature is not available in your current plan. Please upgrade to access '${featureCode}'.`
          });
        }

        // Attach feature info to request for later use
        req.feature = access.feature;
        next();
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to check feature access',
          message: error.message 
        });
      }
    };
  }

  /**
   * Check if retailer can perform an action based on limits
   * For example, check if they can add another location
   * @param {number} retailerId - Retailer ID
   * @param {string} limitType - Type of limit ('locations', 'users', etc.)
   * @param {number} currentCount - Current count of the resource
   * @returns {Promise<Object>}
   */
  async checkLimit(retailerId, limitType, currentCount) {
    try {
      const subscription = await this.subscriptionModel.getActiveSubscription(retailerId);
      
      if (!subscription) {
        return {
          allowed: false,
          reason: 'No active subscription',
          limit: 0,
          current: currentCount
        };
      }

      let limit;
      switch (limitType) {
        case 'locations':
          limit = subscription.max_locations;
          break;
        case 'users':
          limit = subscription.max_users;
          break;
        case 'api_calls':
          limit = subscription.max_api_calls_per_month;
          break;
        default:
          throw new Error(`Unknown limit type: ${limitType}`);
      }

      // -1 means unlimited
      if (limit === -1) {
        return {
          allowed: true,
          reason: 'Unlimited',
          limit: -1,
          current: currentCount
        };
      }

      const allowed = currentCount < limit;
      
      return {
        allowed,
        reason: allowed ? 'Within limit' : 'Limit reached',
        limit,
        current: currentCount
      };
    } catch (error) {
      throw new Error(`Failed to check limit: ${error.message}`);
    }
  }
}

module.exports = FeatureAccessService;
