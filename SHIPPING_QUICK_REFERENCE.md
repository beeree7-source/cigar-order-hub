# Phase 5 Quick Reference - Shipping Integration

## 🚀 Quick Start

### For Suppliers: Adding Shipping Account
1. Navigate to `/suppliers/shipping-settings`
2. Click "Add New Shipping Account"
3. Select UPS or USPS
4. Enter account credentials:
   - Account Number (e.g., 1Z... for UPS)
   - Password
   - API Key
   - Meter Number (UPS only, optional)
5. Submit - Account will be pending verification
6. Admin reviews and activates account
7. Once active, labels auto-generate for orders

### For Warehouse: Printing Labels
1. Navigate to `/warehouse/print-queue`
2. View dashboard stats at top
3. Filter by status (Ready to Print, printed)
4. Filter by carrier (UPS, USPS)
5. Click "📥 Download PDF" for label
6. Print on thermal or regular printer
7. Apply label to package
8. Click "✓ Mark Printed" to confirm
9. Move to next label

---

## 📡 API Endpoints Quick Reference

### Supplier Account Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/suppliers/:id/shipping/account` | Add account |
| GET | `/api/suppliers/:id/shipping/accounts` | List accounts |
| PUT | `/api/suppliers/:id/shipping/account/:aid` | Update account |
| DELETE | `/api/suppliers/:id/shipping/account/:aid` | Remove account |
| POST | `/api/suppliers/:id/shipping/account/:aid/verify` | Admin verify |

### Label & Print Queue
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/orders/:id/shipping/label/generate` | Create label |
| GET | `/api/warehouse/shipping-labels/queue` | Get queue |
| GET | `/api/warehouse/shipping-labels/:id` | Get label |
| POST | `/api/warehouse/shipping-labels/:id/printed` | Mark printed |
| GET | `/api/orders/:id/shipping/labels` | Order labels |

---

## 🔐 Data Security

**Credential Storage:**
- Account numbers: Encrypted (masked in UI as ****789)
- Passwords: Encrypted
- API Keys: Encrypted
- Only accessible to supplier who created them and admins

**Access Control:**
- Suppliers can only manage their own accounts
- Warehouse staff can view and print labels
- Admins can verify accounts and view all accounts

**Audit Trail:**
- All account changes logged with user ID, IP, timestamp
- Label generation tracked with warehouse staff ID
- Print confirmations recorded with time

---

## 📊 Data Models

### Shipping Account
```json
{
  "id": 1,
  "supplier_id": 1,
  "carrier": "UPS",
  "account_number_masked": "*****789",
  "status": "active",
  "last_verified": "2026-02-15",
  "connected_at": "2026-01-20"
}
```

### Print Queue Label
```json
{
  "id": 1,
  "order_id": 5,
  "carrier": "UPS",
  "tracking_number": "1Z4A6G9B2C8D5E1F",
  "status": "ready_to_print",
  "label_url": "/uploads/labels/label_1_ups.pdf",
  "retailer_name": "John's Shop",
  "printer_status": "Ready"
}
```

---

## ⚠️ Common Issues & Fixes

### "Supplier does not have an active UPS account"
**Issue:** Trying to generate label but no active account
**Fix:** Add account in shipping settings and have admin verify

### "Label already exists for this order"
**Issue:** Label was already generated
**Fix:** View existing label in order details or print queue

### "Not authorized to add accounts"
**Issue:** Wrong user role
**Fix:** Must be logged in as supplier or admin

### Label PDF not downloading
**Issue:** Browser blocked popup or PDF plugin missing
**Fix:** Check browser settings, allow popups, install PDF viewer

---

## 📝 Test Cases

### Test 1: Add UPS Account
```bash
curl -X POST http://localhost:10000/api/suppliers/1/shipping/account \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier":"UPS",
    "account_number":"1Z12345",
    "password":"pwd123",
    "api_key":"key123"
  }'
```

### Test 2: Generate Label
```bash
curl -X POST http://localhost:10000/api/orders/1/shipping/label/generate \
  -H "Authorization: Bearer WAREHOUSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "carrier":"UPS",
    "service_type":"ground"
  }'
```

### Test 3: Get Print Queue
```bash
curl http://localhost:10000/api/warehouse/shipping-labels/queue \
  -H "Authorization: Bearer TOKEN"
```

### Test 4: Mark Printed
```bash
curl -X POST http://localhost:10000/api/warehouse/shipping-labels/1/printed \
  -H "Authorization: Bearer WAREHOUSE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"printer_name":"Thermal Printer 1"}'
```

---

## 🔄 Complete Fulfillment Workflow

```
1. Order Placed
   └─> Retailer places order with supplier

2. Warehouse Receives
   └─> Pick list generated
   └─> Items picked and scanned
   └─> Order packed

3. Manual Status Update
   └─> Warehouse staff marks: "ready_to_ship"

4. Auto Label Generation ⭐
   └─> System checks supplier account active
   └─> Generates tracking number
   └─> Creates label PDF
   └─> Adds to print queue

5. Warehouse Printing
   └─> Staff views print queue
   └─> Downloads label PDF
   └─> Prints on printer
   └─> Applies to package
   └─> Marks as printed

6. Carrier Pickup
   └─> Carrier collects with tracking number
   └─> Customer receives tracking link
   └─> Delivery updates sent automatically
```

---

## 🛠️ Maintenance Tasks

### Monthly
- [ ] Review shipping account usage
- [ ] Check print queue performance
- [ ] Verify all labels generating successfully
- [ ] Monitor carrier API health

### Quarterly
- [ ] Review and renew shipping account credentials
- [ ] Update carrier service type rates
- [ ] Audit account permissions
- [ ] Test label PDF generation

### As Needed
- [ ] Add new suppliers
- [ ] Verify new accounts
- [ ] Troubleshoot label generation failures
- [ ] Update carrier APIs to latest versions

---

## 📚 Related Documentation

- **Full Implementation:** `PHASE_5_IMPLEMENTATION_COMPLETE.md`
- **API Testing:** `SHIPPING_ENDPOINTS_TEST.md`
- **Database Schema:** `backend/migrations/006_create_shipping_tables.sql`
- **Service Layer:** `backend/shipping-integration.js`
- **Constants:** `backend/shipping-constants.js`

---

## 💡 Tips & Tricks

1. **Batch Printing:** Filter by carrier to print UPS or USPS labels in batches
2. **Reprint Labels:** Click "Reprint" on already-printed labels to regenerate PDFs
3. **View History:** Check label timestamps to track printing schedule
4. **Monitor Queue:** Keep print queue page open on tablet for real-time updates
5. **Filter Efficiently:** Use both status and carrier filters to narrow down results

---

## 🚨 Critical Alerts

- ⚠️ Account pending verification? Ask admin to verify before using
- ⚠️ No active account? Add one in shipping settings before placing orders
- ⚠️ Label PDF missing? Download and print manually or regenerate
- ⚠️ Print queue full? Check if labels are marked printed or archived

---

## 📞 Support

For issues with:
- **Backend errors:** Check response message field for details
- **Frontend crashes:** Clear browser cache and reload
- **Database:** Verify migration was applied (check sqlite_master table)
- **API authentication:** Ensure token in Authorization header is valid

**Status Page:** `/health` endpoint shows system status

---

Generated: February 2026  
Last Updated: Phase 5 Complete  
Version: 1.0.0
