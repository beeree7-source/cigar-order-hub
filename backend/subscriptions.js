// subscriptions.js - Subscription Management Service

const db = require('./database');
const stripeConfig = require('./stripe-config');

// Get all subscription tiers
const getSubscriptionTiers = (req, res) => {
  db.all(
    'SELECT * FROM subscription_tiers ORDER BY price ASC',
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ tiers: rows });
    }
  );
};

// Get user's current subscription
const getUserSubscription = (req, res) => {
  const userId = req.user.id;
  
  db.get(
    `SELECT us.*, st.name as tier_name, st.price 
     FROM user_subscriptions us
     JOIN subscription_tiers st ON us.tier_id = st.id
     WHERE us.user_id = ? AND us.status = 'active'`,
    [userId],
    (err, subscription) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!subscription) return res.status(404).json({ error: 'No active subscription' });
      res.json(subscription);
    }
  );
};

// Create checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tier_id } = req.body;
    
    // Get tier
    db.get(
      'SELECT * FROM subscription_tiers WHERE id = ?',
      [tier_id],
      async (err, tier) => {
        if (err || !tier) return res.status(404).json({ error: 'Tier not found' });
        
        // Create checkout session
        const session = await stripeConfig.createCheckoutSession(
          tier.stripe_price_id,
          `${process.env.FRONTEND_URL}/subscription/success`,
          `${process.env.FRONTEND_URL}/subscription/cancel`
        );
        
        res.json({ sessionId: session.id, url: session.url });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upgrade subscription
const upgradeSubscription = (req, res) => {
  const userId = req.user.id;
  const { tier_id } = req.body;
  
  db.get(
    'SELECT * FROM user_subscriptions WHERE user_id = ? AND status = ?',
    [userId, 'active'],
    (err, current) => {
      if (err || !current) return res.status(404).json({ error: 'No active subscription' });
      
      // Record history
      db.run(
        'INSERT INTO billing_history (user_subscription_id, billing_date, amount, status) VALUES (?, ?, ?, ?)',
        [current.id, new Date(), 0, 'paid'],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          
          // Update tier
          db.run(
            'UPDATE user_subscriptions SET tier_id = ? WHERE id = ?',
            [tier_id, current.id],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });
              res.json({ message: 'Subscription upgraded' });
            }
          );
        }
      );
    }
  );
};

// Cancel subscription
const cancelSubscription = (req, res) => {
  const userId = req.user.id;
  
  db.get(
    'SELECT * FROM user_subscriptions WHERE user_id = ? AND status = ?',
    [userId, 'active'],
    (err, subscription) => {
      if (err || !subscription) return res.status(404).json({ error: 'No active subscription' });
      
      db.run(
        'UPDATE user_subscriptions SET status = ? WHERE id = ?',
        ['canceled', subscription.id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Subscription canceled' });
        }
      );
    }
  );
};

// Get billing history
const getBillingHistory = (req, res) => {
  const userId = req.user.id;
  
  db.all(
    `SELECT bh.* FROM billing_history bh
     JOIN user_subscriptions us ON bh.user_subscription_id = us.id
     WHERE us.user_id = ?
     ORDER BY bh.billing_date DESC`,
    [userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ history: rows });
    }
  );
};

// Handle Stripe webhook
const handleWebhook = (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  try {
    const event = stripeConfig.verifyWebhookSignature(req.body, sig);
    
    // Handle payment events
    if (event.type === 'payment_intent.succeeded') {
      console.log('Payment succeeded:', event.data.object);
    }
    
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getSubscriptionTiers,
  getUserSubscription,
  createCheckoutSession,
  upgradeSubscription,
  cancelSubscription,
  getBillingHistory,
  handleWebhook,
};