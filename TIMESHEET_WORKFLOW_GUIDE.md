# Timesheet Workflow Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Timesheet Generation](#timesheet-generation)
3. [Submission Workflow](#submission-workflow)
4. [Approval Process](#approval-process)
5. [Corrections & Adjustments](#corrections--adjustments)
6. [Integration with Payroll](#integration-with-payroll)
7. [API Reference](#api-reference)

## Introduction

The Timesheet Management System automates the collection, approval, and processing of employee work hours. It integrates with the time clock system to automatically generate timesheets and provides a comprehensive approval workflow.

### Key Features

- **Auto-Generation**: Timesheets created from time clock entries
- **Multi-Level Approval**: Employee submit → Manager approve workflow
- **Hour Calculations**: Automatic calculation of regular and overtime hours
- **Break Deductions**: Automatic break time deductions
- **Attendance Integration**: Tracks absences and late arrivals
- **Payroll Ready**: Approved timesheets feed directly into payroll

## Timesheet Generation

### Automatic Generation

Generate a timesheet for an employee and pay period:

```javascript
POST /api/:role/timesheets/generate
{
  "employee_id": 10,
  "company_id": 1,
  "period_start_date": "2024-02-05",
  "period_end_date": "2024-02-18"
}
```

Response:
```json
{
  "message": "Timesheet generated",
  "timesheet_id": 789,
  "regular_hours": 72.50,
  "overtime_hours": 5.25
}
```

**How It Works:**
1. Queries all time entries for employee in date range
2. Calculates regular hours (up to 40/week)
3. Calculates overtime hours (over 40/week)
4. Pulls attendance data (absences, late arrivals)
5. Creates timesheet in 'draft' status

### View Timesheet

Get details of a specific timesheet:

```javascript
GET /api/:role/timesheets/:id
```

Response:
```json
{
  "id": 789,
  "employee_id": 10,
  "emp_number": "EMP001",
  "employee_name": "John Doe",
  "period_start_date": "2024-02-05",
  "period_end_date": "2024-02-18",
  "total_regular_hours": 72.50,
  "total_overtime_hours": 5.25,
  "breaks_deducted": 5.0,
  "absences": 0,
  "late_arrivals": 1,
  "status": "draft",
  "submitted_by": null,
  "submitted_at": null,
  "approved_by": null,
  "approved_at": null,
  "comments": null,
  "created_at": "2024-02-19T08:00:00Z"
}
```

### Get Timesheet with Details

View timesheet including all time entries:

```javascript
GET /api/:role/timesheets/:id/details
```

Response:
```json
{
  "timesheet": {
    "id": 789,
    "employee_name": "John Doe",
    "period_start_date": "2024-02-05",
    "period_end_date": "2024-02-18",
    "total_regular_hours": 72.50,
    "total_overtime_hours": 5.25,
    "status": "draft"
  },
  "time_entries": [
    {
      "id": 1001,
      "clock_in_time": "2024-02-05T08:00:00Z",
      "clock_out_time": "2024-02-05T17:30:00Z",
      "notes": "Regular shift",
      "device_type": "mobile"
    },
    // ... more entries
  ]
}
```

## Submission Workflow

### Employee Submission

Employee reviews and submits timesheet:

```javascript
PUT /api/:role/timesheets/:id/submit
{
  "submitted_by": 10  // Employee user ID
}
```

Response:
```json
{
  "message": "Timesheet submitted for approval"
}
```

**Requirements:**
- Timesheet must be in 'draft' status
- Employee verifies all hours are correct
- Any disputes should be resolved before submission

### View Employee Timesheets

Get all timesheets for an employee:

```javascript
GET /api/:role/timesheets/employee/:employee_id?status=submitted&limit=10
```

Response:
```json
[
  {
    "id": 789,
    "emp_number": "EMP001",
    "employee_name": "John Doe",
    "period_start_date": "2024-02-05",
    "period_end_date": "2024-02-18",
    "total_regular_hours": 72.50,
    "total_overtime_hours": 5.25,
    "status": "submitted",
    "submitted_at": "2024-02-19T09:00:00Z"
  }
]
```

### View Week Timesheets

Get all timesheets for a specific week:

```javascript
GET /api/:role/timesheets/week/:company_id/:week_of
```

Example:
```
GET /api/supplier/timesheets/week/1/2024-02-05
```

Response:
```json
[
  {
    "id": 789,
    "employee_name": "John Doe",
    "department_name": "Sales",
    "total_regular_hours": 72.50,
    "total_overtime_hours": 5.25,
    "status": "submitted"
  },
  {
    "id": 790,
    "employee_name": "Jane Smith",
    "department_name": "Warehouse",
    "total_regular_hours": 80.00,
    "total_overtime_hours": 0,
    "status": "approved"
  }
]
```

## Approval Process

### View Pending Approvals

Manager sees all pending timesheets:

```javascript
GET /api/:role/timesheets/pending-approval/:company_id?department_id=2
```

Response:
```json
[
  {
    "id": 789,
    "employee_name": "John Doe",
    "emp_number": "EMP001",
    "department_name": "Sales",
    "period_start_date": "2024-02-05",
    "period_end_date": "2024-02-18",
    "total_regular_hours": 72.50,
    "total_overtime_hours": 5.25,
    "submitted_at": "2024-02-19T09:00:00Z",
    "submitted_by_name": "John Doe"
  }
]
```

### Approve Timesheet

Manager approves the timesheet:

```javascript
PUT /api/:role/timesheets/:id/approve
{
  "approved_by": 5,  // Manager user ID
  "comments": "Approved - hours verified"
}
```

Response:
```json
{
  "message": "Timesheet approved"
}
```

**What Happens:**
1. Status changes to 'approved'
2. Approval record created in timesheet_approvals table
3. Timesheet becomes available for payroll processing
4. Employee receives notification (if configured)
5. Hours are locked and cannot be edited

### Reject Timesheet

Manager rejects timesheet with explanation:

```javascript
PUT /api/:role/timesheets/:id/reject
{
  "approved_by": 5,
  "rejection_reason": "Missing clock out entries for Feb 12 and Feb 15. Please correct."
}
```

Response:
```json
{
  "message": "Timesheet rejected"
}
```

**What Happens:**
1. Status changes to 'rejected'
2. Rejection record created with reason
3. Employee receives notification with reason
4. Timesheet returns to 'draft' status for corrections
5. Employee must make corrections and resubmit

## Corrections & Adjustments

### Manual Hour Adjustments

Manager can adjust hours before approval:

```javascript
PUT /api/:role/timesheets/:id/hours
{
  "regular_hours": 75.00,
  "overtime_hours": 3.00,
  "breaks_deducted": 5.0,
  "comments": "Adjusted for missed clock out on 2/15"
}
```

Response:
```json
{
  "message": "Timesheet updated"
}
```

**When to Use:**
- Employee forgot to clock out
- Time clock error
- Manual time entry needed
- Break time adjustment

**Restrictions:**
- Cannot edit approved timesheets
- All changes logged for audit trail
- Requires manager/HR permission

## Integration with Payroll

### Payroll Processing Flow

1. **Generate Timesheets**: Create for all employees in pay period
2. **Employee Review**: Employees verify and submit
3. **Manager Approval**: Managers approve all timesheets
4. **Payroll Calculation**: Approved timesheets used for payroll
5. **Payment Processing**: Pay is calculated and distributed

### Approved Hours for Payroll

Once approved, timesheet hours are used to calculate:
- **Regular Pay**: regular_hours × hourly_rate
- **Overtime Pay**: overtime_hours × (hourly_rate × 1.5)
- **Gross Pay**: regular_pay + overtime_pay
- **Deductions**: Taxes and other withholdings
- **Net Pay**: Amount employee receives

### Example Calculation

```
Employee: John Doe
Hourly Rate: $25.00
Pay Period: Feb 5-18, 2024

Regular Hours: 72.50 × $25.00 = $1,812.50
Overtime Hours: 5.25 × $37.50 = $196.88
Gross Pay: $2,009.38
```

## API Reference

### Timesheet Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/:role/timesheets/generate` | Generate timesheet |
| GET | `/api/:role/timesheets/:id` | Get timesheet |
| GET | `/api/:role/timesheets/:id/details` | Get with time entries |
| GET | `/api/:role/timesheets/employee/:employee_id` | List employee timesheets |
| GET | `/api/:role/timesheets/week/:company_id/:week_of` | Get week timesheets |

### Workflow

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/:role/timesheets/:id/submit` | Submit for approval |
| PUT | `/api/:role/timesheets/:id/approve` | Approve timesheet |
| PUT | `/api/:role/timesheets/:id/reject` | Reject timesheet |
| GET | `/api/:role/timesheets/pending-approval/:company_id` | Pending approvals |

### Adjustments

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/api/:role/timesheets/:id/hours` | Update hours |

## Best Practices

### For Employees

1. **Review Regularly**: Check your timesheet at least weekly
2. **Verify Hours**: Ensure all clock in/out times are correct
3. **Report Issues**: Immediately report missing or incorrect entries
4. **Submit On Time**: Submit by deadline to avoid payroll delays
5. **Add Notes**: Include explanations for unusual entries

### For Managers

1. **Process Promptly**: Review and approve within 48 hours
2. **Verify Accuracy**: Check against schedules and time clock data
3. **Investigate Anomalies**: Follow up on unusual hours or overtime
4. **Document Changes**: Always include comments for adjustments
5. **Communicate Issues**: Discuss rejections with employees

### For HR/Payroll

1. **Set Deadlines**: Establish clear submission and approval deadlines
2. **Monitor Compliance**: Track timesheets that miss deadlines
3. **Generate Early**: Create timesheets at start of pay period
4. **Audit Regularly**: Review approval patterns and adjustments
5. **Train Users**: Ensure all users understand the workflow

## Timesheet Statuses

| Status | Description | Next Action |
|--------|-------------|-------------|
| `draft` | Newly generated, not yet submitted | Employee reviews and submits |
| `submitted` | Submitted by employee | Manager approves or rejects |
| `approved` | Approved by manager | Ready for payroll processing |
| `rejected` | Rejected by manager | Employee makes corrections |

## Common Workflows

### Standard Two-Week Period

**Week 1:**
1. Day 1: Employees clock in/out normally
2. Days 2-5: Continue clocking time
3. Day 5: Employees review hours

**Week 2:**
1. Days 1-5: Continue clocking time
2. Day 5: Generate timesheets (end of period)
3. Day 6: Employees review and submit
4. Day 7: Managers approve
5. Day 8: Payroll processes

### Bi-Weekly with Early Submission

**Recommended Timeline:**
- Day 10: Generate timesheets (auto-generate)
- Day 11-12: Employees submit
- Day 13: Managers approve
- Day 14: Payroll processes
- Day 15: Payday

### Monthly Workflow

**Timeline:**
- Last 3 days of month: Generate timesheets
- Days 1-2 of new month: Employee submission
- Days 3-4: Manager approval
- Day 5: Payroll processing
- Day 10: Payday

## Troubleshooting

### Issue: Cannot Submit Timesheet

**Symptoms**: Submit button doesn't work

**Solutions**:
1. Verify timesheet is in 'draft' status
2. Check for missing time entries
3. Ensure all required fields are complete
4. Contact manager if persistent

### Issue: Hours Don't Match Time Clock

**Symptoms**: Calculated hours seem incorrect

**Solutions**:
1. Review time entries in detail view
2. Check for missing clock out entries
3. Verify break deductions are correct
4. Request manager adjustment if needed

### Issue: Rejected Timesheet

**Symptoms**: Timesheet sent back to employee

**Solutions**:
1. Read rejection reason carefully
2. Review time entries for the noted dates
3. Make required corrections
4. Resubmit for approval
5. Contact manager if unclear

### Issue: Missing Timesheet

**Symptoms**: Timesheet not generated for period

**Solutions**:
1. Verify you have time entries for the period
2. Check if timesheet was already generated
3. Request HR to generate manually
4. Ensure employee is properly set up in system

## Security & Audit

### Audit Trail

All timesheet actions are logged:
- Generation timestamp
- Submission (who and when)
- Approval/rejection (who and when)
- Hour adjustments (who, what, why, when)
- Status changes

### Data Integrity

- Approved timesheets are immutable
- All changes require authentication
- Manager approval required for processing
- Complete history maintained for compliance

### Role Permissions

- **Employees**: View/submit own timesheets
- **Managers**: View/approve team timesheets, make adjustments
- **HR**: View all timesheets, generate for all employees
- **Payroll**: Read-only access for processing

## Compliance

### Record Retention

- Timesheets retained for 3-7 years (per local laws)
- Complete audit trail maintained
- Accessible for audits and legal requests

### Labor Law Compliance

- Overtime calculated per FLSA rules
- Break time tracking for compliance
- Accurate record of hours worked
- Protection against time clock fraud

### Best Practices for Compliance

1. **Accurate Records**: Ensure all hours are properly recorded
2. **Timely Processing**: Don't delay approvals
3. **Document Everything**: Add notes for all adjustments
4. **Regular Audits**: Review for patterns or issues
5. **Training**: Keep staff trained on proper procedures
