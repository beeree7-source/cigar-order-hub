# RBAC System - API Documentation

Complete API reference for the Enterprise Multi-Login & Role-Based Access Control system.

## Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Roles & Permissions](#roles--permissions)
- [Teams & Departments](#teams--departments)
- [Audit Logs](#audit-logs)
- [Error Responses](#error-responses)

---

## Authentication

### Register User with RBAC

Create a new user account with role assignment.

**Endpoint:** `POST /api/auth/register-rbac`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "retailer",
  "companyId": 1
}
```

**Response:** `200 OK`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "retailer"
  }
}
```

---

### Login with Email

Authenticate using email and password.

**Endpoint:** `POST /api/auth/login-email`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": 456,
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "retailer"
  }
}
```

---

### Login with SSO

Authenticate using Single Sign-On (OAuth2).

**Endpoint:** `POST /api/auth/login-sso`

**Request Body:**
```json
{
  "provider": "google",
  "code": "oauth2_authorization_code"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**Note:** SSO requires OAuth2 configuration in environment variables.

---

### Login with API Key

Authenticate using API key for programmatic access.

**Endpoint:** `POST /api/auth/login-api-key`

**Request Body:**
```json
{
  "apiKey": "ck_1234567890abcdef1234567890abcdef"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "retailer"
  },
  "apiKeyId": 789,
  "permissions": {
    "orders": ["read", "create"]
  },
  "rateLimit": 1000
}
```

---

### Refresh Token

Get a new access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "john@example.com",
    "role": "retailer"
  }
}
```

---

### Logout

End user session.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "sessionId": 456
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Setup MFA

Enable Multi-Factor Authentication.

**Endpoint:** `POST /api/auth/mfa/setup`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "method": "totp"
}
```

**Response:** `200 OK`
```json
{
  "secret": "BASE32_ENCODED_SECRET",
  "qrCode": "data:image/png;base64,...",
  "backupCodes": ["ABC123", "DEF456", ...]
}
```

---

### Verify MFA

Verify MFA code.

**Endpoint:** `POST /api/auth/mfa/verify`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "verified": true
}
```

---

### Create API Key

Generate a new API key.

**Endpoint:** `POST /api/auth/api-keys`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Production API Key",
  "permissions": {
    "orders": ["read", "create"],
    "products": ["read"]
  },
  "rateLimit": 1000,
  "expiresInDays": 365
}
```

**Response:** `200 OK`
```json
{
  "id": 789,
  "apiKey": "ck_1234567890abcdef1234567890abcdef",
  "name": "Production API Key",
  "permissions": { ... },
  "rateLimit": 1000,
  "expiresAt": "2027-02-15T20:00:00.000Z"
}
```

**⚠️ Important:** Save the `apiKey` - it's only shown once!

---

### Revoke API Key

Deactivate an API key.

**Endpoint:** `DELETE /api/auth/api-keys/:keyId`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "API key revoked"
}
```

---

## User Management

### Create User

Create a new user (Admin only).

**Endpoint:** `POST /api/users`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "role": "retailer",
  "departmentId": 2
}
```

**Response:** `200 OK`
```json
{
  "id": 124,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "role": "retailer",
  "departmentId": 2
}
```

---

### Get User Profile

Get detailed user profile with roles and teams.

**Endpoint:** `GET /api/users/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "retailer",
  "approved": 1,
  "created_at": "2026-01-15T10:00:00.000Z",
  "roles": [
    {
      "id": 3,
      "name": "Sales",
      "description": "Create and manage orders",
      "department_id": 2,
      "department_name": "Sales",
      "assigned_at": "2026-01-15T10:00:00.000Z"
    }
  ],
  "teams": [
    {
      "id": 5,
      "name": "East Coast Sales",
      "role_in_team": "member",
      "joined_at": "2026-01-16T10:00:00.000Z"
    }
  ],
  "loginMethods": [
    {
      "id": 1,
      "method_type": "email",
      "identifier": "john@example.com",
      "status": "active",
      "last_used": "2026-02-15T10:00:00.000Z"
    }
  ]
}
```

---

### Update User

Update user information.

**Endpoint:** `PUT /api/users/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "John A. Doe",
  "email": "john.doe@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "userId": 123,
  "updates": {
    "name": "John A. Doe",
    "email": "john.doe@example.com"
  }
}
```

---

### Delete User

Soft delete a user (Admin only).

**Endpoint:** `DELETE /api/users/:id`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "userId": 123
}
```

---

### Change Password

Change user password.

**Endpoint:** `POST /api/users/:id/password`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### Add Login Method

Add additional login method (SSO, biometric).

**Endpoint:** `POST /api/users/:id/login-methods`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "methodType": "sso",
  "identifier": "google-123456789",
  "metadata": {
    "provider": "google",
    "email": "john@gmail.com"
  }
}
```

**Response:** `200 OK`
```json
{
  "id": 2,
  "userId": 123,
  "methodType": "sso",
  "identifier": "google-123456789",
  "metadata": { ... }
}
```

---

### Get User Activity

Get user's audit log.

**Endpoint:** `GET /api/users/:id/activity?limit=50`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "action": "login",
    "resource": "sessions",
    "resource_id": 456,
    "details": {
      "method": "email",
      "ipAddress": "192.168.1.1"
    },
    "ip_address": "192.168.1.1",
    "timestamp": "2026-02-15T10:00:00.000Z",
    "status": "success"
  },
  ...
]
```

---

## Roles & Permissions

### Get All Roles

List all available roles.

**Endpoint:** `GET /api/roles`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Admin",
    "description": "Full system access",
    "permissions": { "all": true },
    "isSystemRole": true
  },
  {
    "id": 3,
    "name": "Sales",
    "description": "Create and manage orders",
    "permissions": {
      "orders": ["create", "read", "update"],
      "customers": ["create", "read", "update"]
    },
    "isSystemRole": true
  },
  ...
]
```

---

### Create Custom Role

Create a custom role (Admin only).

**Endpoint:** `POST /api/roles`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Warehouse Manager",
  "description": "Manage inventory and shipments",
  "permissions": {
    "inventory": ["read", "update"],
    "shipments": ["create", "read", "update"],
    "orders": ["read"]
  }
}
```

**Response:** `200 OK`
```json
{
  "id": 8,
  "name": "Warehouse Manager",
  "description": "Manage inventory and shipments",
  "permissions": { ... },
  "isSystemRole": false
}
```

---

### Get User Roles

Get all roles assigned to a user.

**Endpoint:** `GET /api/users/:id/roles`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 3,
    "name": "Sales",
    "description": "Create and manage orders",
    "department_id": 2,
    "department_name": "Sales",
    "assigned_at": "2026-01-15T10:00:00.000Z",
    "expires_at": null
  }
]
```

---

### Get User Permissions

Get effective permissions for a user.

**Endpoint:** `GET /api/users/:id/permissions`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "orders": ["create", "read", "update"],
  "customers": ["create", "read", "update"],
  "products": ["read"],
  "reports": ["read"]
}
```

---

### Assign Role to User

Assign a role to a user (Manager or Admin).

**Endpoint:** `POST /api/users/:id/roles`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "roleId": 4,
  "departmentId": 3
}
```

**Response:** `200 OK`
```json
{
  "id": 10,
  "userId": 123,
  "roleId": 4,
  "departmentId": 3
}
```

---

### Revoke Role from User

Remove a role from a user (Manager or Admin).

**Endpoint:** `DELETE /api/users/:id/roles/:roleId?departmentId=3`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "userId": 123,
  "roleId": 4,
  "departmentId": 3
}
```

---

### Check Permission

Check if current user has a specific permission.

**Endpoint:** `POST /api/permissions/check`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "resource": "orders",
  "action": "delete"
}
```

**Response:** `200 OK`
```json
{
  "hasPermission": false,
  "resource": "orders",
  "action": "delete"
}
```

---

## Teams & Departments

### Get All Departments

List all active departments.

**Endpoint:** `GET /api/departments`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "company_id": 1,
    "name": "Management",
    "description": "Executive team",
    "manager_id": 5,
    "is_active": 1,
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  ...
]
```

---

### Create Department

Create a new department (Admin only).

**Endpoint:** `POST /api/departments`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "companyId": 1,
  "name": "Sales",
  "description": "Sales and customer relations",
  "managerId": 10
}
```

**Response:** `200 OK`
```json
{
  "id": 2,
  "companyId": 1,
  "name": "Sales",
  "description": "Sales and customer relations",
  "managerId": 10
}
```

---

### Get Department Members

List all members of a department.

**Endpoint:** `GET /api/departments/:id/members`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "retailer",
    "role_id": 3,
    "role_name": "Sales"
  },
  ...
]
```

---

### Get Department Teams

List all teams in a department.

**Endpoint:** `GET /api/departments/:id/teams`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 5,
    "department_id": 2,
    "name": "East Coast Sales",
    "description": "Sales team for East Coast region",
    "lead_id": 25,
    "member_count": 8,
    "created_at": "2026-01-10T00:00:00.000Z"
  },
  ...
]
```

---

### Create Team

Create a new team (Manager or Admin).

**Endpoint:** `POST /api/teams`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "departmentId": 2,
  "name": "West Coast Sales",
  "description": "Sales team for West Coast region",
  "leadId": 30
}
```

**Response:** `200 OK`
```json
{
  "id": 6,
  "departmentId": 2,
  "name": "West Coast Sales",
  "description": "Sales team for West Coast region",
  "leadId": 30
}
```

---

### Add Team Member

Add a user to a team (Manager or Admin).

**Endpoint:** `POST /api/teams/:id/members`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "userId": 123,
  "roleInTeam": "member"
}
```

**Response:** `200 OK`
```json
{
  "id": 15,
  "userId": 123,
  "teamId": 5,
  "roleInTeam": "member"
}
```

---

### Remove Team Member

Remove a user from a team (Manager or Admin).

**Endpoint:** `DELETE /api/teams/:id/members/:userId`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User removed from team"
}
```

---

### Get Team Members

List all members of a team.

**Endpoint:** `GET /api/teams/:id/members`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
[
  {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "retailer",
    "role_in_team": "member",
    "joined_at": "2026-01-16T10:00:00.000Z"
  },
  ...
]
```

---

## Audit Logs

### Get Audit Logs

Retrieve system audit logs (Admin only).

**Endpoint:** `GET /api/audit-logs?limit=100&userId=123&resource=orders&action=create`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit` (optional): Number of logs to return (default: 100)
- `userId` (optional): Filter by user ID
- `resource` (optional): Filter by resource type
- `action` (optional): Filter by action type

**Response:** `200 OK`
```json
[
  {
    "id": 1001,
    "user_id": 123,
    "action": "create",
    "resource": "orders",
    "resource_id": 456,
    "details": {
      "order_total": 1500.00,
      "items": 10
    },
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2026-02-15T10:00:00.000Z",
    "status": "success"
  },
  ...
]
```

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "error": "Access token required"
}
```

### 403 Forbidden
```json
{
  "error": "Permission denied",
  "required": {
    "resource": "users",
    "action": "delete"
  }
}
```

### 404 Not Found
```json
{
  "error": "User not found"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid credentials"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error checking permissions"
}
```

---

## Authentication Methods

The API supports three authentication methods:

### 1. JWT Bearer Token (Recommended)

Include in request header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. API Key

Include in request header:
```
X-API-Key: ck_1234567890abcdef1234567890abcdef
```

### 3. Session Token

Include in request header:
```
X-Session-Token: session_token_value
```

---

## Rate Limiting

- **JWT Authentication**: No built-in rate limit (controlled by token expiry)
- **API Keys**: Custom rate limit per key (default: 1000 requests/hour)
- **Failed Login Attempts**: Consider implementing rate limiting in production

---

## Permission System

### Resources
- `users` - User accounts
- `roles` - Role definitions
- `orders` - Customer orders
- `products` - Product catalog
- `customers` - Customer data
- `invoices` - Invoices and billing
- `payments` - Payment processing
- `reports` - Analytics and reports
- `analytics` - Dashboard analytics
- `shipments` - Shipping and logistics
- `inventory` - Stock management
- `teams` - Team management
- `departments` - Department organization
- `settings` - System configuration

### Actions
- `create` - Create new resources
- `read` - View resources
- `update` - Modify resources
- `delete` - Remove resources
- `manage` - Full control (all actions)

### Permission Hierarchy

The `manage` action implies all other actions:
- `manage` → `create`, `read`, `update`, `delete`
- `delete` → `read`
- `update` → `read`
- `create` → `read`

---

## Predefined Roles

### Admin
Full system access with all permissions.

### Manager
- Manage department users
- Assign roles within department
- View team metrics
- Approve actions
- Department reports

### Sales
- Create/update orders
- Manage customers
- View products
- Track sales

### Shipping
- Process orders
- Update shipment status
- Track inventory
- View logistics

### Office
- Administrative tasks
- Data entry
- View reports
- General access

### Finance
- View/create invoices
- Process payments
- Generate reports
- Budget management

### Supplier
- Manage products
- View orders
- Analytics access

---

## Best Practices

1. **Always use HTTPS** in production
2. **Store JWT tokens securely** (httpOnly cookies recommended)
3. **Rotate API keys regularly**
4. **Enable MFA** for admin accounts
5. **Monitor audit logs** for suspicious activity
6. **Use refresh tokens** instead of long-lived access tokens
7. **Implement rate limiting** per your needs
8. **Validate all input** on the client side
9. **Handle token expiration** gracefully
10. **Keep dependencies updated**

---

Last Updated: 2026-02-15
