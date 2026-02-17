# Payroll Processing Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Payroll Setup](#payroll-setup)
3. [Creating Payroll Periods](#creating-payroll-periods)
4. [Calculating Payroll](#calculating-payroll)
5. [Tax Calculations](#tax-calculations)
6. [Approval Workflow](#approval-workflow)
7. [Payment Processing](#payment-processing)
8. [Reports and Exports](#reports-and-exports)
9. [Compliance](#compliance)
10. [Troubleshooting](#troubleshooting)

## Introduction

The Payroll Processing System automates payroll calculations, tax withholding, and payment processing for hourly and salaried employees. It integrates with time clock and attendance systems to ensure accurate compensation.

### Key Features

- **Automated Calculations**: Regular and overtime pay
- **Tax Withholding**: Federal, state, Social Security, Medicare
- **Multiple Pay Frequencies**: Weekly, biweekly, monthly
- **Deduction Management**: Pre-tax and post-tax deductions
- **Direct Deposit**: Electronic payment processing
- **Pay Stub Generation**: Detailed earnings statements
- **Compliance Reporting**: FLSA, tax compliance
- **Multi-tenant**: Separate payroll per company

## Payroll Setup

### Configure Company Payroll Settings

Set up your company's payroll parameters:

```javascript
PUT /api/:role/payroll/settings/:company_id
{
  "pay_frequency": "biweekly",
  "work_week_start": 0,
  "work_week_end": 6,
  "overtime_threshold_hours": 40,
  "overtime_rate_multiplier": 1.5,
  "double_time_threshold_hours": 60,
  "double_time_multiplier": 2.0,
  "break_deduction_daily": 0.5,
  "lunch_deduction_daily": 0.5,
  "federal_tax_rate": 12.0,
  "state_tax_rate": 5.0
}
```

### Understanding Pay Frequencies

#### Weekly Payroll
- **Period**: 7 days
- **Pay Days Per Year**: 52
- **Example**: Monday-Sunday, paid following Friday

#### Biweekly Payroll  
- **Period**: 14 days
- **Pay Days Per Year**: 26
- **Example**: Two-week periods, paid every other Friday

#### Monthly Payroll
- **Period**: Calendar month
- **Pay Days Per Year**: 12
- **Example**: 1st-last day of month, paid on 1st of next month

### Employee Setup

Ensure each employee has complete payroll information:

```sql
UPDATE companies_employees 
SET 
  hourly_rate = 18.50,           -- For hourly employees
  salary = 45000,                -- For salaried employees
  employment_type = 'full_time', -- full_time, part_time, contract
  position = 'Sales Associate',
  hire_date = '2024-01-15'
WHERE id = 10;
```

## Creating Payroll Periods

### Create a New Period

```javascript
POST /api/:role/payroll/create-period
{
  "company_id": 1,
  "period_start_date": "2024-02-05",
  "period_end_date": "2024-02-18",
  "pay_frequency": "biweekly"
}
```

Response:
```json
{
  "message": "Payroll period created successfully",
  "period_id": 25
}
```

### View Payroll Periods

Get all periods for company:

```javascript
GET /api/:role/payroll/periods/:company_id?status=open&limit=50
```

Response:
```json
[
  {
    "id": 25,
    "company_id": 1,
    "period_start_date": "2024-02-05",
    "period_end_date": "2024-02-18",
    "pay_frequency": "biweekly",
    "total_employees": 0,
    "total_hours": 0,
    "total_payroll": 0,
    "status": "open",
    "created_at": "2024-02-01T10:00:00Z"
  }
]
```

### Period Statuses

- **open**: Period is open, time entries still being collected
- **closed**: Period is closed, ready for calculation
- **processed**: Payroll has been calculated
- **finalized**: Payroll approved and paid

## Calculating Payroll

### Automatic Calculation

Run payroll calculation for a period:

```javascript
POST /api/:role/payroll/calculate/:period_id
{
  "processed_by": 5
}
```

The system will:
1. Gather all time entries for the period
2. Calculate regular and overtime hours
3. Apply hourly rates or salary amounts
4. Calculate tax withholdings
5. Compute net pay
6. Create payroll records for each employee

Response:
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

### Calculation Logic

#### For Hourly Employees

```
Regular Hours = MIN(total_hours, overtime_threshold)
Overtime Hours = MAX(0, total_hours - overtime_threshold)

Regular Pay = Regular Hours × Hourly Rate
Overtime Pay = Overtime Hours × Hourly Rate × Overtime Multiplier

Gross Pay = Regular Pay + Overtime Pay
```

Example:
```
Employee works 45 hours at $20/hour
Overtime threshold: 40 hours
Overtime multiplier: 1.5x

Regular: 40 hours × $20 = $800
Overtime: 5 hours × $20 × 1.5 = $150
Gross Pay: $800 + $150 = $950
```

#### For Salaried Employees

```
Annual Salary = $52,000
Pay Frequency = Biweekly (26 periods)

Gross Pay per Period = $52,000 ÷ 26 = $2,000
```

## Tax Calculations

### Federal Tax Withholding

Based on configured rate:

```
Federal Tax = Gross Pay × (Federal Tax Rate ÷ 100)
```

Example:
```
Gross Pay: $2,000
Federal Rate: 12%
Federal Tax: $2,000 × 0.12 = $240
```

### State Tax Withholding

Based on configured rate:

```
State Tax = Gross Pay × (State Tax Rate ÷ 100)
```

Example:
```
Gross Pay: $2,000
State Rate: 5%
State Tax: $2,000 × 0.05 = $100
```

### Social Security

6.2% up to annual wage limit:

```
Social Security = Gross Pay × 0.062
```

Example:
```
Gross Pay: $2,000
Social Security: $2,000 × 0.062 = $124
```

### Medicare

1.45% with no wage limit:

```
Medicare = Gross Pay × 0.0145
```

Example:
```
Gross Pay: $2,000
Medicare: $2,000 × 0.0145 = $29
```

### Net Pay Calculation

```
Net Pay = Gross Pay - Federal Tax - State Tax - Social Security - Medicare - Other Deductions
```

Complete Example:
```
Gross Pay:          $2,000.00
Federal Tax:        -$240.00
State Tax:          -$100.00
Social Security:    -$124.00
Medicare:           -$29.00
Other Deductions:   -$50.00
------------------------
Net Pay:            $1,457.00
```

## Approval Workflow

### View Period Records

Get all payroll records for a period:

```javascript
GET /api/:role/payroll/period-records/:period_id
```

Response:
```json
[
  {
    "id": 150,
    "employee_id": 10,
    "emp_number": "EMP001",
    "employee_name": "John Doe",
    "position": "Sales Associate",
    "department_name": "Sales",
    "regular_hours": 80,
    "regular_rate": 18.50,
    "regular_pay": 1480.00,
    "overtime_hours": 5,
    "overtime_rate": 27.75,
    "overtime_pay": 138.75,
    "gross_pay": 1618.75,
    "federal_tax": 194.25,
    "state_tax": 80.94,
    "social_security": 100.36,
    "medicare": 23.47,
    "other_deductions": 0,
    "net_pay": 1219.73,
    "status": "draft"
  }
]
```

### Approve Individual Record

```javascript
PUT /api/:role/payroll/records/:id/approve
{
  "approved_by": 5
}
```

Response:
```json
{
  "message": "Payroll record approved successfully"
}
```

### Bulk Approval

Approve multiple records:

```javascript
// Get all draft records
GET /api/:role/payroll/period-records/:period_id

// Approve each one
for (record of records) {
  PUT /api/:role/payroll/records/${record.id}/approve
  {
    "approved_by": 5
  }
}
```

## Payment Processing

### Process Direct Deposit

Process payment for approved records:

```javascript
POST /api/:role/payroll/process-payment
{
  "record_id": 150,
  "payment_method": "direct_deposit"
}
```

Response:
```json
{
  "message": "Payment processed successfully"
}
```

### Payment Methods

- **direct_deposit**: Electronic transfer to bank account
- **check**: Physical paycheck
- **cash**: Cash payment (not recommended)

### Payment Batch Processing

Process all approved records for a period:

```javascript
// Get all approved records
GET /api/:role/payroll/period-records/:period_id

// Filter approved records
const approved = records.filter(r => r.status === 'approved');

// Process each payment
for (record of approved) {
  POST /api/:role/payroll/process-payment
  {
    "record_id": record.id,
    "payment_method": "direct_deposit"
  }
}
```

## Reports and Exports

### Export Payroll Data

Export period data as CSV:

```javascript
GET /api/:role/payroll/export/:period_id
```

Returns CSV file with columns:
- Employee ID
- Employee Name
- Position
- Department
- Regular Hours
- Regular Rate
- Regular Pay
- Overtime Hours
- Overtime Rate
- Overtime Pay
- Gross Pay
- Federal Tax
- State Tax
- Social Security
- Medicare
- Other Deductions
- Net Pay
- Payment Method
- Status

### Department Summary

Get payroll summary by department:

```javascript
GET /api/:role/payroll/summary/:company_id/:period_id
```

Response:
```json
[
  {
    "department_name": "Sales",
    "employee_count": 5,
    "total_regular_hours": 200,
    "total_overtime_hours": 15,
    "total_gross_pay": 8000.00,
    "total_net_pay": 6200.00,
    "avg_gross_pay": 1600.00
  },
  {
    "department_name": "Shipping",
    "employee_count": 8,
    "total_regular_hours": 320,
    "total_overtime_hours": 25,
    "total_gross_pay": 12500.00,
    "total_net_pay": 9750.00,
    "avg_gross_pay": 1562.50
  }
]
```

### Employee Pay History

View pay history for an employee:

```javascript
GET /api/:role/payroll/records/:employee_id?limit=12
```

Response:
```json
[
  {
    "id": 150,
    "period_start_date": "2024-02-05",
    "period_end_date": "2024-02-18",
    "pay_frequency": "biweekly",
    "regular_hours": 80,
    "overtime_hours": 5,
    "gross_pay": 1618.75,
    "net_pay": 1219.73,
    "status": "paid",
    "paid_date": "2024-02-23T12:00:00Z",
    "payment_method": "direct_deposit"
  }
]
```

## Compliance

### Fair Labor Standards Act (FLSA)

Ensure compliance with FLSA:

1. **Minimum Wage**: Set hourly rate at or above minimum
2. **Overtime Pay**: Pay 1.5x for hours over 40/week
3. **Record Keeping**: Maintain accurate time records
4. **Child Labor**: Follow restrictions for minor employees

### Tax Compliance

1. **Federal Withholding**: Calculate and withhold federal taxes
2. **State Withholding**: Apply state tax rates
3. **FICA**: Withhold Social Security and Medicare
4. **Quarterly Reports**: File quarterly tax returns
5. **W-2 Forms**: Issue annual wage statements

### Audit Trail

System maintains complete audit trail:
- Who calculated payroll
- When calculations were made
- Who approved records
- When payments were processed
- Any adjustments or corrections

## Troubleshooting

### Issue 1: Incorrect Hours

**Symptom**: Payroll shows wrong hours worked

**Solution**:
1. Verify time entries are complete
2. Check for missing clock-outs
3. Review time adjustments
4. Recalculate payroll if needed

### Issue 2: Wrong Tax Amounts

**Symptom**: Tax withholding seems incorrect

**Solution**:
1. Check company payroll settings
2. Verify federal and state tax rates
3. Ensure rates are in percentage (not decimal)
4. Recalculate payroll period

### Issue 3: Missing Employees

**Symptom**: Not all employees in payroll

**Solution**:
1. Check employee status is 'active'
2. Verify employees clocked time during period
3. Ensure employees are in correct company
4. Check for time entries in date range

### Issue 4: Cannot Process Payment

**Symptom**: Payment processing fails

**Solution**:
1. Verify record is approved
2. Check payment method is valid
3. Ensure record not already paid
4. Review error message details

## Best Practices

### Payroll Schedule

1. **Consistent Timing**: Process on same day each period
2. **Advance Notice**: Give employees pay date in advance
3. **Early Cutoff**: Close time entries day before processing
4. **Review Time**: Allow time for review and corrections

### Quality Checks

Before finalizing payroll:
1. **Total Hours**: Verify total hours match expectations
2. **Total Pay**: Check total payroll is reasonable
3. **Individual Review**: Spot-check high/low amounts
4. **Tax Calculations**: Verify tax withholdings
5. **Department Totals**: Review department summaries

### Documentation

Maintain records of:
1. Pay period definitions
2. Payroll calculations
3. Tax withholdings
4. Payment confirmations
5. Employee acknowledgments

## Next Steps

- Review [Time Clock Guide](TIME_CLOCK_GUIDE.md)
- Study [Compliance Requirements](COMPLIANCE_GUIDE.md)
- Check [API Documentation](SCHEDULING_API_DOCUMENTATION.md)
