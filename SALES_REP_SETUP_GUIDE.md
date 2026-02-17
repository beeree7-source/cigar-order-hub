# Sales Rep Setup Guide

## Overview

This guide walks you through setting up the Mobile Field Sales Representative System from initial installation to deployment. This system provides comprehensive tools for managing field sales reps including GPS tracking, visit management, photo documentation, mileage tracking, and performance analytics.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Configuration](#backend-configuration)
4. [Environment Variables](#environment-variables)
5. [Running Migrations](#running-migrations)
6. [Testing the Setup](#testing-the-setup)
7. [Creating Sales Reps](#creating-sales-reps)
8. [Configuring Account Preferences](#configuring-account-preferences)
9. [Photo Storage Setup](#photo-storage-setup)
10. [Mobile App Setup](#mobile-app-setup)
11. [Production Deployment](#production-deployment)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up the Mobile Field Sales Representative System, ensure you have:

### Required Software
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **SQLite** (already included with Node.js sqlite3 package)
- **Git**

### Optional Software (for production)
- **AWS Account** (for S3 photo storage)
- **Docker** (for containerized deployment)
- **Nginx** (for reverse proxy)

### Knowledge Requirements
- Basic understanding of REST APIs
- Familiarity with SQL databases
- Understanding of JWT authentication
- Basic knowledge of mobile app development (for mobile setup)

---

## Database Setup

### 1. Verify Database Location

The database file `cigar-hub.db` is created in the `backend/` directory.

```bash
cd backend
ls -la | grep cigar-hub.db
```

### 2. Database Schema

The system creates 9 new tables:
- `sales_reps`: Sales representative profiles
- `daily_check_ins`: Daily check-in/out records
- `location_tracking`: GPS location points
- `account_visits`: Customer visit records
- `account_visit_photos`: Photos from visits
- `account_preferences`: Account-specific settings
- `rep_authorized_accounts`: Rep-to-account authorization
- `mileage_logs`: Mileage tracking for reimbursement
- `rep_performance_metrics`: Performance KPIs

### 3. Indexes

The migration automatically creates indexes for:
- Sales rep lookups
- Location queries
- Visit history
- Photo retrieval
- Performance metrics

---

## Backend Configuration

### 1. Install Dependencies

```bash
cd backend
npm install
```

**New dependencies** (if not already installed):
```bash
npm install express sqlite3 jsonwebtoken bcryptjs cors dotenv nodemailer
```

### 2. Verify Service Files

Ensure these new service files exist:
```bash
ls -la backend/ | grep -E "(sales-rep|location|mileage|photo|mobile-orders|performance)-service.js"
```

You should see:
- `sales-rep-service.js`
- `location-service.js`
- `mileage-service.js`
- `photo-service.js`
- `mobile-orders.js`
- `performance-service.js`

### 3. Verify Migration File

```bash
ls -la backend/migrations/ | grep 007
```

You should see:
- `007_create_sales_rep_tables.sql`

---

## Environment Variables

### 1. Create .env File

Copy the example environment file:

```bash
cp .env.example backend/.env
```

### 2. Configure Mobile Sales Rep Variables

Edit `backend/.env` and add/update these variables:

```env
# Location Tracking
LOCATION_TRACKING_ENABLED=true
LOCATION_UPDATE_INTERVAL=30
LOCATION_ACCURACY_THRESHOLD=50
GEOFENCE_RADIUS=100
MAX_LOCATION_HISTORY=30

# Mileage Configuration
MILEAGE_RATE=0.585
MILEAGE_TRACKING_ENABLED=true

# Photo Storage
PHOTO_STORAGE=local
PHOTO_RETENTION_DAYS=365
MAX_PHOTO_SIZE=10485760
PHOTO_UPLOAD_PATH=/uploads/photos

# S3 Configuration (if using S3)
S3_BUCKET=cigar-order-hub-photos
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Photo Approval
PHOTO_APPROVAL_REQUIRED=false

# Sales Rep Features
REP_CHECK_IN_REQUIRED=true
REP_LOCATION_TRACKING=true
REP_PHOTO_CAPTURE=true
REP_ORDER_PLACEMENT=true
REP_MILEAGE_TRACKING=true
```

### 3. Update Existing Variables

Ensure these existing variables are set:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000

# Port
PORT=4000
```

---

## Running Migrations

### 1. Run the Migration

**Option A: Using npm script** (if configured):
```bash
cd backend
npm run migrate
```

**Option B: Using SQLite directly**:
```bash
cd backend
sqlite3 cigar-hub.db < migrations/007_create_sales_rep_tables.sql
```

### 2. Verify Tables Were Created

```bash
sqlite3 backend/cigar-hub.db "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

You should see all tables including:
- `sales_reps`
- `daily_check_ins`
- `location_tracking`
- `account_visits`
- `account_visit_photos`
- `account_preferences`
- `rep_authorized_accounts`
- `mileage_logs`
- `rep_performance_metrics`

### 3. Verify Indexes

```bash
sqlite3 backend/cigar-hub.db "SELECT name FROM sqlite_master WHERE type='index';"
```

---

## Testing the Setup

### 1. Start the Backend Server

```bash
cd backend
npm start
```

You should see:
```
Backend running on port 4000
```

### 2. Test Health Endpoint

```bash
curl http://localhost:4000/
```

Expected response:
```json
{"message": "Cigar Order Hub with JWT auth & SQLite"}
```

### 3. Test Authentication

First, create a test user:
```bash
curl -X POST http://localhost:4000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Rep",
    "email": "rep@test.com",
    "password": "Test123!",
    "role": "retailer"
  }'
```

Then login:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rep@test.com",
    "password": "Test123!"
  }'
```

Save the JWT token from the response for subsequent requests.

---

## Creating Sales Reps

### 1. Create a Sales Rep Profile

Use the JWT token from login:

```bash
curl -X POST http://localhost:4000/api/reps/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": 1,
    "employee_id": "EMP001",
    "company_id": 1,
    "territory": "Northeast",
    "assigned_accounts": [2, 3, 4],
    "manager_id": null,
    "hire_date": "2026-01-15",
    "base_location": "New York, NY"
  }'
```

### 2. Verify Sales Rep Creation

```bash
curl http://localhost:4000/api/reps/user/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Create Authorized Accounts

Insert authorized accounts directly in the database:

```bash
sqlite3 backend/cigar-hub.db "INSERT INTO rep_authorized_accounts (sales_rep_id, account_id, authorization_type, is_active) VALUES (1, 2, 'full_access', 1);"
```

Or create a script to automate this for multiple accounts.

---

## Configuring Account Preferences

### 1. Set Default Preferences

For existing accounts, the migration automatically sets default preferences. For new accounts:

```bash
sqlite3 backend/cigar-hub.db "INSERT INTO account_preferences (account_id, allow_order_placement) VALUES (2, 1);"
```

### 2. Customize Preferences per Account

Update preferences for specific accounts:

```sql
UPDATE account_preferences 
SET allow_rep_photos = 1,
    allow_location_tracking = 1,
    allow_visit_notes = 1,
    mileage_reimbursement_enabled = 1,
    mileage_rate = 0.585,
    photo_approval_required = 0
WHERE account_id = 2;
```

### 3. Common Configuration Scenarios

**Full Access (all features enabled)**:
```sql
UPDATE account_preferences 
SET allow_rep_photos = 1,
    allow_location_tracking = 1,
    allow_visit_notes = 1,
    allow_order_placement = 1,
    mileage_reimbursement_enabled = 1
WHERE account_id = 2;
```

**Order Only (no tracking or photos)**:
```sql
UPDATE account_preferences 
SET allow_rep_photos = 0,
    allow_location_tracking = 0,
    allow_visit_notes = 0,
    allow_order_placement = 1,
    mileage_reimbursement_enabled = 0
WHERE account_id = 2;
```

---

## Photo Storage Setup

### Option A: Local Storage (Development)

1. **Create upload directory**:
```bash
mkdir -p backend/uploads/photos
chmod 755 backend/uploads/photos
```

2. **Set environment variables**:
```env
PHOTO_STORAGE=local
PHOTO_UPLOAD_PATH=/uploads/photos
```

### Option B: AWS S3 (Production)

1. **Install AWS SDK**:
```bash
npm install aws-sdk
```

2. **Configure S3 bucket**:
   - Create an S3 bucket
   - Set up IAM user with S3 access
   - Configure bucket policy for uploads

3. **Set environment variables**:
```env
PHOTO_STORAGE=s3
S3_BUCKET=cigar-order-hub-photos
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

4. **Update photo-service.js** to integrate S3 SDK (optional enhancement)

### Option C: Cloudinary (Alternative)

1. **Install Cloudinary SDK**:
```bash
npm install cloudinary
```

2. **Configure Cloudinary**:
```env
PHOTO_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## Mobile App Setup

### 1. Configure API Base URL

In the mobile app's configuration file, set the API base URL:

**For iOS/Android (React Native)**:
```javascript
// config.js
export const API_BASE_URL = __DEV__
  ? 'http://localhost:4000'
  : 'https://api.cigar-order-hub.com';
```

### 2. Install Mobile Dependencies

```bash
cd mobile
npm install
```

### 3. Configure Location Permissions

**iOS (Info.plist)**:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to track visits and routes</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>We track your location during work hours for route optimization</string>
```

**Android (AndroidManifest.xml)**:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

### 4. Configure Camera Permissions

**iOS**:
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to document visits</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to save visit photos</string>
```

**Android**:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

### 5. Run the Mobile App

```bash
cd mobile
npm start
# Then follow Expo instructions to run on device/simulator
```

---

## Production Deployment

### 1. Environment Setup

Create production `.env` file:
```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://cigar-order-hub.vercel.app

# Use strong secrets in production
JWT_SECRET=<generate-strong-secret-here>

# Production photo storage
PHOTO_STORAGE=s3
S3_BUCKET=cigar-order-hub-photos-prod
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=<production-access-key>
S3_SECRET_ACCESS_KEY=<production-secret-key>

# Enable all security features
LOCATION_TRACKING_ENABLED=true
PHOTO_APPROVAL_REQUIRED=true
```

### 2. Build for Production

```bash
cd backend
npm install --production
```

### 3. Database Backup

Set up regular database backups:
```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
sqlite3 backend/cigar-hub.db ".backup backup/cigar-hub-$DATE.db"
# Keep only last 7 days
find backup/ -name "cigar-hub-*.db" -mtime +7 -delete
EOF

chmod +x backup-db.sh

# Schedule daily backup with cron
crontab -e
# Add: 0 2 * * * /path/to/backup-db.sh
```

### 4. SSL/TLS Configuration

Use Let's Encrypt for free SSL certificates:
```bash
sudo apt-get install certbot
sudo certbot --nginx -d api.cigar-order-hub.com
```

### 5. Process Management

Use PM2 for process management:
```bash
npm install -g pm2
cd backend
pm2 start server.js --name cigar-order-hub-api
pm2 startup
pm2 save
```

### 6. Monitoring

Set up monitoring:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Troubleshooting

### Common Issues

#### 1. Migration Fails

**Problem**: Migration script fails to execute
**Solution**:
```bash
# Check database file permissions
ls -la backend/cigar-hub.db

# Manually inspect migration file
cat backend/migrations/007_create_sales_rep_tables.sql

# Try running migration commands one at a time
sqlite3 backend/cigar-hub.db
sqlite> -- paste SQL commands one by one
```

#### 2. Authentication Errors

**Problem**: JWT token errors
**Solution**:
```bash
# Verify JWT_SECRET is set
echo $JWT_SECRET

# Test token generation
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({userId: 1}, process.env.JWT_SECRET));"
```

#### 3. CORS Errors

**Problem**: Frontend can't connect to backend
**Solution**:
```javascript
// In server.js, update CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-url.com'],
  credentials: true
}));
```

#### 4. Photo Upload Fails

**Problem**: Photos not uploading
**Solution**:
```bash
# Check directory permissions
ls -la backend/uploads/

# Create directory if missing
mkdir -p backend/uploads/photos
chmod 755 backend/uploads/photos

# Check file size limits
# In server.js:
app.use(express.json({limit: '10mb'}));
```

#### 5. Location Tracking Not Working

**Problem**: GPS coordinates not being logged
**Solution**:
- Verify location permissions on mobile device
- Check `LOCATION_TRACKING_ENABLED` environment variable
- Test location endpoint manually:
```bash
curl -X POST http://localhost:4000/api/reps/location/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sales_rep_id": 1,
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

#### 6. Database Locked Errors

**Problem**: SQLite database locked
**Solution**:
```bash
# Check for multiple connections
lsof backend/cigar-hub.db

# Close unnecessary connections
# Or restart the backend server
pm2 restart cigar-order-hub-api
```

### Performance Issues

#### Slow Queries

**Solution**: Verify indexes are created:
```sql
SELECT * FROM sqlite_master WHERE type='index';
```

#### Large Database Size

**Solution**: Archive old data:
```sql
-- Archive location data older than 30 days
DELETE FROM location_tracking WHERE timestamp < date('now', '-30 days');

-- Vacuum database to reclaim space
VACUUM;
```

### Security Checks

Run security audit:
```bash
# Check for vulnerable dependencies
npm audit

# Fix vulnerabilities
npm audit fix
```

---

## Next Steps

After completing the setup:

1. **Test All Features**: Go through each endpoint in the API documentation
2. **Configure Account Preferences**: Set up preferences for all retailer accounts
3. **Authorize Sales Reps**: Assign accounts to sales reps
4. **Train Users**: Provide training on the mobile app
5. **Monitor Performance**: Set up monitoring and logging
6. **Plan for Scale**: Consider database optimization for growth

---

## Support

For setup assistance:
- **Email**: support@cigar-order-hub.com
- **Documentation**: See MOBILE_SALES_REP_GUIDE.md and MOBILE_APP_API_DOCUMENTATION.md
- **GitHub Issues**: Report bugs and request features

---

## Appendix

### A. Quick Test Script

Save as `test-sales-rep-api.sh`:
```bash
#!/bin/bash
API_URL="http://localhost:4000"
TOKEN="your-jwt-token-here"

echo "Testing Sales Rep API..."

# Test check-in
curl -X POST "$API_URL/api/reps/check-in" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sales_rep_id": 1, "check_in_location": "40.7128,-74.0060,New York, NY", "notes": "Test check-in"}'

echo "\n\nTest complete!"
```

### B. Database Schema Diagram

See `backend/migrations/007_create_sales_rep_tables.sql` for complete schema.

### C. Environment Variables Reference

See `.env.example` for all available configuration options.

---

**Version**: 1.0.0  
**Last Updated**: February 2026
