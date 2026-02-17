const db = require('./database');

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) return reject(err);
    resolve(rows);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) return reject(err);
    resolve({ id: this.lastID, changes: this.changes });
  });
});

const parseTier = (tier) => ({
  ...tier,
  metadata: tier.metadata ? JSON.parse(tier.metadata) : {}
});

const getSupplierId = (req) => req.user?.id || req.user?.userId;

async function getTiers(req, res) {
  try {
    const tiers = await all(
      `SELECT * FROM supplier_subscription_tiers WHERE is_active = 1 ORDER BY display_order ASC`
    );

    const features = await all(
      `SELECT t.tier_code, f.feature_code, f.feature_name, f.feature_description, f.is_enabled, f.metadata
       FROM supplier_subscription_features f
       JOIN supplier_subscription_tiers t ON f.tier_id = t.id
       WHERE t.is_active = 1`
    );

    const featureComparison = {};
    features.forEach((row) => {
      if (!featureComparison[row.feature_code]) {
        featureComparison[row.feature_code] = {
          name: row.feature_name,
          description: row.feature_description,
          tiers: {}
        };
      }
      featureComparison[row.feature_code].tiers[row.tier_code] = {
        enabled: !!row.is_enabled,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      };
    });

    res.json({
      success: true,
      tiers: tiers.map(parseTier),
      featureComparison: {
        tiers: tiers.map((t) => ({
          code: t.tier_code,
          name: t.tier_name,
          monthly_price: t.monthly_price,
          annual_price: t.annual_price
        })),
        features: featureComparison
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getCurrentSubscription(req, res) {
  try {
    const supplierId = getSupplierId(req);
    const subscription = await get(
      `SELECT s.*, t.tier_code, t.tier_name, t.monthly_price, t.annual_price
       FROM supplier_subscriptions s
       JOIN supplier_subscription_tiers t ON s.tier_id = t.id
       WHERE s.supplier_id = ? AND s.status IN ('active', 'trial')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [supplierId]
    );

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function subscribe(req, res) {
  try {
    const supplierId = getSupplierId(req);
    const { tierCode, billingCycle = 'monthly' } = req.body;

    if (!tierCode) {
      return res.status(400).json({ success: false, error: 'Tier code is required' });
    }

    const tier = await get(
      `SELECT * FROM supplier_subscription_tiers WHERE tier_code = ? AND is_active = 1`,
      [tierCode]
    );

    if (!tier) {
      return res.status(404).json({ success: false, error: 'Tier not found' });
    }

    const existing = await get(
      `SELECT id FROM supplier_subscriptions WHERE supplier_id = ? AND status IN ('active', 'trial') ORDER BY id DESC LIMIT 1`,
      [supplierId]
    );

    if (existing) {
      return res.status(400).json({ success: false, error: 'Active subscription already exists' });
    }

    await run(
      `INSERT INTO supplier_subscriptions (supplier_id, tier_id, status, billing_cycle, current_period_start, current_period_end)
       VALUES (?, ?, 'active', ?, CURRENT_TIMESTAMP, datetime('now', '+30 days'))`,
      [supplierId, tier.id, billingCycle]
    );

    res.status(201).json({ success: true, message: 'Subscription created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function changeTier(req, res) {
  try {
    const supplierId = getSupplierId(req);
    const { newTierCode } = req.body;

    if (!newTierCode) {
      return res.status(400).json({ success: false, error: 'New tier code is required' });
    }

    const tier = await get(
      `SELECT * FROM supplier_subscription_tiers WHERE tier_code = ? AND is_active = 1`,
      [newTierCode]
    );

    if (!tier) {
      return res.status(404).json({ success: false, error: 'Tier not found' });
    }

    const current = await get(
      `SELECT id FROM supplier_subscriptions WHERE supplier_id = ? AND status IN ('active', 'trial') ORDER BY id DESC LIMIT 1`,
      [supplierId]
    );

    if (!current) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    await run(`UPDATE supplier_subscriptions SET tier_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [tier.id, current.id]);

    res.json({ success: true, message: 'Subscription tier changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function cancel(req, res) {
  try {
    const supplierId = getSupplierId(req);
    const { immediate = false } = req.body || {};

    const current = await get(
      `SELECT id FROM supplier_subscriptions WHERE supplier_id = ? AND status IN ('active', 'trial') ORDER BY id DESC LIMIT 1`,
      [supplierId]
    );

    if (!current) {
      return res.status(404).json({ success: false, error: 'No active subscription found' });
    }

    if (immediate) {
      await run(
        `UPDATE supplier_subscriptions SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [current.id]
      );
      return res.json({ success: true, message: 'Subscription cancelled immediately' });
    }

    await run(
      `UPDATE supplier_subscriptions SET cancel_at_period_end = 1, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [current.id]
    );

    res.json({ success: true, message: 'Subscription will cancel at end of billing period' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getTiers,
  getCurrentSubscription,
  subscribe,
  changeTier,
  cancel
};
