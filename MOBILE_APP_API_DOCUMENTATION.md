# Mobile App API Documentation

## Overview

This document provides comprehensive API documentation for the Mobile Field Sales Representative System. All endpoints require JWT authentication unless otherwise specified.

**Base URL**: `https://api.cigar-order-hub.com` (or `http://localhost:4000` for development)

**Authentication**: Include JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## Table of Contents

1. [Daily Check-In Endpoints](#daily-check-in-endpoints)
2. [Location Tracking Endpoints](#location-tracking-endpoints)
3. [Mileage Endpoints](#mileage-endpoints)
4. [Account Visits Endpoints](#account-visits-endpoints)
5. [Photo Endpoints](#photo-endpoints)
6. [Authorized Accounts Endpoints](#authorized-accounts-endpoints)
7. [Orders Endpoints](#orders-endpoints)
8. [Performance & Analytics Endpoints](#performance--analytics-endpoints)
9. [Sales Rep Management Endpoints](#sales-rep-management-endpoints)
10. [Error Codes](#error-codes)

---

## Daily Check-In Endpoints

### 1. Morning Check-In

**Endpoint**: `POST /api/reps/check-in`

**Description**: Log morning check-in with location and notes.

**Request Body**:
```json
{
  "sales_rep_id": 123,
  "check_in_location": "40.7128,-74.0060,New York, NY",
  "notes": "Starting morning route",
  "weather": "Sunny, 72°F"
}
```

**Response** (201):
```json
{
  "message": "Checked in successfully",
  "check_in_id": 456,
  "check_in_date": "2026-02-15",
  "check_in_time": "2026-02-15T08:30:00.000Z"
}
```

**Errors**:
- `400`: Already checked in today
- `500`: Server error

---

### 2. Evening Check-Out

**Endpoint**: `POST /api/reps/check-out`

**Description**: Log evening check-out with location and daily mileage.

**Request Body**:
```json
{
  "check_in_id": 456,
  "check_out_location": "40.7589,-73.9851,New York, NY",
  "daily_miles": 45.5
}
```

**Response** (200):
```json
{
  "message": "Checked out successfully",
  "check_out_time": "2026-02-15T18:30:00.000Z"
}
```

**Errors**:
- `404`: Check-in not found
- `500`: Server error

---

### 3. Get Today's Check-In Status

**Endpoint**: `GET /api/reps/:sales_rep_id/check-in/today`

**Description**: Get the current day's check-in status.

**Response** (200):
```json
{
  "id": 456,
  "sales_rep_id": 123,
  "check_in_date": "2026-02-15",
  "check_in_time": "2026-02-15T08:30:00.000Z",
  "check_in_location": "40.7128,-74.0060,New York, NY",
  "check_out_time": null,
  "check_out_location": null,
  "notes": "Starting morning route",
  "weather": "Sunny, 72°F",
  "daily_miles": null,
  "status": "checked_in"
}
```

---

### 4. Get Check-In History

**Endpoint**: `GET /api/reps/:sales_rep_id/check-in/history`

**Query Parameters**:
- `limit` (optional): Number of records (default: 30)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
[
  {
    "id": 456,
    "sales_rep_id": 123,
    "check_in_date": "2026-02-15",
    "check_in_time": "2026-02-15T08:30:00.000Z",
    "check_out_time": "2026-02-15T18:30:00.000Z",
    "daily_miles": 45.5,
    "status": "checked_out"
  }
]
```

---

### 5. Update Check-In

**Endpoint**: `PUT /api/reps/check-in/:id`

**Description**: Update check-in notes, weather, or daily mileage.

**Request Body**:
```json
{
  "notes": "Updated notes",
  "weather": "Cloudy, 68°F",
  "daily_miles": 50.0
}
```

**Response** (200):
```json
{
  "message": "Check-in updated successfully"
}
```

---

## Location Tracking Endpoints

### 1. Track Location

**Endpoint**: `POST /api/reps/location/track`

**Description**: Log a location point for tracking.

**Request Body**:
```json
{
  "sales_rep_id": 123,
  "check_in_id": 456,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "address": "New York, NY",
  "accuracy": 10
}
```

**Response** (201):
```json
{
  "message": "Location tracked successfully",
  "location_id": 789,
  "timestamp": "2026-02-15T10:30:00.000Z"
}
```

---

### 2. Get Today's Route

**Endpoint**: `GET /api/reps/:sales_rep_id/location/today`

**Description**: Get all location points for today.

**Response** (200):
```json
{
  "locations": [
    {
      "id": 789,
      "sales_rep_id": 123,
      "latitude": 40.7128,
      "longitude": -74.0060,
      "address": "New York, NY",
      "timestamp": "2026-02-15T10:30:00.000Z"
    }
  ],
  "total_distance_miles": 25.3,
  "point_count": 45
}
```

---

### 3. Get Location History

**Endpoint**: `GET /api/reps/:sales_rep_id/location/history`

**Query Parameters**:
- `start_date` (optional): Filter start date (YYYY-MM-DD)
- `end_date` (optional): Filter end date (YYYY-MM-DD)
- `limit` (optional): Number of records (default: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
[
  {
    "id": 789,
    "sales_rep_id": 123,
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "New York, NY",
    "timestamp": "2026-02-15T10:30:00.000Z",
    "accuracy": 10
  }
]
```

---

### 4. Get Full Route with Map Data

**Endpoint**: `GET /api/reps/:sales_rep_id/location/route`

**Query Parameters**:
- `date` (optional): Date to get route for (YYYY-MM-DD, default: today)

**Response** (200):
```json
{
  "date": "2026-02-15",
  "locations": [...],
  "segments": [
    {
      "from": {"lat": 40.7128, "lng": -74.0060},
      "to": {"lat": 40.7589, "lng": -73.9851},
      "distance_miles": 2.5,
      "timestamp": "2026-02-15T11:00:00.000Z"
    }
  ],
  "total_distance_miles": 25.3,
  "point_count": 45,
  "start_time": "2026-02-15T08:30:00.000Z",
  "end_time": "2026-02-15T18:30:00.000Z"
}
```

---

### 5. Start Trip

**Endpoint**: `POST /api/reps/location/start-trip`

**Description**: Mark the start of a trip.

**Request Body**:
```json
{
  "sales_rep_id": 123,
  "check_in_id": 456,
  "latitude": 40.7128,
  "longitude": -74.0060,
  "address": "Home Office"
}
```

**Response** (201):
```json
{
  "message": "Trip started",
  "trip_id": 789,
  "start_time": "2026-02-15T09:00:00.000Z"
}
```

---

### 6. End Trip

**Endpoint**: `POST /api/reps/location/end-trip`

**Description**: Mark the end of a trip and calculate distance.

**Request Body**:
```json
{
  "trip_id": 789,
  "latitude": 40.7589,
  "longitude": -73.9851
}
```

**Response** (200):
```json
{
  "message": "Trip ended",
  "end_time": "2026-02-15T12:00:00.000Z",
  "miles_traveled": 5.2
}
```

---

### 7. Check Geofence

**Endpoint**: `GET /api/reps/location/geofence`

**Query Parameters**:
- `latitude`: Current latitude
- `longitude`: Current longitude
- `account_id`: Account to check
- `radius` (optional): Geofence radius in meters (default: 100)

**Response** (200):
```json
{
  "within_geofence": true,
  "distance_meters": 45.5,
  "distance_miles": 0.028,
  "account_location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

---

### 8. Get Distance Between Points

**Endpoint**: `GET /api/reps/location/distance`

**Query Parameters**:
- `lat1`: Start latitude
- `lon1`: Start longitude
- `lat2`: End latitude
- `lon2`: End longitude

**Response** (200):
```json
{
  "distance_miles": 5.2,
  "distance_kilometers": 8.37,
  "distance_meters": 8370
}
```

---

### 9. Get Nearby Accounts

**Endpoint**: `GET /api/reps/location/nearby-accounts`

**Query Parameters**:
- `sales_rep_id`: Sales rep ID
- `latitude`: Current latitude
- `longitude`: Current longitude
- `radius_miles` (optional): Search radius (default: 10)

**Response** (200):
```json
{
  "current_location": {
    "latitude": "40.7128",
    "longitude": "-74.0060"
  },
  "radius_miles": 10,
  "nearby_accounts": [
    {
      "account_id": 789,
      "name": "ABC Store",
      "email": "abc@store.com",
      "location_latitude": 40.7258,
      "location_longitude": -74.0190,
      "distance_miles": 1.2,
      "last_visit_date": "2026-02-10"
    }
  ],
  "count": 5
}
```

---

## Mileage Endpoints

### 1. Log Mileage

**Endpoint**: `POST /api/reps/mileage/log`

**Description**: Log trip mileage for reimbursement.

**Request Body**:
```json
{
  "sales_rep_id": 123,
  "check_in_id": 456,
  "start_odometer": 12345.5,
  "end_odometer": 12391.0,
  "total_miles": 45.5,
  "start_location": "Home Office",
  "end_location": "Customer ABC",
  "trip_date": "2026-02-15",
  "trip_start_time": "2026-02-15T09:00:00.000Z",
  "trip_end_time": "2026-02-15T17:00:00.000Z",
  "purpose": "customer_visit",
  "notes": "Visit to ABC Corp"
}
```

**Response** (201):
```json
{
  "message": "Mileage logged successfully",
  "mileage_log_id": 321,
  "total_miles": 45.5,
  "reimbursement_amount": "26.62",
  "mileage_rate": 0.585
}
```

---

### 2. Get Today's Mileage

**Endpoint**: `GET /api/reps/:sales_rep_id/mileage/today`

**Response** (200):
```json
{
  "date": "2026-02-15",
  "trips": [
    {
      "id": 321,
      "total_miles": 45.5,
      "reimbursement_amount": "26.62",
      "purpose": "customer_visit"
    }
  ],
  "total_miles": 45.5,
  "total_reimbursement": "26.62",
  "trip_count": 1
}
```

---

### 3. Get Monthly Mileage Summary

**Endpoint**: `GET /api/reps/:sales_rep_id/mileage/month`

**Query Parameters**:
- `year` (optional): Year (default: current year)
- `month` (optional): Month (1-12, default: current month)

**Response** (200):
```json
{
  "year": 2026,
  "month": 2,
  "start_date": "2026-02-01",
  "end_date": "2026-02-29",
  "by_date": [
    {
      "date": "2026-02-15",
      "trips": [...],
      "daily_miles": 45.5,
      "daily_reimbursement": "26.62"
    }
  ],
  "total_miles": 850.0,
  "total_reimbursement": "497.25",
  "trip_count": 20,
  "days_with_mileage": 15
}
```

---

### 4. Calculate Reimbursement

**Endpoint**: `GET /api/reps/:sales_rep_id/mileage/reimbursement`

**Query Parameters**:
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `status` (optional): Filter by status (pending, approved, paid, all)

**Response** (200):
```json
{
  "start_date": "2026-02-01",
  "end_date": "2026-02-29",
  "summary": {
    "pending": {
      "miles": 450.0,
      "amount": "263.25",
      "count": 10
    },
    "approved": {
      "miles": 400.0,
      "amount": "234.00",
      "count": 10
    },
    "paid": {
      "miles": 0,
      "amount": "0.00",
      "count": 0
    }
  },
  "logs": [...],
  "total_miles": 850.0,
  "total_amount": "497.25"
}
```

---

### 5. Update Mileage Log

**Endpoint**: `PUT /api/reps/mileage/:id`

**Description**: Update mileage log details.

**Request Body**:
```json
{
  "start_odometer": 12345.5,
  "end_odometer": 12395.0,
  "total_miles": 49.5,
  "purpose": "customer_visit",
  "notes": "Updated notes",
  "reimbursement_status": "approved"
}
```

**Response** (200):
```json
{
  "message": "Mileage log updated successfully"
}
```

---

### 6. Export Mileage for Accounting

**Endpoint**: `POST /api/reps/:sales_rep_id/mileage/export`

**Query Parameters**:
- `start_date` (optional): Start date
- `end_date` (optional): End date
- `format` (optional): Export format (json or csv, default: json)

**Response** (200) - JSON:
```json
{
  "export_date": "2026-02-15T20:00:00.000Z",
  "start_date": "2026-02-01",
  "end_date": "2026-02-29",
  "sales_rep_id": 123,
  "employee_id": "EMP001",
  "rep_name": "John Doe",
  "logs": [...],
  "summary": {
    "total_trips": 20,
    "total_miles": 850.0,
    "total_reimbursement": "497.25"
  }
}
```

**Response** (200) - CSV:
```csv
Date,Employee ID,Rep Name,Start Location,End Location,Start Time,End Time,Miles,Purpose,Reimbursement Amount,Status
2026-02-15,EMP001,John Doe,Home Office,Customer ABC,2026-02-15T09:00:00,2026-02-15T17:00:00,45.5,customer_visit,26.62,pending
```

---

### 7. Calculate Mileage from Tracking

**Endpoint**: `GET /api/reps/:sales_rep_id/mileage/calculate-from-tracking`

**Query Parameters**:
- `date` (optional): Date to calculate (YYYY-MM-DD, default: today)

**Response** (200):
```json
{
  "date": "2026-02-15",
  "total_miles": 47.3,
  "segments": [
    {
      "from": "Home Office",
      "to": "Customer ABC",
      "distance": 15.2,
      "time": "2026-02-15T10:30:00.000Z"
    }
  ],
  "location_count": 156,
  "start_location": "Home Office",
  "end_location": "Customer XYZ",
  "start_time": "2026-02-15T08:30:00.000Z",
  "end_time": "2026-02-15T18:30:00.000Z"
}
```

---

## Account Visits Endpoints

### 1. Check-In at Account

**Endpoint**: `POST /api/reps/visits/check-in`

**Description**: Log arrival at customer account.

**Request Body**:
```json
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

**Response** (201):
```json
{
  "message": "Checked in at account",
  "visit_id": 321,
  "arrival_time": "2026-02-15T10:30:00.000Z"
}
```

---

### 2. Check-Out from Account

**Endpoint**: `POST /api/reps/visits/check-out`

**Description**: Log departure from customer account.

**Request Body**:
```json
{
  "visit_id": 321
}
```

**Response** (200):
```json
{
  "message": "Checked out from account",
  "departure_time": "2026-02-15T11:30:00.000Z"
}
```

---

### 3. Get Today's Visits

**Endpoint**: `GET /api/reps/:sales_rep_id/visits/today`

**Response** (200):
```json
[
  {
    "id": 321,
    "sales_rep_id": 123,
    "account_id": 789,
    "account_name": "ABC Store",
    "account_email": "abc@store.com",
    "visit_date": "2026-02-15",
    "arrival_time": "2026-02-15T10:30:00.000Z",
    "departure_time": "2026-02-15T11:30:00.000Z",
    "visit_duration": 60,
    "notes": "Routine visit",
    "purpose": "routine_call",
    "status": "completed"
  }
]
```

---

### 4. Get Account Visit History

**Endpoint**: `GET /api/reps/visits/account/:account_id`

**Query Parameters**:
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
[
  {
    "id": 321,
    "sales_rep_id": 123,
    "employee_id": "EMP001",
    "rep_name": "John Doe",
    "visit_date": "2026-02-15",
    "arrival_time": "2026-02-15T10:30:00.000Z",
    "departure_time": "2026-02-15T11:30:00.000Z",
    "visit_duration": 60,
    "notes": "Routine visit",
    "purpose": "routine_call",
    "status": "completed"
  }
]
```

---

### 5. Get Scheduled Visits

**Endpoint**: `GET /api/reps/:sales_rep_id/visits/schedule`

**Response** (200):
```json
[
  {
    "id": 322,
    "sales_rep_id": 123,
    "account_id": 790,
    "account_name": "XYZ Store",
    "account_email": "xyz@store.com",
    "visit_date": "2026-02-16",
    "notes": "Follow-up visit",
    "purpose": "problem_solving",
    "status": "scheduled"
  }
]
```

---

### 6. Update Visit

**Endpoint**: `PUT /api/reps/visits/:id`

**Description**: Update visit notes or purpose.

**Request Body**:
```json
{
  "notes": "Updated visit notes",
  "purpose": "order_delivery"
}
```

**Response** (200):
```json
{
  "message": "Visit updated successfully"
}
```

---

### 7. Complete Visit

**Endpoint**: `POST /api/reps/visits/:id/complete`

**Description**: Mark visit as complete.

**Response** (200):
```json
{
  "message": "Visit marked as complete"
}
```

---

## Photo Endpoints

### 1. Upload Photo

**Endpoint**: `POST /api/reps/photos/upload`

**Description**: Upload a photo from a visit.

**Request Body**:
```json
{
  "visit_id": 321,
  "photo_url": "/uploads/photos/store123_display.jpg",
  "photo_type": "display",
  "file_size": 2048576,
  "file_name": "store123_display.jpg",
  "photo_metadata": "{\"camera\":\"iPhone\",\"coordinates\":\"40.7128,-74.0060\"}"
}
```

**Response** (201):
```json
{
  "message": "Photo uploaded successfully",
  "photo_id": 654,
  "taken_at": "2026-02-15T11:00:00.000Z"
}
```

---

### 2. Get Visit Photos

**Endpoint**: `GET /api/reps/photos/visit/:visit_id`

**Response** (200):
```json
{
  "visit_id": 321,
  "photos": [
    {
      "id": 654,
      "visit_id": 321,
      "photo_url": "/uploads/photos/store123_display.jpg",
      "photo_type": "display",
      "taken_at": "2026-02-15T11:00:00.000Z",
      "file_size": 2048576,
      "file_name": "store123_display.jpg"
    }
  ],
  "count": 5
}
```

---

### 3. Get Account Photos

**Endpoint**: `GET /api/reps/photos/account/:account_id`

**Query Parameters**:
- `photo_type` (optional): Filter by photo type
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
{
  "account_id": 789,
  "photos": [...],
  "count": 25,
  "total": 150,
  "offset": 0,
  "limit": 100
}
```

---

### 4. Approve Photo

**Endpoint**: `POST /api/reps/photos/:id/approve`

**Description**: Approve a photo (manager/supervisor).

**Request Body**:
```json
{
  "approved_by": 456
}
```

**Response** (200):
```json
{
  "message": "Photo approved successfully",
  "photo_id": 654,
  "approved_at": "2026-02-15T12:00:00.000Z"
}
```

---

### 5. Reject Photo

**Endpoint**: `POST /api/reps/photos/:id/reject`

**Description**: Reject a photo with reason.

**Request Body**:
```json
{
  "rejected_by": 456,
  "rejection_reason": "Photo quality too low"
}
```

**Response** (200):
```json
{
  "message": "Photo rejected",
  "photo_id": 654,
  "rejected_at": "2026-02-15T12:00:00.000Z",
  "reason": "Photo quality too low"
}
```

---

### 6. Delete Photo

**Endpoint**: `DELETE /api/reps/photos/:id`

**Response** (200):
```json
{
  "message": "Photo deleted successfully",
  "photo_id": 654
}
```

---

### 7. Get Photo Gallery

**Endpoint**: `GET /api/reps/:sales_rep_id/photos/gallery`

**Query Parameters**:
- `photo_type` (optional): Filter by photo type
- `start_date` (optional): Filter start date
- `end_date` (optional): Filter end date
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
{
  "sales_rep_id": 123,
  "photos": [...],
  "count": 50,
  "filters": {
    "photo_type": "display",
    "start_date": "2026-02-01",
    "end_date": "2026-02-29"
  },
  "offset": 0,
  "limit": 100
}
```

---

### 8. Batch Upload Photos

**Endpoint**: `POST /api/reps/photos/batch-upload`

**Description**: Upload multiple photos at once.

**Request Body**:
```json
{
  "photos": [
    {
      "visit_id": 321,
      "photo_url": "/uploads/photo1.jpg",
      "photo_type": "display",
      "file_size": 2048576,
      "file_name": "photo1.jpg"
    },
    {
      "visit_id": 321,
      "photo_url": "/uploads/photo2.jpg",
      "photo_type": "inventory",
      "file_size": 1524288,
      "file_name": "photo2.jpg"
    }
  ]
}
```

**Response** (201):
```json
{
  "message": "Batch upload completed",
  "successful": 2,
  "failed": 0,
  "results": [
    {"index": 0, "photo_id": 654},
    {"index": 1, "photo_id": 655}
  ]
}
```

---

### 9. Get Photo Statistics

**Endpoint**: `GET /api/reps/photos/statistics`

**Query Parameters**:
- `sales_rep_id` (optional): Filter by sales rep
- `account_id` (optional): Filter by account
- `start_date` (optional): Filter start date
- `end_date` (optional): Filter end date

**Response** (200):
```json
{
  "totals": {
    "total_photos": 250,
    "visits_with_photos": 45,
    "accounts_photographed": 15,
    "total_file_size": 524288000
  },
  "by_type": [
    {"photo_type": "display", "count_by_type": 100},
    {"photo_type": "inventory", "count_by_type": 75},
    {"photo_type": "product", "count_by_type": 50},
    {"photo_type": "signage", "count_by_type": 25}
  ],
  "filters": {
    "sales_rep_id": 123,
    "start_date": "2026-02-01",
    "end_date": "2026-02-29"
  }
}
```

---

## Authorized Accounts Endpoints

### 1. Get Authorized Accounts

**Endpoint**: `GET /api/reps/:sales_rep_id/accounts`

**Response** (200):
```json
[
  {
    "id": 1,
    "sales_rep_id": 123,
    "account_id": 789,
    "name": "ABC Store",
    "email": "abc@store.com",
    "role": "retailer",
    "authorization_type": "full_access",
    "is_active": true,
    "allow_rep_photos": true,
    "allow_location_tracking": true,
    "allow_visit_notes": true,
    "allow_order_placement": true,
    "mileage_reimbursement_enabled": true,
    "mileage_rate": 0.585
  }
]
```

---

### 2. Get Account Details

**Endpoint**: `GET /api/reps/accounts/:account_id`

**Query Parameters**:
- `sales_rep_id`: Sales rep ID (required for authorization check)

**Response** (200):
```json
{
  "id": 789,
  "name": "ABC Store",
  "email": "abc@store.com",
  "role": "retailer",
  "created_at": "2025-01-01T00:00:00.000Z",
  "allow_rep_photos": true,
  "allow_location_tracking": true,
  "allow_visit_notes": true,
  "allow_order_placement": true
}
```

**Errors**:
- `403`: Not authorized to access this account

---

### 3. Get Account Preferences

**Endpoint**: `GET /api/reps/accounts/:account_id/preferences`

**Response** (200):
```json
{
  "account_id": 789,
  "allow_rep_photos": true,
  "allow_location_tracking": true,
  "allow_visit_notes": true,
  "allow_order_placement": true,
  "mileage_reimbursement_enabled": true,
  "mileage_rate": 0.585,
  "minimum_visit_duration": 15,
  "required_visit_frequency": "weekly",
  "photo_approval_required": false
}
```

---

### 4. Get Account Visit History

**Endpoint**: `GET /api/reps/accounts/:account_id/visit-history`

**Query Parameters**:
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200): Same as "Get Account Visit History" in Visits section

---

### 5. Schedule Visit

**Endpoint**: `POST /api/reps/accounts/:account_id/visit`

**Description**: Schedule a future visit to an account.

**Request Body**:
```json
{
  "sales_rep_id": 123,
  "visit_date": "2026-02-20",
  "notes": "Follow-up on order",
  "purpose": "order_delivery"
}
```

**Response** (201):
```json
{
  "message": "Visit scheduled successfully",
  "visit_id": 322
}
```

---

## Orders Endpoints

### 1. Create Order

**Endpoint**: `POST /api/reps/orders/create`

**Description**: Create an order for an authorized account.

**Request Body**:
```json
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

**Response** (201):
```json
{
  "message": "Order created successfully",
  "order_id": 999,
  "retailer_id": 789,
  "supplier_id": 456,
  "status": "pending",
  "created_by": "sales_rep",
  "sales_rep_id": 123,
  "note": "Order created by sales rep (Rep ID: 123): Restock order"
}
```

**Errors**:
- `403`: Not authorized or order placement not allowed

---

### 2. Get Account Orders

**Endpoint**: `GET /api/reps/orders/account/:account_id`

**Query Parameters**:
- `sales_rep_id`: Sales rep ID (required)
- `status` (optional): Filter by status
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
{
  "account_id": 789,
  "orders": [
    {
      "id": 999,
      "retailer_id": 789,
      "supplier_id": 456,
      "supplier_name": "Supplier XYZ",
      "items": [...],
      "status": "pending",
      "created_at": "2026-02-15T11:00:00.000Z"
    }
  ],
  "count": 10,
  "offset": 0,
  "limit": 50
}
```

---

### 3. Get Today's Orders

**Endpoint**: `GET /api/reps/:sales_rep_id/orders/today`

**Response** (200):
```json
{
  "date": "2026-02-15",
  "orders": [...],
  "count": 5,
  "total_value": 1250.00
}
```

---

### 4. Get Order Details

**Endpoint**: `GET /api/reps/orders/:order_id`

**Query Parameters**:
- `sales_rep_id` (optional): For authorization check

**Response** (200):
```json
{
  "id": 999,
  "retailer_id": 789,
  "retailer_name": "ABC Store",
  "retailer_email": "abc@store.com",
  "supplier_id": 456,
  "supplier_name": "Supplier XYZ",
  "supplier_email": "xyz@supplier.com",
  "items": [...],
  "status": "pending",
  "created_at": "2026-02-15T11:00:00.000Z"
}
```

---

### 5. Update Order

**Endpoint**: `PUT /api/reps/orders/:order_id`

**Description**: Update a pending order.

**Request Body**:
```json
{
  "sales_rep_id": 123,
  "items": [...],
  "status": "pending",
  "notes": "Updated order"
}
```

**Response** (200):
```json
{
  "message": "Order updated successfully",
  "order_id": 999,
  "note": "Updated order"
}
```

**Errors**:
- `400`: Can only update pending orders
- `404`: Order not found or not authorized

---

### 6. Get Order History

**Endpoint**: `GET /api/reps/orders/history/:account_id`

**Query Parameters**:
- `sales_rep_id`: Sales rep ID (required)
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
{
  "account_id": 789,
  "orders": [...],
  "count": 50,
  "total_value": 12500.00,
  "offset": 0,
  "limit": 100
}
```

---

### 7. Quick Reorder

**Endpoint**: `POST /api/reps/orders/:order_id/reorder`

**Description**: Create a new order based on a previous order.

**Request Body**:
```json
{
  "sales_rep_id": 123,
  "account_id": 789
}
```

**Response** (201):
```json
{
  "message": "Order created successfully (reorder)",
  "order_id": 1000,
  "original_order_id": 999,
  "retailer_id": 789,
  "supplier_id": 456,
  "status": "pending",
  "items": [...]
}
```

---

## Performance & Analytics Endpoints

### 1. Get Rep Dashboard

**Endpoint**: `GET /api/reps/:sales_rep_id/performance/dashboard`

**Query Parameters**:
- `period` (optional): Time period (day, week, month, default: week)

**Response** (200):
```json
{
  "period": "week",
  "start_date": "2026-02-08",
  "end_date": "2026-02-15",
  "sales_rep_id": 123,
  "metrics": {
    "visits": {
      "count": 25,
      "avg_duration_minutes": 45
    },
    "orders": {
      "count": 15
    },
    "mileage": {
      "total_miles": 320.5,
      "reimbursement": "187.49"
    },
    "photos": {
      "count": 75
    },
    "accounts": {
      "total": 50
    }
  }
}
```

---

### 2. Get Daily Metrics

**Endpoint**: `GET /api/reps/:sales_rep_id/performance/daily`

**Query Parameters**:
- `date` (optional): Date (YYYY-MM-DD, default: today)

**Response** (200):
```json
{
  "date": "2026-02-15",
  "sales_rep_id": 123,
  "check_in": {
    "id": 456,
    "check_in_time": "2026-02-15T08:30:00.000Z",
    "check_out_time": "2026-02-15T18:30:00.000Z",
    "status": "checked_out"
  },
  "metrics": {
    "visits": {
      "count": 5,
      "total_duration_minutes": 225
    },
    "orders": {
      "count": 3
    },
    "mileage": {
      "total_miles": 45.5
    },
    "photos": {
      "count": 15
    }
  }
}
```

---

### 3. Get Weekly Summary

**Endpoint**: `GET /api/reps/:sales_rep_id/performance/weekly`

**Query Parameters**:
- `week_start` (optional): Week start date (YYYY-MM-DD, default: current week)

**Response** (200):
```json
{
  "week_start": "2026-02-08",
  "week_end": "2026-02-14",
  "sales_rep_id": 123,
  "by_date": [
    {
      "date": "2026-02-08",
      "visits": 5,
      "accounts_visited": 5,
      "total_duration_minutes": 225,
      "photos_taken": 15,
      "miles": 45.5,
      "reimbursement": "26.62",
      "orders": 3
    }
  ],
  "summary": {
    "total_visits": 25,
    "total_accounts_visited": 20,
    "total_photos": 75,
    "total_miles": 320.5,
    "total_reimbursement": "187.49",
    "total_orders": 15
  }
}
```

---

### 4. Get Monthly Summary

**Endpoint**: `GET /api/reps/:sales_rep_id/performance/monthly`

**Query Parameters**:
- `year` (optional): Year (default: current year)
- `month` (optional): Month (1-12, default: current month)

**Response** (200):
```json
{
  "id": 1,
  "sales_rep_id": 123,
  "period_start_date": "2026-02-01",
  "period_end_date": "2026-02-29",
  "total_accounts": 50,
  "accounts_visited": 45,
  "total_orders": 60,
  "total_sales": 15000.00,
  "avg_order_value": 250.00,
  "photos_taken": 300,
  "total_miles": 1280.0,
  "visit_completion_rate": 90.00,
  "created_at": "2026-03-01T00:00:00.000Z",
  "updated_at": "2026-03-01T00:00:00.000Z"
}
```

---

### 5. Get Account-Level Metrics

**Endpoint**: `GET /api/reps/:sales_rep_id/performance/accounts`

**Query Parameters**:
- `account_id` (optional): Filter by specific account
- `start_date` (optional): Filter start date
- `end_date` (optional): Filter end date

**Response** (200):
```json
{
  "sales_rep_id": 123,
  "accounts": [
    {
      "account_id": 789,
      "account_name": "ABC Store",
      "visit_count": 8,
      "last_visit": "2026-02-15",
      "avg_visit_duration_minutes": 45,
      "photos_count": 24
    }
  ],
  "count": 45
}
```

---

### 6. Get Rep Comparison

**Endpoint**: `GET /api/reps/performance/comparison/:manager_id`

**Query Parameters**:
- `start_date` (optional): Filter start date
- `end_date` (optional): Filter end date

**Description**: Compare performance of all reps under a manager.

**Response** (200):
```json
{
  "manager_id": 456,
  "start_date": "2026-02-01",
  "end_date": "2026-02-29",
  "reps": [
    {
      "sales_rep_id": 123,
      "employee_id": "EMP001",
      "name": "John Doe",
      "visits": 25,
      "accounts_visited": 20,
      "photos": 75
    },
    {
      "sales_rep_id": 124,
      "employee_id": "EMP002",
      "name": "Jane Smith",
      "visits": 30,
      "accounts_visited": 25,
      "photos": 90
    }
  ],
  "count": 2
}
```

---

## Sales Rep Management Endpoints

### 1. Create Sales Rep

**Endpoint**: `POST /api/reps/create`

**Description**: Create a new sales rep profile.

**Request Body**:
```json
{
  "user_id": 789,
  "employee_id": "EMP001",
  "company_id": 1,
  "territory": "Northeast",
  "assigned_accounts": [789, 790, 791],
  "manager_id": 456,
  "hire_date": "2026-01-15",
  "base_location": "New York, NY"
}
```

**Response** (201):
```json
{
  "message": "Sales rep created successfully",
  "sales_rep_id": 123
}
```

---

### 2. Get Sales Rep by User ID

**Endpoint**: `GET /api/reps/user/:user_id`

**Response** (200):
```json
{
  "id": 123,
  "user_id": 789,
  "employee_id": "EMP001",
  "name": "John Doe",
  "email": "john@example.com",
  "company_id": 1,
  "company_name": "ABC Company",
  "territory": "Northeast",
  "assigned_accounts": "[789,790,791]",
  "manager_id": 456,
  "status": "active",
  "hire_date": "2026-01-15",
  "base_location": "New York, NY",
  "created_at": "2026-01-15T00:00:00.000Z",
  "updated_at": "2026-01-15T00:00:00.000Z"
}
```

**Errors**:
- `404`: Sales rep not found

---

## Error Codes

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Not authorized to access this resource
- **404 Not Found**: Resource not found
- **500 Internal Server Error**: Server error

### Error Response Format

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Errors

**Authentication Errors**:
```json
{
  "error": "Invalid token"
}
```

**Authorization Errors**:
```json
{
  "error": "Not authorized to access this account"
}
```

**Validation Errors**:
```json
{
  "error": "Missing required field: sales_rep_id"
}
```

**Constraint Errors**:
```json
{
  "error": "Already checked in today"
}
```

---

## Rate Limiting

API requests are rate-limited to prevent abuse:
- **Default**: 1000 requests per hour per API key
- **Burst**: 100 requests per minute

**Rate Limit Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1708099200
```

---

## Pagination

Endpoints that return lists support pagination:

**Parameters**:
- `limit`: Number of records per page (default varies by endpoint)
- `offset`: Number of records to skip

**Example**:
```
GET /api/reps/:sales_rep_id/visits/today?limit=20&offset=40
```

---

## Filtering

Many endpoints support filtering via query parameters:

**Common Filters**:
- `start_date`: Filter by start date (YYYY-MM-DD)
- `end_date`: Filter by end date (YYYY-MM-DD)
- `status`: Filter by status
- `photo_type`: Filter by photo type

**Example**:
```
GET /api/reps/photos/gallery?photo_type=display&start_date=2026-02-01&end_date=2026-02-29
```

---

## Best Practices

### Security

1. **Never expose JWT tokens**
2. **Use HTTPS in production**
3. **Validate all input data**
4. **Implement proper authorization checks**
5. **Log security events**

### Performance

1. **Use pagination for large datasets**
2. **Cache frequently accessed data**
3. **Minimize API calls**
4. **Use batch operations when possible**
5. **Compress large payloads**

### Error Handling

1. **Always check response status**
2. **Implement retry logic for transient errors**
3. **Log errors for debugging**
4. **Show user-friendly error messages**
5. **Handle network failures gracefully**

---

## Support

For API support:
- **Documentation**: https://docs.cigar-order-hub.com
- **Email**: api-support@cigar-order-hub.com
- **Developer Portal**: https://developers.cigar-order-hub.com

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**API Version**: v1
