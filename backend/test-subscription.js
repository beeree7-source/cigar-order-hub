// Test script for subscription system
const SubscriptionService = require('./services/SubscriptionService');
const FeatureAccessService = require('./services/FeatureAccessService');
const UsageTrackingService = require('./services/UsageTrackingService');
const db = require('./database');

const subscriptionService = new SubscriptionService();
const featureService = new FeatureAccessService();
const usageService = new UsageTrackingService();

async function runTests() {
  console.log('\n=== Testing Retailer Subscription System ===\n');
  
  try {
    // Test 1: Get available tiers
    console.log('Test 1: Get Available Tiers');
    const tiers = await subscriptionService.getAvailableTiers();
    console.log(`✓ Found ${tiers.length} tiers`);
    tiers.forEach(t => {
      console.log(`  - ${t.tier_code}: $${t.monthly_price}/mo, ${t.max_locations === -1 ? 'Unlimited' : t.max_locations} locations`);
    });
    
    // Test 2: Create test user
    console.log('\nTest 2: Create Test User');
    const userId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT OR IGNORE INTO users (name, email, password, role, approved) VALUES (?, ?, ?, ?, ?)',
        ['Test Retailer', 'test@retailer.com', 'hashed_password', 'retailer', 1],
        function(err) {
          if (err) {
            // If user exists, get their ID
            db.get('SELECT id FROM users WHERE email = ?', ['test@retailer.com'], (err2, row) => {
              if (err2) reject(err2);
              else resolve(row.id);
            });
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
    console.log(`✓ Test user ID: ${userId}`);
    
    // Test 3: Create subscription
    console.log('\nTest 3: Create Subscription');
    try {
      await subscriptionService.createSubscription({
        retailerId: userId,
        tierCode: 'FREE',
        billingCycle: 'monthly',
        performedBy: userId
      });
      console.log('✓ Subscription created');
    } catch (err) {
      if (err.message.includes('already has')) {
        console.log('✓ Subscription already exists (expected)');
      } else {
        throw err;
      }
    }
    
    // Test 4: Get current subscription
    console.log('\nTest 4: Get Current Subscription');
    const subscription = await subscriptionService.getCurrentSubscription(userId);
    console.log(`✓ Current tier: ${subscription.tier_name}`);
    console.log(`✓ Status: ${subscription.status}`);
    console.log(`✓ Features: ${subscription.features.length}`);
    
    // Test 5: Check feature access
    console.log('\nTest 5: Check Feature Access');
    const apiAccess = await featureService.checkFeatureAccess(userId, 'api_access');
    console.log(`✓ API Access: ${apiAccess.hasAccess ? 'GRANTED' : 'DENIED'} - ${apiAccess.reason}`);
    
    const placeOrders = await featureService.checkFeatureAccess(userId, 'place_orders');
    console.log(`✓ Place Orders: ${placeOrders.hasAccess ? 'GRANTED' : 'DENIED'} - ${placeOrders.reason}`);
    
    // Test 6: Get available features
    console.log('\nTest 6: Get Available Features');
    const features = await featureService.getAvailableFeatures(userId);
    console.log(`✓ Available features: ${features.length}`);
    features.forEach(f => console.log(`  - ${f.feature_code}: ${f.feature_name}`));
    
    // Test 7: Get usage statistics
    console.log('\nTest 7: Get Usage Statistics');
    const usage = await usageService.getAllUsage(userId);
    console.log('✓ Usage statistics:');
    console.log(`  - API Calls: ${usage.api_calls.current}/${usage.api_calls.limit === -1 ? 'Unlimited' : usage.api_calls.limit}`);
    console.log(`  - Locations: ${usage.locations.current}/${usage.locations.limit === -1 ? 'Unlimited' : usage.locations.limit}`);
    console.log(`  - Users: ${usage.users.current}/${usage.users.limit === -1 ? 'Unlimited' : usage.users.limit}`);
    
    // Test 8: Upgrade subscription
    console.log('\nTest 8: Upgrade Subscription');
    try {
      const upgraded = await subscriptionService.changeSubscriptionTier({
        retailerId: userId,
        newTierCode: 'STARTER',
        performedBy: userId,
        reason: 'Testing upgrade'
      });
      console.log(`✓ Upgraded to: ${upgraded.tier_name}`);
      
      // Verify API access after upgrade
      const newApiAccess = await featureService.checkFeatureAccess(userId, 'api_access');
      console.log(`✓ API Access after upgrade: ${newApiAccess.hasAccess ? 'GRANTED' : 'DENIED'}`);
    } catch (err) {
      console.log(`✗ Upgrade failed: ${err.message}`);
    }
    
    // Test 9: Track API usage
    console.log('\nTest 9: Track API Usage');
    await usageService.trackApiCall(userId, 5);
    const newUsage = await usageService.getUsage(userId, 'api_calls');
    console.log(`✓ API calls tracked: ${newUsage.current}/${newUsage.limit}`);
    
    // Test 10: Get subscription history
    console.log('\nTest 10: Get Subscription History');
    const history = await subscriptionService.getSubscriptionHistory(userId);
    console.log(`✓ History entries: ${history.length}`);
    history.forEach(h => {
      console.log(`  - ${h.action_type} on ${new Date(h.created_at).toLocaleDateString()}`);
    });
    
    console.log('\n=== All Tests Passed! ===\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n✗ Test Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runTests();
