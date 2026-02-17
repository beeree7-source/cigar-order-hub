# Employee Scheduling & Payroll Compliance Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Fair Labor Standards Act (FLSA)](#fair-labor-standards-act-flsa)
3. [State Labor Laws](#state-labor-laws)
4. [Tax Compliance](#tax-compliance)
5. [Record Keeping](#record-keeping)
6. [Privacy and Data Protection](#privacy-and-data-protection)
7. [Best Practices](#best-practices)
8. [Audit Preparation](#audit-preparation)

## Introduction

This guide outlines compliance requirements for employee scheduling, time tracking, and payroll processing. Proper compliance protects both the company and employees while avoiding penalties and legal issues.

### Key Compliance Areas

1. **Federal Labor Laws**: FLSA, FICA, FUTA
2. **State Labor Laws**: Overtime, breaks, meal periods
3. **Tax Compliance**: Withholding, reporting, payments
4. **Data Privacy**: GDPR, CCPA, employee data protection
5. **Record Keeping**: Document retention requirements
6. **Accessibility**: ADA compliance for leave and accommodations

## Fair Labor Standards Act (FLSA)

### Minimum Wage

**Requirement**: Pay at least federal minimum wage ($7.25/hour as of 2024)

**System Implementation**:
- Set `hourly_rate` at or above minimum wage
- System validates rates during employee setup
- Regular audits to ensure compliance

```sql
-- Check employees below minimum wage
SELECT * FROM companies_employees 
WHERE hourly_rate < 7.25 AND employment_type != 'salary';
```

### Overtime Pay

**Requirement**: Pay 1.5x regular rate for hours over 40/week

**System Implementation**:
- Automatic overtime detection
- Configurable overtime threshold (default: 40 hours)
- Overtime rate multiplier (default: 1.5x)

```javascript
// Company settings for overtime
{
  "overtime_threshold_hours": 40,
  "overtime_rate_multiplier": 1.5
}
```

**Calculation**:
```
Regular Hours = MIN(total_hours, 40)
Overtime Hours = MAX(0, total_hours - 40)
Overtime Pay = Overtime Hours × Rate × 1.5
```

### Exempt vs Non-Exempt Employees

**Exempt Employees**:
- Salaried employees not entitled to overtime
- Must meet salary threshold ($684/week minimum)
- Must perform exempt duties (executive, administrative, professional)

**Non-Exempt Employees**:
- Entitled to overtime pay
- Typically hourly workers
- Must track all hours worked

**System Implementation**:
```sql
UPDATE companies_employees 
SET employment_type = 'full_time',
    salary = 45000  -- Annual salary for exempt
WHERE position = 'Manager';

UPDATE companies_employees 
SET employment_type = 'full_time',
    hourly_rate = 18.50  -- Hourly rate for non-exempt
WHERE position = 'Sales Associate';
```

### Record Keeping Requirements

**Required Records** (3 years minimum):
- Employee name, address, SSN
- Birth date (if under 19)
- Hours worked each day
- Total hours per workweek
- Basis of pay (hourly/salary)
- Regular rate of pay
- Gross wages
- Deductions
- Net wages
- Pay period dates

**System Implementation**:
- All data stored in database
- Complete audit trail
- Automatic calculation and logging
- Export capabilities for audits

### Child Labor Restrictions

**Ages 14-15**:
- Limited to 3 hours/day when school in session
- 18 hours per week during school
- 8 hours/day when school not in session
- 40 hours per week when school not in session
- No work before 7am or after 7pm (9pm summer)

**Ages 16-17**:
- Unlimited hours
- Hazardous occupation restrictions

**System Implementation**:
```sql
-- Track minor employees
ALTER TABLE companies_employees ADD COLUMN birth_date DATE;

-- Validate schedules for minors
SELECT * FROM employee_schedules es
JOIN companies_employees ce ON es.employee_id = ce.id
WHERE date('now', '-18 years') > ce.birth_date;
```

## State Labor Laws

### Overtime Rules

Some states have different overtime rules:

**California**:
- Overtime after 8 hours/day
- Double time after 12 hours/day
- Overtime after 40 hours/week
- Double time on 7th consecutive workday

**Colorado**:
- Overtime after 40 hours/week
- Overtime after 12 hours/day

**System Configuration**:
```javascript
PUT /api/:role/payroll/settings/:company_id
{
  "overtime_threshold_hours": 40,
  "overtime_rate_multiplier": 1.5,
  "double_time_threshold_hours": 12,
  "double_time_multiplier": 2.0
}
```

### Meal and Rest Breaks

**California**:
- 30-minute meal break for 5+ hour shifts
- 10-minute rest break per 4 hours worked

**Colorado**:
- 30-minute meal break for 5+ hour shifts
- 10-minute rest break per 4 hours worked

**New York**:
- 30-minute meal break for 6+ hour shifts

**System Implementation**:
```javascript
// Configure break requirements
{
  "break_duration": 10,      // minutes per 4 hours
  "lunch_duration": 30,      // minutes for 5+ hour shift
  "break_deduction_daily": 0.5,
  "lunch_deduction_daily": 0.5
}
```

### Predictive Scheduling Laws

Some jurisdictions require advance notice of schedules:

**Oregon**: 14 days advance notice
**Seattle**: 14 days advance notice
**San Francisco**: 2 weeks advance notice

**System Best Practice**:
- Publish schedules at least 2 weeks in advance
- Document schedule changes
- Compensate for last-minute changes

## Tax Compliance

### Federal Income Tax Withholding

**Requirement**: Withhold federal income tax based on W-4 form

**System Implementation**:
```javascript
{
  "federal_tax_rate": 12.0  // Percentage based on bracket
}
```

**Tax Brackets** (2024):
- 10%: $0 - $11,000
- 12%: $11,001 - $44,725
- 22%: $44,726 - $95,375
- 24%: $95,376 - $182,100

### Social Security Tax

**Requirement**: 6.2% of wages up to $168,600 (2024)

**System Implementation**:
```javascript
Social Security = MIN(Gross Pay, Annual Limit) × 0.062
```

### Medicare Tax

**Requirement**: 1.45% of all wages (no limit)

**Additional Medicare**: 0.9% on wages over $200,000

**System Implementation**:
```javascript
Medicare = Gross Pay × 0.0145
Additional Medicare = MAX(0, Annual Wages - 200000) × 0.009
```

### State Income Tax

**Varies by state**:
- No income tax: AK, FL, NV, NH, SD, TN, TX, WA, WY
- Flat rate: CO, IL, IN, KY, MA, MI, NC, PA, UT
- Progressive: CA, NY, OR, etc.

**System Implementation**:
```javascript
{
  "state_tax_rate": 5.0  // Percentage for state
}
```

### Quarterly Tax Filing

**Form 941**: Filed quarterly
- Due: April 30, July 31, October 31, January 31

**Information Required**:
- Total wages paid
- Federal income tax withheld
- Social Security wages and tax
- Medicare wages and tax

**System Support**:
```sql
-- Quarterly tax report
SELECT 
  SUM(gross_pay) as total_wages,
  SUM(federal_tax) as federal_withheld,
  SUM(social_security) as ss_tax,
  SUM(medicare) as medicare_tax
FROM payroll_records
WHERE paid_date >= '2024-01-01' 
  AND paid_date < '2024-04-01'
  AND company_id = 1;
```

### Annual Reporting

**Form W-2**: Annual wage statement
- Due to employees: January 31
- Due to SSA: January 31

**Information Required**:
- Total wages
- Federal tax withheld
- Social Security wages and tax
- Medicare wages and tax
- State wages and tax

## Record Keeping

### Required Documents

**Employee Records** (duration: entire employment + 3 years):
- Name, address, SSN, date of birth
- Hire date, position, pay rate
- Employment agreements
- W-4 forms
- I-9 forms

**Payroll Records** (duration: 4 years):
- Time cards/time sheets
- Wage computations
- Payment records
- Tax withholding records

**System Implementation**:
- All records stored in database
- Automatic retention
- Export capabilities
- Backup procedures

### Audit Trail

**Required Logging**:
- Time entry creation/modification
- Who made changes and when
- Reason for changes
- Approval records
- Payment records

**System Implementation**:
```sql
-- Time entry audit
SELECT 
  te.*,
  te.edited_by,
  te.edited_reason,
  u.name as edited_by_name
FROM time_entries te
LEFT JOIN users u ON te.edited_by = u.id
WHERE te.status = 'edited';
```

### Document Retention Schedule

| Document Type | Retention Period |
|---------------|-----------------|
| W-4 Forms | 4 years after last tax filing |
| I-9 Forms | 3 years after hire or 1 year after termination |
| Payroll Records | 4 years |
| Time Cards | 3 years |
| Tax Returns | 7 years |
| Benefit Plans | Permanent |
| Personnel Files | 7 years after termination |

## Privacy and Data Protection

### GDPR Compliance (EU)

**Requirements**:
- Lawful basis for processing
- Data minimization
- Right to access
- Right to erasure
- Data portability
- Consent management

**System Implementation**:
- Collect only necessary data
- Secure storage (encryption)
- Access controls
- Data export functionality
- Deletion procedures

### CCPA Compliance (California)

**Requirements**:
- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of data sale
- Non-discrimination

**System Implementation**:
- Privacy notices
- Data access procedures
- Deletion capabilities
- No data sale
- Equal service regardless of privacy choices

### Employee Data Security

**Best Practices**:
1. **Access Control**: Role-based permissions
2. **Encryption**: Data encrypted at rest and in transit
3. **Audit Logging**: Track all access to sensitive data
4. **Regular Audits**: Review access logs
5. **Training**: Educate staff on data privacy

**System Security**:
```javascript
// Role-based access control
verifyAuth, requireManager

// Data isolation
WHERE company_id = :company_id

// Encryption
- HTTPS for transit
- Database encryption for sensitive fields
```

### GPS Location Privacy

**Considerations**:
- Only collect location at clock in/out
- Inform employees of tracking
- Use only for legitimate purposes
- Secure storage
- Limited retention

**System Implementation**:
```javascript
{
  "gps_verification_required": true  // Can be disabled
}

// Location stored only with time entries
location_latitude, location_longitude
```

## Best Practices

### Scheduling Best Practices

1. **Advance Notice**: Publish schedules 2+ weeks ahead
2. **Predictability**: Maintain consistent schedules
3. **Flexibility**: Allow shift swaps and time-off requests
4. **Fairness**: Distribute shifts equitably
5. **Documentation**: Record all schedule changes

### Time Tracking Best Practices

1. **Accuracy**: Clock in/out at actual times
2. **Breaks**: Track all breaks accurately
3. **Adjustments**: Document reasons for changes
4. **Review**: Employees review time entries weekly
5. **Approval**: Manager approval before payroll

### Payroll Best Practices

1. **Timeliness**: Process on consistent schedule
2. **Accuracy**: Verify calculations before payment
3. **Transparency**: Provide detailed pay stubs
4. **Compliance**: Follow tax withholding rules
5. **Records**: Maintain complete documentation

### Communication Best Practices

1. **Clear Policies**: Written policies for all employees
2. **Training**: Train employees on time clock procedures
3. **Updates**: Communicate schedule changes promptly
4. **Feedback**: Provide channel for employee questions
5. **Documentation**: Keep records of communications

## Audit Preparation

### Internal Audits

**Quarterly Review**:
- Verify minimum wage compliance
- Check overtime calculations
- Review time adjustments
- Validate tax withholdings
- Check for policy violations

**Checklist**:
```
□ All employees above minimum wage
□ Overtime calculated correctly
□ Time adjustments documented
□ Tax rates up to date
□ Break policies followed
□ Schedule advance notice met
□ Records complete and organized
```

### External Audits

**Preparation**:
1. **Gather Records**: Compile all required documents
2. **Run Reports**: Generate summary reports
3. **Review Exceptions**: Investigate anomalies
4. **Document Processes**: Prepare process documentation
5. **Designate Contact**: Assign audit liaison

**Required Reports**:
```sql
-- Total payroll by period
SELECT 
  period_start_date,
  period_end_date,
  COUNT(*) as employees,
  SUM(regular_hours) as total_regular_hours,
  SUM(overtime_hours) as total_overtime_hours,
  SUM(gross_pay) as total_gross,
  SUM(federal_tax) as total_federal_tax,
  SUM(net_pay) as total_net
FROM payroll_records pr
JOIN payroll_periods pp ON pr.payroll_period_id = pp.id
WHERE company_id = 1
GROUP BY pp.id
ORDER BY period_start_date DESC;
```

### Common Audit Issues

1. **Missing Time Records**: Ensure all shifts have time entries
2. **Incorrect Overtime**: Verify overtime calculations
3. **Unauthorized Adjustments**: Check approval for changes
4. **Late Payments**: Document reasons for payment delays
5. **Incomplete Records**: Fill gaps in documentation

## Penalties for Non-Compliance

### FLSA Violations

- **Back Wages**: Must pay unpaid overtime
- **Liquidated Damages**: Equal to back wages
- **Civil Penalties**: Up to $2,074 per violation
- **Criminal Penalties**: Possible for willful violations

### Tax Violations

- **Failure to Withhold**: Employer liable for taxes
- **Late Filing**: Penalties for late quarterly returns
- **Late Payment**: Interest and penalties on late payments
- **Fraud**: Criminal penalties for intentional violations

### State Violations

- **Varies by State**: Check local regulations
- **Meal Break Violations**: Penalties for skipped breaks
- **Schedule Notice**: Penalties for last-minute changes
- **Record Keeping**: Fines for inadequate records

## Staying Current

### Resources

1. **DOL Website**: www.dol.gov
2. **IRS Tax Guide**: www.irs.gov/businesses
3. **State Labor Office**: Check state website
4. **Legal Counsel**: Consult employment attorney
5. **Industry Associations**: Trade group resources

### System Updates

The system will be updated to reflect:
- Minimum wage changes
- Tax rate adjustments
- New compliance requirements
- Best practice recommendations

### Training

Ensure staff training on:
- Time clock procedures
- Break requirements
- Schedule policies
- Payroll processes
- Privacy practices

## Conclusion

Compliance is an ongoing process requiring:
- Proper system configuration
- Regular monitoring and audits
- Complete documentation
- Staff training and communication
- Staying current with regulations

Use this system's built-in compliance features to maintain adherence to all applicable laws and regulations.
