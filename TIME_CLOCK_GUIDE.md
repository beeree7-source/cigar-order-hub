# Time Clock System Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Clock In/Out Operations](#clock-inout-operations)
4. [Break Management](#break-management)
5. [GPS Verification](#gps-verification)
6. [Time Adjustments](#time-adjustments)
7. [Reports and Analytics](#reports-and-analytics)
8. [Troubleshooting](#troubleshooting)

## Introduction

The Time Clock System allows employees to clock in and out, track breaks, and manage their daily work hours. The system supports multiple clock-in methods including mobile, web, biometric, and kiosk devices.

### Key Features

- **Multiple Device Support**: Mobile, web, biometric, kiosk
- **GPS Verification**: Optional location tracking for clock events
- **Break Tracking**: Separate break and lunch periods
- **Real-time Monitoring**: Live view of who's clocked in
- **Automatic Calculations**: Compute hours worked, break time
- **Time Adjustments**: Manager approval for corrections
- **Late Arrival Detection**: Track tardiness
- **Historical Records**: Complete audit trail

## Getting Started

### Prerequisites

1. **Employee Setup**: Employee must be registered in companies_employees table
2. **Company Settings**: Configure GPS requirements and break policies
3. **Device Setup**: Choose clock-in methods (mobile, web, etc.)

### Configure Company Settings

```javascript
PUT /api/:role/payroll/settings/:company_id
{
  "gps_verification_required": true,
  "break_deduction_daily": 0.5,
  "lunch_deduction_daily": 0.5,
  "maximum_shift_length": 12,
  "minimum_shift_length": 2
}
```

## Clock In/Out Operations

### Standard Clock In

Employee clocks in at start of shift:

```javascript
POST /api/:role/timeclock/clock-in
{
  "company_id": 1,
  "employee_id": 10,
  "location_latitude": 40.7128,
  "location_longitude": -74.0060,
  "device_type": "mobile",
  "notes": "Starting morning shift"
}
```

Response:
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

Employee clocks out at end of shift:

```javascript
POST /api/:role/timeclock/clock-out
{
  "entry_id": 123,
  "location_latitude": 40.7128,
  "location_longitude": -74.0060,
  "notes": "Completed all tasks"
}
```

Response:
```json
{
  "message": "Clocked out successfully",
  "entry": {
    "id": 123,
    "clock_in_time": "2024-02-20T08:00:15Z",
    "clock_out_time": "2024-02-20T16:30:45Z",
    "hours_worked": 8.51,
    "status": "completed"
  }
}
```

### Check Current Status

Check if employee is currently clocked in:

```javascript
GET /api/:role/timeclock/status/:employee_id
```

Response if clocked in:
```json
{
  "clocked_in": true,
  "entry": {
    "id": 123,
    "clock_in_time": "2024-02-20T08:00:15Z",
    "hours_worked": 4.25,
    "on_break": false,
    "device_type": "mobile"
  }
}
```

Response if not clocked in:
```json
{
  "clocked_in": false,
  "message": "Employee is not clocked in"
}
```

## Break Management

### Start Break

Employee starts a break:

```javascript
POST /api/:role/timeclock/break/start
{
  "entry_id": 123
}
```

Response:
```json
{
  "message": "Break started successfully"
}
```

### End Break

Employee ends break:

```javascript
POST /api/:role/timeclock/break/end
{
  "entry_id": 123
}
```

Response:
```json
{
  "message": "Break ended successfully",
  "break_minutes": 15
}
```

### Break Rules

Configure break policies in company settings:

- **Break Deduction**: Automatic deduction from hours worked
- **Lunch Duration**: Separate lunch break tracking
- **Multiple Breaks**: System can handle multiple breaks per shift
- **Paid vs Unpaid**: Configure in payroll settings

Example configuration:
```json
{
  "break_deduction_daily": 0.5,    // 30 minutes
  "lunch_deduction_daily": 0.5     // 30 minutes
}
```

## GPS Verification

### Enable GPS Tracking

Configure GPS requirements:

```javascript
PUT /api/:role/payroll/settings/:company_id
{
  "gps_verification_required": true
}
```

### Clock In with GPS

Include coordinates in clock-in:

```javascript
POST /api/:role/timeclock/clock-in
{
  "company_id": 1,
  "employee_id": 10,
  "location_latitude": 40.7128,
  "location_longitude": -74.0060,
  "device_type": "mobile"
}
```

### Geofencing (Future Feature)

Define acceptable clock-in locations:

```javascript
// Coming soon
{
  "allowed_locations": [
    {
      "name": "Main Office",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "radius_meters": 100
    }
  ]
}
```

## Time Adjustments

### Manual Time Adjustment

Managers can adjust time entries with approval:

```javascript
POST /api/:role/timeclock/adjust
{
  "entry_id": 123,
  "clock_in_time": "2024-02-20T08:00:00Z",
  "clock_out_time": "2024-02-20T16:30:00Z",
  "edited_by": 5,
  "edited_reason": "Employee forgot to clock out"
}
```

Response:
```json
{
  "message": "Time entry adjusted successfully"
}
```

### Adjustment Workflow

1. **Employee Request**: Employee notices error in time entry
2. **Manager Review**: Manager reviews request and reason
3. **Approval**: Manager makes adjustment with documented reason
4. **Audit Trail**: System records who made change and why

### Common Adjustment Scenarios

#### Forgot to Clock In
```javascript
POST /api/:role/timeclock/adjust
{
  "entry_id": 123,
  "clock_in_time": "2024-02-20T08:00:00Z",
  "edited_by": 5,
  "edited_reason": "Employee forgot to clock in, verified by supervisor"
}
```

#### Forgot to Clock Out
```javascript
POST /api/:role/timeclock/adjust
{
  "entry_id": 123,
  "clock_out_time": "2024-02-20T17:00:00Z",
  "edited_by": 5,
  "edited_reason": "Employee forgot to clock out at end of shift"
}
```

#### Wrong Clock In Time
```javascript
POST /api/:role/timeclock/adjust
{
  "entry_id": 123,
  "clock_in_time": "2024-02-20T08:00:00Z",
  "edited_by": 5,
  "edited_reason": "Clocked in on wrong device, actual start time verified"
}
```

## Reports and Analytics

### Today's Time Entries

View all time entries for current day:

```javascript
GET /api/:role/timeclock/entries/today/:employee_id
```

Response:
```json
{
  "entries": [
    {
      "id": 123,
      "clock_in_time": "2024-02-20T08:00:15Z",
      "clock_out_time": "2024-02-20T16:30:45Z",
      "hours_worked": 8.51,
      "break_minutes": 30,
      "device_type": "mobile",
      "status": "completed"
    }
  ],
  "total_hours": "8.51"
}
```

### Date Range Query

Get time entries for specific period:

```javascript
GET /api/:role/timeclock/entries/range/:company_id?employee_id=10&start_date=2024-02-01&end_date=2024-02-29
```

Response:
```json
[
  {
    "id": 123,
    "employee_id": 10,
    "emp_number": "EMP001",
    "employee_name": "John Doe",
    "clock_in_time": "2024-02-01T08:00:00Z",
    "clock_out_time": "2024-02-01T16:30:00Z",
    "hours_worked": 8.5,
    "break_minutes": 30,
    "status": "completed"
  }
]
```

### Late Arrivals Report

Track employees who clocked in late:

```javascript
GET /api/:role/timeclock/late-arrivals/:company_id?start_date=2024-02-01&end_date=2024-02-29
```

Response:
```json
[
  {
    "id": 123,
    "clock_in_time": "2024-02-20T08:15:00Z",
    "scheduled_start": "08:00:00",
    "emp_number": "EMP001",
    "employee_name": "John Doe",
    "minutes_late": 15
  }
]
```

### Timesheet Hours Calculation

Calculate total hours for timesheet period:

```javascript
GET /api/:role/timeclock/timesheet-hours?employee_id=10&start_date=2024-02-01&end_date=2024-02-15
```

Response:
```json
{
  "total_entries": 10,
  "total_hours": 85.25,
  "total_break_hours": 5.0,
  "net_hours": "80.25"
}
```

## Troubleshooting

### Common Issues

#### Issue 1: Already Clocked In

**Symptom**: Error "Employee is already clocked in"

**Solution**:
1. Check current status
2. Clock out existing entry
3. Try clock-in again

```javascript
// Check status
GET /api/:role/timeclock/status/:employee_id

// Clock out if needed
POST /api/:role/timeclock/clock-out
{
  "entry_id": 123
}
```

#### Issue 2: GPS Coordinates Required

**Symptom**: Clock-in fails without GPS

**Solution**:
1. Enable location services on device
2. Include coordinates in request
3. Or disable GPS requirement in settings

```javascript
// Disable GPS requirement
PUT /api/:role/payroll/settings/:company_id
{
  "gps_verification_required": false
}
```

#### Issue 3: Cannot Start Break

**Symptom**: Error "Cannot start break"

**Solution**:
1. Verify employee is clocked in
2. Check if break already started
3. Ensure entry_id is correct

```javascript
// Verify clock-in status
GET /api/:role/timeclock/status/:employee_id
```

#### Issue 4: Missing Time Entries

**Symptom**: Time entries not showing up

**Solution**:
1. Check date range in query
2. Verify employee_id
3. Check if entries were deleted
4. Review company_id filter

```javascript
// Query with broader date range
GET /api/:role/timeclock/entries/range/:company_id?employee_id=10&start_date=2024-01-01&end_date=2024-12-31
```

### Device-Specific Issues

#### Mobile App Issues
- Ensure app has location permissions
- Check internet connectivity
- Verify device time is correct
- Update app to latest version

#### Web Browser Issues
- Clear browser cache
- Enable JavaScript
- Check browser compatibility
- Disable ad blockers

#### Biometric Issues
- Clean fingerprint scanner
- Re-register fingerprint
- Check device calibration
- Verify network connection

## Best Practices

### For Employees

1. **Clock In Promptly**: Clock in as soon as shift starts
2. **Take Required Breaks**: Follow break policies
3. **Clock Out Daily**: Never leave shift without clocking out
4. **Report Issues**: Notify manager of clock errors immediately
5. **Verify Times**: Check time entries for accuracy

### For Managers

1. **Monitor Daily**: Review clock-ins throughout the day
2. **Address Late Arrivals**: Follow up on tardiness promptly
3. **Approve Adjustments**: Process time adjustment requests quickly
4. **Weekly Review**: Review all time entries weekly
5. **Document Changes**: Always provide reason for adjustments

### For Administrators

1. **Regular Backups**: Backup time entry data regularly
2. **Audit Trail Review**: Monitor edited entries
3. **Policy Enforcement**: Ensure GPS/break policies followed
4. **Training**: Train employees on proper clock procedures
5. **System Maintenance**: Keep time clock system updated

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Employees can only clock themselves
3. **Audit Trail**: All changes are logged
4. **Data Encryption**: Sensitive data encrypted at rest
5. **GPS Privacy**: Location data only for clock events

## Integration with Other Systems

### Scheduling Integration
Time clock integrates with scheduling system:
- Validates scheduled shifts
- Detects late arrivals
- Tracks schedule compliance

### Payroll Integration
Time entries feed into payroll:
- Automatic hour calculation
- Break time deductions
- Overtime detection
- Pay period summaries

### Attendance Integration
Clock data updates attendance records:
- Present/absent marking
- Late arrival tracking
- Early departure detection
- Pattern analysis

## Next Steps

- Set up [Attendance Management](COMPLIANCE_GUIDE.md)
- Configure [Payroll Processing](PAYROLL_PROCESSING_GUIDE.md)
- Review [API Documentation](SCHEDULING_API_DOCUMENTATION.md)
