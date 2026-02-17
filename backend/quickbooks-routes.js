const express = require('express');
const quickbooksService = require('./quickbooks');

const router = express.Router();

const requireQuickbooksAccess = (req, res, next) => {
  const role = req.user?.role;

  if (role !== 'supplier' && role !== 'retailer' && role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Only supplier/retailer/admin users can access QuickBooks integration'
    });
  }

  next();
};

router.use(requireQuickbooksAccess);

router.get('/connect', quickbooksService.connectQuickBooks);
router.post('/sync', quickbooksService.triggerSync);
router.get('/status', quickbooksService.getSyncStatus);
router.post('/sync-orders', quickbooksService.syncOrders);
router.post('/sync-customers', quickbooksService.syncCustomers);
router.get('/mapping', quickbooksService.getAccountMapping);
router.put('/mapping', quickbooksService.updateAccountMapping);
router.get('/reconciliation', quickbooksService.getReconciliation);

module.exports = {
  router,
  callbackHandler: quickbooksService.quickbooksCallback
};
