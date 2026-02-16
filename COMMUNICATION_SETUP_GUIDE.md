# Communication Extension Setup Guide

## Overview
This guide provides step-by-step instructions for setting up and using the Communication Extension in the Cigar Order Hub platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Backend Configuration](#backend-configuration)
4. [Frontend Setup](#frontend-setup)
5. [Testing the Setup](#testing-the-setup)
6. [Usage Examples](#usage-examples)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- Node.js (v14 or higher)
- npm (v6 or higher)
- SQLite3

### Required Files
Ensure the following files are in place:
- `backend/database.js` - Updated with communication tables
- `backend/communication.js` - Communication service
- `backend/server.js` - Updated with communication endpoints
- `backend/migrations/009_create_communication_tables.sql` - Migration file
- `frontend/app/messages/page.tsx` - Messages page
- `frontend/app/calls/page.tsx` - Call logs page

---

## Database Setup

### Automatic Setup
The communication tables are automatically created when the backend server starts. The `database.js` file includes table creation statements for:
- `conversation_threads`
- `messages`
- `message_read_status`
- `call_logs`

### Manual Setup (Optional)
If you prefer to run migrations manually, execute the SQL file:

```bash
cd backend
sqlite3 cigar-hub.db < migrations/009_create_communication_tables.sql
```

### Verify Tables
Check that all tables were created:

```bash
cd backend
sqlite3 cigar-hub.db ".tables"
```

You should see:
```
call_logs                  messages
conversation_threads       message_read_status
... (other existing tables)
```

### Check Indexes
Verify that performance indexes were created:

```bash
sqlite3 cigar-hub.db ".indexes messages"
```

---

## Backend Configuration

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Environment Variables
Create or update `.env` file in the backend directory:

```env
# Server Configuration
PORT=4000

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret-key-change-in-production

# Database
DATABASE_PATH=./cigar-hub.db

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Required for shipping integration
ENCRYPTION_KEY=your-encryption-key-for-shipping
```

**Important:** Change `JWT_SECRET` and `ENCRYPTION_KEY` in production!

### 3. Start the Backend Server
```bash
cd backend
npm start
```

Expected output:
```
Backend running on port 4000
```

### 4. Verify Server is Running
Test the health endpoint:
```bash
curl http://localhost:4000/
```

Expected response:
```json
{
  "message": "Cigar Order Hub with JWT auth & SQLite"
}
```

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Environment Variables
Create or update `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

For production:
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

### 3. Start the Frontend Development Server
```bash
cd frontend
npm run dev
```

Expected output:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3000
- Ready in X.Xs
```

### 4. Access the Application
Open your browser to:
- Dashboard: http://localhost:3000
- Messages: http://localhost:3000/messages
- Call Logs: http://localhost:3000/calls

---

## Testing the Setup

### 1. Create Test Users

**Option A: Via API**
```bash
# Register Supplier
curl -X POST http://localhost:4000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Supplier",
    "email": "supplier@test.com",
    "password": "password123",
    "role": "supplier"
  }'

# Register Retailer
curl -X POST http://localhost:4000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Retailer",
    "email": "retailer@test.com",
    "password": "password123",
    "role": "retailer"
  }'
```

**Option B: Via Frontend**
1. Go to http://localhost:3000
2. Register two users with different roles
3. Note their user IDs from the response

### 2. Test Login and Authentication
```bash
# Login as Supplier
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "supplier@test.com",
    "password": "password123"
  }'
```

Save the returned token for subsequent requests.

### 3. Test Messaging
```bash
# Send a message
curl -X POST http://localhost:4000/api/protected/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipientId": 2,
    "content": "Hello, this is a test message!",
    "messageType": "text"
  }'

# Get conversations
curl -X GET http://localhost:4000/api/protected/messages/conversations \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get unread count
curl -X GET http://localhost:4000/api/protected/messages/unread/count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test Call Logging
```bash
# Initiate a call
curl -X POST http://localhost:4000/api/protected/calls/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipientId": 2,
    "callType": "outbound"
  }'

# Log call completion (use the ID from the initiate response)
curl -X POST http://localhost:4000/api/protected/calls/1/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "completed",
    "duration": 120,
    "notes": "Discussed order details"
  }'

# Get call logs
curl -X GET http://localhost:4000/api/protected/calls/logs \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get analytics
curl -X GET http://localhost:4000/api/protected/calls/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5. Test Frontend Pages

**Messages Page:**
1. Login to the application at http://localhost:3000
2. Navigate to http://localhost:3000/messages
3. You should see your conversations list
4. Click on a conversation to view messages
5. Send a test message
6. Verify the message appears in the thread

**Call Logs Page:**
1. Navigate to http://localhost:3000/calls
2. You should see call analytics cards
3. View the call history table
4. Click "Add Notes" on a call
5. Add notes and save
6. Verify notes are saved

---

## Usage Examples

### For Suppliers

**Messaging:**
```typescript
// Send a message to a retailer
const response = await fetch(`${API_URL}/api/protected/messages/send`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    recipientId: retailerId,
    content: 'New products available!',
    messageType: 'text'
  })
});
```

**Call Logging:**
```typescript
// Log a call to a retailer
const callResponse = await fetch(`${API_URL}/api/protected/calls/initiate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    recipientId: retailerId,
    callType: 'outbound'
  })
});

const { id: callId } = await callResponse.json();

// Complete the call
await fetch(`${API_URL}/api/protected/calls/${callId}/log`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    status: 'completed',
    duration: 180,
    notes: 'Discussed pricing and delivery'
  })
});
```

### For Retailers

**Check Unread Messages:**
```typescript
const response = await fetch(`${API_URL}/api/protected/messages/unread/count`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { count } = await response.json();
console.log(`You have ${count} unread messages`);
```

**View Call History:**
```typescript
const response = await fetch(`${API_URL}/api/protected/calls/logs?callType=inbound&status=completed`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const callLogs = await response.json();
```

### For Sales Reps

**Get Analytics:**
```typescript
// Get call analytics for the current month
const startDate = new Date();
startDate.setDate(1); // First day of month

const response = await fetch(
  `${API_URL}/api/protected/calls/analytics?startDate=${startDate.toISOString().split('T')[0]}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const analytics = await response.json();
console.log(`Total calls this month: ${analytics.total_calls}`);
console.log(`Average duration: ${Math.round(analytics.avg_duration)}s`);
```

---

## Troubleshooting

### Backend Issues

**Issue: Server won't start**
```
Error: Cannot find module 'express'
```
**Solution:**
```bash
cd backend
npm install
```

**Issue: Database tables not created**
```
Error: no such table: messages
```
**Solution:**
```bash
cd backend
# Delete existing database
rm cigar-hub.db
# Restart server to recreate tables
npm start
```

**Issue: Authentication errors**
```
Error: Invalid token
```
**Solution:**
- Verify JWT_SECRET is set correctly
- Ensure token is not expired
- Check Authorization header format: `Bearer YOUR_TOKEN`

### Frontend Issues

**Issue: Cannot connect to backend**
```
Error: Network error
```
**Solution:**
- Verify backend server is running on port 4000
- Check NEXT_PUBLIC_API_URL in `.env.local`
- Verify CORS settings in backend allow your frontend URL

**Issue: Pages show "Loading..." indefinitely**
**Solution:**
- Check browser console for errors
- Verify token is stored in localStorage
- Confirm user is logged in

### Communication Issues

**Issue: "Unauthorized: Users cannot communicate"**
**Solution:**
- Verify users have compatible roles (supplier ↔ retailer)
- Ensure sales reps role is set correctly
- Check RBAC enforcement in `communication.js`

**Issue: Messages not appearing**
**Solution:**
- Check if messages are soft-deleted
- Verify conversation thread exists
- Confirm read/unread status

**Issue: Call logs missing**
**Solution:**
- Ensure `/initiate` was called before `/log`
- Verify call ID is correct
- Check database for orphaned records

### Database Issues

**Check Database Content:**
```bash
cd backend
sqlite3 cigar-hub.db

# List all messages
SELECT * FROM messages;

# List all call logs
SELECT * FROM call_logs;

# List all conversation threads
SELECT * FROM conversation_threads;

# Exit
.quit
```

**Reset Database:**
```bash
cd backend
rm cigar-hub.db
npm start  # Tables will be recreated
```

---

## Production Deployment

### Security Checklist
- [ ] Change JWT_SECRET to a strong, random value
- [ ] Change ENCRYPTION_KEY to a strong, random value
- [ ] Enable HTTPS for all communications
- [ ] Set strong password policies
- [ ] Configure rate limiting
- [ ] Enable audit logging
- [ ] Set up database backups
- [ ] Configure monitoring and alerts

### Environment Configuration
```env
# Production backend .env
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-strong-secret>
JWT_ALGORITHM=HS256
JWT_EXPIRY=15m
DATABASE_PATH=/var/lib/cigar-hub/cigar-hub.db
FRONTEND_URL=https://your-domain.com
ENCRYPTION_KEY=<generate-strong-key>
```

### Monitoring
Set up monitoring for:
- API endpoint response times
- Database query performance
- Message delivery rates
- Call logging accuracy
- Error rates
- Unread message counts

---

## Additional Resources

- [Communication API Documentation](./COMMUNICATION_API_DOCUMENTATION.md)
- [Main API Documentation](./API_DOCUMENTATION.md)
- [RBAC Setup Guide](./RBAC_SETUP_GUIDE.md)
- [Security Summary](./SECURITY_SUMMARY.md)

---

## Support

For additional help:
- Email: support@cigarorderhub.com
- Documentation: https://docs.cigarorderhub.com
- GitHub Issues: https://github.com/beeree7-source/cigar-order-hub/issues

---

## Version History

- **v1.0.0** (2026-02-16)
  - Initial release of Communication Extension
  - Messaging system with read receipts
  - Call logging with analytics
  - RBAC enforcement
  - Frontend pages for messages and calls
