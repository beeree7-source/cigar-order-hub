# Mobile Field Sales Representative Guide

## Overview

The Mobile Field Sales Representative System is a comprehensive mobile-first solution designed for sales representatives on the road. It provides tools for daily activity tracking, account management, location tracking, photo documentation, mileage logging, and order management.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Daily Check-In/Check-Out](#daily-check-incheck-out)
3. [Account Management](#account-management)
4. [Visit Management](#visit-management)
5. [Photo Documentation](#photo-documentation)
6. [Location Tracking](#location-tracking)
7. [Mileage Tracking](#mileage-tracking)
8. [Order Management](#order-management)
9. [Performance Dashboard](#performance-dashboard)
10. [Privacy & Security](#privacy--security)

## Getting Started

### Account Setup

1. **User Registration**: Your company administrator will create your account with the "sales_rep" role
2. **Profile Setup**: Complete your sales rep profile with:
   - Employee ID
   - Territory assignment
   - Base location
   - Manager assignment
3. **Mobile App**: Download and install the mobile app on your device
4. **First Login**: Use your credentials to log in to the mobile app

### Initial Configuration

- Enable location services on your device
- Allow camera access for photo capture
- Set up notification preferences
- Review your assigned accounts

## Daily Check-In/Check-Out

### Morning Check-In

Start your day with a check-in:

```
POST /api/reps/check-in
{
  "sales_rep_id": 123,
  "check_in_location": "40.7128,-74.0060,New York, NY",
  "notes": "Starting morning route",
  "weather": "Sunny, 72°F"
}
```

**Features:**
- ✅ GPS location capture
- ✅ Weather auto-detection
- ✅ Daily notes
- ✅ Starting odometer reading (optional)

### Evening Check-Out

End your day with a check-out:

```
POST /api/reps/check-out
{
  "check_in_id": 456,
  "check_out_location": "40.7589,-73.9851,New York, NY",
  "daily_miles": 45.5
}
```

**What's Captured:**
- Check-out time
- Final location
- Total daily miles
- Summary of activities

## Account Management

### Viewing Authorized Accounts

```
GET /api/reps/:sales_rep_id/accounts
```

**Response includes:**
- Account contact information
- Account preferences
- Last visit date
- Order history
- Authorization level (full_access, order_only, view_only)

### Account Preferences

Each account has configurable preferences:
- `allow_rep_photos`: Can you take photos at this account?
- `allow_location_tracking`: Is location tracking enabled?
- `allow_visit_notes`: Can you add visit notes?
- `allow_order_placement`: Can you place orders?
- `minimum_visit_duration`: Required minimum visit time
- `required_visit_frequency`: How often to visit (daily, weekly, biweekly)

### Finding Nearby Accounts

```
GET /api/reps/location/nearby-accounts?sales_rep_id=123&latitude=40.7128&longitude=-74.0060&radius_miles=10
```

This helps you plan your route efficiently by showing accounts within a specified radius.

## Visit Management

### Check-In at Account

```
POST /api/reps/visits/check-in
{
  "sales_rep_id": 123,
  "account_id": 789,
  "check_in_id": 456,
  "notes": "Routine visit",
  "purpose": "routine_call",
  "location_latitude": 40.7128,
  "location_longitude": -74.0060
}
```

**Visit Purposes:**
- `routine_call`: Regular scheduled visit
- `problem_solving`: Address customer issues
- `order_delivery`: Deliver or follow up on orders
- `new_product_demo`: Product demonstrations
- `inventory_check`: Review inventory levels

### Check-Out from Account

```
POST /api/reps/visits/check-out
{
  "visit_id": 321,
  "notes": "Discussed new product line"
}
```

Visit duration is automatically calculated.

### Scheduling Future Visits

```
POST /api/reps/accounts/:account_id/visit
{
  "sales_rep_id": 123,
  "visit_date": "2026-02-20",
  "notes": "Follow-up on order",
  "purpose": "order_delivery"
}
```

## Photo Documentation

### Taking Photos

```
POST /api/reps/photos/upload
{
  "visit_id": 321,
  "photo_url": "/uploads/photos/store123_display.jpg",
  "photo_type": "display",
  "file_size": 2048576,
  "file_name": "store123_display.jpg",
  "photo_metadata": "{\"camera\":\"iPhone\",\"coordinates\":\"40.7128,-74.0060\"}"
}
```

**Photo Types:**
- `display`: Product displays
- `inventory`: Inventory levels
- `product`: Product photos
- `signage`: Store signage
- `store_front`: Store exterior
- `other`: Other documentation

### Photo Best Practices

1. **Quality**: Take clear, well-lit photos
2. **Context**: Include context in your photos
3. **Metadata**: Location and timestamp are automatically captured
4. **Organization**: Use appropriate photo types
5. **Privacy**: Respect customer privacy; don't photograph people without permission

### Photo Approval Workflow

If enabled by your supplier:
1. Photos are uploaded but marked as "pending"
2. Manager reviews and approves/rejects
3. You receive notification of approval status
4. Rejected photos include reason for rejection

## Location Tracking

### Real-Time Tracking

Location is automatically tracked when enabled:
- Updates every 30 seconds (configurable)
- Battery-efficient background tracking
- Automatic route logging

### Manual Location Logging

```
POST /api/reps/location/track
{
  "sales_rep_id": 123,
  "check_in_id": 456,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "address": "New York, NY",
  "accuracy": 10
}
```

### Viewing Your Route

```
GET /api/reps/:sales_rep_id/location/today
```

Shows your complete route for the day with:
- All location points
- Total distance traveled
- Time stamps
- Map visualization

### Geofencing

Automatic notifications when you:
- Arrive at an account location
- Depart from an account location
- Enter/exit your territory

## Mileage Tracking

### Automatic Mileage Calculation

Mileage is automatically calculated from location tracking using the Haversine formula for accurate distance measurements.

### Manual Mileage Entry

```
POST /api/reps/mileage/log
{
  "sales_rep_id": 123,
  "check_in_id": 456,
  "start_odometer": 12345.5,
  "end_odometer": 12391.0,
  "start_location": "Home Office",
  "end_location": "Customer ABC",
  "trip_date": "2026-02-15",
  "purpose": "customer_visit",
  "notes": "Visit to ABC Corp"
}
```

### Mileage Reimbursement

```
GET /api/reps/:sales_rep_id/mileage/reimbursement?start_date=2026-02-01&end_date=2026-02-28
```

**Features:**
- IRS standard mileage rate (0.585 per mile)
- Custom rates per account/company
- Monthly summaries
- CSV export for accounting
- Reimbursement status tracking (pending, approved, paid)

### Monthly Mileage Report

```
GET /api/reps/:sales_rep_id/mileage/month?year=2026&month=2
```

Provides:
- Total miles by date
- Daily summaries
- Reimbursement calculations
- Export functionality

## Order Management

### Creating Orders

```
POST /api/reps/orders/create
{
  "sales_rep_id": 123,
  "account_id": 789,
  "supplier_id": 456,
  "items": [
    {
      "product_id": 1,
      "name": "Product A",
      "sku": "PROD-001",
      "quantity": 10,
      "price": 25.00
    }
  ],
  "notes": "Restock order"
}
```

**Authorization Check:**
- System verifies you're authorized for this account
- Checks if order placement is allowed by account preferences
- Validates product availability

### Quick Reorder

```
POST /api/reps/orders/:order_id/reorder
{
  "sales_rep_id": 123,
  "account_id": 789
}
```

Duplicates a previous order for quick reordering.

### Viewing Order History

```
GET /api/reps/orders/history/:account_id?sales_rep_id=123
```

Shows complete order history for an account.

## Performance Dashboard

### Daily Metrics

```
GET /api/reps/:sales_rep_id/performance/daily?date=2026-02-15
```

**Metrics:**
- Check-in status
- Visits completed
- Orders placed
- Miles traveled
- Photos taken

### Weekly Summary

```
GET /api/reps/:sales_rep_id/performance/weekly
```

**Includes:**
- Daily breakdown
- Weekly totals
- Visit completion rate
- Account coverage
- Mileage summary

### Monthly Performance

```
GET /api/reps/:sales_rep_id/performance/monthly?year=2026&month=2
```

**Key Performance Indicators:**
- Total accounts assigned
- Accounts visited
- Visit completion rate
- Total orders
- Total sales value
- Average order value
- Photos taken
- Total miles
- Days worked

### Personal Dashboard

```
GET /api/reps/:sales_rep_id/performance/dashboard?period=week
```

Real-time dashboard showing:
- Today's progress
- Week/month to date
- Targets vs actuals
- Alerts and notifications
- Upcoming scheduled visits

## Privacy & Security

### Location Data

**What's Tracked:**
- Your location during work hours (after check-in)
- Route between customer visits
- Arrival/departure times at accounts

**What's NOT Tracked:**
- Location when checked out
- Location outside work hours
- Personal activities

**Your Controls:**
- View all tracked locations
- Request location data export
- Request location data deletion (after retention period)

### Photo Security

**Protection:**
- Photos are encrypted in transit (HTTPS)
- Stored securely with access controls
- Watermarked with metadata
- Regular backups

**Your Rights:**
- Delete your photos
- Export your photo gallery
- Control photo sharing

### Data Privacy

**GDPR Compliance:**
- Right to access your data
- Right to export your data
- Right to delete your data
- Transparent data usage
- Consent management

### Account Privacy

You can only:
- View accounts you're authorized for
- Create orders for authorized accounts
- Access visit history for your visits
- View photos you've taken or approved

## Mobile App Features

### Offline Mode

- Cache account information
- Log visits offline
- Queue orders for sync
- Automatic sync when online

### Notifications

- Arrival at account (geofence)
- Scheduled visit reminders
- Order status updates
- Photo approval status
- Mileage reimbursement updates

### Quick Actions

- One-tap check-in
- Quick visit log
- Fast photo capture
- Quick reorder
- Emergency contact

## Best Practices

### Daily Routine

1. **Morning**:
   - Check in as you start work
   - Review scheduled visits
   - Plan your route
   - Check notifications

2. **During Visits**:
   - Check in at each account
   - Take required photos
   - Add detailed notes
   - Place orders as needed
   - Check out when leaving

3. **Evening**:
   - Check out at end of day
   - Review daily summary
   - Submit mileage (if not auto-tracked)
   - Plan tomorrow's route

### Documentation Tips

- **Notes**: Be clear and concise
- **Photos**: Take multiple angles
- **Timing**: Log visits in real-time
- **Accuracy**: Review data before submitting

### Efficiency Tips

- Use nearby accounts feature
- Batch visits by area
- Schedule regular accounts
- Use quick reorder
- Review performance metrics

## Troubleshooting

### GPS Issues

- Enable location services
- Check GPS accuracy
- Move to open area
- Restart app if needed

### Photo Upload Fails

- Check internet connection
- Verify photo size < 10MB
- Retry upload
- Contact support if persistent

### Mileage Discrepancies

- Verify odometer readings
- Check location tracking settings
- Review route for accuracy
- Contact manager for adjustments

## Support

For technical support:
- **Email**: support@cigar-order-hub.com
- **Phone**: 1-800-XXX-XXXX
- **In-App**: Help & Support section

For account issues:
- Contact your manager
- Use the feedback feature
- Check documentation

## Updates

This system is regularly updated with new features and improvements. Check the release notes for:
- New features
- Bug fixes
- Performance improvements
- Security updates

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Next Review**: May 2026
