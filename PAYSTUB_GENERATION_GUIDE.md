# Paystub Generation Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Paystub Structure](#paystub-structure)
3. [Generation Process](#generation-process)
4. [Distribution Methods](#distribution-methods)
5. [Employee Access](#employee-access)
6. [API Reference](#api-reference)
7. [Troubleshooting](#troubleshooting)

## Introduction

The Paystub Generation System provides automated generation of employee pay stubs based on approved payroll records. Pay stubs include detailed breakdowns of earnings, deductions, and net pay for each pay period.

### Key Features

- **Automated Generation**: Create from approved payroll records
- **Detailed Breakdown**: Earnings, deductions, taxes clearly shown
- **Multiple Formats**: JSON (PDF coming soon)
- **Email Distribution**: Send directly to employees
- **Historical Access**: Employees can access past pay stubs
- **Secure Access**: Role-based permissions protect data

## Paystub Structure

### Complete Paystub Format

```json
{
  "paystub_id": "PS-123-1708444800000",
  "company": {
    "name": "Acme Cigars Inc."
  },
  "employee": {
    "id": "EMP001",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "position": "Sales Representative",
    "department": "Sales"
  },
  "pay_period": {
    "start_date": "2024-02-05",
    "end_date": "2024-02-18",
    "frequency": "biweekly",
    "payment_date": "2024-02-22"
  },
  "earnings": {
    "regular": {
      "hours": 80.00,
      "rate": 25.00,
      "amount": 2000.00
    },
    "overtime": {
      "hours": 5.00,
      "rate": 37.50,
      "amount": 187.50
    },
    "gross_pay": 2187.50
  },
  "deductions": {
    "federal_tax": 328.13,
    "state_tax": 131.25,
    "social_security": 135.62,
    "medicare": 31.72,
    "other": 50.00,
    "total": 676.72
  },
  "net_pay": 1510.78,
  "payment_method": "direct_deposit",
  "status": "paid",
  "generated_at": "2024-02-22T10:00:00Z"
}
```

### Section Breakdown

#### Company Information
- Company name
- (Future: Company address, tax ID)

#### Employee Information
- Employee ID number
- Full name
- Email address
- Position/title
- Department

#### Pay Period
- Start and end dates
- Pay frequency (weekly, biweekly, monthly)
- Actual payment date

#### Earnings
- **Regular Hours**: Standard work hours
- **Regular Rate**: Base hourly rate
- **Regular Amount**: Regular hours × rate
- **Overtime Hours**: Hours worked over threshold
- **Overtime Rate**: Typically 1.5× regular rate
- **Overtime Amount**: Overtime hours × OT rate
- **Gross Pay**: Total earnings before deductions

#### Deductions
- **Federal Tax**: Federal income tax withholding
- **State Tax**: State income tax withholding
- **Social Security**: 6.2% of gross (up to limit)
- **Medicare**: 1.45% of gross
- **Other**: Health insurance, 401(k), etc.
- **Total Deductions**: Sum of all deductions

#### Net Pay
- Final amount employee receives
- Gross Pay - Total Deductions

## Generation Process

### Generate Single Paystub

Generate paystub for a specific payroll record:

```javascript
GET /api/:role/payroll/paystub/:payroll_record_id
```

Example:
```
GET /api/supplier/payroll/paystub/123
```

Response: Complete paystub JSON (see structure above)

**Requirements:**
- Payroll record must exist
- Record should be in 'approved' or 'paid' status
- User must have permission to view

### Generate for Multiple Employees

To generate paystubs for all employees in a pay period:

1. Get all payroll records for the period:
```javascript
GET /api/supplier/payroll/period-records/456
```

2. Loop through records and generate each paystub:
```javascript
for each record:
  GET /api/supplier/payroll/paystub/{record.id}
```

### Batch Generation (Recommended)

**Future Enhancement**: Single endpoint to generate all paystubs for a period

```javascript
POST /api/:role/payroll/paystubs/generate-batch
{
  "period_id": 456
}
```

## Distribution Methods

### Email Individual Paystub

Send paystub directly to employee email:

```javascript
POST /api/:role/payroll/paystub/:payroll_record_id/email
```

Example:
```
POST /api/supplier/payroll/paystub/123/email
```

Response:
```json
{
  "message": "Paystub email queued for delivery",
  "employee_email": "john.doe@example.com",
  "employee_name": "John Doe",
  "pay_period": "2024-02-05 to 2024-02-18",
  "note": "Email integration pending"
}
```

**Email Contents:**
- Subject: "Your Paystub for [Pay Period]"
- Body: Summary of earnings and net pay
- Attachment: PDF paystub (future)
- Link to view online

### Batch Email Distribution

Send paystubs to all employees for a pay period:

```javascript
// Get all records
GET /api/supplier/payroll/period-records/456

// Email each one
for each record:
  POST /api/supplier/payroll/paystub/{record.id}/email
```

### Employee Self-Service

Employees access their own paystubs:

```javascript
GET /api/employee/payroll/paystubs/:employee_id?limit=12
```

Response:
```json
[
  {
    "payroll_record_id": 123,
    "period_start_date": "2024-02-05",
    "period_end_date": "2024-02-18",
    "gross_pay": 2187.50,
    "net_pay": 1510.78,
    "status": "paid",
    "paid_date": "2024-02-22",
    "payment_method": "direct_deposit"
  },
  {
    "payroll_record_id": 110,
    "period_start_date": "2024-01-22",
    "period_end_date": "2024-02-04",
    "gross_pay": 2000.00,
    "net_pay": 1385.00,
    "status": "paid",
    "paid_date": "2024-02-08",
    "payment_method": "direct_deposit"
  }
]
```

## Employee Access

### View Paystub History

Employees see list of available paystubs:

```javascript
GET /api/employee/payroll/paystubs/:employee_id
```

Default shows last 12 pay periods. Can adjust with `?limit=24` for 2 years, etc.

### Download Specific Paystub

Employee selects a pay period and views details:

```javascript
GET /api/employee/payroll/paystub/:payroll_record_id
```

**Access Control:**
- Employees can only access their own paystubs
- Managers cannot access employee paystubs (privacy)
- HR/Payroll admins can access all for support

### Year-End Access

For tax purposes, employees should:
1. Download all paystubs for the year
2. Save locally or print
3. Use for tax preparation
4. Verify against W-2 form

## API Reference

### Paystub Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/:role/payroll/paystub/:payroll_record_id` | Generate paystub |
| POST | `/api/:role/payroll/paystub/:payroll_record_id/email` | Email paystub |
| GET | `/api/:role/payroll/paystubs/:employee_id` | List employee paystubs |

### Query Parameters

**For List Endpoint:**
- `limit`: Number of paystubs to return (default: 12)
- `year`: Filter by specific year (optional)

**For Generate Endpoint:**
- `format`: Output format - `json` or `pdf` (default: json)

## PDF Generation (Future)

### Planned Features

Currently, paystubs are returned as JSON. Future enhancement will include:

```javascript
GET /api/:role/payroll/paystub/:id?format=pdf
```

**PDF Will Include:**
- Professional formatting
- Company logo
- Complete earning/deduction breakdown
- Year-to-date totals
- Payment method details
- Employee retention copy and file copy

### PDF Libraries

Recommended for implementation:
- **PDFKit**: Node.js PDF generation
- **Puppeteer**: HTML to PDF conversion
- **jsPDF**: Client-side PDF generation

### PDF Template Structure

```
┌─────────────────────────────────────────┐
│  COMPANY LOGO              PAYSTUB      │
│  Company Name              PS-123-...   │
├─────────────────────────────────────────┤
│  EMPLOYEE INFORMATION                   │
│  Name: John Doe                         │
│  ID: EMP001                             │
│  Department: Sales                      │
├─────────────────────────────────────────┤
│  PAY PERIOD                             │
│  02/05/2024 - 02/18/2024               │
│  Payment Date: 02/22/2024              │
├─────────────────────────────────────────┤
│  EARNINGS          HOURS    RATE   AMT │
│  Regular           80.00   25.00  2000 │
│  Overtime           5.00   37.50   188 │
│                                 ─────── │
│  Gross Pay                      $2,188 │
├─────────────────────────────────────────┤
│  DEDUCTIONS                         AMT │
│  Federal Tax                       $328 │
│  State Tax                         $131 │
│  Social Security                   $136 │
│  Medicare                           $32 │
│  Other                              $50 │
│                                 ─────── │
│  Total Deductions                  $677 │
├─────────────────────────────────────────┤
│  NET PAY                         $1,511 │
│  Payment Method: Direct Deposit         │
└─────────────────────────────────────────┘
```

## Best Practices

### For Payroll Administrators

1. **Generate After Approval**: Only generate paystubs for approved payroll
2. **Review First**: Check one paystub before batch distribution
3. **Schedule Distribution**: Send on or before payday
4. **Keep Records**: Archive generated paystubs
5. **Verify Emails**: Ensure employee emails are current

### For Employees

1. **Review Immediately**: Check paystub as soon as received
2. **Verify Accuracy**: Confirm hours, rate, deductions
3. **Save Copies**: Download and store securely
4. **Report Issues**: Contact payroll immediately if incorrect
5. **Tax Documents**: Keep for tax season

### For HR Department

1. **Employee Training**: Show employees how to access paystubs
2. **Privacy Protection**: Ensure secure access only
3. **Compliance**: Maintain records per legal requirements
4. **Support Requests**: Assist with access issues
5. **Annual Review**: Send year-end summary

## Security & Privacy

### Data Protection

- Paystubs contain sensitive financial information
- Access strictly controlled by role-based permissions
- All access logged for audit trail
- Encrypted in transit (HTTPS)
- Stored securely in database

### Access Rules

| Role | Access Level |
|------|--------------|
| Employee | Own paystubs only |
| Manager | No access to paystubs |
| Payroll Admin | All paystubs |
| HR Admin | All paystubs (support) |
| Company Admin | All paystubs |

### Compliance

**Required Retention:**
- Paystubs: 3-7 years (varies by state)
- Payroll records: 3-7 years
- Tax documents: 7 years minimum

**Legal Requirements:**
- Must provide paystubs to employees
- Must show all deductions
- Must be available on or before payday
- Must be retrievable for audits

## Troubleshooting

### Issue: Paystub Not Found

**Symptoms**: 404 error when accessing paystub

**Solutions**:
1. Verify payroll record exists
2. Check payroll record ID is correct
3. Ensure payroll has been processed
4. Contact payroll admin if persistent

### Issue: Incorrect Amounts

**Symptoms**: Hours or pay amounts don't match expectations

**Solutions**:
1. Review timesheet that generated payroll
2. Check pay rate is correct
3. Verify deduction amounts
4. Contact payroll admin for correction

### Issue: Cannot Access Paystubs

**Symptoms**: Permission denied or empty list

**Solutions**:
1. Verify employee ID is correct
2. Check user has employee role
3. Ensure payroll has been processed
4. Contact HR for access issues

### Issue: Email Not Received

**Symptoms**: Paystub email doesn't arrive

**Solutions**:
1. Check spam/junk folder
2. Verify email address in profile
3. Try alternative email
4. Download directly from portal
5. Contact IT support

## Integration

### With Payroll System

Paystubs are generated from:
- Approved payroll records
- Validated timesheet hours
- Current employee pay rates
- Configured tax withholdings

### With Email System

(Pending Implementation)
- Automated email delivery
- Scheduled distribution
- Delivery confirmation
- Bounce handling

### With Accounting System

- QuickBooks export includes paystub data
- Matches journal entries
- Reconciliation support
- Audit trail

## Future Enhancements

### Planned Features

1. **PDF Generation**: Professional PDF paystubs
2. **Year-to-Date Totals**: Running totals on each paystub
3. **Custom Deductions**: Support for additional deduction types
4. **Multi-Currency**: Support for international payroll
5. **Direct Deposit Details**: Bank account info on paystub
6. **Mobile App**: View paystubs on mobile device
7. **Automatic Distribution**: Email automatically on payday
8. **Electronic Signature**: Digital signature for records

### API Enhancements

```javascript
// Batch generation
POST /api/:role/payroll/paystubs/generate-batch
{
  "period_id": 456
}

// Year-to-date summary
GET /api/:role/payroll/paystubs/:employee_id/ytd/:year

// Download all for year
GET /api/:role/payroll/paystubs/:employee_id/year/:year/download
```

## Support

### For Payroll Questions

Contact: Payroll Department
- Email: payroll@company.com
- Phone: (555) 123-4567
- Hours: Mon-Fri 9am-5pm

### For Technical Issues

Contact: IT Support
- Email: itsupport@company.com
- Phone: (555) 987-6543
- Portal: support.company.com

### For Access Issues

Contact: HR Department
- Email: hr@company.com
- Phone: (555) 555-1234
- Portal: hr.company.com
