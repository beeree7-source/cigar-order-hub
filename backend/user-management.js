/**
 * User Management Service
 * Handles user CRUD, profiles, departments, teams, and login methods
 */

const db = require('./database');
const bcrypt = require('bcryptjs');
const { logAuditEvent, getUserRoles } = require('./rbac');

/**
 * Create a new user
 */
const createUser = async (name, email, password, role, departmentId = null, createdBy = null) => {
  return new Promise((resolve, reject) => {
    const hashedPassword = bcrypt.hashSync(password, 12);

    db.run(
      `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, role],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return reject(new Error('Email already exists'));
          }
          return reject(err);
        }

        const userId = this.lastID;

        // Add email login method
        db.run(
          `INSERT INTO login_methods (user_id, method_type, identifier, status) VALUES (?, 'email', ?, 'active')`,
          [userId, email],
          (err) => {
            if (err) {
              return reject(err);
            }

            // Log creation
            logAuditEvent(createdBy, 'create_user', 'users', userId, { email, role }).catch(console.error);

            resolve({
              id: userId,
              name,
              email,
              role,
              departmentId
            });
          }
        );
      }
    );
  });
};

/**
 * Update user profile
 */
const updateUser = async (userId, updates, updatedBy = null) => {
  return new Promise((resolve, reject) => {
    const allowedFields = ['name', 'email', 'role'];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      return reject(new Error('No valid fields to update'));
    }

    values.push(userId);

    db.run(
      `UPDATE users SET ${fields.join(', ')}, updated_at = datetime('now') WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return reject(new Error('Email already exists'));
          }
          return reject(err);
        }

        if (this.changes === 0) {
          return reject(new Error('User not found'));
        }

        // Log update
        logAuditEvent(updatedBy, 'update_user', 'users', userId, updates).catch(console.error);

        resolve({ success: true, userId, updates });
      }
    );
  });
};

/**
 * Delete user (soft delete by setting inactive)
 */
const deleteUser = async (userId, deletedBy = null) => {
  return new Promise((resolve, reject) => {
    // We'll use approved field as a proxy for active/inactive
    db.run(
      `UPDATE users SET approved = 0 WHERE id = ?`,
      [userId],
      function(err) {
        if (err) {
          return reject(err);
        }

        if (this.changes === 0) {
          return reject(new Error('User not found'));
        }

        // Also deactivate all login methods
        db.run(
          `UPDATE login_methods SET status = 'inactive' WHERE user_id = ?`,
          [userId]
        );

        // Log deletion
        logAuditEvent(deletedBy, 'delete_user', 'users', userId).catch(console.error);

        resolve({ success: true, userId });
      }
    );
  });
};

/**
 * Change user password
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  return new Promise((resolve, reject) => {
    // Verify current password
    db.get('SELECT password FROM users WHERE id = ?', [userId], (err, user) => {
      if (err || !user) {
        return reject(new Error('User not found'));
      }

      if (!bcrypt.compareSync(currentPassword, user.password)) {
        return reject(new Error('Current password is incorrect'));
      }

      // Hash new password
      const hashedPassword = bcrypt.hashSync(newPassword, 12);

      db.run(
        `UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?`,
        [hashedPassword, userId],
        function(err) {
          if (err) {
            return reject(err);
          }

          // Log password change
          logAuditEvent(userId, 'password_changed', 'users', userId).catch(console.error);

          resolve({ success: true, message: 'Password changed successfully' });
        }
      );
    });
  });
};

/**
 * Add login method (SSO, API key, biometric)
 */
const addLoginMethod = async (userId, methodType, identifier, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const metadataJson = JSON.stringify(metadata);

    db.run(
      `INSERT INTO login_methods (user_id, method_type, identifier, metadata, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [userId, methodType, identifier, metadataJson],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return reject(new Error('Login method already exists'));
          }
          return reject(err);
        }

        // Log addition
        logAuditEvent(userId, 'add_login_method', 'login_methods', this.lastID, { methodType }).catch(console.error);

        resolve({
          id: this.lastID,
          userId,
          methodType,
          identifier,
          metadata
        });
      }
    );
  });
};

/**
 * Remove login method
 */
const removeLoginMethod = async (userId, loginMethodId) => {
  return new Promise((resolve, reject) => {
    // Check how many active login methods user has
    db.get(
      `SELECT COUNT(*) as count FROM login_methods WHERE user_id = ? AND status = 'active'`,
      [userId],
      (err, row) => {
        if (err) {
          return reject(err);
        }

        if (row.count <= 1) {
          return reject(new Error('Cannot remove last login method'));
        }

        // Remove the login method
        db.run(
          `DELETE FROM login_methods WHERE id = ? AND user_id = ?`,
          [loginMethodId, userId],
          function(err) {
            if (err) {
              return reject(err);
            }

            if (this.changes === 0) {
              return reject(new Error('Login method not found'));
            }

            // Log removal
            logAuditEvent(userId, 'remove_login_method', 'login_methods', loginMethodId).catch(console.error);

            resolve({ success: true, message: 'Login method removed' });
          }
        );
      }
    );
  });
};

/**
 * Assign user to department
 */
const assignDepartment = async (userId, departmentId, assignedBy = null) => {
  return new Promise((resolve, reject) => {
    // For now, we'll use a user_roles entry with the department
    // In a more complex system, you might have a separate user_departments table

    // We can update the user's primary department in their roles
    db.run(
      `UPDATE user_roles SET department_id = ? WHERE user_id = ? AND department_id IS NULL LIMIT 1`,
      [departmentId, userId],
      function(err) {
        if (err) {
          return reject(err);
        }

        // Log assignment
        logAuditEvent(assignedBy, 'assign_department', 'user_roles', null, { userId, departmentId }).catch(console.error);

        resolve({ success: true, userId, departmentId });
      }
    );
  });
};

/**
 * Assign user to team
 */
const assignTeam = async (userId, teamId, roleInTeam = 'member', assignedBy = null) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_teams (user_id, team_id, role_in_team) VALUES (?, ?, ?)`,
      [userId, teamId, roleInTeam],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return reject(new Error('User already in team'));
          }
          return reject(err);
        }

        // Update team member count
        db.run(
          `UPDATE teams SET member_count = member_count + 1 WHERE id = ?`,
          [teamId]
        );

        // Log assignment
        logAuditEvent(assignedBy, 'assign_team', 'user_teams', this.lastID, { userId, teamId, roleInTeam }).catch(console.error);

        resolve({
          id: this.lastID,
          userId,
          teamId,
          roleInTeam
        });
      }
    );
  });
};

/**
 * Remove user from team
 */
const removeFromTeam = async (userId, teamId, removedBy = null) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM user_teams WHERE user_id = ? AND team_id = ?`,
      [userId, teamId],
      function(err) {
        if (err) {
          return reject(err);
        }

        if (this.changes === 0) {
          return reject(new Error('User not in team'));
        }

        // Update team member count
        db.run(
          `UPDATE teams SET member_count = member_count - 1 WHERE id = ?`,
          [teamId]
        );

        // Log removal
        logAuditEvent(removedBy, 'remove_from_team', 'user_teams', null, { userId, teamId }).catch(console.error);

        resolve({ success: true, message: 'User removed from team' });
      }
    );
  });
};

/**
 * Get user profile with roles and teams
 */
const getUserProfile = async (userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, name, email, role, approved, created_at FROM users WHERE id = ?`,
      [userId],
      async (err, user) => {
        if (err || !user) {
          return reject(new Error('User not found'));
        }

        try {
          // Get roles
          const roles = await getUserRoles(userId);

          // Get teams
          const teams = await new Promise((res, rej) => {
            db.all(
              `SELECT t.id, t.name, t.description, ut.role_in_team, ut.joined_at
               FROM user_teams ut
               JOIN teams t ON ut.team_id = t.id
               WHERE ut.user_id = ?`,
              [userId],
              (err, rows) => {
                if (err) return rej(err);
                res(rows);
              }
            );
          });

          // Get login methods
          const loginMethods = await new Promise((res, rej) => {
            db.all(
              `SELECT id, method_type, identifier, status, last_used
               FROM login_methods WHERE user_id = ?`,
              [userId],
              (err, rows) => {
                if (err) return rej(err);
                res(rows);
              }
            );
          });

          resolve({
            ...user,
            roles,
            teams,
            loginMethods
          });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

/**
 * Get team members
 */
const getTeamMembers = async (teamId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT u.id, u.name, u.email, u.role, ut.role_in_team, ut.joined_at
       FROM user_teams ut
       JOIN users u ON ut.user_id = u.id
       WHERE ut.team_id = ?
       ORDER BY ut.joined_at DESC`,
      [teamId],
      (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      }
    );
  });
};

/**
 * Get user activity from audit logs
 */
const getUserActivity = async (userId, limit = 50) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT action, resource, resource_id, details, ip_address, timestamp, status
       FROM audit_logs
       WHERE user_id = ?
       ORDER BY timestamp DESC
       LIMIT ?`,
      [userId, limit],
      (err, rows) => {
        if (err) {
          return reject(err);
        }

        // Parse JSON details
        const activities = rows.map(row => ({
          ...row,
          details: row.details ? JSON.parse(row.details) : {}
        }));

        resolve(activities);
      }
    );
  });
};

/**
 * Create a new team
 */
const createTeam = async (departmentId, name, description, leadId = null, createdBy = null) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO teams (department_id, name, description, lead_id) VALUES (?, ?, ?, ?)`,
      [departmentId, name, description, leadId],
      function(err) {
        if (err) {
          return reject(err);
        }

        // Log creation
        logAuditEvent(createdBy, 'create_team', 'teams', this.lastID, { name, departmentId }).catch(console.error);

        resolve({
          id: this.lastID,
          departmentId,
          name,
          description,
          leadId
        });
      }
    );
  });
};

/**
 * Get department members
 */
const getDepartmentMembers = async (departmentId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT DISTINCT u.id, u.name, u.email, u.role, ur.role_id, r.name as role_name
       FROM user_roles ur
       JOIN users u ON ur.user_id = u.id
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.department_id = ?
       ORDER BY u.name`,
      [departmentId],
      (err, rows) => {
        if (err) {
          return reject(err);
        }
        resolve(rows);
      }
    );
  });
};

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  addLoginMethod,
  removeLoginMethod,
  assignDepartment,
  assignTeam,
  removeFromTeam,
  getUserProfile,
  getTeamMembers,
  getUserActivity,
  createTeam,
  getDepartmentMembers
};
