-- QuickBooks configuration table
CREATE TABLE IF NOT EXISTS quickbooks_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id TEXT UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  realm_id TEXT,
  sync_status TEXT DEFAULT 'not_connected',
  last_sync DATETIME,
  token_expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- QuickBooks sync log table
CREATE TABLE IF NOT EXISTS qb_sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  items_synced INTEGER DEFAULT 0,
  last_sync DATETIME DEFAULT CURRENT_TIMESTAMP,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Account mapping table
CREATE TABLE IF NOT EXISTS account_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  local_account TEXT NOT NULL,
  qb_account_id TEXT,
  qb_account_name TEXT,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
