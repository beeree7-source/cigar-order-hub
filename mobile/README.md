# Cigar Order Hub - Mobile App

React Native mobile application for the Cigar Order Hub B2B SaaS platform.

## Features

### Authentication
- **Login/Register** with email and password
- **Biometric Authentication** (Face ID/Touch ID) support
- **Secure token storage** using Expo SecureStore

### Dashboard
- **Key Metrics** at a glance (orders, revenue, products, low stock)
- **Quick Navigation** to main features
- **Pull to refresh** functionality

### Orders Management
- **View all orders** with status filtering (pending, completed, cancelled)
- **Order details** with item counts
- **Real-time updates**

### Product Catalog
- **Browse products** with search functionality
- **Product details** including SKU, price, and stock levels
- **Low stock warnings**
- **Product images** or placeholders

### Invoices
- **View all invoices** with status filtering (paid, unpaid)
- **Invoice details** (number, amount, due date)
- **Download PDF** functionality
- **Payment status tracking**

### Settings
- **Notification preferences** management
  - Email alerts
  - Low stock alerts
  - Order confirmations
  - Shipment notifications
  - Payment reminders
  - Weekly summaries
- **Biometric authentication** toggle
- **Logout** functionality

### Push Notifications
- **Firebase Cloud Messaging** integration
- **Local notifications** support
- **Notification badge** counts
- **In-app notification handling**

## Technology Stack

- **React Native** 0.72.6
- **Expo** 49.x
- **React Navigation** 6.x
- **TypeScript** 5.x
- **Axios** for API calls
- **Expo Notifications** for push notifications
- **Expo Local Authentication** for biometric auth
- **Expo SecureStore** for secure storage

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac only) or Android Emulator
- Physical device for testing biometric features

### Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update the API URL in `app.json`:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://YOUR_BACKEND_URL:4000"
    }
  }
}
```

### Running the App

Start the development server:
```bash
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your device

### Building for Production

#### iOS
```bash
expo build:ios
```

#### Android
```bash
expo build:android
```

## Project Structure

```
mobile/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── navigation/
│   └── RootNavigator.tsx  # Navigation configuration
├── screens/
│   ├── LoginScreen.tsx    # Login/authentication
│   ├── DashboardScreen.tsx # Main dashboard
│   ├── OrdersScreen.tsx    # Orders list
│   ├── ProductsScreen.tsx  # Products catalog
│   ├── InvoicesScreen.tsx  # Invoices list
│   └── SettingsScreen.tsx  # App settings
├── components/
│   ├── OrderCard.tsx       # Order card component
│   ├── ProductCard.tsx     # Product card component
│   └── NotificationBadge.tsx # Notification badge
└── services/
    ├── api.ts              # API service layer
    ├── auth.ts             # Authentication utilities
    └── notifications.ts    # Push notifications service
```

## API Integration

The mobile app connects to the backend API at the URL specified in `app.json`. All API calls are authenticated using JWT tokens stored securely.

### API Endpoints Used

- `POST /api/auth/login` - User login
- `POST /api/users/register` - User registration
- `GET /api/protected/orders` - Fetch orders
- `GET /api/protected/analytics/summary` - Dashboard metrics
- `GET /api/products/search` - Search products
- `GET /api/protected/invoices` - Fetch invoices
- `GET /api/protected/invoices/:id/pdf` - Download invoice PDF
- `GET /api/protected/notifications/settings` - Get notification preferences
- `PUT /api/protected/notifications/settings` - Update notification preferences

## Features in Detail

### Dark Mode Support
The app automatically adapts to the system's dark mode setting.

### Offline Caching
Basic offline support with local storage for viewed data.

### Pull-to-Refresh
All list screens support pull-to-refresh to fetch latest data.

### Error Handling
Comprehensive error handling with user-friendly messages.

### Security
- Secure token storage using Expo SecureStore
- Biometric authentication option
- Automatic logout on token expiration

## Customization

### Changing Colors
Update the color scheme in each screen's StyleSheet:
- Primary: `#1e3a8a` (blue)
- Success: `#047857` (green)
- Warning: `#ea580c` (orange)
- Error: `#dc2626` (red)

### Adding New Screens
1. Create new screen in `screens/`
2. Import in `navigation/RootNavigator.tsx`
3. Add to Stack.Navigator

### Adding New API Endpoints
Add new service functions in `services/api.ts`

## Troubleshooting

### iOS Build Issues
- Clear build cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Android Build Issues
- Update Android SDK tools
- Check `app.json` permissions

### Network Issues
- Ensure backend is running and accessible
- Check API URL in `app.json`
- For Android emulator, use `10.0.2.2` instead of `localhost`

## Future Enhancements

- [ ] Order creation from mobile
- [ ] Product barcode scanning
- [ ] Invoice generation
- [ ] Photo upload for products
- [ ] Chat/messaging feature
- [ ] Analytics charts
- [ ] Offline mode with sync
- [ ] Multi-language support

## License

MIT License - See main project README for details

## Support

For issues and questions, please contact the development team or create an issue in the repository.
