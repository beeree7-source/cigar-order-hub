const express = require('express');
const controller = require('./retailer-subscription-controller');

const router = express.Router();

const normalizeUserId = (req, res, next) => {
  if (req.user && !req.user.id && req.user.userId) {
    req.user.id = req.user.userId;
  }
  next();
};

router.use(normalizeUserId);

router.get('/tiers', controller.getSubscriptionTiers);
router.get('/current', controller.getCurrentSubscription);
router.post('/subscribe', controller.subscribeToTier);
router.post('/change-tier', controller.changeSubscriptionTier);
router.post('/cancel', controller.cancelSubscription);
router.post('/reactivate', controller.reactivateSubscription);
router.get('/history', controller.getSubscriptionHistory);

router.get('/features', controller.getAvailableFeatures);
router.get('/features/:featureCode', controller.checkFeatureAccess);

router.get('/usage', controller.getUsageStatistics);
router.get('/usage/:metricType/history', controller.getUsageHistory);

router.get('/billing/history', controller.getBillingHistory);
router.get('/billing/invoice/:invoiceId', controller.getInvoice);
router.get('/payment-methods', controller.getPaymentMethods);
router.post('/payment-methods', controller.addPaymentMethod);
router.put('/payment-methods/:paymentMethodId/default', controller.setDefaultPaymentMethod);
router.delete('/payment-methods/:paymentMethodId', controller.removePaymentMethod);

router.get('/locations', controller.getLocations);
router.post('/locations', controller.addLocation);

router.get('/add-ons', controller.getAvailableAddOns);
router.get('/add-ons/active', controller.getActiveAddOns);

module.exports = router;
