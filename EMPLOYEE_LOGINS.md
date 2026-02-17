# Employee Login Credentials

All employee accounts use the password: **password123**

## 🎯 Sales Team

### Sales Representatives
1. **John Doe** (SR-001)
   - Email: `john@example.com`
   - Role: Sales Representative
   - Territory: Northeast Region
   - Access: Field Sales, Accounts, Orders, Products

2. **Jane Smith** (SR-002)
   - Email: `jane@example.com`
   - Role: Sales Representative  
   - Territory: Midwest Region
   - Access: Field Sales, Accounts, Orders, Products

3. **Mike Johnson** (SR-003)
   - Email: `mike.sales@premiumcigars.com`
   - Role: Sales Representative
   - Territory: West Coast Region
   - Access: Field Sales, Accounts, Orders, Products

### Sales Management
4. **Sarah Williams** (SM-001)
   - Email: `sarah.sales@premiumcigars.com`
   - Role: Sales Manager
   - Access: Field Sales, Accounts, Orders, Products, Analytics, Scheduling
   - Can view all sales data
   - Manages sales reps

## 📦 Warehouse Team

### Warehouse Management
5. **David Martinez** (WM-001)
   - Email: `david.warehouse@premiumcigars.com`
   - Role: Warehouse Manager
   - Access: Warehouse, Products, Orders, Scheduling, Analytics
   - Can manage products and inventory

### Warehouse Workers
6. **Carlos Rodriguez** (WW-001)
   - Email: `carlos.warehouse@premiumcigars.com`
   - Role: Warehouse Worker
   - Access: Warehouse, Products, Orders

7. **Maria Garcia** (WW-002)
   - Email: `maria.warehouse@premiumcigars.com`
   - Role: Warehouse Worker
   - Access: Warehouse, Products, Orders

## 👔 HR & Administration

### HR Team
8. **Linda Chen** (HR-001)
   - Email: `linda.hr@premiumcigars.com`
   - Role: HR Manager
   - Access: HR, Scheduling, Users, Analytics
   - Can manage users and employees

### Finance Team
9. **Robert Taylor** (ACC-001)
   - Email: `robert.accounting@premiumcigars.com`
   - Role: Accountant
   - Access: Orders, Analytics, Contracts
   - Can view all financial data

### System Administration
10. **Admin User** (ADM-001)
    - Email: `admin@example.com`
    - Role: System Administrator
    - Access: ALL FEATURES
    - Full system access and control

## 🚀 Operations Team

11. **Jennifer Brown** (OM-001)
    - Email: `jennifer.ops@premiumcigars.com`
    - Role: Operations Manager
    - Access: Warehouse, Orders, Products, Scheduling, Analytics
    - Can manage products and orders
    - Can view all operational data

## 👥 Customer Service

12. **Kevin Anderson** (CS-001)
    - Email: `kevin.support@premiumcigars.com`
    - Role: Customer Service
    - Access: Orders, Products, Accounts
    - Can manage orders and assist customers

## 🚚 Delivery Team

13. **James Wilson** (DD-001)
    - Email: `james.delivery@premiumcigars.com`
    - Role: Delivery Driver
    - Access: Orders (delivery information)

14. **Thomas Moore** (DD-002)
    - Email: `thomas.delivery@premiumcigars.com`
    - Role: Delivery Driver
    - Access: Orders (delivery information)

---

## 📋 Role Permissions Summary

| Role | Field Sales | Warehouse | HR | Orders | Products | Analytics | Manage Users |
|------|-------------|-----------|-----|--------|----------|-----------|--------------|
| Sales Rep | ✅ | ❌ | ❌ | ✅ | View | ❌ | ❌ |
| Sales Manager | ✅ | ❌ | ❌ | ✅ | View | ✅ | ❌ |
| Warehouse Manager | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Warehouse Worker | ❌ | ✅ | ❌ | View | View | ❌ | ❌ |
| HR Manager | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Accountant | ❌ | ❌ | ❌ | View | ❌ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Operations Manager | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Customer Service | ❌ | ❌ | ❌ | ✅ | View | ❌ | ❌ |
| Delivery Driver | ❌ | ❌ | ❌ | View | ❌ | ❌ | ❌ |

---

## 🔐 API Endpoints for Employee Info

### Get Current Employee Info
```
GET /api/auth/employee-info
Headers: Authorization: Bearer <token>
```

Returns:
- User details
- Employee role
- Employee ID
- Permissions object with access levels

### Get All Available Roles
```
GET /api/roles
Headers: Authorization: Bearer <token>
```

Returns:
- Complete list of all roles and their permissions

---

## 🚀 Quick Test Commands

Login and get employee info:
```powershell
# Sales Rep
$body = @{ email = "john@example.com"; password = "password123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:10000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token
$headers = @{Authorization="Bearer $token"}
$empInfo = Invoke-RestMethod -Uri "http://localhost:10000/api/auth/employee-info" -Headers $headers -Method GET
$empInfo

# Warehouse Manager
$body = @{ email = "david.warehouse@premiumcigars.com"; password = "password123" } | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:10000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
$token = $response.token
$headers = @{Authorization="Bearer $token"}
$empInfo = Invoke-RestMethod -Uri "http://localhost:10000/api/auth/employee-info" -Headers $headers -Method GET
$empInfo
```

---

## 📝 Notes

- All passwords are currently set to `password123` for testing purposes
- Each employee has a unique employee ID (SR-001, WM-001, etc.)
- Roles determine what features and data each employee can access
- Sales reps can only see their own field sales data (enforced by backend validation)
- Managers can view all data within their department
- Admin has unrestricted access to all features
