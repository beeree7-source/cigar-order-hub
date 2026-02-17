# Employee Scheduling Setup Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Creating Shifts](#creating-shifts)
5. [Scheduling Employees](#scheduling-employees)
6. [Advanced Features](#advanced-features)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Introduction

The Employee Scheduling System allows companies (both suppliers and retailers) to create, manage, and publish employee schedules. It supports shift templates, recurring schedules, conflict detection, and coverage verification.

### Key Features

- **Shift Templates**: Create reusable shift definitions
- **Schedule Creation**: Assign employees to shifts
- **Recurring Schedules**: Auto-generate weekly/monthly schedules
- **Conflict Detection**: Prevent double-booking
- **Coverage Verification**: Ensure adequate staffing
- **Publishing**: Control when schedules are visible to employees
- **Multi-tenant**: Complete data isolation by company

## Prerequisites

Before setting up scheduling:

1. **Company Setup**: Ensure your company is registered in the system
2. **Employees**: Add employees to your company (companies_employees table)
3. **Departments**: Create departments if needed (optional but recommended)
4. **Payroll Settings**: Configure basic payroll settings including work week

### Database Migration

Run the migration to create scheduling tables:

```bash
cd backend
sqlite3 cigar-hub.db < migrations/008_create_employee_scheduling_tables.sql
```

## Initial Setup

### Step 1: Configure Company Settings

Set up your company's work week and scheduling preferences:

```sql
INSERT INTO company_payroll_settings (
  company_id,
  work_week_start,
  work_week_end,
  minimum_shift_length,
  maximum_shift_length
) VALUES (
  1,              -- Your company ID
  0,              -- Sunday (0-6)
  6,              -- Saturday
  2,              -- Minimum 2 hours
  12              -- Maximum 12 hours
);
```

### Step 2: Add Employees

Ensure all employees are added to the system:

```javascript
POST /api/:role/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "employee",
  "departmentId": 1
}
```

Then create the employee record:

```sql
INSERT INTO companies_employees (
  company_id,
  user_id,
  employee_id,
  department_id,
  position,
  hire_date,
  employment_type,
  hourly_rate,
  status
) VALUES (
  1,                    -- Company ID
  123,                  -- User ID from users table
  'EMP001',            -- Employee number
  1,                   -- Department ID
  'Sales Associate',   -- Position
  '2024-01-15',       -- Hire date
  'full_time',        -- Employment type
  18.50,              -- Hourly rate
  'active'            -- Status
);
```

## Creating Shifts

### Basic Shift Creation

Create standard shift templates that can be reused:

```javascript
POST /api/:role/shifts/create
{
  "company_id": 1,
  "shift_name": "Morning Shift",
  "start_time": "08:00:00",
  "end_time": "16:00:00",
  "break_duration": 15,      // minutes
  "lunch_duration": 30,      // minutes
  "days_of_week": [1, 2, 3, 4, 5],  // Monday-Friday
  "is_recurring": true
}
```

### Common Shift Templates

#### 1. Morning Shift
```json
{
  "shift_name": "Morning Shift",
  "start_time": "06:00:00",
  "end_time": "14:00:00",
  "break_duration": 15,
  "lunch_duration": 30
}
```

#### 2. Day Shift
```json
{
  "shift_name": "Day Shift",
  "start_time": "08:00:00",
  "end_time": "16:00:00",
  "break_duration": 15,
  "lunch_duration": 30
}
```

#### 3. Evening Shift
```json
{
  "shift_name": "Evening Shift",
  "start_time": "14:00:00",
  "end_time": "22:00:00",
  "break_duration": 15,
  "lunch_duration": 30
}
```

#### 4. Night Shift
```json
{
  "shift_name": "Night Shift",
  "start_time": "22:00:00",
  "end_time": "06:00:00",
  "break_duration": 15,
  "lunch_duration": 30
}
```

#### 5. Part-Time Shift
```json
{
  "shift_name": "Part-Time (4hr)",
  "start_time": "09:00:00",
  "end_time": "13:00:00",
  "break_duration": 15,
  "lunch_duration": 0
}
```

### Retrieving Shifts

Get all shifts for your company:

```javascript
GET /api/:role/shifts/:company_id
```

Response:
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
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

## Scheduling Employees

### Single Schedule Creation

Create a schedule for one employee on one day:

```javascript
POST /api/:role/schedules/create
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

The system will:
1. Check for conflicts (employee already scheduled)
2. Validate the date and times
3. Create the schedule with status 'scheduled'

### Recurring Schedule Creation

Create multiple schedules at once:

```javascript
POST /api/:role/schedules/recurring
{
  "company_id": 1,
  "employee_id": 10,
  "shift_id": 1,
  "start_date": "2024-02-19",
  "end_date": "2024-02-23",
  "days_of_week": [1, 2, 3, 4, 5],  // Monday-Friday
  "created_by": 1
}
```

This creates schedules for Monday through Friday between the date range.

### Weekly Scheduling Workflow

1. **Plan the week**: Determine staffing needs by day/department
2. **Create schedules**: Use recurring schedules for regular shifts
3. **Review conflicts**: Check for scheduling conflicts
4. **Verify coverage**: Ensure adequate staffing
5. **Publish**: Make schedules visible to employees

Example workflow:

```javascript
// Step 1: Create schedules for the week
POST /api/:role/schedules/recurring
{
  "company_id": 1,
  "employee_id": 10,
  "shift_id": 1,
  "start_date": "2024-02-19",
  "end_date": "2024-02-23",
  "days_of_week": [1, 2, 3, 4, 5],
  "created_by": 1
}

// Step 2: Check for conflicts
GET /api/:role/schedules/conflicts/:company_id?start_date=2024-02-19&end_date=2024-02-23

// Step 3: Check coverage
GET /api/:role/schedules/coverage/:company_id/:department_id?start_date=2024-02-19&end_date=2024-02-23

// Step 4: Publish schedules
POST /api/:role/schedules/publish
{
  "schedule_ids": [1, 2, 3, 4, 5]
}
```

### View Schedules

#### Weekly View
```javascript
GET /api/:role/schedules/week/:company_id/:date
// Example: GET /api/:role/schedules/week/1/2024-02-20
```

#### Monthly View
```javascript
GET /api/:role/schedules/month/:company_id/:date
// Example: GET /api/:role/schedules/month/1/2024-02-01
```

#### Employee-Specific Schedules
```javascript
GET /api/:role/schedules/employee/:employee_id?start_date=2024-02-01&end_date=2024-02-29
```

## Advanced Features

### Conflict Detection

The system automatically detects scheduling conflicts:

- **Double Booking**: Same employee scheduled twice on same day
- **Time Overlap**: Overlapping shift times
- **Invalid Times**: End time before start time

Manual conflict check:

```javascript
GET /api/:role/schedules/conflicts/:company_id?start_date=2024-02-01&end_date=2024-02-29
```

Response shows all conflicts:
```json
{
  "conflicts": [
    {
      "schedule1_id": 10,
      "schedule2_id": 15,
      "employee_id": 5,
      "scheduled_date": "2024-02-20",
      "start1": "08:00:00",
      "end1": "16:00:00",
      "start2": "14:00:00",
      "end2": "22:00:00",
      "employee_name": "John Doe"
    }
  ]
}
```

### Coverage Verification

Check if departments have adequate coverage:

```javascript
GET /api/:role/schedules/coverage/:company_id/:department_id?start_date=2024-02-19&end_date=2024-02-23
```

Response:
```json
[
  {
    "scheduled_date": "2024-02-19",
    "scheduled_employees": 5,
    "total_employees": 8,
    "scheduled_names": "John Doe, Jane Smith, Bob Johnson, Alice Brown, Charlie Wilson"
  },
  {
    "scheduled_date": "2024-02-20",
    "scheduled_employees": 7,
    "total_employees": 8,
    "scheduled_names": "..."
  }
]
```

### Schedule Publishing

Schedules can be created as drafts and published when ready:

```javascript
// Create unpublished schedule (published = 0 by default)
POST /api/:role/schedules/create
{
  "company_id": 1,
  "employee_id": 10,
  "shift_id": 1,
  "scheduled_date": "2024-02-20"
}

// Publish when ready
POST /api/:role/schedules/publish
{
  "schedule_ids": [1, 2, 3, 4, 5]
}
```

Employees only see published schedules.

### Updating Schedules

Modify existing schedules:

```javascript
PUT /api/:role/schedules/:id
{
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "status": "approved"
}
```

### Cancelling Schedules

Cancel a schedule without deleting:

```javascript
DELETE /api/:role/schedules/:id
```

This sets status to 'cancelled' rather than deleting the record.

## Best Practices

### 1. Planning and Forecasting

- **Plan 2-3 weeks ahead**: Give employees advance notice
- **Consider historical data**: Use past schedules to predict needs
- **Account for holidays**: Plan extra coverage or time off
- **Buffer for absences**: Schedule 10% extra to cover call-outs

### 2. Shift Assignment

- **Respect preferences**: Honor employee availability when possible
- **Rotate shifts fairly**: Distribute unpopular shifts evenly
- **Consider skills**: Match qualified employees to specialized shifts
- **Limit consecutive days**: Avoid excessive consecutive work days

### 3. Communication

- **Publish early**: Give at least 1 week notice
- **Notify changes**: Alert employees of schedule changes promptly
- **Use consistent format**: Keep schedule format predictable
- **Enable notifications**: Use system notifications for updates

### 4. Compliance

- **Track hours**: Monitor weekly hours to prevent overtime
- **Rest periods**: Ensure adequate time between shifts
- **Break requirements**: Schedule required breaks and lunches
- **Minor restrictions**: Follow labor laws for underage employees

### 5. Coverage Management

- **Maintain minimums**: Ensure minimum staffing at all times
- **Plan for peak times**: Schedule extra staff during busy periods
- **Cross-train**: Have backup employees for critical positions
- **On-call list**: Maintain list of employees available for extra shifts

### 6. Schedule Templates

Create and reuse templates:

```javascript
// Weekly template for full-time employee
{
  "Monday": { "shift": "Day Shift", "hours": 8 },
  "Tuesday": { "shift": "Day Shift", "hours": 8 },
  "Wednesday": { "shift": "Day Shift", "hours": 8 },
  "Thursday": { "shift": "Day Shift", "hours": 8 },
  "Friday": { "shift": "Day Shift", "hours": 8 },
  "Saturday": { "shift": "Off", "hours": 0 },
  "Sunday": { "shift": "Off", "hours": 0 }
}
```

### 7. Department Considerations

Different departments may need different approaches:

#### Sales Department
- Peak hours: 10 AM - 6 PM
- Weekend coverage needed
- Commission-based scheduling

#### Shipping Department
- Early morning shifts
- End-of-day cutoffs
- Delivery schedule coordination

#### Office/Admin
- Standard business hours
- Minimal weekend needs
- Flexible scheduling possible

## Troubleshooting

### Common Issues

#### Issue 1: Schedule Conflicts

**Symptom**: Error "Schedule conflict: Employee already scheduled for this date"

**Solution**:
1. Check existing schedules for the employee
2. Cancel or modify conflicting schedule
3. Retry schedule creation

```javascript
// Find existing schedules
GET /api/:role/schedules/employee/:employee_id?start_date=2024-02-20&end_date=2024-02-20

// Cancel conflicting schedule
DELETE /api/:role/schedules/:conflicting_schedule_id
```

#### Issue 2: Cannot Publish Schedules

**Symptom**: Schedules not visible to employees

**Solution**:
1. Verify schedule IDs are correct
2. Check that schedules exist and are not cancelled
3. Call publish endpoint with correct IDs

```javascript
POST /api/:role/schedules/publish
{
  "schedule_ids": [1, 2, 3]
}
```

#### Issue 3: Coverage Gaps

**Symptom**: Not enough employees scheduled

**Solution**:
1. Check coverage report
2. Identify dates with gaps
3. Add additional schedules or redistribute shifts

```javascript
GET /api/:role/schedules/coverage/:company_id/:department_id?start_date=2024-02-19&end_date=2024-02-23
```

#### Issue 4: Recurring Schedules Not Created

**Symptom**: Fewer schedules created than expected

**Solution**:
1. Check date range is correct
2. Verify days_of_week array matches desired days
3. Look for pre-existing schedules blocking creation
4. Check response for error details

```javascript
POST /api/:role/schedules/recurring
{
  "company_id": 1,
  "employee_id": 10,
  "shift_id": 1,
  "start_date": "2024-02-19",
  "end_date": "2024-02-23",
  "days_of_week": [1, 2, 3, 4, 5],
  "created_by": 1
}

// Response shows results:
{
  "message": "Recurring schedules created",
  "total": 5,
  "completed": 5,
  "errors": []  // Check this for issues
}
```

### Performance Tips

1. **Batch Operations**: Use recurring schedules instead of individual creates
2. **Date Ranges**: Limit query date ranges to necessary periods
3. **Publish in Bulk**: Publish multiple schedules at once
4. **Index Usage**: Ensure database indexes are in place

### Getting Help

If you encounter issues not covered here:

1. Check API Documentation for endpoint details
2. Review database logs for error messages
3. Verify authentication and permissions
4. Contact system administrator

## Next Steps

After setting up scheduling:

1. Configure [Time Clock System](TIME_CLOCK_GUIDE.md)
2. Set up [Payroll Processing](PAYROLL_PROCESSING_GUIDE.md)
3. Review [Compliance Requirements](COMPLIANCE_GUIDE.md)
4. Read [API Documentation](SCHEDULING_API_DOCUMENTATION.md)

## Additional Resources

- Employee Scheduling Best Practices
- Labor Law Compliance Guidelines
- Shift Optimization Strategies
- Employee Communication Templates
