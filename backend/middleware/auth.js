/**
 * Authentication Middleware
 * Validates JWT tokens, sessions, and API keys
 */

const { authenticateToken, loginWithAPIKey } = require('../auth-advanced');
const { logAuditEvent } = require('../rbac');

/**
 * Middleware: Verify JWT token
 */
const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = await authenticateToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware: Verify API key
 */
const verifyAPIKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const result = await loginWithAPIKey(apiKey);
    req.user = result.user;
    req.apiKeyPermissions = result.permissions;
    req.rateLimit = result.rateLimit;
    
    next();
  } catch (error) {
    return res.status(403).json({ error: error.message });
  }
};

/**
 * Middleware: Verify either JWT or API key
 */
const verifyAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'];

  if (apiKey) {
    return verifyAPIKey(req, res, next);
  } else if (authHeader) {
    return verifyJWT(req, res, next);
  } else {
    return res.status(401).json({ error: 'Authentication required' });
  }
};

/**
 * Middleware: Session validation
 */
const verifySession = (req, res, next) => {
  const db = require('../database');
  const sessionToken = req.headers['x-session-token'];

  if (!sessionToken) {
    return res.status(401).json({ error: 'Session token required' });
  }

  db.get(
    `SELECT s.*, u.id as user_id, u.email, u.role
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > datetime('now')`,
    [sessionToken],
    (err, session) => {
      if (err || !session) {
        return res.status(403).json({ error: 'Invalid or expired session' });
      }

      // Update last activity
      db.run(
        `UPDATE sessions SET last_activity = datetime('now') WHERE id = ?`,
        [session.id]
      );

      req.user = {
        id: session.user_id,
        email: session.email,
        role: session.role
      };
      req.sessionId = session.id;

      next();
    }
  );
};

/**
 * Middleware: Log request (for audit trail)
 */
const logRequest = (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  const action = `${req.method} ${req.path}`;
  const details = {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress
  };

  // Log in background, don't wait
  if (userId) {
    logAuditEvent(userId, action, 'api', null, details).catch(console.error);
  }

  next();
};

module.exports = {
  verifyJWT,
  verifyAPIKey,
  verifyAuth,
  verifySession,
  logRequest
};
