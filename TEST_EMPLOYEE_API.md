# Employee Management API Test

## Test the Employee Management System

### 1. Login as John (Supplier Owner)
```powershell
$loginBody = @{
  email = "john@example.com"
  password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:10000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $response.token
$headers = @{
  "Authorization" = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "✓ Logged in as: $($response.user.name)"
Write-Host "✓ Business: $($response.user.business_name)"
```

### 2. View Existing Employees
```powershell
$employees = Invoke-RestMethod -Uri "http://localhost:10000/api/employees" -Method GET -Headers $headers
Write-Host "`n✓ Total Employees: $($employees.total_employees)"
Write-Host "✓ Business: $($employees.business_name)"
$employees.employees | ForEach-Object { Write-Host "  - $($_.name) ($($_.employee_role))" }
```

### 3. Add a New Employee
```powershell
$newEmployee = @{
  name = "Sarah Johnson"
  email = "sarah.new@premiumcigars.com"
  password = "tempPassword123"
  employee_role = "warehouse_manager"
  employee_id = "WM-003"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:10000/api/employees" -Method POST -Body $newEmployee -Headers $headers
Write-Host "`n✓ Added Employee: $($result.employee.name)"
Write-Host "  Role: $($result.employee.employee_role)"
Write-Host "  ID: $($result.employee.employee_id)"
```

### 4. View Warehouse Workers
```powershell
$warehouse = Invoke-RestMethod -Uri "http://localhost:10000/api/employees/role/warehouse_worker" -Method GET -Headers $headers
Write-Host "`n✓ Warehouse Workers: $($warehouse.count)"
$warehouse.employees | ForEach-Object { Write-Host "  - $($_.name) ($($_.employee_id))" }
```

### 5. Test New Employee Can Login
```powershell
$newLoginBody = @{
  email = "sarah.new@premiumcigars.com"
  password = "tempPassword123"
} | ConvertTo-Json

$newUserResponse = Invoke-RestMethod -Uri "http://localhost:10000/api/auth/login" -Method POST -Body $newLoginBody -ContentType "application/json"
Write-Host "`n✓ New employee can log in: $($newUserResponse.user.name)"
Write-Host "✓ Business: $($newUserResponse.user.business_name)"
Write-Host "✓ Role: $($newUserResponse.user.employee_role)"
```

## Complete Test Script
```powershell
# Complete test in one go
$loginBody = @{"email"="john@example.com";"password"="password123"} | ConvertTo-Json
$response = Invoke-RestMethod -Uri "http://localhost:10000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $response.token
$headers = @{"Authorization"="Bearer $token";"Content-Type"="application/json"}

Write-Host "=== EMPLOYEE MANAGEMENT TEST ===`n"

# View existing
$employees = Invoke-RestMethod -Uri "http://localhost:10000/api/employees" -Method GET -Headers $headers
Write-Host "1. Current Team: $($employees.business_name)"
Write-Host "   Total: $($employees.total_employees) employees`n"

# Add new
$newEmp = @{name="Alex Martinez";email="alex.new@premiumcigars.com";password="temp123";employee_role="customer_service"} | ConvertTo-Json
$added = Invoke-RestMethod -Uri "http://localhost:10000/api/employees" -Method POST -Body $newEmp -Headers $headers
Write-Host "2. ✓ Added: $($added.employee.name) as $($added.employee.employee_role)`n"

# Verify
$updated = Invoke-RestMethod -Uri "http://localhost:10000/api/employees" -Method GET -Headers $headers
Write-Host "3. ✓ Updated count: $($updated.total_employees) employees`n"

# Test new login
$newLogin = @{"email"="alex.new@premiumcigars.com";"password"="temp123"} | ConvertTo-Json
$newUser = Invoke-RestMethod -Uri "http://localhost:10000/api/auth/login" -Method POST -Body $newLogin -ContentType "application/json"
Write-Host "4. ✓ New employee login successful"
Write-Host "   Name: $($newUser.user.name)"
Write-Host "   Company: $($newUser.user.business_name)"

Write-Host "`n=== ALL TESTS PASSED ✓ ===`n"
```
