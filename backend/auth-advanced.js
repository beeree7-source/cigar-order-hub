/**
 * Advanced Authentication Service
 * Supports multiple login methods, MFA, sessions, and API keys
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('./database');
const { logAuditEvent } = require('./rbac');

const JWT_SECRET = process.env.JWT_SECRET || 'cigar-hub-secret-2026-change-in-production';
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const SESSION_TIMEOUT = process.env.SESSION_TIMEOUT || 30 * 60 * 1000; // 30 minutes

/**
 * Register a new user with company
 */
const registerUser = async (name, email, password, role = 'Sales', companyId = 1) => {
  return new Promise((resolve, reject) => {
    // Hash password with bcrypt (cost factor 12)
    const hashedPassword = bcrypt.hashSync(password, 12);

    // Start transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // Create user
      db.run(
        `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)`,
        [name, email, hashedPassword, role],
        function(err) {
          if (err) {
            db.run('ROLLBACK');
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
                db.run('ROLLBACK');
                return reject(err);
              }

              // Assign default role based on user role
              const roleIdMap = {
                'retailer': 3, // Sales
                'supplier': 7, // Supplier
                'admin': 1
              };
              const roleId = roleIdMap[role.toLowerCase()] || 3;

              db.run(
                `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
                [userId, roleId],
                (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }

                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return reject(err);
                    }

                    // Log registration
                    logAuditEvent(userId, 'register', 'users', userId, { email }).catch(console.error);

                    resolve({
                      id: userId,
                      name,
                      email,
                      role
                    });
                  });
                }
              );
            }
          );
        }
      );
    });
  });
};

/**
 * Login with email and password
 */
const loginWithEmail = async (email, password, ipAddress = null, userAgent = null) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        logAuditEvent(null, 'login_failed', 'sessions', null, { email, reason: 'error' }).catch(console.error);
        return reject(err);
      }

      if (!user || !bcrypt.compareSync(password, user.password)) {
        logAuditEvent(null, 'login_failed', 'sessions', null, { email, reason: 'invalid_credentials' }).catch(console.error);
        return reject(new Error('Invalid credentials'));
      }

      try {
        // Create session
        const session = await createSession(user.id, ipAddress, userAgent);

        // Generate tokens
        const accessToken = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRY, algorithm: JWT_ALGORITHM }
        );

        const refreshToken = jwt.sign(
          { id: user.id, sessionId: session.id },
          JWT_SECRET,
          { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: JWT_ALGORITHM }
        );

        // Update login method last_used
        db.run(
          `UPDATE login_methods SET last_used = datetime('now') WHERE user_id = ? AND method_type = 'email'`,
          [user.id]
        );

        // Log successful login
        logAuditEvent(user.id, 'login', 'sessions', session.id, { method: 'email', ipAddress }).catch(console.error);

        resolve({
          accessToken,
          refreshToken,
          sessionId: session.id,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Login with SSO (OAuth2 framework)
 */
const loginWithSSO = async (provider, code, ipAddress = null, userAgent = null) => {
  // This is a framework for SSO integration
  // In production, implement OAuth2 flow with providers like Google, Microsoft, Okta
  
  return new Promise((resolve, reject) => {
    // Mock implementation - verify code with provider
    // const userInfo = await verifyOAuthCode(provider, code);
    
    // For now, return error indicating SSO needs configuration
    reject(new Error('SSO not configured. Please set up OAuth2 provider credentials.'));
  });
};

/**
 * Login with API Key
 */
const loginWithAPIKey = async (apiKey) => {
  return new Promise((resolve, reject) => {
    // Hash the provided key
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    db.get(
      `SELECT ak.*, u.id as user_id, u.name, u.email, u.role
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = ? AND ak.is_active = 1
         AND (ak.expires_at IS NULL OR ak.expires_at > datetime('now'))`,
      [keyHash],
      (err, row) => {
        if (err) {
          return reject(err);
        }

        if (!row) {
          logAuditEvent(null, 'api_key_login_failed', 'api_keys', null, { reason: 'invalid_key' }).catch(console.error);
          return reject(new Error('Invalid or expired API key'));
        }

        // Update last_used
        db.run(`UPDATE api_keys SET last_used = datetime('now') WHERE id = ?`, [row.id]);

        // Log successful API key login
        logAuditEvent(row.user_id, 'api_key_login', 'api_keys', row.id).catch(console.error);

        // Parse permissions
        let permissions = {};
        try {
          permissions = row.permissions ? JSON.parse(row.permissions) : {};
        } catch (e) {
          console.error('Invalid permissions JSON:', e);
        }

        resolve({
          user: {
            id: row.user_id,
            name: row.name,
            email: row.email,
            role: row.role
          },
          apiKeyId: row.id,
          permissions,
          rateLimit: row.rate_limit
        });
      }
    );
  });
};

/**
 * Authenticate JWT token
 */
const authenticateToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }, (err, decoded) => {
      if (err) {
        return reject(new Error('Invalid or expired token'));
      }
      resolve(decoded);
    });
  });
};

/**
 * Refresh expired token
 */
const refreshToken = async (refreshTokenStr) => {
  return new Promise((resolve, reject) => {
    jwt.verify(refreshTokenStr, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }, (err, decoded) => {
      if (err) {
        return reject(new Error('Invalid refresh token'));
      }

      // Verify session still exists and is valid
      db.get(
        `SELECT s.*, u.email, u.role
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.id = ? AND s.expires_at > datetime('now')`,
        [decoded.sessionId],
        (err, session) => {
          if (err || !session) {
            return reject(new Error('Session expired or invalid'));
          }

          // Generate new access token
          const accessToken = jwt.sign(
            { id: decoded.id, email: session.email, role: session.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY, algorithm: JWT_ALGORITHM }
          );

          // Update session activity
          db.run(
            `UPDATE sessions SET last_activity = datetime('now') WHERE id = ?`,
            [decoded.sessionId]
          );

          resolve({
            accessToken,
            user: {
              id: decoded.id,
              email: session.email,
              role: session.role
            }
          });
        }
      );
    });
  });
};

/**
 * Setup MFA for a user (TOTP)
 */
const setupMFA = async (userId, method = 'totp') => {
  // This is a framework for MFA
  // In production, use speakeasy library to generate secret
  // const secret = speakeasy.generateSecret({ name: 'Cigar Order Hub' });
  // const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  return new Promise((resolve, reject) => {
    // Mock secret for now
    const mockSecret = crypto.randomBytes(32).toString('base64');

    db.run(
      `INSERT OR REPLACE INTO mfa_settings (user_id, enabled, method, secret)
       VALUES (?, 0, ?, ?)`,
      [userId, method, mockSecret],
      function(err) {
        if (err) {
          return reject(err);
        }

        logAuditEvent(userId, 'mfa_setup_initiated', 'mfa_settings', this.lastID).catch(console.error);

        resolve({
          secret: mockSecret,
          qrCode: 'MFA_QR_CODE_PLACEHOLDER', // In production, generate actual QR code
          backupCodes: generateBackupCodes()
        });
      }
    );
  });
};

/**
 * Verify MFA code
 */
const verifyMFA = async (userId, code) => {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM mfa_settings WHERE user_id = ? AND enabled = 1`,
      [userId],
      (err, mfa) => {
        if (err || !mfa) {
          return reject(new Error('MFA not enabled for this user'));
        }

        // In production, verify TOTP code using speakeasy
        // const verified = speakeasy.totp.verify({
        //   secret: mfa.secret,
        //   encoding: 'base32',
        //   token: code
        // });

        // Mock verification for now
        const verified = code === '123456'; // Mock code

        if (verified) {
          db.run(
            `UPDATE mfa_settings SET last_verified = datetime('now') WHERE user_id = ?`,
            [userId]
          );

          logAuditEvent(userId, 'mfa_verified', 'mfa_settings', mfa.id).catch(console.error);

          resolve({ verified: true });
        } else {
          logAuditEvent(userId, 'mfa_verification_failed', 'mfa_settings', mfa.id, { status: 'failed' }).catch(console.error);
          reject(new Error('Invalid MFA code'));
        }
      }
    );
  });
};

/**
 * Create a session
 */
const createSession = (userId, ipAddress = null, userAgent = null) => {
  return new Promise((resolve, reject) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT).toISOString();

    db.run(
      `INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, token, ipAddress, userAgent, expiresAt],
      function(err) {
        if (err) {
          return reject(err);
        }

        resolve({
          id: this.lastID,
          token,
          userId,
          expiresAt
        });
      }
    );
  });
};

/**
 * Logout user - destroy session
 */
const logoutUser = async (sessionId, userId) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM sessions WHERE id = ? AND user_id = ?`,
      [sessionId, userId],
      function(err) {
        if (err) {
          return reject(err);
        }

        logAuditEvent(userId, 'logout', 'sessions', sessionId).catch(console.error);

        resolve({ success: true, message: 'Logged out successfully' });
      }
    );
  });
};

/**
 * Generate backup codes for MFA
 */
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
};

/**
 * Create API Key for user
 */
const createAPIKey = async (userId, name, permissions = {}, rateLimit = 1000, expiresInDays = null) => {
  return new Promise((resolve, reject) => {
    // Generate random API key
    const apiKey = `ck_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const permissionsJson = JSON.stringify(permissions);

    db.run(
      `INSERT INTO api_keys (user_id, key_hash, name, permissions, rate_limit, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, keyHash, name, permissionsJson, rateLimit, expiresAt],
      function(err) {
        if (err) {
          return reject(err);
        }

        logAuditEvent(userId, 'api_key_created', 'api_keys', this.lastID, { name }).catch(console.error);

        resolve({
          id: this.lastID,
          apiKey, // Only returned once!
          name,
          permissions,
          rateLimit,
          expiresAt
        });
      }
    );
  });
};

/**
 * Revoke API Key
 */
const revokeAPIKey = async (keyId, userId) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?`,
      [keyId, userId],
      function(err) {
        if (err) {
          return reject(err);
        }

        if (this.changes === 0) {
          return reject(new Error('API key not found'));
        }

        logAuditEvent(userId, 'api_key_revoked', 'api_keys', keyId).catch(console.error);

        resolve({ success: true, message: 'API key revoked' });
      }
    );
  });
};

module.exports = {
  registerUser,
  loginWithEmail,
  loginWithSSO,
  loginWithAPIKey,
  authenticateToken,
  refreshToken,
  setupMFA,
  verifyMFA,
  createSession,
  logoutUser,
  createAPIKey,
  revokeAPIKey
};
