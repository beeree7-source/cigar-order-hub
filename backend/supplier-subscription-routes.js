const express = require('express');
const controller = require('./supplier-subscription-controller');

const router = express.Router();

const normalizeUserId = (req, res, next) => {
  if (req.user && !req.user.id && req.user.userId) {
    req.user.id = req.user.userId;
  }
  next();
};

router.use(normalizeUserId);

router.get('/tiers', controller.getTiers);
router.get('/current', controller.getCurrentSubscription);
router.post('/subscribe', controller.subscribe);
router.post('/change-tier', controller.changeTier);
router.post('/cancel', controller.cancel);

module.exports = router;
