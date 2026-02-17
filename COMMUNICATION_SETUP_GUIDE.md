# Communication Setup Guide

This guide enables direct communication between:
- Approved supplier-retailer counterparties
- Same-business employees (supplier↔supplier team, retailer↔retailer team)

## Prerequisites
- Backend running on `http://localhost:10000`
- Valid supplier and retailer accounts (example seeded users)
- Existing supplier approval relationship (retailer approved by supplier)

## Start Services

### Backend
```powershell
cd backend
npm start
```

### Frontend (optional for UI checks)
```powershell
cd frontend
npm run dev
```

## Communication Rules
- Only supplier/retailer users can use communication APIs.
- Users can communicate when either condition is true:
	- Approved supplier-retailer pair
	- Same-business employee team contact (same `business_name` and same role family)
- These rules are enforced on both messaging and call logs.

## Simple Employee Messaging (UI)

- Supplier dashboard: open **Employees** in the header, or use `http://localhost:3000/messages?scope=team`
- Retailer dashboard: open **Employees** in the header, or use `http://localhost:3000/messages?scope=team`
- The team scope shows employee contacts only.

## Quick API Smoke Test (PowerShell)

```powershell
$base = 'http://localhost:10000'

# Login as supplier (example user)
$supplierLogin = @{ email='john@example.com'; password='password123' } | ConvertTo-Json
$supplier = Invoke-RestMethod -Method Post -Uri "$base/api/auth/login" -ContentType 'application/json' -Body $supplierLogin
$supplierHeaders = @{ Authorization = "Bearer $($supplier.token)" }

# Get approved contacts
Invoke-RestMethod -Method Get -Uri "$base/api/communication/contacts" -Headers $supplierHeaders

# Get only employee/team contacts
Invoke-RestMethod -Method Get -Uri "$base/api/communication/contacts?teamOnly=true" -Headers $supplierHeaders

# Send message to approved retailer (example retailer id: 2)
$msgBody = @{ recipient_id=2; content='Hello from supplier account' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/messages" -Headers $supplierHeaders -ContentType 'application/json' -Body $msgBody

# Read conversation
Invoke-RestMethod -Method Get -Uri "$base/api/messages?with_user_id=2" -Headers $supplierHeaders

# Log call
$callBody = @{ recipient_id=2; call_type='outbound'; duration_seconds=300; notes='Restock discussion' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/calls" -Headers $supplierHeaders -ContentType 'application/json' -Body $callBody

# Read call logs
Invoke-RestMethod -Method Get -Uri "$base/api/calls?with_user_id=2" -Headers $supplierHeaders
```

## Endpoints
- `GET /api/communication/contacts`
- `POST /api/messages`
- `GET /api/messages`
- `POST /api/calls`
- `GET /api/calls`

## Contact Query Options
- `GET /api/communication/contacts?teamOnly=true` → employee contacts only
- `GET /api/communication/contacts` → approved counterparties + employees

For full request/response details, see `COMMUNICATION_API_DOCUMENTATION.md`.
