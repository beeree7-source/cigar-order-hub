# Scheduling & Payroll API Documentation

## Table of Contents
1. [Authentication](#authentication)
2. [Multi-Tenant Support](#multi-tenant-support)
3. [Shift Management](#shift-management)
4. [Schedule Management](#schedule-management)
5. [Time Clock](#time-clock)
6. [Overtime](#overtime)
7. [Attendance](#attendance)
8. [Shift Swaps](#shift-swaps)
9. [Payroll](#payroll)
10. [Error Handling](#error-handling)

## Authentication

All endpoints require JWT authentication. Include token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Get token via login:
```javascript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

## Multi-Tenant Support

All endpoints support multi-tenant architecture with `:role` parameter:

- `suppliers` - For supplier companies
- `retailers` - For retailer companies

Example:
```
/api/suppliers/schedules/create
/api/retailers/schedules/create
```

Data is automatically filtered by `company_id` to ensure isolation.

## Shift Management

### Create Shift

**Endpoint:** `POST /api/:role/shifts/create`

**Request Body**:
```json
{
  "company_id": 1,
  "shift_name": "Morning Shift",
  "start_time": "08:00:00",
  "end_time": "16:00:00",
  "break_duration": 15,
  "lunch_duration": 30,
  "days_of_week": [1, 2, 3, 4, 5],
  "is_recurring": true
}
```

**Response**:
```json
{
  "message": "Shift created successfully",
  "shift_id": 1
}
```

### Get Company Shifts

**Endpoint:** `GET /api/:role/shifts/:company_id`

**Response**:
```json
[
  {
    "id": 1,
    "company_id": 1,
    "shift_name": "Morning Shift",
    "start_time": "08:00:00",
    "end_time": "16:00:00",
    "break_duration": 15,
    "lunch_duration": 30,
    "days_of_week": [1, 2, 3, 4, 5],
    "is_recurring": true,
    "created_at": "2024-02-15T10:00:00Z"
  }
]
```

### Update Shift

**Endpoint:** `PUT /api/:role/shifts/:id`

**Request Body**:
```json
{
  "shift_name": "Updated Morning Shift",
  "start_time": "07:00:00",
  "end_time": "15:00:00"
}
```

**Response**:
```json
{
  "message": "Shift updated successfully"
}
```

### Delete Shift

**Endpoint:** `DELETE /api/:role/shifts/:id`

**Response**:
```json
{
  "message": "Shift deleted successfully"
}
```

## Schedule Management

### Create Schedule

**Endpoint:** `POST /api/:role/schedules/create`

**Request Body**:
```json
{
  "company_id": 1,
  "employee_id": 10,
  "shift_id": 1,
  "scheduled_date": "2024-02-20",
  "start_time": "08:00:00",
  "end_time": "16:00:00",
  "created_by": 1
}
```

**Response**:
```json
{
  "message": "Schedule created successfully",
  "schedule_id": 123
}
```

**Error Responses**:
- `409`: Schedule conflict detected
- `400`: Missing required fields
- `404`: Employee or shift not found

### Get Schedule

**Endpoint:** `GET /api/:role/schedules/:id`

**Response**:
```json
{
  "id": 123,
  "company_id": 1,
  "employee_id": 10,
  "emp_number": "EMP001",
  "employee_name": "John Doe",
  "shift_id": 1,
  "shift_name": "Morning Shift",
  "scheduled_date": "2024-02-20",
  "start_time": "08:00:00",
  "end_time": "16:00:00",
  "status": "scheduled",
  "published": false
}
```

### Update Schedule

**Endpoint:** `PUT /api/:role/schedules/:id`

**Request Body**:
```json
{
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "status": "approved",
  "approved_by": 5
}
```

**Response**:
```json
{
  "message": "Schedule updated successfully"
}
```

### Delete Schedule (Cancel)

**Endpoint:** `DELETE /api/:role/schedules/:id`

**Response**:
```json
{
  "message": "Schedule cancelled successfully"
}
```

### Get Weekly Schedules

**Endpoint:** `GET /api/:role/schedules/week/:company_id/:date`

**Parameters**:
- `date`: Any date in the target week (YYYY-MM-DD)

**Response**: Array of schedules for the week

### Get Monthly Schedules

**Endpoint:** `GET /api/:role/schedules/month/:company_id/:date`

**Parameters**:
- `date`: Any date in the target month (YYYY-MM-DD)

**Response**: Array of schedules for the month

### Publish Schedules

**Endpoint:** `POST /api/:role/schedules/publish`

**Request Body**:
```json
{
  "schedule_ids": [1, 2, 3, 4, 5]
}
```

**Response**:
```json
{
  "message": "Schedules published successfully",
  "count": 5
}
```

### Detect Conflicts

**Endpoint:** `GET /api/:role/schedules/conflicts/:company_id`

**Query Parameters**:
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

**Response**:
```json
{
  "conflicts": [
    {
      "schedule1_id": 10,
      "schedule2_id": 15,
      "employee_id": 5,
      "scheduled_date": "2024-02-20",
      "employee_name": "John Doe"
    }
  ]
}
```

### Create Recurring Schedules

**Endpoint:** `POST /api/:role/schedules/recurring`

**Request Body**:
```json
{
  "company_id": 1,
  "employee_id": 10,
  "shift_id": 1,
  "start_date": "2024-02-19",
  "end_date": "2024-02-23",
  "days_of_week": [1, 2, 3, 4, 5],
  "created_by": 1
}
```

**Response**:
```json
{
  "message": "Recurring schedules created",
  "total": 5,
  "completed": 5,
  "errors": []
}
```

### Get Department Coverage

**Endpoint:** `GET /api/:role/schedules/coverage/:company_id/:department_id`

**Query Parameters**:
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

**Response**:
```json
[
  {
    "scheduled_date": "2024-02-19",
    "scheduled_employees": 5,
    "total_employees": 8,
    "scheduled_names": "John Doe, Jane Smith, Bob Johnson, Alice Brown, Charlie Wilson"
  }
]
```

### Get Employee Schedules

**Endpoint:** `GET /api/:role/schedules/employee/:employee_id`

**Query Parameters**:
- `start_date`: Start date (YYYY-MM-DD) (optional)
- `end_date`: End date (YYYY-MM-DD) (optional)

**Response**: Array of employee's schedules

## Time Clock

### Clock In

**Endpoint:** `POST /api/:role/timeclock/clock-in`

**Request Body**:
```json
{
  "company_id": 1,
  "employee_id": 10,
  "location_latitude": 40.7128,
  "location_longitude": -74.0060,
  "device_type": "mobile",
  "notes": "Starting shift"
}
```

**Response**:
```json
{
  "message": "Clocked in successfully",
  "entry": {
    "id": 123,
    "company_id": 1,
    "employee_id": 10,
    "clock_in_time": "2024-02-20T08:00:15Z",
    "location_latitude": 40.7128,
    "location_longitude": -74.0060,
    "device_type": "mobile",
    "status": "completed"
  }
}
```

### Clock Out

**Endpoint:** `POST /api/:role/timeclock/clock-out`

**Request Body**:
```json
{
  "entry_id": 123,
  "location_latitude": 40.7128,
  "location_longitude": -74.0060,
  "notes": "Completed shift"
}
```

**Response**:
```json
{
  "message": "Clocked out successfully",
  "entry": {
    "id": 123,
    "clock_in_time": "2024-02-20T08:00:15Z",
    "clock_out_time": "2024-02-20T16:30:45Z",
    "hours_worked": 8.51
  }
}
```

### Start Break

**Endpoint:** `POST /api/:role/timeclock/break/start`

**Request Body**:
```json
{
  "entry_id": 123
}
```

**Response**:
```json
{
  "message": "Break started successfully"
}
```

### End Break

**Endpoint:** `POST /api/:role/timeclock/break/end`

**Request Body**:
```json
{
  "entry_id": 123
}
```

**Response**:
```json
{
  "message": "Break ended successfully",
  "break_minutes": 15
}
```

### Get Clock Status

**Endpoint:** `GET /api/:role/timeclock/status/:employee_id`

**Response (Clocked In)**:
```json
{
  "clocked_in": true,
  "entry": {
    "id": 123,
    "clock_in_time": "2024-02-20T08:00:15Z",
    "hours_worked": 4.25,
    "on_break": false
  }
}
```

**Response (Not Clocked In)**:
```json
{
  "clocked_in": false,
  "message": "Employee is not clocked in"
}
```

### Get Today's Entries

**Endpoint:** `GET /api/:role/timeclock/entries/today/:employee_id`

**Response**:
```json
{
  "entries": [
    {
      "id": 123,
      "clock_in_time": "2024-02-20T08:00:15Z",
      "clock_out_time": "2024-02-20T16:30:45Z",
      "hours_worked": 8.51,
      "break_minutes": 30
    }
  ],
  "total_hours": "8.51"
}
```

### Get Entries in Range

**Endpoint:** `GET /api/:role/timeclock/entries/range/:company_id`

**Query Parameters**:
- `employee_id`: Filter by employee (optional)
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

**Response**: Array of time entries

### Adjust Time Entry

**Endpoint:** `POST /api/:role/timeclock/adjust`

**Request Body**:
```json
{
  "entry_id": 123,
  "clock_in_time": "2024-02-20T08:00:00Z",
  "clock_out_time": "2024-02-20T16:30:00Z",
  "edited_by": 5,
  "edited_reason": "Employee forgot to clock out"
}
```

**Response**:
```json
{
  "message": "Time entry adjusted successfully"
}
```

### Delete Time Entry

**Endpoint:** `DELETE /api/:role/timeclock/:id`

**Response**:
```json
{
  "message": "Time entry deleted successfully"
}
```

### Bulk Import Entries

**Endpoint:** `POST /api/:role/timeclock/bulk-import`

**Request Body**:
```json
{
  "entries": [
    {
      "company_id": 1,
      "employee_id": 10,
      "clock_in_time": "2024-02-20T08:00:00Z",
      "clock_out_time": "2024-02-20T16:30:00Z",
      "device_type": "web"
    }
  ]
}
```

**Response**:
```json
{
  "message": "Bulk import completed",
  "total": 10,
  "completed": 10,
  "errors": []
}
```

## Overtime

### Record Overtime

**Endpoint:** `POST /api/:role/overtime/record`

**Request Body**:
```json
{
  "company_id": 1,
  "employee_id": 10,
  "timesheet_id": 5,
  "overtime_date": "2024-02-20",
  "overtime_hours": 5,
  "rate_multiplier": 1.5,
  "reason": "Project deadline"
}
```

**Response**:
```json
{
  "message": "Overtime recorded successfully",
  "overtime_id": 25
}
```

### Get Today's Overtime

**Endpoint:** `GET /api/:role/overtime/today/:company_id`

**Response**: Array of overtime records for today

### Get Monthly Overtime

**Endpoint:** `GET /api/:role/overtime/month/:company_id`

**Query Parameters**:
- `month`: Month (MM)
- `year`: Year (YYYY)
- `employee_id`: Filter by employee (optional)

**Response**:
```json
{
  "records": [...],
  "summary": {
    "total_hours": "125.50",
    "total_pay": "4500.00",
    "record_count": 15
  }
}
```

### Approve Overtime

**Endpoint:** `POST /api/:role/overtime/approve/:id`

**Request Body**:
```json
{
  "approved_by": 5
}
```

**Response**:
```json
{
  "message": "Overtime approved successfully"
}
```

### Get Pending Overtime

**Endpoint:** `GET /api/:role/overtime/pending/:company_id`

**Response**: Array of pending overtime records

### Export Overtime

**Endpoint:** `POST /api/:role/overtime/export/:company_id`

**Query Parameters**:
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

**Response**: CSV file download

## Attendance

### Mark Attendance

**Endpoint:** `POST /api/:role/attendance/mark`

**Request Body**:
```json
{
  "company_id": 1,
  "employee_id": 10,
  "attendance_date": "2024-02-20",
  "status": "present",
  "check_in_time": "2024-02-20T08:05:00Z",
  "check_out_time": "2024-02-20T16:30:00Z"
}
```

**Status Values**:
- `present`
- `absent`
- `late`
- `early_departure`
- `sick`
- `pto`
- `unpaid_leave`

**Response**:
```json
{
  "message": "Attendance marked successfully",
  "attendance_id": 150
}
```

### Get Today's Attendance

**Endpoint:** `GET /api/:role/attendance/today/:company_id`

**Response**: Array of today's attendance records

### Get Monthly Attendance

**Endpoint:** `GET /api/:role/attendance/month/:company_id`

**Query Parameters**:
- `employee_id`: Filter by employee (optional)
- `month`: Month (MM)
- `year`: Year (YYYY)

**Response**: Array of attendance records

### Bulk Mark Attendance

**Endpoint:** `POST /api/:role/attendance/bulk-mark`

**Request Body**:
```json
{
  "attendance_records": [
    {
      "company_id": 1,
      "employee_id": 10,
      "attendance_date": "2024-02-20",
      "status": "present"
    }
  ]
}
```

**Response**:
```json
{
  "message": "Bulk attendance marking completed",
  "total": 20,
  "completed": 20,
  "errors": []
}
```

### Get Attendance Report

**Endpoint:** `GET /api/:role/attendance/report/:company_id`

**Query Parameters**:
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `department_id`: Filter by department (optional)

**Response**: Attendance summary by employee

### Submit Absence Request

**Endpoint:** `POST /api/:role/attendance/absence-request`

**Request Body**:
```json
{
  "company_id": 1,
  "employee_id": 10,
  "attendance_date": "2024-02-25",
  "status": "pto",
  "reason": "Family vacation"
}
```

**Response**:
```json
{
  "message": "Absence request submitted successfully",
  "request_id": 75
}
```

## Shift Swaps

### Create Swap Request

**Endpoint:** `POST /api/:role/shifts/swap-request`

**Request Body**:
```json
{
  "company_id": 1,
  "requesting_employee_id": 10,
  "target_schedule_id": 123,
  "covering_employee_id": 15,
  "notes": "Need to attend appointment"
}
```

**Response**:
```json
{
  "message": "Shift swap request created successfully",
  "request_id": 50
}
```

### Get Swap Requests

**Endpoint:** `GET /api/:role/shifts/swap-requests/:company_id`

**Query Parameters**:
- `employee_id`: Filter by employee (optional)
- `status`: Filter by status (optional)

**Response**: Array of swap requests

### Approve Swap Request

**Endpoint:** `POST /api/:role/shifts/swap-approve/:id`

**Request Body**:
```json
{
  "approved_by": 5
}
```

**Response**:
```json
{
  "message": "Shift swap approved and completed successfully"
}
```

### Deny Swap Request

**Endpoint:** `POST /api/:role/shifts/swap-deny/:id`

**Request Body**:
```json
{
  "approved_by": 5,
  "notes": "Insufficient coverage"
}
```

**Response**:
```json
{
  "message": "Shift swap request denied"
}
```

### Get Available Shifts

**Endpoint:** `GET /api/:role/shifts/available/:company_id`

**Query Parameters**:
- `employee_id`: Exclude this employee's shifts
- `date`: Filter by specific date (optional)

**Response**: Array of available shifts to cover

### Request Coverage

**Endpoint:** `POST /api/:role/shifts/coverage-request`

**Request Body**:
```json
{
  "company_id": 1,
  "requesting_employee_id": 10,
  "target_schedule_id": 123,
  "notes": "Need coverage for this shift"
}
```

**Response**:
```json
{
  "message": "Coverage request created successfully",
  "request_id": 50
}
```

## Payroll

### Create Payroll Period

**Endpoint:** `POST /api/:role/payroll/create-period`

**Request Body**:
```json
{
  "company_id": 1,
  "period_start_date": "2024-02-05",
  "period_end_date": "2024-02-18",
  "pay_frequency": "biweekly"
}
```

**Response**:
```json
{
  "message": "Payroll period created successfully",
  "period_id": 25
}
```

### Get Payroll Periods

**Endpoint:** `GET /api/:role/payroll/periods/:company_id`

**Query Parameters**:
- `status`: Filter by status (optional)
- `limit`: Number of periods to return (default: 50)

**Response**: Array of payroll periods

### Calculate Payroll

**Endpoint:** `POST /api/:role/payroll/calculate/:period_id`

**Request Body**:
```json
{
  "processed_by": 5
}
```

**Response**:
```json
{
  "message": "Payroll calculated successfully",
  "period_id": 25,
  "total_employees": 15,
  "total_hours": "1200.50",
  "total_payroll": "22500.75",
  "records_created": 15
}
```

### Get Employee Payroll Records

**Endpoint:** `GET /api/:role/payroll/records/:employee_id`

**Query Parameters**:
- `limit`: Number of records to return (default: 12)

**Response**: Array of payroll records for employee

### Approve Payroll Record

**Endpoint:** `PUT /api/:role/payroll/records/:id/approve`

**Request Body**:
```json
{
  "approved_by": 5
}
```

**Response**:
```json
{
  "message": "Payroll record approved successfully"
}
```

### Process Payment

**Endpoint:** `POST /api/:role/payroll/process-payment`

**Request Body**:
```json
{
  "record_id": 150,
  "payment_method": "direct_deposit"
}
```

**Payment Methods**:
- `direct_deposit`
- `check`
- `cash`

**Response**:
```json
{
  "message": "Payment processed successfully"
}
```

### Export Payroll

**Endpoint:** `GET /api/:role/payroll/export/:period_id`

**Response**: CSV file download

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (e.g., schedule conflict)
- `500`: Internal Server Error

### Common Errors

#### Authentication Error
```json
{
  "error": "Unauthorized - Invalid or missing token"
}
```

#### Validation Error
```json
{
  "error": "Missing required fields"
}
```

#### Conflict Error
```json
{
  "error": "Schedule conflict: Employee already scheduled for this date"
}
```

#### Not Found Error
```json
{
  "error": "Employee not found"
}
```

