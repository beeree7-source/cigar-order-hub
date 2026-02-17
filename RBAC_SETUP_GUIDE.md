# RBAC System Setup Guide

Complete guide to setting up and configuring the Enterprise Multi-Login & Role-Based Access Control system.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Initial Setup](#initial-setup)
6. [Creating Users and Roles](#creating-users-and-roles)
7. [Testing the System](#testing-the-system)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up the RBAC system, ensure you have:

- **Node.js** v16+ installed
- **npm** v8+ installed
- **SQLite3** (automatically included)
- Text editor or IDE
- Terminal/Command prompt access

---

## Installation

### 1. Install Dependencies

Navigate to the backend directory and install required packages:

```bash
cd backend
npm install
```

This will install:
- `express` - Web framework
- `sqlite3` - Database
- `jsonwebtoken` - JWT tokens
- `bcryptjs` - Password hashing
- `speakeasy` - MFA/TOTP support
- `qrcode` - QR code generation
- `express-rate-limit` - Rate limiting
- And other dependencies...

### 2. Verify Installation

Check that all dependencies are installed:

```bash
npm list --depth=0
```

You should see all packages listed without errors.

---

## Database Setup

### 1. Run Migrations

The RBAC system requires new database tables. Run the migration to create them:

```bash
cd backend
npm run migrate
```

This will:
- Create the `cigar-hub.db` SQLite database
- Execute all migration files in order
- Create RBAC tables:
  - `companies`
  - `departments`
  - `roles`
  - `role_permissions`
  - `user_roles`
  - `teams`
  - `user_teams`
  - `login_methods`
  - `audit_logs`
  - `api_keys`
  - `sessions`
  - `mfa_settings`

### 2. Verify Database

Check that the database was created successfully:

```bash
ls -la cigar-hub.db
```

You should see the database file with a recent timestamp.

### 3. Inspect Tables (Optional)

To view the created tables:

```bash
sqlite3 cigar-hub.db
```

Then run:
```sql
.tables
.schema roles
.quit
```

---

## Environment Configuration

### 1. Create Environment File

Create a `.env` file in the backend directory:

```bash
cd backend
cp ../.env.example .env
```

### 2. Configure Essential Variables

Edit the `.env` file and set these critical values:

```bash
# JWT Configuration (REQUIRED)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-please
JWT_ALGORITHM=HS256
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Session Configuration
SESSION_TIMEOUT=1800000

# MFA Configuration
MFA_ISSUER=Cigar Order Hub
MFA_ENABLED=false

# Security Settings
BCRYPT_ROUNDS=12

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Port
PORT=4000
```

### 3. Generate Secure JWT Secret

**⚠️ IMPORTANT:** Never use the default JWT secret in production!

Generate a secure random secret:

```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32

# Option 3: Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the generated string and paste it as your `JWT_SECRET` in `.env`.

### 4. Optional: Configure SSO

If you want to enable Single Sign-On:

```bash
SSO_ENABLED=true
SSO_CLIENT_ID=your-google-client-id
SSO_CLIENT_SECRET=your-google-client-secret
SSO_CALLBACK_URL=http://localhost:4000/api/auth/sso/callback
SSO_PROVIDER=google
```

**Note:** SSO requires OAuth2 setup with your chosen provider (Google, Microsoft, Okta, etc.)

---

## Initial Setup

### 1. Start the Server

Start the backend server:

```bash
cd backend
npm start
```

You should see:
```
Backend running on port 4000
```

### 2. Verify Server is Running

Open another terminal and test:

```bash
curl http://localhost:4000
```

Expected response:
```json
{
  "message": "Cigar Order Hub with JWT auth & SQLite"
}
```

### 3. Check Database Seeding

The migration should have created default roles. Verify:

```bash
sqlite3 cigar-hub.db "SELECT * FROM roles;"
```

You should see 7 predefined roles:
1. Admin
2. Manager
3. Sales
4. Shipping
5. Office
6. Finance
7. Supplier

---

## Creating Users and Roles

### 1. Create Admin User

First, create an admin user using the registration endpoint:

```bash
curl -X POST http://localhost:4000/api/auth/register-rbac \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "AdminPass123!",
    "role": "admin",
    "companyId": 1
  }'
```

**Important:** The system will automatically assign the Admin role to users with role "admin".

### 2. Login as Admin

Get an access token:

```bash
curl -X POST http://localhost:4000/api/auth/login-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPass123!"
  }'
```

Save the `accessToken` from the response - you'll need it for subsequent requests.

### 3. Create Department Users

Create users for different departments:

**Sales User:**
```bash
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Sales Rep",
    "email": "sales@example.com",
    "password": "SalesPass123!",
    "role": "retailer",
    "departmentId": 2
  }'
```

**Shipping User:**
```bash
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Shipping Clerk",
    "email": "shipping@example.com",
    "password": "ShipPass123!",
    "role": "retailer",
    "departmentId": 3
  }'
```

**Finance User:**
```bash
curl -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Finance Officer",
    "email": "finance@example.com",
    "password": "FinPass123!",
    "role": "retailer",
    "departmentId": 4
  }'
```

### 4. Assign Roles to Users

Assign appropriate roles to users:

```bash
# Assign Shipping role (roleId: 4) to shipping user (userId: 3)
curl -X POST http://localhost:4000/api/users/3/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "roleId": 4,
    "departmentId": 3
  }'
```

### 5. Create Teams

Create a sales team:

```bash
curl -X POST http://localhost:4000/api/teams \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "departmentId": 2,
    "name": "East Coast Sales",
    "description": "Sales team for East Coast region",
    "leadId": 2
  }'
```

### 6. Add Team Members

Add users to teams:

```bash
curl -X POST http://localhost:4000/api/teams/1/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "userId": 2,
    "roleInTeam": "lead"
  }'
```

---

## Testing the System

### 1. Test Permission Checking

Check if a user has specific permissions:

```bash
# Login as sales user
curl -X POST http://localhost:4000/api/auth/login-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sales@example.com",
    "password": "SalesPass123!"
  }'

# Check if sales user can create orders
curl -X POST http://localhost:4000/api/permissions/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SALES_USER_TOKEN" \
  -d '{
    "resource": "orders",
    "action": "create"
  }'

# Expected: {"hasPermission": true, "resource": "orders", "action": "create"}

# Check if sales user can delete users
curl -X POST http://localhost:4000/api/permissions/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SALES_USER_TOKEN" \
  -d '{
    "resource": "users",
    "action": "delete"
  }'

# Expected: {"hasPermission": false, "resource": "users", "action": "delete"}
```

### 2. Test API Key Authentication

Create an API key:

```bash
curl -X POST http://localhost:4000/api/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Test API Key",
    "permissions": {
      "orders": ["read"]
    },
    "rateLimit": 100,
    "expiresInDays": 30
  }'
```

Save the returned `apiKey` and test it:

```bash
curl -X POST http://localhost:4000/api/auth/login-api-key \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "YOUR_API_KEY_HERE"
  }'
```

### 3. Test MFA Setup

Enable MFA for a user:

```bash
curl -X POST http://localhost:4000/api/auth/mfa/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "method": "totp"
  }'
```

**Note:** Full MFA verification requires implementing TOTP verification with a library like `speakeasy`.

### 4. Test Audit Logging

View audit logs (admin only):

```bash
curl -X GET "http://localhost:4000/api/audit-logs?limit=10" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 5. Test User Profile

Get detailed user profile:

```bash
curl -X GET http://localhost:4000/api/users/2 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Production Deployment

### 1. Pre-Deployment Checklist

Before deploying to production:

- [ ] Change JWT_SECRET to a secure random value
- [ ] Set strong passwords for all users
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS settings
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Test all authentication methods
- [ ] Review and test all permissions
- [ ] Set up monitoring and alerting
- [ ] Configure email service (for notifications)
- [ ] Document admin credentials securely

### 2. Environment Variables for Production

Update `.env` for production:

```bash
NODE_ENV=production
PORT=4000

# Use strong, unique values
JWT_SECRET=production-secret-minimum-64-chars-random-generated
JWT_ALGORITHM=HS256
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Production URLs
FRONTEND_URL=https://your-production-domain.com

# Enable MFA
MFA_ENABLED=true
MFA_ISSUER=Your Company Name

# Production database path (consider PostgreSQL/MySQL for production)
DATABASE_PATH=/var/lib/cigar-hub/cigar-hub.db

# Email configuration
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@your-domain.com

# API Rate limiting
API_RATE_LIMIT=1000

# Security
BCRYPT_ROUNDS=12
```

### 3. HTTPS Configuration

**Always use HTTPS in production.** Configure your web server (nginx, Apache) or use a service like:
- Cloudflare
- AWS Load Balancer
- Let's Encrypt

### 4. Database Considerations

For production, consider:
- **PostgreSQL** or **MySQL** instead of SQLite
- Regular automated backups
- Replication for high availability
- Connection pooling

### 5. Monitoring

Set up monitoring for:
- Failed login attempts
- API key usage
- Permission denied events
- System errors
- Database performance
- Audit log review

---

## Troubleshooting

### Problem: "Invalid token" error

**Solution:**
- Verify JWT_SECRET matches between .env and code
- Check token hasn't expired (15 minutes default)
- Ensure token is properly formatted: `Bearer <token>`
- Use refresh token to get new access token

### Problem: "Permission denied" error

**Solution:**
- Check user has correct role assigned
- Verify role has required permissions
- Check department assignment if applicable
- View user permissions: `GET /api/users/:id/permissions`

### Problem: Database migration fails

**Solution:**
- Delete existing `cigar-hub.db` and retry
- Check file permissions on database directory
- Verify all migration files are present
- Check SQLite3 is installed: `sqlite3 --version`

### Problem: Can't create admin user

**Solution:**
- Check database has roles seeded
- Verify email doesn't already exist
- Use role: "admin" in registration
- Manually assign admin role after creation

### Problem: MFA not working

**Solution:**
- Ensure speakeasy is installed
- Verify QR code is displayed correctly
- Check time sync on server (TOTP is time-based)
- Use backup codes if available

### Problem: API key authentication fails

**Solution:**
- Verify API key is sent in `X-API-Key` header
- Check key hasn't expired
- Ensure key is active (not revoked)
- Check rate limit hasn't been exceeded

### Problem: Session expires too quickly

**Solution:**
- Adjust SESSION_TIMEOUT in .env (in milliseconds)
- Default is 30 minutes (1800000 ms)
- Use refresh tokens for long-lived sessions

### Problem: Audit logs not recording

**Solution:**
- Check AUDIT_LOG_ENABLED=true in .env
- Verify database has audit_logs table
- Check disk space for database
- Verify user authentication is working

---

## Advanced Configuration

### Custom Roles

Create custom roles programmatically:

```javascript
const rbac = require('./rbac');

await rbac.createRole(
  'Custom Role',
  'Description of role',
  {
    orders: ['read', 'update'],
    products: ['read'],
    reports: ['read']
  },
  false // not a system role
);
```

### Permission Inheritance

The system supports permission hierarchy:
- `manage` implies all actions
- `delete` implies `read`
- `update` implies `read`
- `create` implies `read`

### Ownership Rules

Users automatically have access to their own resources:
- View own profile
- Update own profile
- View own orders
- View own products (suppliers)

Configure in `backend/config/permissions.js`.

### Rate Limiting per Role

Implement custom rate limiting based on user role:

```javascript
const getRateLimitForUser = (user) => {
  if (user.role === 'Admin') return 10000;
  if (user.role === 'Manager') return 5000;
  return 1000;
};
```

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong passwords** (min 12 characters, mixed case, numbers, special)
3. **Enable MFA** for admin accounts
4. **Rotate API keys** regularly (every 90 days)
5. **Review audit logs** weekly for suspicious activity
6. **Keep dependencies updated** (`npm audit`, `npm update`)
7. **Use HTTPS** exclusively in production
8. **Implement rate limiting** to prevent abuse
9. **Validate all inputs** to prevent injection attacks
10. **Follow principle of least privilege** when assigning roles

---

## Next Steps

After successful setup:

1. **Test all features** thoroughly
2. **Create user documentation** for your team
3. **Set up monitoring** and alerts
4. **Configure backups** for database
5. **Plan for scaling** if needed
6. **Review security regularly**
7. **Keep system updated**

---

## Support Resources

- **API Documentation:** See `RBAC_API_DOCUMENTATION.md`
- **Implementation Summary:** See `RBAC_IMPLEMENTATION_SUMMARY.md`
- **Main README:** See root `README.md`

---

## Maintenance

### Regular Tasks

**Weekly:**
- Review audit logs
- Check for failed login attempts
- Monitor API key usage

**Monthly:**
- Rotate admin passwords
- Review user permissions
- Check for inactive users
- Update dependencies

**Quarterly:**
- Rotate API keys
- Security audit
- Performance review
- Backup verification

---

Last Updated: 2026-02-15
Version: 1.0.0
