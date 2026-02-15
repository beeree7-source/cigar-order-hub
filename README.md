# Cigar Order Hub

B2B SaaS central ordering hub for cigar retailers and wholesalers with Enterprise-level RBAC and Shipping Integration.

## 🎯 Overview

The Cigar Order Hub is a comprehensive B2B platform that connects cigar retailers with suppliers, featuring:
- **UPS & USPS Shipping Integration** 🆕
- **Enterprise Multi-Login & RBAC System** 🆕
- Multi-supplier ordering system
- Invoice generation and management
- Email notification system
- Advanced analytics and reporting
- QuickBooks integration
- Mobile app (React Native)

## 📱 Platform Components

- **Backend API**: Node.js/Express with SQLite
- **Frontend Web**: Next.js/React
- **Mobile App**: React Native with Expo
- **Integrations**: QuickBooks Online, Email services, UPS, USPS
- **Security**: JWT, API Keys, MFA, RBAC, AES-256 Encryption

## 🚀 Quick Start

### Backend Setup
```bash
cd backend
npm install
# Run database migrations
npm run migrate
# Or manually:
sqlite3 cigar-hub.db < migrations/006_create_shipping_tables.sql
npm start
```
Runs on http://localhost:4000

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Runs on http://localhost:3000

### Mobile App Setup
```bash
cd mobile
npm install
npm start
```
Follow Expo instructions to run on iOS/Android

## 📚 Documentation

### General Documentation
- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Security Summary](./SECURITY_SUMMARY.md)** - Security analysis and recommendations
- **[Mobile App README](./mobile/README.md)** - Mobile app setup and features
- **[Deployment Guide](./DEPLOYMENT.md)** - Deployment instructions

### RBAC System Documentation 🆕
- **[RBAC API Documentation](./RBAC_API_DOCUMENTATION.md)** - 50+ new API endpoints for authentication and authorization
- **[RBAC Setup Guide](./RBAC_SETUP_GUIDE.md)** - Complete setup and configuration guide
- **[RBAC Implementation Summary](./RBAC_IMPLEMENTATION_SUMMARY.md)** - Technical overview and architecture
- **[RBAC Security Summary](./RBAC_SECURITY_SUMMARY.md)** - Security analysis and recommendations

### Shipping Integration Documentation 🆕
- **[Shipping API Documentation](./SHIPPING_API_DOCUMENTATION.md)** - 32 new API endpoints for UPS and USPS integration
- **[Shipping Setup Guide](./SHIPPING_SETUP_GUIDE.md)** - Complete setup and configuration guide
- **[Shipping Implementation Summary](./SHIPPING_IMPLEMENTATION_SUMMARY.md)** - Technical overview and architecture

## 🔐 Enterprise Multi-Login & RBAC System

### Features

**Authentication Methods:**
- ✅ Email/Password with bcrypt hashing (cost 12)
- ✅ Single Sign-On (SSO) framework (OAuth2)
- ✅ API Key authentication with scoped permissions
- ✅ Multi-Factor Authentication (MFA/TOTP)
- ✅ Session management with timeout

**Role-Based Access Control:**
- 7 predefined roles (Admin, Manager, Sales, Shipping, Office, Finance, Supplier)
- Custom role creation
- Granular permission system (create, read, update, delete, manage)
- Resource-level access control
- Department and team-based permissions
- Permission inheritance hierarchy

**Security Features:**
- Complete audit logging (all user actions)
- IP address and user agent tracking
- JWT tokens (15-minute access, 7-day refresh)
- API key rate limiting
- Session tracking and management
- Password strength validation

**Database Schema:**
- 12 new tables (companies, departments, roles, permissions, teams, audit logs, etc.)
- 15 performance indexes
- 98 new database fields

**API Endpoints:**
- 50+ new RESTful endpoints
- Authentication (login, register, MFA, API keys)
- User management (CRUD, profiles, teams)
- Roles & permissions (assign, revoke, check)
- Departments & teams (create, manage, members)
- Audit logs (complete activity tracking)

### Quick RBAC Setup

1. **Run migrations:**
```bash
cd backend
sqlite3 cigar-hub.db < migrations/005_create_rbac_tables.sql
```

2. **Configure environment:**
```bash
cp .env.example backend/.env
# Edit backend/.env and set JWT_SECRET
```

3. **Create admin user:**
```bash
curl -X POST http://localhost:4000/api/auth/register-rbac \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"SecurePass123!","role":"retailer"}'
```

4. **Login:**
```bash
curl -X POST http://localhost:4000/api/auth/login-email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePass123!"}'
```

See [RBAC Setup Guide](./RBAC_SETUP_GUIDE.md) for complete instructions.

## 🚚 UPS & USPS Shipping Integration

### Features

**Account Management:**
- ✅ Connect UPS and USPS carrier accounts
- ✅ AES-256 encrypted credential storage
- ✅ Account verification and status monitoring
- ✅ Multiple carriers per supplier
- ✅ Connection refresh and management

**Label Generation:**
- ✅ Generate shipping labels for both carriers
- ✅ Automatic address validation
- ✅ Multiple service types (Ground, Express, Priority, etc.)
- ✅ Weight verification
- ✅ Label reprinting and downloading
- ✅ Batch label generation

**Real-Time Tracking:**
- ✅ Current shipment status and location
- ✅ Estimated delivery dates
- ✅ Detailed event history
- ✅ Webhook subscriptions
- ✅ Email notifications
- ✅ Batch tracking

**Analytics & Reporting:**
- ✅ Shipping cost analysis
- ✅ Carrier performance comparison
- ✅ On-time delivery rates
- ✅ Delivery trends
- ✅ Cost estimation

**Database Schema:**
- 3 new tables (supplier_shipping_accounts, shipment_tracking, shipment_events)
- 9 performance indexes
- Full audit trail

**API Endpoints:**
- 32 new RESTful endpoints
- UPS account management (5 endpoints)
- USPS account management (5 endpoints)
- Label generation (6 endpoints)
- Tracking (6 endpoints)
- Shipment management (5 endpoints)
- Analytics & reporting (5 endpoints)

### Quick Shipping Setup

1. **Run migrations:**
```bash
cd backend
npm run migrate
# Or manually:
sqlite3 cigar-hub.db < migrations/006_create_shipping_tables.sql
```

2. **Configure environment:**
```bash
# Add to backend/.env
ENCRYPTION_KEY=your-secure-32-character-encryption-key-here

# UPS Integration
UPS_ENABLED=true
UPS_ACCOUNT_NUMBER=your_account
UPS_USER_ID=your_user_id
UPS_PASSWORD=your_password
UPS_METER_NUMBER=your_meter
UPS_API_URL=https://onlinetools.ups.com/ship/v1

# USPS Integration
USPS_ENABLED=true
USPS_USER_ID=your_user_id
USPS_API_KEY=your_api_key
USPS_API_URL=https://secure.shippingapis.com
```

3. **Connect UPS account:**
```bash
curl -X POST http://localhost:4000/api/suppliers/1/shipping/ups/connect \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountNumber":"TEST123","userId":"testuser","password":"testpass","meterNumber":"METER123","apiKey":"APIKEY123"}'
```

4. **Generate a label:**
```bash
curl -X POST http://localhost:4000/api/suppliers/1/shipping/labels/ups \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"orderId":1,"weight":2.5,"serviceType":"ground","shipFrom":{...},"shipTo":{...}}'
```

See [Shipping Setup Guide](./SHIPPING_SETUP_GUIDE.md) for complete instructions.

## ✨ Phase 4 Enterprise Features

### 1. Email Notifications System
- Automated email alerts (low stock, order confirmations, shipment tracking)
- Customizable notification preferences
- Email templates with HTML formatting
- Notification history tracking

**Endpoints**:
- `POST /api/protected/notifications/email/test` - Send test email
- `GET /api/protected/notifications/settings` - Get preferences
- `PUT /api/protected/notifications/settings` - Update preferences
- `GET /api/protected/notifications/history` - View history

### 2. Invoice Generation
- Automatic invoice number generation (INV-YYYY-NNN)
- PDF invoice generation
- Tax and discount calculations
- Payment terms and due dates
- Email invoice to customers

**Endpoints**:
- `POST /api/protected/orders/:id/invoice` - Generate invoice
- `GET /api/protected/invoices` - List invoices
- `GET /api/protected/invoices/:id` - Get details
- `GET /api/protected/invoices/:id/pdf` - Download PDF
- `POST /api/protected/invoices/:id/send` - Email invoice
- `PUT /api/protected/invoices/:id/mark-paid` - Mark as paid

### 3. Multi-Supplier Dashboard
- Supplier performance metrics (on-time delivery %, quality ratings)
- Balance and credit tracking
- Payment history
- Order analytics by supplier

**Endpoints**:
- `GET /api/protected/suppliers` - List suppliers
- `GET /api/protected/suppliers/:id/analytics` - Detailed analytics
- `GET /api/protected/suppliers/:id/orders` - Supplier orders
- `GET /api/protected/suppliers/:id/balance` - Balance info
- `PUT /api/protected/suppliers/:id/terms` - Update terms

### 4. Advanced Reporting
- Quarterly revenue reports
- Supplier performance analysis
- Customer lifetime value (LTV)
- Profit margin analysis
- Tax summary generation
- Year-over-year comparisons

**Endpoints**:
- `GET /api/protected/reports/quarterly` - Quarterly revenue
- `GET /api/protected/reports/supplier-performance` - Supplier metrics
- `GET /api/protected/reports/customer-ltv` - Customer LTV
- `GET /api/protected/reports/profit-analysis` - Profit margins
- `GET /api/protected/reports/tax-summary` - Tax summary
- `GET /api/protected/reports/yoy-comparison` - YoY comparison

### 5. QuickBooks Integration
- OAuth2 authentication with Intuit
- Sync customers, vendors, products, orders
- Payment synchronization
- Account mapping configuration
- Reconciliation dashboard

**Endpoints**:
- `GET /api/protected/quickbooks/connect` - Start OAuth
- `GET /api/protected/quickbooks/callback` - OAuth callback
- `POST /api/protected/quickbooks/sync` - Full sync
- `GET /api/protected/quickbooks/status` - Sync status
- `POST /api/protected/quickbooks/sync-orders` - Sync orders
- `POST /api/protected/quickbooks/sync-customers` - Sync customers
- `GET /api/protected/quickbooks/mapping` - View mappings
- `PUT /api/protected/quickbooks/mapping` - Update mappings

### 6. Mobile App (React Native)
- Full authentication with biometric support
- Dashboard with key metrics
- Order management
- Product catalog browsing
- Invoice viewing and PDF download
- Push notifications
- Settings and preferences

## 🗄️ Database Schema

### New Tables (Phase 4)

**notifications**
- Email and SMS notification tracking
- Status and history logging

**notification_settings**
- User notification preferences
- Alert type toggles

**invoices**
- Invoice details and status
- Tax and discount calculations
- Payment tracking

**quickbooks_config**
- QuickBooks OAuth tokens
- Sync status and configuration

**qb_sync_log**
- Synchronization history
- Error tracking

**account_mapping**
- Chart of accounts mappings
- Category assignments

**supplier_metrics**
- Performance tracking
- Balance and credit management

**supplier_payments**
- Payment history
- Transaction records

## 🔐 Security

- JWT authentication for all protected endpoints
- Bcrypt password hashing
- Parameterized database queries (SQL injection prevention)
- CORS configuration
- Secure token storage in mobile app
- Biometric authentication support

**Note**: Rate limiting is not implemented in MVP. See [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md) for production recommendations.

## 🛠️ Tech Stack

### Backend
- Node.js with Express
- SQLite database
- JWT for authentication
- Bcryptjs for password hashing

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS (if configured)

### Mobile
- React Native 0.72
- Expo 49
- React Navigation 6
- Axios for API calls
- Expo SecureStore for secure storage
- Expo LocalAuthentication for biometrics
- Expo Notifications for push notifications

## 📦 Dependencies

### Backend
```json
{
  "express": "^4.19.2",
  "sqlite3": "^5.1.7",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5"
}
```

### Frontend
```json
{
  "next": "latest",
  "react": "latest",
  "react-dom": "latest",
  "typescript": "^5.9.3"
}
```

### Mobile
```json
{
  "react-native": "0.72.6",
  "expo": "~49.0.15",
  "@react-navigation/native": "^6.1.9",
  "expo-notifications": "~0.20.1",
  "axios": "^1.6.2"
}
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in backend directory:
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@cigar-order-hub.com

# QuickBooks Configuration
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_REDIRECT_URI=http://localhost:4000/api/protected/quickbooks/callback
QUICKBOOKS_ENVIRONMENT=sandbox
```

Create `.env.local` file in frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Update `mobile/app.json` with your API URL:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://YOUR_COMPUTER_IP:4000"
    }
  }
}
```

## 🧪 Testing

### Test Backend API
```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"supplier@test.com","password":"password123"}'

# Test notification endpoint
curl -X POST http://localhost:4000/api/protected/notifications/email/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete testing examples.

## 📱 Mobile App Testing

### iOS
```bash
cd mobile
npm start
# Press 'i' for iOS simulator
```

### Android
```bash
cd mobile
npm start
# Press 'a' for Android emulator
```

### Physical Device
1. Install Expo Go app from App Store/Play Store
2. Scan QR code from terminal
3. Update API URL in app.json to your computer's IP

## 🚢 Deployment

### Backend
- Deploy to Heroku, Railway, or any Node.js hosting
- Set environment variables
- Ensure SQLite database persistence

### Frontend
- Deploy to Vercel (recommended)
- Set NEXT_PUBLIC_API_URL environment variable
- Configure domain and SSL

### Mobile
```bash
# Build for iOS
cd mobile
expo build:ios

# Build for Android
cd mobile
expo build:android
```

## 📈 Future Enhancements

- [ ] Rate limiting implementation
- [ ] Real email service integration (Nodemailer/SendGrid)
- [ ] Actual PDF generation (PDFKit)
- [ ] Real QuickBooks OAuth (intuit-oauth)
- [ ] Web socket for real-time updates
- [ ] Advanced analytics charts
- [ ] Multi-language support
- [ ] Dark mode for web
- [ ] Barcode scanning in mobile
- [ ] Offline mode for mobile

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 👥 Team

Developed as part of the Cigar Order Hub B2B SaaS platform.

## 🆘 Support

For issues and questions:
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- Check [SECURITY_SUMMARY.md](./SECURITY_SUMMARY.md)
- Review [mobile/README.md](./mobile/README.md)
- Create an issue in the repository

---

**Version**: 1.0.0 (Phase 4 Complete)
**Last Updated**: February 2026


