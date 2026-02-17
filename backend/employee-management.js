/**
 * Employee Management Module
 * Allows suppliers and retailers to manage their employees
 */

const express = require('express');
const router = express.Router();

// This will be set by server.js
let mockUsers = null;
let getNextUserId = null;

// Initialize with mockUsers reference from server.js
const init = (users, counterFn) => {
  mockUsers = users;
  getNextUserId = counterFn;
};

/**
 * Get all employees for the current user's company
 * GET /api/employees
 */
router.get('/', (req, res) => {
  try {
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    
    if (!currentUser || !currentUser.business_name) {
      return res.status(400).json({ error: 'User is not associated with a business' });
    }

    // Get all employees from the same company
    const employees = mockUsers
      .filter(u => u.business_name === currentUser.business_name && u.id !== currentUser.id)
      .map(({ password, ...employee }) => employee);

    res.json({
      business_name: currentUser.business_name,
      total_employees: employees.length,
      employees
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add a new employee to the company
 * POST /api/employees
 */
router.post('/', (req, res) => {
  try {
    const { name, email, password, employee_role, employee_id } = req.body;
    
    if (!name || !email || !password || !employee_role) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, email, password, employee_role' 
      });
    }

    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    
    if (!currentUser || !currentUser.business_name) {
      return res.status(400).json({ error: 'User is not associated with a business' });
    }

    // Check if email already exists
    if (mockUsers.some(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Generate employee ID if not provided
    const empId = employee_id || `EMP-${getNextUserId()}`;

    // Create new employee with same role and business as owner
    const newEmployee = {
      id: getNextUserId(),
      name,
      email,
      password, // In production, hash this!
      role: currentUser.role, // Inherit owner's role (supplier/retailer)
      business_name: currentUser.business_name,
      employee_role,
      employee_id: empId,
      approved: 1,
      created_at: new Date().toISOString(),
      created_by: req.user.userId
    };

    mockUsers.push(newEmployee);

    const { password: _, ...employeeWithoutPassword } = newEmployee;

    res.status(201).json({
      message: 'Employee added successfully',
      employee: employeeWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update an employee
 * PUT /api/employees/:id
 */
router.put('/:id', (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    
    if (!currentUser || !currentUser.business_name) {
      return res.status(400).json({ error: 'User is not associated with a business' });
    }

    const employeeIndex = mockUsers.findIndex(u => 
      u.id === employeeId && 
      u.business_name === currentUser.business_name
    );

    if (employeeIndex === -1) {
      return res.status(404).json({ error: 'Employee not found or not in your company' });
    }

    // Update allowed fields
    const { name, email, employee_role, employee_id } = req.body;
    
    if (name) mockUsers[employeeIndex].name = name;
    if (email) mockUsers[employeeIndex].email = email;
    if (employee_role) mockUsers[employeeIndex].employee_role = employee_role;
    if (employee_id) mockUsers[employeeIndex].employee_id = employee_id;

    const { password, ...employeeWithoutPassword } = mockUsers[employeeIndex];

    res.json({
      message: 'Employee updated successfully',
      employee: employeeWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete an employee
 * DELETE /api/employees/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    
    if (!currentUser || !currentUser.business_name) {
      return res.status(400).json({ error: 'User is not associated with a business' });
    }

    const employeeIndex = mockUsers.findIndex(u => 
      u.id === employeeId && 
      u.business_name === currentUser.business_name
    );

    if (employeeIndex === -1) {
      return res.status(404).json({ error: 'Employee not found or not in your company' });
    }

    // Prevent deleting yourself
    if (employeeId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deletedEmployee = mockUsers.splice(employeeIndex, 1)[0];
    const { password, ...employeeWithoutPassword } = deletedEmployee;

    res.json({
      message: 'Employee removed successfully',
      employee: employeeWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get employee by ID
 * GET /api/employees/:id
 */
router.get('/:id', (req, res) => {
  try {
    const employeeId = parseInt(req.params.id);
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    
    if (!currentUser || !currentUser.business_name) {
      return res.status(400).json({ error: 'User is not associated with a business' });
    }

    const employee = mockUsers.find(u => 
      u.id === employeeId && 
      u.business_name === currentUser.business_name
    );

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const { password, ...employeeWithoutPassword } = employee;

    res.json({
      employee: employeeWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get employees by role
 * GET /api/employees/role/:role
 */
router.get('/role/:role', (req, res) => {
  try {
    const { role } = req.params;
    const currentUser = mockUsers.find(u => u.id === req.user.userId);
    
    if (!currentUser || !currentUser.business_name) {
      return res.status(400).json({ error: 'User is not associated with a business' });
    }

    const employees = mockUsers
      .filter(u => 
        u.business_name === currentUser.business_name && 
        u.employee_role === role
      )
      .map(({ password, ...employee }) => employee);

    res.json({
      role,
      count: employees.length,
      employees
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, init };
