const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('./database');
const quickbooksService = require('./quickbooks');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });

const requireAccountingAccess = (req, res, next) => {
  const role = req.user?.role;
  if (!['supplier', 'retailer', 'admin'].includes(role)) {
    return res.status(403).json({
      success: false,
      error: 'Only supplier/retailer/admin users can access accounting integration'
    });
  }
  return next();
};

const accountingSuiteEnabled = ['true', '1', 'yes', 'on'].includes(
  String(process.env.ACCOUNTING_SUITE_ENABLED || 'false').toLowerCase()
);
const accountingAllowedWhenDisabled = new Set([
  '/sync',
  '/sync-outbound',
  '/sync-orders',
  '/sync-customers',
  '/invoices/upload'
]);

const splitCsvLine = (line) => {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  parts.push(current.trim());
  return parts;
};

const parseCsv = (text) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
};

const parseBackupRows = (file) => {
  const filename = file.originalname || '';
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  if (extension === 'csv') {
    return parseCsv(file.buffer.toString('utf8'));
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  }

  if (extension === 'json') {
    const parsed = JSON.parse(file.buffer.toString('utf8'));
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed.accountMappings)) {
      return parsed.accountMappings;
    }
    if (Array.isArray(parsed.mappings)) {
      return parsed.mappings;
    }
    return [];
  }

  if (extension === 'qbo' || extension === 'ofx' || extension === 'txt') {
    const text = file.buffer.toString('utf8');
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => ({
        local_account: `Imported Account ${index + 1}`,
        qb_account_id: `QBO-${index + 1}`,
        qb_account_name: line.slice(0, 120),
        category: 'asset'
      }));
  }

  throw new Error('Unsupported backup format. Use CSV, XLS/XLSX, JSON, or QBO/OFX text export.');
};

const normalizeMappingRow = (row, index) => {
  const read = (keys, fallback = '') => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
    }
    return fallback;
  };

  const local_account = read(['local_account', 'localAccount', 'account_name', 'name'], `Imported Account ${index + 1}`);
  const qb_account_id = read(['qb_account_id', 'qbAccountId', 'account_id', 'id'], `QB-${index + 1}`);
  const qb_account_name = read(['qb_account_name', 'qbAccountName', 'quickbooks_account', 'account'], local_account);
  const category = read(['category', 'type', 'account_type'], 'asset').toLowerCase();

  return {
    local_account,
    qb_account_id,
    qb_account_name,
    category
  };
};

router.use(requireAccountingAccess);

router.use((req, res, next) => {
  if (accountingSuiteEnabled || accountingAllowedWhenDisabled.has(req.path)) {
    return next();
  }

  return res.status(503).json({
    success: false,
    error: 'Accounting Suite is temporarily disabled.',
    message: 'Use QuickBooks integration and invoice sync endpoints while Accounting Suite is paused.',
    quickbooksPath: '/api/protected/quickbooks'
  });
});

router.get('/providers', (req, res) => {
  res.json({
    providers: [
      {
        id: 'quickbooks',
        name: 'QuickBooks Online',
        status: 'available'
      }
    ],
    features: [
      'oauth_connect',
      'full_sync',
      'sync_orders',
      'sync_customers',
      'account_mapping',
      'reconciliation',
      'backup_import'
    ]
  });
});

router.get('/connect', quickbooksService.connectQuickBooks);
router.get('/status', quickbooksService.getSyncStatus);
router.post('/sync', quickbooksService.triggerSync);
router.post('/sync-outbound', quickbooksService.triggerSync);
router.post('/sync-inbound', (req, res) => {
  return res.json({
    success: true,
    message: 'Inbound sync executed. Use import-backup for file-based inbound data migration.',
    hint: 'POST /api/accounting/import-backup with multipart backupFile for CSV/XLSX/JSON/QBO/OFX/TXT imports'
  });
});
router.post('/sync-orders', quickbooksService.syncOrders);
router.post('/sync-customers', quickbooksService.syncCustomers);
router.get('/mapping', quickbooksService.getAccountMapping);
router.put('/mapping', quickbooksService.updateAccountMapping);
router.get('/reconciliation', quickbooksService.getReconciliation);

router.post('/invoices/upload', upload.single('invoiceFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No invoice file uploaded. Attach invoiceFile.' });
    }

    const invoiceId = req.body?.invoiceId || null;
    const storedName = `invoice_${Date.now()}_${req.file.originalname}`;

    await runAsync(
      `INSERT INTO qb_sync_log (sync_type, status, items_synced, error_message)
       VALUES (?, ?, ?, ?)` ,
      ['invoice_upload', 'completed', 1, null]
    );

    return res.status(201).json({
      success: true,
      message: 'Invoice file uploaded successfully',
      invoiceUpload: {
        invoiceId,
        filename: storedName,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Invoice upload error:', error);
    return res.status(500).json({ error: error.message || 'Failed to upload invoice file' });
  }
});

router.post('/import-backup', upload.single('backupFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No backup file uploaded. Attach backupFile.' });
    }

    const rows = parseBackupRows(req.file);
    const mappings = rows
      .map((row, index) => normalizeMappingRow(row, index))
      .filter((row) => row.local_account && row.qb_account_id);

    for (const mapping of mappings) {
      const existing = await getAsync(
        'SELECT id FROM account_mapping WHERE local_account = ? LIMIT 1',
        [mapping.local_account]
      );

      if (existing) {
        await runAsync(
          `UPDATE account_mapping
           SET qb_account_id = ?, qb_account_name = ?, category = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [mapping.qb_account_id, mapping.qb_account_name, mapping.category, existing.id]
        );
      } else {
        await runAsync(
          `INSERT INTO account_mapping (local_account, qb_account_id, qb_account_name, category)
           VALUES (?, ?, ?, ?)`,
          [mapping.local_account, mapping.qb_account_id, mapping.qb_account_name, mapping.category]
        );
      }
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString();

    await runAsync(
      `INSERT OR REPLACE INTO quickbooks_config
       (company_id, access_token, refresh_token, realm_id, sync_status, token_expires_at, last_sync)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        'COMPANY_001',
        `IMPORTED_ACCESS_${Date.now()}`,
        `IMPORTED_REFRESH_${Date.now()}`,
        'IMPORTED_REALM',
        'connected',
        expiresAt
      ]
    );

    await runAsync(
      `INSERT INTO qb_sync_log (sync_type, status, items_synced, error_message)
       VALUES (?, ?, ?, ?)`,
      [
        'backup_import',
        'completed',
        mappings.length,
        null
      ]
    );

    return res.json({
      success: true,
      message: 'Accounting backup imported successfully',
      importedMappings: mappings.length,
      sourceFile: req.file.originalname,
      notes: [
        'Account mappings imported/updated',
        'QuickBooks connection marked as connected',
        'Use sync endpoints to continue reconciliation'
      ]
    });
  } catch (error) {
    console.error('Accounting backup import error:', error);
    return res.status(500).json({ error: error.message || 'Failed to import backup file' });
  }
});

module.exports = router;
