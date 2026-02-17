# Time Off Management Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Time Off Types](#time-off-types)
3. [Balance Management](#balance-management)
4. [Request Workflow](#request-workflow)
5. [Approval Process](#approval-process)
6. [Calendar Integration](#calendar-integration)
7. [Accruals](#accruals)
8. [API Reference](#api-reference)

## Introduction

The Time Off Management System provides comprehensive tracking of employee PTO, vacation, sick leave, and other leave types. The system includes balance tracking, approval workflows, and calendar integration to ensure proper coverage and compliance.

### Key Features

- **Multiple Leave Types**: PTO, vacation, sick, personal, unpaid, bereavement, jury duty
- **Balance Tracking**: Real-time balance calculation per employee
- **Approval Workflow**: Manager approval required for requests
- **Accrual System**: Automatic accrual based on configured rates
- **Calendar View**: Team calendar showing approved time off
- **Conflict Prevention**: Ensures sufficient staffing before approval

## Time Off Types

### Available Leave Types

| Type | Description | Requires Balance | Typical Use |
|------|-------------|------------------|-------------|
| `pto` | Paid Time Off | Yes | General vacation or personal days |
| `vacation` | Vacation Days | Yes | Extended time off for travel |
| `sick` | Sick Leave | Yes | Illness or medical appointments |
| `personal` | Personal Days | Yes | Personal matters |
| `unpaid` | Unpaid Leave | No | Time off without pay |
| `bereavement` | Bereavement Leave | Optional | Family loss |
| `jury_duty` | Jury Duty | No | Legal obligation |

## Balance Management

### Initialize Employee Balance

Set up initial time off balance for an employee:

```javascript
POST /api/:role/time-off/balance/initialize
{
  "employee_id": 10,
  "company_id": 1,
  "leave_type": "pto",
  "total_hours": 80,      // 2 weeks (10 days)
  "accrual_rate": 3.33,   // Hours per pay period
  "year": 2024
}
```

Response:
```json
{
  "message": "Time off balance initialized",
  "balance_id": 123
}
```

### Check Employee Balance

View current balance for an employee:

```javascript
GET /api/:role/time-off/balance/:employee_id?leave_type=pto&year=2024
```

Response:
```json
[
  {
    "id": 123,
    "employee_id": 10,
    "emp_number": "EMP001",
    "employee_name": "John Doe",
    "leave_type": "pto",
    "total_hours": 80,
    "used_hours": 24,
    "available_hours": 56,
    "accrual_rate": 3.33,
    "year": 2024,
    "last_accrual_date": "2024-02-01"
  }
]
```

### Update Balance

Manually adjust balance (for corrections or policy changes):

```javascript
PUT /api/:role/time-off/balance/:id
{
  "total_hours": 88,      // Increase total
  "accrual_rate": 3.5     // Update accrual rate
}
```

## Request Workflow

### Submit Time Off Request

Employee submits a request:

```javascript
POST /api/:role/time-off/request
{
  "employee_id": 10,
  "company_id": 1,
  "leave_type": "vacation",
  "start_date": "2024-03-15",
  "end_date": "2024-03-22",
  "total_hours": 64,      // 8 days × 8 hours
  "reason": "Family vacation"
}
```

Response:
```json
{
  "message": "Time off request submitted",
  "request_id": 456
}
```

**Validation:**
- System checks if employee has sufficient balance
- Returns error if balance is insufficient (unless unpaid leave)
- Creates request in 'pending' status

### View Requests

Get all requests for a company:

```javascript
GET /api/:role/time-off/requests/:company_id?employee_id=10&status=pending
```

Response:
```json
[
  {
    "id": 456,
    "employee_id": 10,
    "emp_number": "EMP001",
    "employee_name": "John Doe",
    "leave_type": "vacation",
    "start_date": "2024-03-15",
    "end_date": "2024-03-22",
    "total_hours": 64,
    "reason": "Family vacation",
    "status": "pending",
    "created_at": "2024-02-20T10:00:00Z"
  }
]
```

### Get Specific Request

View details of a single request:

```javascript
GET /api/:role/time-off/requests/:id
```

## Approval Process

### Approve Request

Manager approves the request:

```javascript
PUT /api/:role/time-off/requests/:id/approve
{
  "approved_by": 5,       // Manager user ID
  "notes": "Approved - coverage arranged"
}
```

Response:
```json
{
  "message": "Time off request approved"
}
```

**What Happens:**
1. Request status changes to 'approved'
2. Employee balance is automatically updated (hours deducted)
3. Request appears on team calendar
4. Employee receives notification (if configured)

### Deny Request

Manager denies the request:

```javascript
PUT /api/:role/time-off/requests/:id/deny
{
  "approved_by": 5,
  "denial_reason": "Insufficient coverage during that period"
}
```

Response:
```json
{
  "message": "Time off request denied"
}
```

**What Happens:**
1. Request status changes to 'denied'
2. Balance remains unchanged
3. Employee receives notification with reason

### Cancel Request

Employee cancels their own request:

```javascript
DELETE /api/:role/time-off/requests/:id/cancel
{
  "employee_id": 10
}
```

Response:
```json
{
  "message": "Time off request cancelled"
}
```

**What Happens:**
1. Request status changes to 'cancelled'
2. If previously approved, balance is restored
3. Removed from team calendar

## Calendar Integration

### View Team Calendar

See all approved time off for a date range:

```javascript
GET /api/:role/time-off/calendar/:company_id?start_date=2024-03-01&end_date=2024-03-31&department_id=2
```

Response:
```json
[
  {
    "id": 456,
    "employee_id": 10,
    "emp_number": "EMP001",
    "employee_name": "John Doe",
    "department_name": "Sales",
    "leave_type": "vacation",
    "start_date": "2024-03-15",
    "end_date": "2024-03-22",
    "total_hours": 64
  },
  {
    "id": 457,
    "employee_id": 12,
    "emp_number": "EMP003",
    "employee_name": "Jane Smith",
    "department_name": "Sales",
    "leave_type": "sick",
    "start_date": "2024-03-20",
    "end_date": "2024-03-21",
    "total_hours": 16
  }
]
```

### Use Cases

**Check Coverage:**
- Before approving time off, check calendar for conflicts
- Ensure minimum staffing levels are maintained
- Coordinate overlapping time off requests

**Plan Ahead:**
- Employees can see when coworkers are off
- Coordinate vacation schedules
- Avoid scheduling conflicts

## Accruals

### Automatic Accrual Processing

Process accruals for all employees in a company:

```javascript
POST /api/:role/time-off/accruals/process
{
  "company_id": 1
}
```

Response:
```json
{
  "message": "Accruals processed",
  "records_updated": 45
}
```

**How Accruals Work:**
1. System adds accrual_rate hours to each employee's balance
2. Only processes records with accrual_rate > 0
3. Updates last_accrual_date to current date
4. Recalculates available_hours

### Accrual Scheduling

**Recommended Schedule:**
- Run at the end of each pay period
- Can be automated via cron job
- Ensures balances stay current

**Example Accrual Rates (Biweekly):**
- 2 weeks/year = 80 hours/year = 3.08 hours per pay period
- 3 weeks/year = 120 hours/year = 4.62 hours per pay period
- 4 weeks/year = 160 hours/year = 6.15 hours per pay period

## API Reference

### Balance Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/:role/time-off/balance/:employee_id` | Get employee balance |
| POST | `/api/:role/time-off/balance/initialize` | Initialize new balance |
| PUT | `/api/:role/time-off/balance/:id` | Update balance |

### Request Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/:role/time-off/request` | Submit time off request |
| GET | `/api/:role/time-off/requests/:company_id` | List all requests |
| GET | `/api/:role/time-off/requests/:id` | Get specific request |
| PUT | `/api/:role/time-off/requests/:id/approve` | Approve request |
| PUT | `/api/:role/time-off/requests/:id/deny` | Deny request |
| DELETE | `/api/:role/time-off/requests/:id/cancel` | Cancel request |

### Calendar Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/:role/time-off/calendar/:company_id` | Get team calendar |

### Accrual Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/:role/time-off/accruals/process` | Process accruals |

## Best Practices

### For Employees

1. **Submit Early**: Request time off as far in advance as possible
2. **Check Balance**: Verify you have sufficient balance before requesting
3. **Provide Details**: Include reason and any relevant notes
4. **Coordinate**: Check team calendar to avoid conflicts
5. **Update Plans**: Cancel requests if plans change

### For Managers

1. **Review Promptly**: Process requests within 48 hours
2. **Check Coverage**: Ensure adequate staffing before approving
3. **Be Consistent**: Apply policies fairly across all employees
4. **Provide Reasons**: Always explain denial reasons
5. **Plan Ahead**: Review upcoming requests regularly

### For HR/Admin

1. **Set Policies**: Define clear time off policies
2. **Configure Balances**: Set appropriate accrual rates
3. **Run Accruals**: Process accruals consistently
4. **Monitor Usage**: Track patterns and trends
5. **Audit Regularly**: Ensure balances are accurate

## Troubleshooting

### Issue: Request Denied - Insufficient Balance

**Symptom**: Error when submitting request

**Solution**:
1. Check current balance
2. Verify year (balances are per year)
3. Consider using unpaid leave
4. Contact HR if balance seems incorrect

### Issue: Cannot Cancel Approved Request

**Symptom**: Cancellation fails

**Solution**:
1. Ensure employee_id matches request owner
2. Check if already in 'cancelled' status
3. Contact manager if assistance needed

### Issue: Accruals Not Updating

**Symptom**: Balance not increasing

**Solution**:
1. Verify accrual_rate is set and > 0
2. Check last_accrual_date
3. Ensure accrual process is running
4. Contact admin to manually process accruals

## Security & Permissions

### Role Requirements

- **Employees**: Can submit and cancel own requests, view own balance
- **Managers**: Can approve/deny requests for their team
- **HR Managers**: Can approve all requests, manage balances
- **Admins**: Full access to all features

### Data Privacy

- Employees can only view their own balance and requests
- Managers can view their team's data
- Time off reasons are visible to managers and HR only
- All actions are logged for audit purposes

## Integration

### With Scheduling System

- Approved time off automatically updates attendance records
- Scheduled shifts can be cancelled for approved time off
- Prevents scheduling conflicts

### With Payroll System

- Paid time off included in payroll calculations
- Unpaid leave properly deducted
- Balance tracking for year-end reporting

### With Notifications

- Email notifications for new requests (to managers)
- Approval/denial notifications (to employees)
- Reminder notifications for pending requests
- Low balance alerts (optional)
