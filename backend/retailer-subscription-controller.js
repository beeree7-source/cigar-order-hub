/**
 * Retailer Subscription Controller
 * Main API endpoints for subscription management
 */

const SubscriptionService = require('./services/SubscriptionService');
const FeatureAccessService = require('./services/FeatureAccessService');
const UsageTrackingService = require('./services/UsageTrackingService');
const BillingService = require('./services/BillingService');
const { LocationModel, AddOnModel, ActiveAddOnModel } = require('./models/SubscriptionModels');

// Initialize services
const subscriptionService = new SubscriptionService();
const featureService = new FeatureAccessService();
const usageService = new UsageTrackingService();
const billingService = new BillingService();

// Initialize models
const locationModel = new LocationModel();
const addOnModel = new AddOnModel();
const activeAddOnModel = new ActiveAddOnModel();

/**
 * Get all available subscription tiers
 * GET /api/retailer-subscription/tiers
 */
const getSubscriptionTiers = async (req, res) => {
  try {
    const tiers = await subscriptionService.getAvailableTiers();
    
    // Include feature comparison
    const comparison = await featureService.getFeatureComparison();
    
    res.json({
      success: true,
      tiers,
      featureComparison: comparison
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get current subscription for authenticated retailer
 * GET /api/retailer-subscription/current
 */
const getCurrentSubscription = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const subscription = await subscriptionService.getCurrentSubscription(retailerId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    // Get usage data
    const usage = await usageService.getAllUsage(retailerId);
    
    // Get billing summary
    const billingSummary = await billingService.getBillingSummary(retailerId);

    res.json({
      success: true,
      subscription,
      usage,
      billing: billingSummary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Subscribe to a tier
 * POST /api/retailer-subscription/subscribe
 * Body: { tierCode, billingCycle }
 */
const subscribeToTier = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { tierCode, billingCycle = 'monthly' } = req.body;

    if (!tierCode) {
      return res.status(400).json({
        success: false,
        error: 'Tier code is required'
      });
    }

    if (!['monthly', 'annual'].includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid billing cycle. Must be "monthly" or "annual"'
      });
    }

    const subscription = await subscriptionService.createSubscription({
      retailerId,
      tierCode,
      billingCycle,
      performedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Upgrade or downgrade subscription tier
 * POST /api/retailer-subscription/change-tier
 * Body: { newTierCode, reason }
 */
const changeSubscriptionTier = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { newTierCode, reason } = req.body;

    if (!newTierCode) {
      return res.status(400).json({
        success: false,
        error: 'New tier code is required'
      });
    }

    const subscription = await subscriptionService.changeSubscriptionTier({
      retailerId,
      newTierCode,
      performedBy: req.user.id,
      reason
    });

    res.json({
      success: true,
      message: 'Subscription tier changed successfully',
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel subscription
 * POST /api/retailer-subscription/cancel
 * Body: { immediate, reason }
 */
const cancelSubscription = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { immediate = false, reason } = req.body;

    const subscription = await subscriptionService.cancelSubscription({
      retailerId,
      immediate,
      performedBy: req.user.id,
      reason
    });

    res.json({
      success: true,
      message: immediate 
        ? 'Subscription cancelled immediately'
        : 'Subscription will cancel at end of billing period',
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reactivate a cancelled subscription
 * POST /api/retailer-subscription/reactivate
 */
const reactivateSubscription = async (req, res) => {
  try {
    const retailerId = req.user.id;
    
    const subscription = await subscriptionService.reactivateSubscription(
      retailerId,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
      subscription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check access to a specific feature
 * GET /api/retailer-subscription/features/:featureCode
 */
const checkFeatureAccess = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { featureCode } = req.params;

    const access = await featureService.checkFeatureAccess(retailerId, featureCode);

    res.json({
      success: true,
      ...access
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all available features
 * GET /api/retailer-subscription/features
 */
const getAvailableFeatures = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const features = await featureService.getAvailableFeatures(retailerId);
    const categorized = await featureService.getFeaturesByCategory(retailerId);

    res.json({
      success: true,
      features,
      categorized
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get usage statistics
 * GET /api/retailer-subscription/usage
 */
const getUsageStatistics = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const usage = await usageService.getAllUsage(retailerId);
    const alerts = await usageService.getUsageAlerts(retailerId);

    res.json({
      success: true,
      usage,
      alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get usage history for a metric
 * GET /api/retailer-subscription/usage/:metricType/history
 */
const getUsageHistory = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { metricType } = req.params;
    const { months = 6 } = req.query;

    const history = await usageService.getUsageHistory(retailerId, metricType, parseInt(months));

    res.json({
      success: true,
      metricType,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get billing history
 * GET /api/retailer-subscription/billing/history
 */
const getBillingHistory = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const history = await billingService.getBillingHistory(retailerId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get a specific invoice
 * GET /api/retailer-subscription/billing/invoice/:invoiceId
 */
const getInvoice = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { invoiceId } = req.params;

    const invoice = await billingService.getInvoice(parseInt(invoiceId), retailerId);

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get payment methods
 * GET /api/retailer-subscription/payment-methods
 */
const getPaymentMethods = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const methods = await billingService.getPaymentMethods(retailerId);

    // Don't send full payment method details for security
    const sanitized = methods.map(m => ({
      id: m.id,
      payment_type: m.payment_type,
      is_default: m.is_default,
      card_brand: m.card_brand,
      card_last4: m.card_last4,
      card_exp_month: m.card_exp_month,
      card_exp_year: m.card_exp_year,
      billing_name: m.billing_name,
      is_active: m.is_active
    }));

    res.json({
      success: true,
      paymentMethods: sanitized
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add a payment method
 * POST /api/retailer-subscription/payment-methods
 * Body: { stripePaymentMethodId, isDefault }
 */
const addPaymentMethod = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { stripePaymentMethodId, isDefault = false } = req.body;

    if (!stripePaymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'Stripe payment method ID is required'
      });
    }

    // Here you would typically fetch payment method details from Stripe
    // For this implementation, we'll accept the details in the request
    const {
      cardBrand,
      cardLast4,
      cardExpMonth,
      cardExpYear,
      billingName,
      billingEmail
    } = req.body;

    const paymentMethodId = await billingService.addPaymentMethod({
      retailerId,
      paymentType: 'card',
      isDefault,
      stripePaymentMethodId,
      cardBrand,
      cardLast4,
      cardExpMonth,
      cardExpYear,
      billingName,
      billingEmail
    });

    res.status(201).json({
      success: true,
      message: 'Payment method added successfully',
      paymentMethodId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Set default payment method
 * PUT /api/retailer-subscription/payment-methods/:paymentMethodId/default
 */
const setDefaultPaymentMethod = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { paymentMethodId } = req.params;

    await billingService.setDefaultPaymentMethod(parseInt(paymentMethodId), retailerId);

    res.json({
      success: true,
      message: 'Default payment method updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Remove a payment method
 * DELETE /api/retailer-subscription/payment-methods/:paymentMethodId
 */
const removePaymentMethod = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { paymentMethodId } = req.params;

    await billingService.removePaymentMethod(parseInt(paymentMethodId), retailerId);

    res.json({
      success: true,
      message: 'Payment method removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get retailer locations
 * GET /api/retailer-subscription/locations
 */
const getLocations = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const locations = await locationModel.getRetailerLocations(retailerId);

    res.json({
      success: true,
      locations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Add a location
 * POST /api/retailer-subscription/locations
 */
const addLocation = async (req, res) => {
  try {
    const retailerId = req.user.id;
    
    // Check location limit
    const currentCount = await locationModel.countActiveLocations(retailerId);
    const limitCheck = await featureService.checkLimit(retailerId, 'locations', currentCount);
    
    if (!limitCheck.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Location limit reached',
        message: 'You have reached the maximum number of locations for your plan. Please upgrade to add more locations.',
        limit: limitCheck.limit,
        current: limitCheck.current
      });
    }

    const {
      locationName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country = 'USA',
      phone,
      email,
      isPrimary = false
    } = req.body;

    // Validate required fields
    if (!locationName || !addressLine1 || !city || !state || !postalCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const locationId = await locationModel.create({
      retailer_id: retailerId,
      location_name: locationName,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city,
      state,
      postal_code: postalCode,
      country,
      phone,
      email,
      is_primary: isPrimary ? 1 : 0,
      is_active: 1
    });

    if (isPrimary) {
      await locationModel.setPrimaryLocation(locationId, retailerId);
    }

    res.status(201).json({
      success: true,
      message: 'Location added successfully',
      locationId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available add-ons
 * GET /api/retailer-subscription/add-ons
 */
const getAvailableAddOns = async (req, res) => {
  try {
    const addOns = await addOnModel.getActiveAddOns();
    
    res.json({
      success: true,
      addOns: addOns.map(a => ({
        ...a,
        metadata: a.metadata ? JSON.parse(a.metadata) : {}
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get active add-ons for retailer
 * GET /api/retailer-subscription/add-ons/active
 */
const getActiveAddOns = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const addOns = await activeAddOnModel.getRetailerAddOns(retailerId);

    res.json({
      success: true,
      addOns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get subscription history
 * GET /api/retailer-subscription/history
 */
const getSubscriptionHistory = async (req, res) => {
  try {
    const retailerId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    const history = await subscriptionService.getSubscriptionHistory(retailerId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  // Subscription management
  getSubscriptionTiers,
  getCurrentSubscription,
  subscribeToTier,
  changeSubscriptionTier,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionHistory,
  
  // Feature access
  checkFeatureAccess,
  getAvailableFeatures,
  
  // Usage tracking
  getUsageStatistics,
  getUsageHistory,
  
  // Billing
  getBillingHistory,
  getInvoice,
  getPaymentMethods,
  addPaymentMethod,
  setDefaultPaymentMethod,
  removePaymentMethod,
  
  // Locations
  getLocations,
  addLocation,
  
  // Add-ons
  getAvailableAddOns,
  getActiveAddOns,
  
  // Middleware exports
  requireFeature: featureService.requireFeatureMiddleware.bind(featureService),
  trackApiUsage: usageService.apiUsageMiddleware.bind(usageService)
};
