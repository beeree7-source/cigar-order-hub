const db = require('../database');
const { TRACKING_PATTERNS, RATE_LIMITS } = require('../shipping-constants');

/**
 * Shipping Middleware
 * Provides middleware functions for shipping endpoints
 */

/**
 * Verify supplier has a connected carrier account
 */
const verifyCarrierAccount = (carrier) => {
  return (req, res, next) => {
    const { supplierId } = req.params;

    if (!supplierId) {
      return res.status(400).json({ error: 'Supplier ID is required' });
    }

    db.get(
      `SELECT * FROM supplier_shipping_accounts 
       WHERE supplier_id = ? AND carrier = ? AND status = 'active'`,
      [supplierId, carrier],
      (err, account) => {
        if (err) {
          console.error('Error verifying carrier account:', err);
          return res.status(500).json({ error: 'Failed to verify carrier account' });
        }

        if (!account) {
          return res.status(400).json({ 
            error: `${carrier} account not connected or inactive`,
            carrier,
            connected: false
          });
        }

        req.carrierAccount = account;
        next();
      }
    );
  };
};

/**
 * Verify supplier owns the shipment
 */
const verifyShipmentOwnership = (req, res, next) => {
  const { supplierId, trackingNumber } = req.params;

  if (!supplierId || !trackingNumber) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  db.get(
    `SELECT st.*, o.supplier_id 
     FROM shipment_tracking st
     JOIN orders o ON st.order_id = o.id
     WHERE st.tracking_number = ?`,
    [trackingNumber],
    (err, shipment) => {
      if (err) {
        console.error('Error verifying shipment ownership:', err);
        return res.status(500).json({ error: 'Failed to verify shipment ownership' });
      }

      if (!shipment) {
        return res.status(404).json({ error: 'Shipment not found' });
      }

      if (shipment.supplier_id !== parseInt(supplierId)) {
        return res.status(403).json({ error: 'Access denied to this shipment' });
      }

      req.shipment = shipment;
      next();
    }
  );
};

/**
 * Validate shipment data before label generation
 */
const validateShipmentData = (req, res, next) => {
  const { weight, serviceType, shipFrom, shipTo } = req.body;
  const errors = [];

  // Validate weight
  if (!weight || typeof weight !== 'number' || weight <= 0) {
    errors.push('Valid weight is required (must be positive number)');
  }

  // Validate service type
  if (!serviceType || typeof serviceType !== 'string') {
    errors.push('Service type is required');
  }

  // Validate ship from address
  if (!shipFrom || typeof shipFrom !== 'object') {
    errors.push('Ship from address is required');
  } else {
    if (!shipFrom.address || !shipFrom.city || !shipFrom.postalCode) {
      errors.push('Ship from address must include address, city, and postal code');
    }
  }

  // Validate ship to address
  if (!shipTo || typeof shipTo !== 'object') {
    errors.push('Ship to address is required');
  } else {
    if (!shipTo.address || !shipTo.city || !shipTo.postalCode) {
      errors.push('Ship to address must include address, city, and postal code');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ 
      error: 'Invalid shipment data',
      details: errors
    });
  }

  next();
};

/**
 * Validate carrier credentials
 */
const validateCarrierCredentials = (carrier) => {
  return (req, res, next) => {
    const errors = [];

    if (carrier === 'UPS') {
      const { accountNumber, userId, password, meterNumber, apiKey } = req.body;
      
      if (!accountNumber) errors.push('Account number is required');
      if (!userId) errors.push('User ID is required');
      if (!password) errors.push('Password is required');
      if (!meterNumber) errors.push('Meter number is required');
      if (!apiKey) errors.push('API key is required');
    } else if (carrier === 'USPS') {
      const { accountNumber, userId, apiKey } = req.body;
      
      if (!accountNumber) errors.push('Account number is required');
      if (!userId) errors.push('User ID is required');
      if (!apiKey) errors.push('API key is required');
    } else {
      errors.push('Invalid carrier');
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid credentials',
        details: errors
      });
    }

    next();
  };
};

/**
 * Rate limiter for label generation
 * Prevents abuse by limiting label generation per supplier
 */
const rateLimitLabels = (req, res, next) => {
  const { supplierId } = req.params;
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  db.get(
    `SELECT COUNT(*) as count 
     FROM shipment_tracking st
     JOIN orders o ON st.order_id = o.id
     WHERE o.supplier_id = ? AND st.created_at > ?`,
    [supplierId, hourAgo],
    (err, result) => {
      if (err) {
        console.error('Error checking rate limit:', err);
        return next(); // Allow request on error
      }

      const limit = RATE_LIMITS.LABEL_GENERATION;
      if (result && result.count >= limit) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded',
          message: `Maximum ${limit} labels per hour`,
          retryAfter: 3600
        });
      }

      next();
    }
  );
};

/**
 * Validate tracking number format
 */
const validateTrackingNumber = (req, res, next) => {
  const { trackingNumber } = req.params;

  if (!trackingNumber) {
    return res.status(400).json({ error: 'Tracking number is required' });
  }

  // Use patterns from constants
  const isValid = TRACKING_PATTERNS.UPS.test(trackingNumber) || 
                  TRACKING_PATTERNS.USPS.test(trackingNumber);

  if (!isValid) {
    return res.status(400).json({ 
      error: 'Invalid tracking number format',
      message: 'Tracking number must be valid UPS or USPS format'
    });
  }

  next();
};

/**
 * Check if shipment can be cancelled
 */
const canCancelShipment = (req, res, next) => {
  if (!req.shipment) {
    return res.status(400).json({ error: 'Shipment information not available' });
  }

  const cancelableStatuses = ['label_generated', 'picked_up'];
  
  if (!cancelableStatuses.includes(req.shipment.status)) {
    return res.status(400).json({ 
      error: 'Cannot cancel shipment',
      message: `Shipment with status '${req.shipment.status}' cannot be cancelled`,
      currentStatus: req.shipment.status
    });
  }

  next();
};

/**
 * Log shipping operations for audit trail
 */
const logShippingOperation = (operation) => {
  return (req, res, next) => {
    const userId = req.user?.id;
    const { supplierId, trackingNumber } = req.params;

    // Log asynchronously, don't block request
    setImmediate(() => {
      const logData = {
        operation,
        userId,
        supplierId,
        trackingNumber,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };

      console.log('[SHIPPING AUDIT]', JSON.stringify(logData));

      // In production, save to audit log table
      // db.run(`INSERT INTO shipping_audit_log ...`, [...]);
    });

    next();
  };
};

module.exports = {
  verifyCarrierAccount,
  verifyShipmentOwnership,
  validateShipmentData,
  validateCarrierCredentials,
  rateLimitLabels,
  validateTrackingNumber,
  canCancelShipment,
  logShippingOperation
};
