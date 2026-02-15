const db = require('./database');

/**
 * QuickBooks Integration Service
 * Handles OAuth2 authentication and data synchronization with QuickBooks Online
 * 
 * NOTE: This is a mock implementation for development.
 * In production, use the 'intuit-oauth' package for real OAuth flow.
 */

/**
 * Start OAuth flow
 */
const connectQuickBooks = async (req, res) => {
  try {
    // Generate CSRF token for security (in production, store this in session/database)
    // TODO: In production, use a cryptographically secure random generator and store/validate the state
    const csrfToken = `state_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Mock OAuth URL (in production, use intuit-oauth to generate)
    const mockAuthUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=MOCK_CLIENT_ID&redirect_uri=${encodeURIComponent(process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:4000/api/protected/quickbooks/callback')}&response_type=code&scope=com.intuit.quickbooks.accounting&state=${csrfToken}`;

    res.json({
      authUrl: mockAuthUrl,
      message: 'Redirect user to this URL to authorize QuickBooks access',
      note: 'This is a mock implementation. In production, use intuit-oauth package with proper CSRF validation.'
    });
  } catch (error) {
    console.error('Error initiating QB OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate QuickBooks connection' });
  }
};

/**
 * OAuth callback handler
 */
const quickbooksCallback = async (req, res) => {
  try {
    const { code, realmId, state } = req.query;

    if (!code || !realmId) {
      return res.status(400).json({ error: 'Missing authorization code or realm ID' });
    }

    // Mock token exchange (in production, exchange code for access/refresh tokens)
    const mockTokens = {
      access_token: `MOCK_ACCESS_TOKEN_${Date.now()}`,
      refresh_token: `MOCK_REFRESH_TOKEN_${Date.now()}`,
      expires_in: 3600,
      x_refresh_token_expires_in: 8726400
    };

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + mockTokens.expires_in);

    // Save tokens to database
    db.run(
      `INSERT OR REPLACE INTO quickbooks_config 
       (company_id, access_token, refresh_token, realm_id, sync_status, token_expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'COMPANY_001',
        mockTokens.access_token,
        mockTokens.refresh_token,
        realmId,
        'connected',
        expiresAt.toISOString()
      ],
      function(err) {
        if (err) {
          console.error('Error saving QB config:', err);
          return res.status(500).json({ error: 'Failed to save QuickBooks configuration' });
        }

        res.json({
          success: true,
          message: 'QuickBooks connected successfully',
          realm_id: realmId
        });
      }
    );
  } catch (error) {
    console.error('Error in QB callback:', error);
    res.status(500).json({ error: 'Failed to complete QuickBooks authorization' });
  }
};

/**
 * Trigger full sync
 */
const triggerSync = async (req, res) => {
  try {
    // Check if QB is connected
    db.get(
      `SELECT * FROM quickbooks_config WHERE company_id = 'COMPANY_001' ORDER BY id DESC LIMIT 1`,
      async (err, config) => {
        if (err || !config) {
          return res.status(400).json({ 
            error: 'QuickBooks not connected. Please connect first.' 
          });
        }

        // Create sync log entry
        db.run(
          `INSERT INTO qb_sync_log (sync_type, status) VALUES (?, ?)`,
          ['full_sync', 'in_progress'],
          async function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to start sync' });
            }

            const syncLogId = this.lastID;

            // Mock sync process
            setTimeout(() => {
              const itemsSynced = Math.floor(Math.random() * 50) + 10;
              
              db.run(
                `UPDATE qb_sync_log 
                 SET status = ?, items_synced = ?, last_sync = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                ['completed', itemsSynced, syncLogId]
              );

              db.run(
                `UPDATE quickbooks_config 
                 SET last_sync = CURRENT_TIMESTAMP, sync_status = ?
                 WHERE company_id = ?`,
                ['synced', 'COMPANY_001']
              );
            }, 2000);

            res.json({
              success: true,
              message: 'Sync started',
              sync_log_id: syncLogId
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
};

/**
 * Get sync status
 */
const getSyncStatus = async (req, res) => {
  try {
    db.get(
      `SELECT * FROM quickbooks_config WHERE company_id = 'COMPANY_001' ORDER BY id DESC LIMIT 1`,
      (err, config) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!config) {
          return res.json({
            connected: false,
            status: 'not_connected'
          });
        }

        // Get recent sync logs
        db.all(
          `SELECT * FROM qb_sync_log ORDER BY created_at DESC LIMIT 10`,
          (err, logs) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            res.json({
              connected: true,
              status: config.sync_status,
              realm_id: config.realm_id,
              last_sync: config.last_sync,
              token_expires_at: config.token_expires_at,
              recent_syncs: logs
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
};

/**
 * Sync orders to QuickBooks
 */
const syncOrders = async (req, res) => {
  try {
    // Check if QB is connected
    db.get(
      `SELECT * FROM quickbooks_config WHERE company_id = 'COMPANY_001'`,
      (err, config) => {
        if (err || !config) {
          return res.status(400).json({ 
            error: 'QuickBooks not connected' 
          });
        }

        // Get orders that need syncing (last 30 days)
        db.all(
          `SELECT * FROM orders 
           WHERE created_at >= date('now', '-30 days')
           ORDER BY created_at DESC`,
          (err, orders) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            // Mock sync process
            const syncLogId = Date.now();
            
            db.run(
              `INSERT INTO qb_sync_log (sync_type, status, items_synced)
               VALUES (?, ?, ?)`,
              ['orders', 'completed', orders.length],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to log sync' });
                }

                res.json({
                  success: true,
                  message: `Synced ${orders.length} orders to QuickBooks`,
                  orders_synced: orders.length,
                  sync_log_id: syncLogId
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Error syncing orders:', error);
    res.status(500).json({ error: 'Failed to sync orders' });
  }
};

/**
 * Sync customers to QuickBooks
 */
const syncCustomers = async (req, res) => {
  try {
    db.get(
      `SELECT * FROM quickbooks_config WHERE company_id = 'COMPANY_001'`,
      (err, config) => {
        if (err || !config) {
          return res.status(400).json({ 
            error: 'QuickBooks not connected' 
          });
        }

        // Get all retailers
        db.all(
          `SELECT * FROM users WHERE role = 'retailer'`,
          (err, customers) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            db.run(
              `INSERT INTO qb_sync_log (sync_type, status, items_synced)
               VALUES (?, ?, ?)`,
              ['customers', 'completed', customers.length],
              (err) => {
                if (err) {
                  return res.status(500).json({ error: 'Failed to log sync' });
                }

                res.json({
                  success: true,
                  message: `Synced ${customers.length} customers to QuickBooks`,
                  customers_synced: customers.length
                });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('Error syncing customers:', error);
    res.status(500).json({ error: 'Failed to sync customers' });
  }
};

/**
 * Get account mappings
 */
const getAccountMapping = async (req, res) => {
  try {
    db.all(
      `SELECT * FROM account_mapping ORDER BY category, local_account`,
      (err, mappings) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          mappings,
          categories: ['revenue', 'expense', 'asset', 'liability', 'equity']
        });
      }
    );
  } catch (error) {
    console.error('Error fetching account mappings:', error);
    res.status(500).json({ error: 'Failed to fetch account mappings' });
  }
};

/**
 * Update account mappings
 */
const updateAccountMapping = async (req, res) => {
  try {
    const { local_account, qb_account_id, qb_account_name, category } = req.body;

    if (!local_account || !qb_account_id || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: local_account, qb_account_id, category' 
      });
    }

    // Check if mapping exists
    db.get(
      `SELECT id FROM account_mapping WHERE local_account = ?`,
      [local_account],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          // Update existing mapping
          db.run(
            `UPDATE account_mapping 
             SET qb_account_id = ?, qb_account_name = ?, category = ?, updated_at = CURRENT_TIMESTAMP
             WHERE local_account = ?`,
            [qb_account_id, qb_account_name, category, local_account],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to update mapping' });
              }
              res.json({ success: true, message: 'Mapping updated successfully' });
            }
          );
        } else {
          // Create new mapping
          db.run(
            `INSERT INTO account_mapping (local_account, qb_account_id, qb_account_name, category)
             VALUES (?, ?, ?, ?)`,
            [local_account, qb_account_id, qb_account_name, category],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to create mapping' });
              }
              res.json({ success: true, message: 'Mapping created successfully' });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Error updating account mapping:', error);
    res.status(500).json({ error: 'Failed to update account mapping' });
  }
};

/**
 * Get reconciliation data
 */
const getReconciliation = async (req, res) => {
  try {
    // Mock reconciliation data
    const reconciliation = {
      last_reconciliation: new Date().toISOString().split('T')[0],
      local_transactions: 156,
      qb_transactions: 156,
      matched: 150,
      unmatched_local: 6,
      unmatched_qb: 6,
      discrepancies: [
        {
          type: 'missing_in_qb',
          local_id: 'ORD-123',
          amount: 450.00,
          date: '2026-02-10'
        },
        {
          type: 'amount_mismatch',
          local_id: 'ORD-145',
          qb_id: 'INV-998',
          local_amount: 320.00,
          qb_amount: 325.00,
          difference: 5.00
        }
      ]
    };

    res.json(reconciliation);
  } catch (error) {
    console.error('Error fetching reconciliation:', error);
    res.status(500).json({ error: 'Failed to fetch reconciliation data' });
  }
};

module.exports = {
  connectQuickBooks,
  quickbooksCallback,
  triggerSync,
  getSyncStatus,
  syncOrders,
  syncCustomers,
  getAccountMapping,
  updateAccountMapping,
  getReconciliation
};
