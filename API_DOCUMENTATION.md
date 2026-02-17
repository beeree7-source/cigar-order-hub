# Phase 4 Features - API Documentation

Complete API reference for all Phase 4 enterprise features.

## Base URL
```
http://localhost:4000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Section Index
- [Email Notifications API](#email-notifications-api)
- [Supplier Dashboard API](#supplier-dashboard-api)
- [Advanced Reports API](#advanced-reports-api)
- [QuickBooks Integration API](#quickbooks-integration-api)
- [Accounting Hub API](#accounting-hub-api)
- [Invoice API](#invoice-api)
- [Inventory Import API](#inventory-import-api)
- [Supplier Catalog / Pricelist API](#supplier-catalog--pricelist-api)
- [Communication API](#communication-api)

---

## Email Notifications API

### Send Test Email
Send a test email to verify email configuration.

**Endpoint:** `POST /api/protected/notifications/email/test`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "messageId": "1234567890"
}
```

### Get Notification Settings
Retrieve notification preferences for the authenticated user.

**Endpoint:** `GET /api/protected/notifications/settings`

**Response:**
```json
{
  "user_id": 1,
  "email_alerts": 1,
  "sms_alerts": 0,
  "low_stock_alert": 1,
  "order_confirmation": 1,
  "shipment_notification": 1,
  "payment_reminder": 1,
  "weekly_summary": 1
}
```

### Update Notification Settings
Update notification preferences.

**Endpoint:** `PUT /api/protected/notifications/settings`

**Request:**
```json
{
  "email_alerts": true,
  "low_stock_alert": true,
  "order_confirmation": true,
  "shipment_notification": true,
  "payment_reminder": false,
  "weekly_summary": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

### Get Notification History
Retrieve sent notifications history.

**Endpoint:** `GET /api/protected/notifications/history`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by notification type

**Response:**
```json
{
  "notifications": [
    {
      "id": 1,
      "user_id": 1,
      "type": "order_confirmation",
      "subject": "Order Confirmation #123",
      "body": "...",
      "sent_at": "2026-02-15T10:00:00Z",
      "status": "sent"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

## Supplier Dashboard API

Detailed endpoint reference: `SUPPLIER_API_DOCUMENTATION.md`

### Get All Suppliers
List all suppliers with their metrics.

**Endpoint:** `GET /api/protected/suppliers`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**
```json
{
  "suppliers": [
    {
      "id": 1,
      "name": "Premium Tobacco Co",
      "email": "supplier@example.com",
      "approved": 1,
      "total_orders": 150,
      "on_time_percentage": 95.5,
      "quality_rating": 4.8,
      "total_revenue": 125000.00,
      "outstanding_balance": 5000.00,
      "credit_limit": 50000.00,
      "payment_terms": "Net 30"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1
  }
}
```

### Get Supplier Analytics
Detailed analytics for a specific supplier.

**Endpoint:** `GET /api/protected/suppliers/:id/analytics`

**Response:**
```json
{
  "supplier": {
    "id": 1,
    "name": "Premium Tobacco Co",
    "email": "supplier@example.com",
    "on_time_percentage": 95.5,
    "quality_rating": 4.8,
    "total_revenue": 125000.00
  },
  "analytics": {
    "orders": {
      "total_orders": 150,
      "completed_orders": 140,
      "pending_orders": 8,
      "cancelled_orders": 2
    },
    "monthlyTrend": [
      { "month": "2026-02", "order_count": 25 },
      { "month": "2026-01", "order_count": 30 }
    ],
    "topProducts": [
      {
        "id": 1,
        "name": "Premium Cigars",
        "sku": "CIG-001",
        "price": 10.00,
        "stock": 500
      }
    ],
    "performance": {
      "on_time_percentage": 95.5,
      "quality_rating": 4.8,
      "total_revenue": 125000.00,
      "outstanding_balance": 5000.00
    }
  }
}
```

### Get Supplier Orders
List all orders from a specific supplier.

**Endpoint:** `GET /api/protected/suppliers/:id/orders`

**Query Parameters:**
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "orders": [
    {
      "id": 123,
      "retailer_id": 5,
      "retailer_name": "Retail Store Inc",
      "retailer_email": "retailer@example.com",
      "items": [...],
      "status": "completed",
      "created_at": "2026-02-10T10:00:00Z"
    }
  ],
  "pagination": {...}
}
```

### Get Supplier Balance
Get supplier balance and payment information.

**Endpoint:** `GET /api/protected/suppliers/:id/balance`

**Response:**
```json
{
  "balance": {
    "name": "Premium Tobacco Co",
    "email": "supplier@example.com",
    "outstanding_balance": 5000.00,
    "credit_limit": 50000.00,
    "payment_terms": "Net 30",
    "available_credit": 45000.00
  },
  "payments": [
    {
      "id": 1,
      "amount": 10000.00,
      "payment_date": "2026-02-01T10:00:00Z",
      "payment_method": "Bank Transfer",
      "reference_number": "TXN-12345"
    }
  ]
}
```

### Update Supplier Terms
Update payment terms and credit limit.

**Endpoint:** `PUT /api/protected/suppliers/:id/terms`

**Request:**
```json
{
  "credit_limit": 75000.00,
  "payment_terms": "Net 45"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment terms updated successfully"
}
```

---

## Advanced Reports API

### Quarterly Revenue Report
Get revenue breakdown by quarter.

**Endpoint:** `GET /api/protected/reports/quarterly`

**Query Parameters:**
- `year` (optional): Year (default: current year)

**Response:**
```json
{
  "year": 2026,
  "quarters": [
    {
      "quarter": "Q1",
      "year": 2026,
      "revenue": 125000.00,
      "order_count": 450
    },
    {
      "quarter": "Q2",
      "year": 2026,
      "revenue": 0,
      "order_count": 0
    }
  ],
  "total": 125000.00
}
```

### Supplier Performance Report
Analyze supplier performance metrics.

**Endpoint:** `GET /api/protected/reports/supplier-performance`

**Response:**
```json
{
  "suppliers": [
    {
      "id": 1,
      "name": "Premium Tobacco Co",
      "email": "supplier@example.com",
      "total_orders": 150,
      "completed_orders": 140,
      "completion_rate": 93,
      "on_time_percentage": 95.5,
      "quality_rating": 4.8,
      "total_revenue": 125000.00
    }
  ],
  "summary": {
    "total_suppliers": 5,
    "avg_completion_rate": 91.2,
    "avg_quality_rating": 4.6
  }
}
```

### Customer Lifetime Value (LTV)
Calculate customer lifetime value and metrics.

**Endpoint:** `GET /api/protected/reports/customer-ltv`

**Response:**
```json
{
  "customers": [
    {
      "id": 1,
      "name": "Retail Store Inc",
      "email": "retailer@example.com",
      "total_orders": 50,
      "lifetime_value": 25000.00,
      "avg_order_value": 500.00,
      "days_as_customer": 365,
      "orders_per_month": 4.11
    }
  ],
  "summary": {
    "total_customers": 20,
    "avg_ltv": 15000.00,
    "total_revenue": 300000.00
  }
}
```

### Profit Analysis
Analyze profit margins by product.

**Endpoint:** `GET /api/protected/reports/profit-analysis`

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response:**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Premium Cigars",
      "sku": "CIG-001",
      "supplier_name": "Premium Tobacco Co",
      "times_ordered": 45,
      "total_quantity_sold": 4500,
      "current_price": 10.00,
      "total_revenue": 45000.00,
      "estimated_cost": 7.00,
      "estimated_profit": 13500.00,
      "margin_percentage": 30.00
    }
  ],
  "summary": {
    "total_revenue": 125000.00,
    "total_profit": 37500.00,
    "avg_margin": 30.00
  }
}
```

### Tax Summary Report
Generate tax calculations for a specific year.

**Endpoint:** `GET /api/protected/reports/tax-summary`

**Query Parameters:**
- `year` (optional): Year (default: current year)

**Response:**
```json
{
  "year": 2026,
  "monthly": [
    {
      "month": "Jan",
      "month_num": "01",
      "gross_sales": 50000.00,
      "sales_tax": 4000.00,
      "total_discounts": 2500.00,
      "net_revenue": 51500.00,
      "invoice_count": 150
    }
  ],
  "annual_totals": {
    "gross_sales": 500000.00,
    "sales_tax": 40000.00,
    "total_discounts": 25000.00,
    "net_revenue": 515000.00,
    "invoice_count": 1500
  }
}
```

### Year-over-Year Comparison
Compare current year performance to previous year.

**Endpoint:** `GET /api/protected/reports/yoy-comparison`

**Response:**
```json
{
  "current_year": {
    "year": 2026,
    "total_orders": 150,
    "unique_customers": 25,
    "revenue": 125000.00
  },
  "previous_year": {
    "year": 2025,
    "total_orders": 120,
    "unique_customers": 20,
    "revenue": 100000.00
  },
  "growth": {
    "orders": 25.00,
    "customers": 25.00,
    "revenue": 25.00
  }
}
```

---

## QuickBooks Integration API

Protected QuickBooks endpoints require JWT auth and are available to `supplier`, `retailer`, and `admin` roles.

### Connect to QuickBooks
Initiate OAuth flow to connect QuickBooks.

**Endpoint:** `GET /api/protected/quickbooks/connect`

**Response:**
```json
{
  "authUrl": "https://appcenter.intuit.com/connect/oauth2?...",
  "message": "Redirect user to this URL to authorize QuickBooks access",
  "note": "This is a mock implementation"
}
```

### OAuth Callback
Handle OAuth callback (called by QuickBooks).

Note: Callback is intentionally public (no JWT header) because it is called by Intuit OAuth redirect.

**Endpoint:** `GET /api/protected/quickbooks/callback`

**Query Parameters:**
- `code`: Authorization code
- `realmId`: QuickBooks realm ID
- `state`: Security token

**Response:**
```json
{
  "success": true,
  "message": "QuickBooks connected successfully",
  "realm_id": "123456789"
}
```

### Trigger Full Sync
Start a full synchronization with QuickBooks.

**Endpoint:** `POST /api/protected/quickbooks/sync`

**Response:**
```json
{
  "success": true,
  "message": "Sync started",
  "sync_log_id": 1
}
```

### Get Sync Status
Check current synchronization status.

**Endpoint:** `GET /api/protected/quickbooks/status`

**Response:**
```json
{
  "connected": true,
  "status": "synced",
  "realm_id": "123456789",
  "last_sync": "2026-02-15T10:00:00Z",
  "token_expires_at": "2026-02-15T11:00:00Z",
  "recent_syncs": [
    {
      "id": 1,
      "sync_type": "full_sync",
      "status": "completed",
      "items_synced": 45,
      "last_sync": "2026-02-15T10:00:00Z"
    }
  ]
}
```

### Sync Orders to QuickBooks
Sync orders from last 30 days.

**Endpoint:** `POST /api/protected/quickbooks/sync-orders`

**Response:**
```json
{
  "success": true,
  "message": "Synced 25 orders to QuickBooks",
  "orders_synced": 25,
  "sync_log_id": 2
}
```

### Sync Customers to QuickBooks
Sync all customer (retailer) accounts.

**Endpoint:** `POST /api/protected/quickbooks/sync-customers`

**Response:**
```json
{
  "success": true,
  "message": "Synced 20 customers to QuickBooks",
  "customers_synced": 20
}
```

### Get Account Mappings
Retrieve chart of accounts mappings.

**Endpoint:** `GET /api/protected/quickbooks/mapping`

**Response:**
```json
{
  "mappings": [
    {
      "id": 1,
      "local_account": "Sales Revenue",
      "qb_account_id": "80",
      "qb_account_name": "Sales",
      "category": "revenue"
    }
  ],
  "categories": ["revenue", "expense", "asset", "liability", "equity"]
}
```

### Update Account Mapping
Create or update an account mapping.

**Endpoint:** `PUT /api/protected/quickbooks/mapping`

**Request:**
```json
{
  "local_account": "Sales Revenue",
  "qb_account_id": "80",
  "qb_account_name": "Sales",
  "category": "revenue"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Mapping updated successfully"
}
```

### Get Reconciliation Data
View reconciliation status and discrepancies.

**Endpoint:** `GET /api/protected/quickbooks/reconciliation`

**Response:**
```json
{
  "last_reconciliation": "2026-02-15",
  "local_transactions": 156,
  "qb_transactions": 156,
  "matched": 150,
  "unmatched_local": 6,
  "unmatched_qb": 6,
  "discrepancies": [
    {
      "type": "missing_in_qb",
      "local_id": "ORD-123",
      "amount": 450.00,
      "date": "2026-02-10"
    },
    {
      "type": "amount_mismatch",
      "local_id": "ORD-145",
      "qb_id": "INV-998",
      "local_amount": 320.00,
      "qb_amount": 325.00,
      "difference": 5.00
    }
  ]
}
```

---

## Accounting Hub API

Accounting Hub endpoints provide QuickBooks-equivalent accounting functions with a provider abstraction and backup-file onboarding.

Current mode (temporary):
- `ACCOUNTING_SUITE_ENABLED=false` by default (paused)
- While paused, only these `/api/accounting/*` routes are available:
  - `POST /api/accounting/sync`
  - `POST /api/accounting/sync-outbound`
  - `POST /api/accounting/sync-orders`
  - `POST /api/accounting/sync-customers`
  - `POST /api/accounting/invoices/upload`
- Other Accounting Hub routes return `503` with a temporary-disabled response.

Access:
- Requires JWT auth
- Roles: `supplier`, `retailer`, `admin`
- Mounted at `/api/accounting/*`

### List Accounting Providers

`503` while Accounting Suite is paused.

**Endpoint:** `GET /api/accounting/providers`

**Response:**
```json
{
  "providers": [
    {
      "id": "quickbooks",
      "name": "QuickBooks Online",
      "status": "available"
    }
  ],
  "features": [
    "oauth_connect",
    "full_sync",
    "sync_orders",
    "sync_customers",
    "account_mapping",
    "reconciliation",
    "backup_import"
  ]
}
```

### Start Accounting Connect Flow

`503` while Accounting Suite is paused.

**Endpoint:** `GET /api/accounting/connect`

**Response:**
```json
{
  "authUrl": "https://appcenter.intuit.com/connect/oauth2?...",
  "message": "Redirect user to this URL to authorize QuickBooks access"
}
```

### Get Accounting Status

`503` while Accounting Suite is paused.

**Endpoint:** `GET /api/accounting/status`

**Response:**
```json
{
  "connected": true,
  "status": "synced",
  "realm_id": "123456789",
  "last_sync": "2026-02-16T10:00:00Z",
  "recent_syncs": [
    {
      "id": 1,
      "sync_type": "full_sync",
      "status": "completed",
      "items_synced": 45,
      "created_at": "2026-02-16T10:00:00Z"
    }
  ]
}
```

### Trigger Full Sync

**Endpoint:** `POST /api/accounting/sync`

### Sync Outbound (Explicit)

Use explicit outbound sync naming for accounting teams.

**Endpoint:** `POST /api/accounting/sync-outbound`

### Sync Inbound (Explicit)

`503` while Accounting Suite is paused.

Use explicit inbound sync naming for accounting teams.

**Endpoint:** `POST /api/accounting/sync-inbound`

**Notes:**
- File-based inbound migration is done with `POST /api/accounting/import-backup`
- Supports CSV/XLSX/JSON/QBO/OFX/TXT backup-style data

### Sync Orders

**Endpoint:** `POST /api/accounting/sync-orders`

### Sync Customers

**Endpoint:** `POST /api/accounting/sync-customers`

### Get Account Mapping

`503` while Accounting Suite is paused.

**Endpoint:** `GET /api/accounting/mapping`

### Update Account Mapping

`503` while Accounting Suite is paused.

**Endpoint:** `PUT /api/accounting/mapping`

**Request:**
```json
{
  "local_account": "Sales Revenue",
  "qb_account_id": "80",
  "qb_account_name": "Sales",
  "category": "revenue"
}
```

### Get Reconciliation View

`503` while Accounting Suite is paused.

**Endpoint:** `GET /api/accounting/reconciliation`

### Import Accounting Backup

`503` while Accounting Suite is paused.

Imports account mappings from backup-like exports and marks accounting connection as ready.

**Endpoint:** `POST /api/accounting/import-backup`

**Content-Type:** `multipart/form-data`

**Form Field:**
- `backupFile` (required)

**Supported Formats:**
- `.csv`
- `.xls`, `.xlsx`
- `.json`
- `.qbo`, `.ofx`, `.txt`

**CSV/Excel/JSON Mapping Columns (flexible aliases supported):**
- `local_account`
- `qb_account_id`
- `qb_account_name`
- `category`

**Sample CSV (quick test):**
```csv
local_account,qb_account_id,qb_account_name,category
Cash On Hand,QB-1001,Cash,asset
Accounts Payable,QB-2001,AP,liability
```

**PowerShell Accounting Backup Import Example (Windows):**
```powershell
$base = 'http://localhost:10000'
$loginBody = @{ email='john@example.com'; password='password123' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body $loginBody
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

$backupPath = Join-Path $PWD 'sample-accounting-backup.csv'

@"
local_account,qb_account_id,qb_account_name,category
Cash On Hand,QB-1001,Cash,asset
Accounts Payable,QB-2001,AP,liability
"@ | Set-Content -Path $backupPath -Encoding UTF8

Invoke-RestMethod -Method Post \
  -Uri "$base/api/accounting/import-backup" \
  -Headers $headers \
  -Form @{ backupFile = Get-Item $backupPath }
```

**Response:**
```json
{
  "success": true,
  "message": "Accounting backup imported successfully",
  "importedMappings": 2,
  "sourceFile": "backup.csv",
  "notes": [
    "Account mappings imported/updated",
    "QuickBooks connection marked as connected",
    "Use sync endpoints to continue reconciliation"
  ]
}
```

### Upload Invoice File

Upload an invoice artifact into the accounting flow.

**Endpoint:** `POST /api/accounting/invoices/upload`

**Content-Type:** `multipart/form-data`

**Form Fields:**
- `invoiceFile` (required)
- `invoiceId` (optional)

**Response:**
```json
{
  "success": true,
  "message": "Invoice file uploaded successfully",
  "invoiceUpload": {
    "invoiceId": "12",
    "filename": "invoice_1739700000000_upload.pdf",
    "originalFilename": "upload.pdf",
    "mimeType": "application/pdf",
    "size": 12345,
    "uploadedAt": "2026-02-16T20:00:00.000Z"
  }
}
```

---

## Invoice API

Invoice management endpoints are mounted under `/api/invoices` and require JWT auth.

### Generate Invoice for Order

**Endpoint:** `POST /api/invoices/order/:id/generate`

**Troubleshooting Note (Price Resolution):**
- If order items do not include inline `price` fields (for example `{ "productId": 1, "quantity": 2 }`), invoice generation automatically resolves prices from the `products` table using `productId`/`product_id`.
- If a product cannot be found, its price resolves to `0`, so verify product records first if totals look lower than expected.
- If the target order already has an invoice, the endpoint returns an "Invoice already exists for this order" error.

### List Invoices

**Endpoint:** `GET /api/invoices`

### Get Invoice Details

**Endpoint:** `GET /api/invoices/:id`

### Download Invoice PDF/Text

**Endpoint:** `GET /api/invoices/:id/pdf`

### Send Invoice by Email

**Endpoint:** `POST /api/invoices/:id/email`

### Pay Invoice

Mark an invoice as paid.

**Endpoint:** `POST /api/invoices/:id/pay`

### Update Invoice Status

**Endpoint:** `PATCH /api/invoices/:id/status`

**Request:**
```json
{
  "status": "paid"
}
```

**PowerShell Full Invoice E2E Example (Windows):**
```powershell
$base = 'http://localhost:10000'
$loginBody = @{ email='john@example.com'; password='password123' } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body $loginBody
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

# 1) Create order
$createBody = @{ supplier_id=1; products=@(@{ product_id=1; quantity=1 }) } | ConvertTo-Json -Depth 5
$created = Invoke-RestMethod -Method Post -Uri "$base/api/orders" -Headers $headers -ContentType 'application/json' -Body $createBody
$orderId = $created.order.id

# 2) Generate invoice
$genBody = @{ discount=0; taxRate=0.08; paymentTerms='Net 30'; notes='API docs E2E test' } | ConvertTo-Json
$invoice = Invoke-RestMethod -Method Post -Uri "$base/api/invoices/order/$orderId/generate" -Headers $headers -ContentType 'application/json' -Body $genBody
$invoiceId = $invoice.invoice.id

# 3) Mark paid and verify
$pay = Invoke-RestMethod -Method Post -Uri "$base/api/invoices/$invoiceId/pay" -Headers $headers -ContentType 'application/json' -Body '{}'
$details = Invoke-RestMethod -Method Get -Uri "$base/api/invoices/$invoiceId" -Headers $headers

Write-Output ("ORDER_ID=" + $orderId)
Write-Output ("INVOICE_ID=" + $invoiceId)
Write-Output ("PAY_MSG=" + $pay.message)
Write-Output ("INVOICE_STATUS=" + $details.status)
```

---

## Inventory Import API

Inventory import endpoints support `supplier`, `retailer`, and `admin` roles for onboarding existing inventory files.

### Preview Inventory File
Parse CSV, Excel, or PDF and return normalized preview rows before commit.

**Endpoint:** `POST /inventory-import/preview`

**Content-Type:** `multipart/form-data`

**Form Field:**
- `inventoryFile` (required): `.csv`, `.xls`, `.xlsx`, or `.pdf`

**Response:**
```json
{
  "message": "Inventory file parsed successfully",
  "sourceType": "csv",
  "fileName": "inventory.csv",
  "headers": ["name", "sku", "price", "stock"],
  "detectedColumnMap": {
    "name": "name",
    "sku": "sku",
    "price": "price",
    "stock": "stock"
  },
  "totalRows": 120,
  "validRows": 115,
  "skippedRows": 5,
  "preview": [
    {
      "name": "Premium Cigar A",
      "sku": "SKU-1001",
      "price": 25.99,
      "stock": 150,
      "category": "Premium",
      "description": "",
      "sourceType": "csv"
    }
  ]
}
```

### Commit Inventory Import
Create products from preview rows (deduplicates by SKU).

**Endpoint:** `POST /inventory-import/commit`

**Request:**
```json
{
  "products": [
    {
      "name": "Premium Cigar A",
      "sku": "SKU-1001",
      "price": 25.99,
      "stock": 150,
      "category": "Premium",
      "description": "Imported from file"
    }
  ]
}
```

**Response:**
```json
{
  "message": "Inventory import completed",
  "importedCount": 1,
  "skippedCount": 0,
  "imported": [
    {
      "id": 99,
      "supplierId": 1,
      "name": "Premium Cigar A",
      "sku": "SKU-1001",
      "price": 25.99,
      "stock": 150,
      "category": "Premium",
      "description": "Imported from file",
      "imageUrl": ""
    }
  ]
}
```

### Download CSV Template
Download a ready-to-fill CSV inventory template.

**Endpoint:** `GET /inventory-import/template.csv`

**Response:**
- `text/csv` attachment (`inventory-import-template.csv`)

### Download Excel Template
Download a ready-to-fill Excel inventory template.

**Endpoint:** `GET /inventory-import/template.xlsx`

**Response:**
- `.xlsx` attachment (`inventory-import-template.xlsx`)

---

## Supplier Catalog / Pricelist API

Allows suppliers to import catalogs/pricelists and control visibility of MSRP and custom columns (e.g., taxes/import fees) for retailers.

### Preview Catalog/Pricelist File

**Endpoint:** `POST /supplier-catalog/pricelist/preview`

**Content-Type:** `multipart/form-data`

**Form Field:**
- `catalogFile` (required): `.csv`, `.xls`, `.xlsx`, or `.pdf`

**Response:**
```json
{
  "message": "Catalog/pricelist parsed successfully",
  "sourceType": "excel",
  "availableDynamicColumns": ["case_size", "origin_country"],
  "totalRows": 50,
  "validRows": 48,
  "skippedRows": 2,
  "preview": [
    {
      "name": "Premium Cigar A",
      "sku": "SKU-1001",
      "price": 25.99,
      "msrp": 34.99,
      "tax": 1.20,
      "importFee": 0.75,
      "dynamicFields": {
        "case_size": "24",
        "origin_country": "Nicaragua"
      }
    }
  ]
}
```

### Save Supplier Catalog/Pricelist

**Endpoint:** `POST /supplier-catalog/pricelist/commit`

**Request:**
```json
{
  "showMSRP": true,
  "selectedColumns": ["case_size", "origin_country"],
  "items": [
    {
      "name": "Premium Cigar A",
      "sku": "SKU-1001",
      "price": 25.99,
      "msrp": 34.99,
      "tax": 1.20,
      "importFee": 0.75,
      "dynamicFields": {
        "case_size": "24",
        "origin_country": "Nicaragua"
      }
    }
  ]
}
```

### Get My Catalog/Pricelist

**Endpoint:** `GET /supplier-catalog/pricelist/my`

### List Suppliers With Catalogs

**Endpoint:** `GET /supplier-catalog/pricelist/suppliers`

### Get Supplier Catalog/Pricelist (Retailer View)

**Endpoint:** `GET /supplier-catalog/pricelist/supplier/:supplierId`

Behavior:
- MSRP is returned only when supplier enabled `showMSRP` (or for supplier/admin owner view).
- Taxes/import fees and any custom columns are returned based on supplier-selected columns.

### Download Catalog/Pricelist CSV Template

**Endpoint:** `GET /supplier-catalog/pricelist/template.csv`

**Response:**
- `text/csv` attachment (`supplier-catalog-pricelist-template.csv`)

### Download Catalog/Pricelist Excel Template

**Endpoint:** `GET /supplier-catalog/pricelist/template.xlsx`

**Response:**
- `.xlsx` attachment (`supplier-catalog-pricelist-template.xlsx`)

---

## Testing with cURL

### Test Email Notification
```bash
# Login first
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supplier@test.com","password":"password123"}' \
  | jq -r '.token')

# Send test email
curl -X POST http://localhost:4000/api/protected/notifications/email/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Generate Invoice
```bash
curl -X POST http://localhost:4000/api/protected/orders/1/invoice \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "discount": 5,
    "taxRate": 0.08,
    "paymentTerms": "Net 30",
    "notes": "Thank you for your business"
  }'
```

### Get Supplier Analytics
```bash
curl http://localhost:4000/api/protected/suppliers/1/analytics \
  -H "Authorization: Bearer $TOKEN"
```

### Get Quarterly Revenue
```bash
curl "http://localhost:4000/api/protected/reports/quarterly?year=2026" \
  -H "Authorization: Bearer $TOKEN"
```

### Trigger QuickBooks Sync
```bash
curl -X POST http://localhost:4000/api/protected/quickbooks/sync \
  -H "Authorization: Bearer $TOKEN"
```

---

## Communication API

Communication endpoints require JWT authentication and are available to `supplier` and `retailer` users.

Allowed communication relationships:
- Approved supplier-retailer counterparties
- Same-business employee/team relationships

### List Communication Contacts

**Endpoint:** `GET /api/communication/contacts`

**Optional Query Parameters:**
- `teamOnly=true` → employee/team contacts only

**Response Fields:**
- `id`, `name`, `email`, `role`, `business_name`
- `employee_role` (nullable)
- `communication_type` (`approved_partner` or `team`)

### Send Message

**Endpoint:** `POST /api/messages`

**Request:**
```json
{
  "recipient_id": 2,
  "content": "Hello team, please confirm today's priorities."
}
```

### List Messages

**Endpoint:** `GET /api/messages`

**Optional Query Parameters:**
- `with_user_id` (number): conversation with one allowed contact

### Log Call

**Endpoint:** `POST /api/calls`

**Request:**
```json
{
  "recipient_id": 2,
  "call_type": "outbound",
  "duration_seconds": 120,
  "notes": "Restock discussion"
}
```

### List Call Logs

**Endpoint:** `GET /api/calls`

**Optional Query Parameters:**
- `with_user_id` (number): call logs with one allowed contact

### Team-Only UI Shortcut

- `GET /messages?scope=team` opens employee-only messaging mode in the web app.

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limiting is implemented. In production, consider:
- 100 requests per minute per user
- 1000 requests per hour per user
- Separate limits for expensive operations (PDF generation, sync)

---

## Notes

- All mock implementations are marked as such in responses
- In production, replace mock email service with Nodemailer/SendGrid
- In production, replace mock QuickBooks with intuit-oauth package
- All timestamps are in ISO 8601 format (UTC)
- All monetary values are in USD
- PDF generation currently returns plain text (implement PDFKit in production)
