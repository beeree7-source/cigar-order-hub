# Employee Management System Guide

## Overview

The Cigar Order Hub supports **multi-user companies** where suppliers and retailers can have multiple employees with different roles and permissions.

## How It Works

### Account Types (Roles)
Users have TWO role layers:

1. **Account Type** (`role` field):
   - `supplier` - Company that sells cigars
   - `retailer` - Company that buys cigars  
   - `admin` - System administrator

2. **Employee Role** (`employee_role` field):
   - `sales_rep` - Sales representative
   - `sales_manager` - Sales team manager
   - `warehouse_manager` - Warehouse operations manager
   - `warehouse_worker` - Warehouse floor staff
   - `hr_manager` - Human resources manager
   - `accountant` - Accounting/finance staff
   - `operations_manager` - Operations management
   - `customer_service` - Customer support
   - `delivery_driver` - Delivery personnel

### Company Association
Employees are linked to their company via the `business_name` field:

```javascript
{
  id: 4,
  name: 'Mike Johnson',
  email: 'mike.sales@premiumcigars.com',
  role: 'supplier',  // Account type
  business_name: 'Premium Cigars Inc',  // Company
  employee_role: 'sales_rep',  // Job title
  employee_id: 'SR-003'  // Employee ID
}
```

## For Company Owners

### Adding Employees

Company owners can add employees to their organization using the Employee Management API.

**Endpoint:** `POST /api/employees`

**Example Request:**
```javascript
POST http://localhost:10000/api/employees
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "name": "Sarah Johnson",
  "email": "sarah@yourbusiness.com",
  "password": "initialPassword123",
  "employee_role": "warehouse_manager"
}
```

**What Happens:**
- New employee is created with the **same** `role` (supplier/retailer) as the owner
- Employee is linked to the **same** `business_name` as the owner
- Employee gets their specified `employee_role`
- Auto-generates `employee_id` if not provided

### Viewing Your Employees

**Endpoint:** `GET /api/employees`

```javascript
GET http://localhost:10000/api/employees
Authorization: Bearer <owner_token>
```

**Response:**
```json
{
  "business_name": "Premium Cigars Inc",
  "total_employees": 12,
  "employees": [
    {
      "id": 4,
      "name": "Mike Johnson",
      "email": "mike.sales@premiumcigars.com",
      "role": "supplier",
      "business_name": "Premium Cigars Inc",
      "employee_role": "sales_rep",
      "employee_id": "SR-003"
    },
    ...
  ]
}
```

### Updating Employees

**Endpoint:** `PUT /api/employees/:id`

```javascript
PUT http://localhost:10000/api/employees/4
Authorization: Bearer <owner_token>
Content-Type: application/json

{
  "name": "Mike Johnson Sr.",
  "employee_role": "sales_manager"
}
```

### Removing Employees

**Endpoint:** `DELETE /api/employees/:id`

```javascript
DELETE http://localhost:10000/api/employees/4
Authorization: Bearer <owner_token>
```

**Note:** You cannot delete your own account through this endpoint.

### Finding Employees by Role

**Endpoint:** `GET /api/employees/role/:role`

```javascript
GET http://localhost:10000/api/employees/role/warehouse_worker
Authorization: Bearer <owner_token>
```

Returns all employees in your company with that specific role.

## For Employees

### Signing Up

Employees have two options:

#### Option 1: Owner Creates Account
The company owner adds them via the API (recommended for security).

#### Option 2: Self-Registration (If Enabled)
Employee uses the signup page at `http://localhost:3000/signup` and:
1. Selects their account type (Supplier/Retailer)
2. Enters their personal details
3. Enters the **exact business name** of their company
4. Selects their employee role

**Important:** The `business_name` must **exactly match** the owner's business name for proper association.

### Logging In

All users (owners and employees) log in the same way:

1. Go to `http://localhost:3000/login`
2. Enter email and password
3. System redirects based on role:
   - Suppliers → `/suppliers/orders`
   - Retailers → `/retailers/order-tracking`
   - Admins → Home page

## Data Access & Permissions

### Automatic Filtering
When employees make API calls, the system automatically:
- Filters data by their `business_name`
- Shows only their company's orders, products, inventory
- Prevents access to other companies' data

### Example:
```javascript
// Employee from "Premium Cigars Inc" 
GET /api/employees

// Returns only employees from "Premium Cigars Inc"
// Even though other companies' employees exist in the system
```

## Integration with Other Systems

### HR & Payroll
Employees automatically have access to:
- Time clock (punch in/out)
- Schedule viewing
- Time-off requests
- Paystub viewing
- Timesheet submission

**See:** `TIME_CLOCK_GUIDE.md`, `PAYROLL_PROCESSING_GUIDE.md`

### Warehouse Management
Employees with warehouse roles can access:
- Barcode scanning
- Receiving shipments
- Picking orders
- Inventory management

**See:** `WAREHOUSE_SETUP_GUIDE.md`, `WAREHOUSE_API_DOCUMENTATION.md`

### Sales Rep System
Employees with sales roles can access:
- Customer account management
- Visit tracking
- Mileage tracking
- Performance dashboard

**See:** `MOBILE_SALES_REP_GUIDE.md`

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/employees` | List all company employees | Yes |
| POST | `/api/employees` | Add new employee | Yes |
| GET | `/api/employees/:id` | Get specific employee | Yes |
| PUT | `/api/employees/:id` | Update employee | Yes |
| DELETE | `/api/employees/:id` | Remove employee | Yes |
| GET | `/api/employees/role/:role` | Find by role | Yes |

## Security Considerations

### Best Practices
1. **Owner Creates Accounts**: Have the owner create employee accounts instead of self-registration
2. **Initial Passwords**: Use temporary passwords and force password change on first login
3. **Email Verification**: Verify employee email addresses before activation
4. **Role Permissions**: Assign minimal permissions needed for the job
5. **Audit Trail**: Monitor who adds/removes employees

### Data Isolation
- Employees can only see data from their `business_name`
- Cannot access other companies' data
- Cannot modify employees from other companies
- Automatic filtering by business association

## Example Workflows

### Scenario 1: New Warehouse Worker

```javascript
// 1. Owner adds warehouse worker
POST /api/employees
{
  "name": "Carlos Martinez",
  "email": "carlos@premiumcigars.com",
  "password": "TempPassword123!",
  "employee_role": "warehouse_worker",
  "employee_id": "WW-005"
}

// 2. Carlos logs in
POST /api/auth/login
{
  "email": "carlos@premiumcigars.com",
  "password": "TempPassword123!"
}

// 3. Carlos accesses warehouse dashboard
GET /api/warehouse/dashboard
// Sees only Premium Cigars Inc inventory
```

### Scenario 2: Promoting an Employee

```javascript
// Sales rep gets promoted to sales manager
PUT /api/employees/23
{
  "employee_role": "sales_manager",
  "employee_id": "SM-002"
}
```

### Scenario 3: Viewing Sales Team

```javascript
// Get all sales reps
GET /api/employees/role/sales_rep

// Get all managers
GET /api/employees/role/sales_manager
```

## Troubleshooting

### Employee Can't See Company Data
**Issue:** New employee logs in but sees no orders/products

**Solution:** Check that `business_name` **exactly matches** the owner's business name:
```sql
-- Owner: "Premium Cigars Inc"
-- Employee: "Premium Cigars Inc " (extra space)
-- ❌ Won't match!
```

### Can't Add Employee
**Issue:** `POST /api/employees` fails

**Possible Causes:**
1. Not authenticated as an owner
2. Email already exists
3. Missing required fields
4. Your account doesn't have a `business_name`

### Employee Sees Wrong Company Data
**Issue:** Employee sees data from multiple companies

**This shouldn't happen!** Contact your system administrator immediately - this indicates a data isolation bug.

## Next Steps

- **Frontend UI:** Create an employee management page at `/employees`
- **Permissions:** Implement granular RBAC based on employee_role
- **Invitations:** Add employee invitation system via email
- **Two-Factor Auth:** Add 2FA for sensitive employee roles
- **Audit Logs:** Track all employee actions

## Related Documentation

- [RBAC Implementation](RBAC_IMPLEMENTATION_SUMMARY.md)
- [HR System](HR_IMPLEMENTATION_COMPLETE.md)
- [Time Clock Guide](TIME_CLOCK_GUIDE.md)
- [Warehouse Setup](WAREHOUSE_SETUP_GUIDE.md)
- [Sales Rep Guide](MOBILE_SALES_REP_GUIDE.md)
