/**
 * QuickBooks Configuration
 * OAuth2 and API settings for QuickBooks Online integration
 */

module.exports = {
  // OAuth2 Configuration
  clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
  
  // Redirect URI for OAuth callback
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:4000/api/protected/quickbooks/callback',
  
  // Environment (sandbox or production)
  environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox',
  
  // API Endpoints
  authEndpoint: {
    sandbox: 'https://appcenter.intuit.com/connect/oauth2',
    production: 'https://appcenter.intuit.com/connect/oauth2'
  },
  
  tokenEndpoint: {
    sandbox: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    production: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
  },
  
  apiEndpoint: {
    sandbox: 'https://sandbox-quickbooks.api.intuit.com',
    production: 'https://quickbooks.api.intuit.com'
  },
  
  // Scopes
  scopes: [
    'com.intuit.quickbooks.accounting'
  ],
  
  // Sync settings
  sync: {
    // Auto-sync interval in minutes (0 = disabled)
    autoSyncInterval: 0,
    
    // Retry failed syncs
    retryFailedSyncs: true,
    maxRetries: 3,
    
    // Batch size for bulk operations
    batchSize: 50
  },
  
  // Account mapping defaults
  defaultAccounts: {
    revenue: 'Sales Revenue',
    expense: 'Cost of Goods Sold',
    asset: 'Inventory Asset',
    liability: 'Accounts Payable',
    equity: 'Owner\'s Equity'
  },
  
  // Webhook configuration (for real-time updates)
  webhook: {
    enabled: false,
    verifierToken: process.env.QUICKBOOKS_WEBHOOK_TOKEN || ''
  }
};
