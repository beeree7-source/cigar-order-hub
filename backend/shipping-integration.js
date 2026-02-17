const db = require('./database');
const crypto = require('crypto');
const { DELIVERY_DAYS, SERVICE_COST_MULTIPLIERS } = require('./shipping-constants');

/**
 * Shipping Integration Service
 * Comprehensive service for UPS and USPS shipping integration
 * Handles account management, label generation, tracking, and analytics
 * 
 * NOTE: This is a mock implementation for development.
 * In production, integrate with actual UPS and USPS APIs.
 */

// Encryption configuration
const ENCRYPTION_ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate encryption key is set
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable must be set for shipping integration');
}

/**
 * Encrypt sensitive data (passwords, API keys)
 */
const encrypt = (text) => {
  try {
    // Use a cryptographic salt derived from the key
    const salt = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data
 */
const decrypt = (text) => {
  try {
    // Use the same salt derivation as encrypt
    const salt = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

// ============================================
// UPS Account Management
// ============================================

/**
 * Link UPS account for a supplier
 */
const linkUPSAccount = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { accountNumber, userId, password, meterNumber, apiKey } = req.body;

    if (!accountNumber || !userId || !password || !meterNumber || !apiKey) {
      return res.status(400).json({ error: 'Missing required UPS credentials' });
    }

    // Encrypt sensitive data
    const encryptedPassword = encrypt(password);
    const encryptedApiKey = encrypt(apiKey);

    // Mock verification (in production, verify with UPS API)
    const verified = await verifyUPSCredentials({ accountNumber, userId, password, meterNumber, apiKey });

    if (!verified.success) {
      return res.status(400).json({ error: 'Invalid UPS credentials', details: verified.error });
    }

    db.run(
      `INSERT OR REPLACE INTO supplier_shipping_accounts 
       (supplier_id, carrier, account_number, password, meter_number, api_key, status, last_verified)
       VALUES (?, 'UPS', ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
      [supplierId, accountNumber, encryptedPassword, meterNumber, encryptedApiKey],
      function(err) {
        if (err) {
          console.error('Error linking UPS account:', err);
          return res.status(500).json({ error: 'Failed to link UPS account' });
        }

        res.json({
          success: true,
          message: 'UPS account linked successfully',
          accountId: this.lastID,
          carrier: 'UPS',
          accountNumber,
          status: 'active'
        });
      }
    );
  } catch (error) {
    console.error('Error linking UPS account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Unlink UPS account
 */
const unlinkUPSAccount = async (req, res) => {
  try {
    const { supplierId } = req.params;

    db.run(
      `DELETE FROM supplier_shipping_accounts WHERE supplier_id = ? AND carrier = 'UPS'`,
      [supplierId],
      function(err) {
        if (err) {
          console.error('Error unlinking UPS account:', err);
          return res.status(500).json({ error: 'Failed to unlink UPS account' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'UPS account not found' });
        }

        res.json({
          success: true,
          message: 'UPS account unlinked successfully'
        });
      }
    );
  } catch (error) {
    console.error('Error unlinking UPS account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get UPS account status
 */
const getUPSStatus = async (req, res) => {
  try {
    const { supplierId } = req.params;

    db.get(
      `SELECT id, account_number, status, last_verified, connected_at, updated_at 
       FROM supplier_shipping_accounts 
       WHERE supplier_id = ? AND carrier = 'UPS'`,
      [supplierId],
      (err, row) => {
        if (err) {
          console.error('Error getting UPS status:', err);
          return res.status(500).json({ error: 'Failed to get UPS status' });
        }

        if (!row) {
          return res.status(404).json({ 
            connected: false,
            message: 'UPS account not connected'
          });
        }

        res.json({
          connected: true,
          carrier: 'UPS',
          accountNumber: row.account_number,
          status: row.status,
          lastVerified: row.last_verified,
          connectedAt: row.connected_at,
          updatedAt: row.updated_at
        });
      }
    );
  } catch (error) {
    console.error('Error getting UPS status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify UPS credentials
 */
const verifyUPSCredentials = async (credentials) => {
  // Mock verification
  // In production, make actual API call to UPS to verify credentials
  return new Promise((resolve) => {
    setTimeout(() => {
      const { accountNumber, userId, password, meterNumber, apiKey } = credentials;
      
      // Simple validation
      if (accountNumber && userId && password && meterNumber && apiKey) {
        resolve({ success: true, message: 'UPS credentials verified' });
      } else {
        resolve({ success: false, error: 'Invalid credentials format' });
      }
    }, 500);
  });
};

/**
 * Verify UPS credentials endpoint
 */
const verifyUPSCredentialsEndpoint = async (req, res) => {
  try {
    const { accountNumber, userId, password, meterNumber, apiKey } = req.body;

    if (!accountNumber || !userId || !password || !meterNumber || !apiKey) {
      return res.status(400).json({ error: 'Missing required credentials' });
    }

    const result = await verifyUPSCredentials({ accountNumber, userId, password, meterNumber, apiKey });
    
    if (result.success) {
      res.json({ verified: true, message: result.message });
    } else {
      res.status(400).json({ verified: false, error: result.error });
    }
  } catch (error) {
    console.error('Error verifying UPS credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refresh UPS connection
 */
const refreshUPSConnection = async (req, res) => {
  try {
    const { supplierId } = req.params;

    // Get current account
    db.get(
      `SELECT * FROM supplier_shipping_accounts WHERE supplier_id = ? AND carrier = 'UPS'`,
      [supplierId],
      async (err, row) => {
        if (err || !row) {
          return res.status(404).json({ error: 'UPS account not found' });
        }

        // Mock refresh (in production, refresh token/verify credentials)
        db.run(
          `UPDATE supplier_shipping_accounts 
           SET status = 'active', last_verified = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE supplier_id = ? AND carrier = 'UPS'`,
          [supplierId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to refresh UPS connection' });
            }

            res.json({
              success: true,
              message: 'UPS connection refreshed successfully',
              status: 'active',
              lastVerified: new Date().toISOString()
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error refreshing UPS connection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// USPS Account Management
// ============================================

/**
 * Link USPS account for a supplier
 */
const linkUSPSAccount = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { accountNumber, userId, apiKey } = req.body;

    if (!accountNumber || !userId || !apiKey) {
      return res.status(400).json({ error: 'Missing required USPS credentials' });
    }

    // Encrypt sensitive data
    const encryptedApiKey = encrypt(apiKey);

    // Mock verification
    const verified = await verifyUSPSCredentials({ accountNumber, userId, apiKey });

    if (!verified.success) {
      return res.status(400).json({ error: 'Invalid USPS credentials', details: verified.error });
    }

    db.run(
      `INSERT OR REPLACE INTO supplier_shipping_accounts 
       (supplier_id, carrier, account_number, api_key, status, last_verified)
       VALUES (?, 'USPS', ?, ?, 'active', CURRENT_TIMESTAMP)`,
      [supplierId, accountNumber, encryptedApiKey],
      function(err) {
        if (err) {
          console.error('Error linking USPS account:', err);
          return res.status(500).json({ error: 'Failed to link USPS account' });
        }

        res.json({
          success: true,
          message: 'USPS account linked successfully',
          accountId: this.lastID,
          carrier: 'USPS',
          accountNumber,
          status: 'active'
        });
      }
    );
  } catch (error) {
    console.error('Error linking USPS account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Unlink USPS account
 */
const unlinkUSPSAccount = async (req, res) => {
  try {
    const { supplierId } = req.params;

    db.run(
      `DELETE FROM supplier_shipping_accounts WHERE supplier_id = ? AND carrier = 'USPS'`,
      [supplierId],
      function(err) {
        if (err) {
          console.error('Error unlinking USPS account:', err);
          return res.status(500).json({ error: 'Failed to unlink USPS account' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'USPS account not found' });
        }

        res.json({
          success: true,
          message: 'USPS account unlinked successfully'
        });
      }
    );
  } catch (error) {
    console.error('Error unlinking USPS account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get USPS account status
 */
const getUSPSStatus = async (req, res) => {
  try {
    const { supplierId } = req.params;

    db.get(
      `SELECT id, account_number, status, last_verified, connected_at, updated_at 
       FROM supplier_shipping_accounts 
       WHERE supplier_id = ? AND carrier = 'USPS'`,
      [supplierId],
      (err, row) => {
        if (err) {
          console.error('Error getting USPS status:', err);
          return res.status(500).json({ error: 'Failed to get USPS status' });
        }

        if (!row) {
          return res.status(404).json({ 
            connected: false,
            message: 'USPS account not connected'
          });
        }

        res.json({
          connected: true,
          carrier: 'USPS',
          accountNumber: row.account_number,
          status: row.status,
          lastVerified: row.last_verified,
          connectedAt: row.connected_at,
          updatedAt: row.updated_at
        });
      }
    );
  } catch (error) {
    console.error('Error getting USPS status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify USPS credentials
 */
const verifyUSPSCredentials = async (credentials) => {
  // Mock verification
  return new Promise((resolve) => {
    setTimeout(() => {
      const { accountNumber, userId, apiKey } = credentials;
      
      if (accountNumber && userId && apiKey) {
        resolve({ success: true, message: 'USPS credentials verified' });
      } else {
        resolve({ success: false, error: 'Invalid credentials format' });
      }
    }, 500);
  });
};

/**
 * Verify USPS credentials endpoint
 */
const verifyUSPSCredentialsEndpoint = async (req, res) => {
  try {
    const { accountNumber, userId, apiKey } = req.body;

    if (!accountNumber || !userId || !apiKey) {
      return res.status(400).json({ error: 'Missing required credentials' });
    }

    const result = await verifyUSPSCredentials({ accountNumber, userId, apiKey });
    
    if (result.success) {
      res.json({ verified: true, message: result.message });
    } else {
      res.status(400).json({ verified: false, error: result.error });
    }
  } catch (error) {
    console.error('Error verifying USPS credentials:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Refresh USPS connection
 */
const refreshUSPSConnection = async (req, res) => {
  try {
    const { supplierId } = req.params;

    db.get(
      `SELECT * FROM supplier_shipping_accounts WHERE supplier_id = ? AND carrier = 'USPS'`,
      [supplierId],
      async (err, row) => {
        if (err || !row) {
          return res.status(404).json({ error: 'USPS account not found' });
        }

        db.run(
          `UPDATE supplier_shipping_accounts 
           SET status = 'active', last_verified = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE supplier_id = ? AND carrier = 'USPS'`,
          [supplierId],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to refresh USPS connection' });
            }

            res.json({
              success: true,
              message: 'USPS connection refreshed successfully',
              status: 'active',
              lastVerified: new Date().toISOString()
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error refreshing USPS connection:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// Label Generation
// ============================================

/**
 * Validate shipment data
 */
const validateShipmentData = (data) => {
  const errors = [];

  // Validate addresses
  if (!data.shipFrom || !data.shipFrom.address || !data.shipFrom.city || !data.shipFrom.postalCode) {
    errors.push('Invalid ship from address');
  }
  
  if (!data.shipTo || !data.shipTo.address || !data.shipTo.city || !data.shipTo.postalCode) {
    errors.push('Invalid ship to address');
  }

  // Validate weight
  if (!data.weight || data.weight <= 0) {
    errors.push('Invalid weight');
  }

  // Validate service type
  if (!data.serviceType) {
    errors.push('Service type is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Generate UPS shipping label
 */
const generateUPSLabel = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const shipmentData = req.body;

    // Validate shipment data
    const validation = validateShipmentData(shipmentData);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid shipment data', details: validation.errors });
    }

    // Check if UPS account is connected
    db.get(
      `SELECT * FROM supplier_shipping_accounts WHERE supplier_id = ? AND carrier = 'UPS' AND status = 'active'`,
      [supplierId],
      async (err, account) => {
        if (err || !account) {
          return res.status(400).json({ error: 'UPS account not connected or inactive' });
        }

        // Mock label generation
        const trackingNumber = `1Z${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
        const labelUrl = `https://mock-ups-api.com/labels/${trackingNumber}.pdf`;
        const labelId = `UPS-${Date.now()}`;

        // Save to database
        db.run(
          `INSERT INTO shipment_tracking 
           (order_id, carrier, tracking_number, label_url, label_id, status, weight, service_type, last_tracked)
           VALUES (?, 'UPS', ?, ?, ?, 'label_generated', ?, ?, CURRENT_TIMESTAMP)`,
          [shipmentData.orderId, trackingNumber, labelUrl, labelId, shipmentData.weight, shipmentData.serviceType],
          function(err) {
            if (err) {
              console.error('Error saving UPS label:', err);
              return res.status(500).json({ error: 'Failed to generate UPS label' });
            }

            // Create initial event
            db.run(
              `INSERT INTO shipment_events (tracking_id, event_type, location, timestamp, details)
               VALUES (?, 'label_generated', ?, CURRENT_TIMESTAMP, ?)`,
              [this.lastID, shipmentData.shipFrom.city, JSON.stringify({ serviceType: shipmentData.serviceType })]
            );

            res.json({
              success: true,
              message: 'UPS label generated successfully',
              trackingNumber,
              labelUrl,
              labelId,
              carrier: 'UPS',
              serviceType: shipmentData.serviceType,
              estimatedDelivery: calculateEstimatedDelivery(shipmentData.serviceType)
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error generating UPS label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate USPS shipping label
 */
const generateUSPSLabel = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const shipmentData = req.body;

    // Validate shipment data
    const validation = validateShipmentData(shipmentData);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Invalid shipment data', details: validation.errors });
    }

    // Check if USPS account is connected
    db.get(
      `SELECT * FROM supplier_shipping_accounts WHERE supplier_id = ? AND carrier = 'USPS' AND status = 'active'`,
      [supplierId],
      async (err, account) => {
        if (err || !account) {
          return res.status(400).json({ error: 'USPS account not connected or inactive' });
        }

        // Mock label generation - use string concatenation to avoid precision issues
        const randomPart1 = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        const randomPart2 = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        const randomPart3 = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
        const trackingNumber = `9${randomPart1}${randomPart2}${randomPart3}`;
        const labelUrl = `https://mock-usps-api.com/labels/${trackingNumber}.pdf`;
        const labelId = `USPS-${Date.now()}`;

        // Save to database
        db.run(
          `INSERT INTO shipment_tracking 
           (order_id, carrier, tracking_number, label_url, label_id, status, weight, service_type, last_tracked)
           VALUES (?, 'USPS', ?, ?, ?, 'label_generated', ?, ?, CURRENT_TIMESTAMP)`,
          [shipmentData.orderId, trackingNumber, labelUrl, labelId, shipmentData.weight, shipmentData.serviceType],
          function(err) {
            if (err) {
              console.error('Error saving USPS label:', err);
              return res.status(500).json({ error: 'Failed to generate USPS label' });
            }

            // Create initial event
            db.run(
              `INSERT INTO shipment_events (tracking_id, event_type, location, timestamp, details)
               VALUES (?, 'label_generated', ?, CURRENT_TIMESTAMP, ?)`,
              [this.lastID, shipmentData.shipFrom.city, JSON.stringify({ serviceType: shipmentData.serviceType })]
            );

            res.json({
              success: true,
              message: 'USPS label generated successfully',
              trackingNumber,
              labelUrl,
              labelId,
              carrier: 'USPS',
              serviceType: shipmentData.serviceType,
              estimatedDelivery: calculateEstimatedDelivery(shipmentData.serviceType)
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error generating USPS label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Calculate estimated delivery date
 */
const calculateEstimatedDelivery = (serviceType) => {
  const now = new Date();
  const daysToAdd = DELIVERY_DAYS[serviceType.toLowerCase()] || 5;
  
  now.setDate(now.getDate() + daysToAdd);
  return now.toISOString();
};

/**
 * Get label by tracking number
 */
const getLabel = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    db.get(
      `SELECT * FROM shipment_tracking WHERE tracking_number = ?`,
      [trackingNumber],
      (err, row) => {
        if (err) {
          console.error('Error getting label:', err);
          return res.status(500).json({ error: 'Failed to retrieve label' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Label not found' });
        }

        res.json({
          trackingNumber: row.tracking_number,
          carrier: row.carrier,
          labelUrl: row.label_url,
          labelId: row.label_id,
          status: row.status,
          serviceType: row.service_type,
          createdAt: row.created_at
        });
      }
    );
  } catch (error) {
    console.error('Error getting label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reprint existing label
 */
const reprintLabel = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    db.get(
      `SELECT * FROM shipment_tracking WHERE tracking_number = ?`,
      [trackingNumber],
      (err, row) => {
        if (err || !row) {
          return res.status(404).json({ error: 'Label not found' });
        }

        res.json({
          success: true,
          message: 'Label ready for reprint',
          trackingNumber: row.tracking_number,
          labelUrl: row.label_url,
          carrier: row.carrier
        });
      }
    );
  } catch (error) {
    console.error('Error reprinting label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Download label
 */
const downloadLabel = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    db.get(
      `SELECT * FROM shipment_tracking WHERE tracking_number = ?`,
      [trackingNumber],
      (err, row) => {
        if (err || !row) {
          return res.status(404).json({ error: 'Label not found' });
        }

        // In production, this would download the actual PDF file
        res.json({
          success: true,
          downloadUrl: row.label_url,
          trackingNumber: row.tracking_number,
          carrier: row.carrier,
          format: 'PDF'
        });
      }
    );
  } catch (error) {
    console.error('Error downloading label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Batch generate labels
 */
const batchGenerateLabels = async (req, res) => {
  try {
    const { shipments } = req.body;

    if (!Array.isArray(shipments) || shipments.length === 0) {
      return res.status(400).json({ error: 'Invalid shipments data' });
    }

    const results = [];
    const errors = [];

    for (const shipment of shipments) {
      try {
        const validation = validateShipmentData(shipment);
        if (!validation.valid) {
          errors.push({
            orderId: shipment.orderId,
            errors: validation.errors
          });
          continue;
        }

        // Mock label generation
        let trackingNumber;
        if (shipment.carrier === 'UPS') {
          trackingNumber = `1Z${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
        } else {
          // USPS - use string concatenation to avoid precision issues
          const randomPart1 = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
          const randomPart2 = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
          const randomPart3 = Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
          trackingNumber = `9${randomPart1}${randomPart2}${randomPart3}`;
        }

        results.push({
          orderId: shipment.orderId,
          trackingNumber,
          carrier: shipment.carrier,
          success: true
        });
      } catch (error) {
        errors.push({
          orderId: shipment.orderId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${shipments.length} shipments`,
      results,
      errors,
      summary: {
        total: shipments.length,
        successful: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error('Error in batch label generation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// Real-Time Tracking
// ============================================

/**
 * Track UPS shipment
 */
const trackUPSShipment = async (trackingNumber) => {
  // Mock tracking data
  return {
    trackingNumber,
    carrier: 'UPS',
    status: 'in_transit',
    currentLocation: 'Memphis, TN',
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        type: 'in_transit',
        location: 'Memphis, TN',
        timestamp: new Date().toISOString(),
        details: 'Package in transit'
      },
      {
        type: 'picked_up',
        location: 'Louisville, KY',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        details: 'Package picked up'
      }
    ]
  };
};

/**
 * Track USPS shipment
 */
const trackUSPSShipment = async (trackingNumber) => {
  // Mock tracking data
  return {
    trackingNumber,
    carrier: 'USPS',
    status: 'in_transit',
    currentLocation: 'Chicago, IL',
    estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    events: [
      {
        type: 'in_transit',
        location: 'Chicago, IL',
        timestamp: new Date().toISOString(),
        details: 'In transit to destination'
      },
      {
        type: 'picked_up',
        location: 'New York, NY',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        details: 'Acceptance at post office'
      }
    ]
  };
};

/**
 * Track shipment endpoint
 */
const trackShipment = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    db.get(
      `SELECT * FROM shipment_tracking WHERE tracking_number = ?`,
      [trackingNumber],
      async (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve tracking information' });
        }

        if (!row) {
          return res.status(404).json({ error: 'Tracking number not found' });
        }

        // Get tracking data from carrier
        let trackingData;
        if (row.carrier === 'UPS') {
          trackingData = await trackUPSShipment(trackingNumber);
        } else if (row.carrier === 'USPS') {
          trackingData = await trackUSPSShipment(trackingNumber);
        }

        // Update database with latest info
        db.run(
          `UPDATE shipment_tracking 
           SET status = ?, current_location = ?, estimated_delivery = ?, last_tracked = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE tracking_number = ?`,
          [trackingData.status, trackingData.currentLocation, trackingData.estimatedDelivery, trackingNumber]
        );

        // Save events
        for (const event of trackingData.events) {
          db.run(
            `INSERT OR IGNORE INTO shipment_events (tracking_id, event_type, location, timestamp, details)
             VALUES (?, ?, ?, ?, ?)`,
            [row.id, event.type, event.location, event.timestamp, JSON.stringify(event)]
          );
        }

        res.json(trackingData);
      }
    );
  } catch (error) {
    console.error('Error tracking shipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get tracking history
 */
const getTrackingHistory = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    db.get(
      `SELECT * FROM shipment_tracking WHERE tracking_number = ?`,
      [trackingNumber],
      (err, shipment) => {
        if (err || !shipment) {
          return res.status(404).json({ error: 'Tracking number not found' });
        }

        db.all(
          `SELECT * FROM shipment_events WHERE tracking_id = ? ORDER BY timestamp DESC`,
          [shipment.id],
          (err, events) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to retrieve tracking history' });
            }

            res.json({
              trackingNumber: shipment.tracking_number,
              carrier: shipment.carrier,
              status: shipment.status,
              currentLocation: shipment.current_location,
              estimatedDelivery: shipment.estimated_delivery,
              actualDelivery: shipment.actual_delivery,
              events: events.map(e => ({
                type: e.event_type,
                location: e.location,
                timestamp: e.timestamp,
                details: e.details
              }))
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error getting tracking history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Subscribe to tracking updates
 */
const subscribeToUpdates = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { webhookUrl, email } = req.body;

    if (!webhookUrl && !email) {
      return res.status(400).json({ error: 'Webhook URL or email is required' });
    }

    // Mock subscription
    res.json({
      success: true,
      message: 'Subscribed to tracking updates',
      trackingNumber,
      webhookUrl: webhookUrl || null,
      email: email || null,
      subscriptionId: `SUB-${Date.now()}`
    });
  } catch (error) {
    console.error('Error subscribing to updates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Poll for tracking updates
 */
const pollForUpdates = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    db.get(
      `SELECT last_tracked FROM shipment_tracking WHERE tracking_number = ?`,
      [trackingNumber],
      (err, row) => {
        if (err || !row) {
          return res.status(404).json({ error: 'Tracking number not found' });
        }

        const lastTracked = new Date(row.last_tracked);
        const now = new Date();
        const hoursSinceLastUpdate = (now - lastTracked) / (1000 * 60 * 60);

        res.json({
          trackingNumber,
          lastTracked: row.last_tracked,
          hoursSinceLastUpdate: Math.round(hoursSinceLastUpdate * 100) / 100,
          updateAvailable: hoursSinceLastUpdate > 1,
          message: hoursSinceLastUpdate > 1 
            ? 'Updates may be available, please track shipment' 
            : 'No new updates since last check'
        });
      }
    );
  } catch (error) {
    console.error('Error polling for updates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get tracking summary for supplier
 */
const getTrackingSummary = async (req, res) => {
  try {
    const { supplierId } = req.params;

    db.all(
      `SELECT st.*, o.supplier_id 
       FROM shipment_tracking st
       JOIN orders o ON st.order_id = o.id
       WHERE o.supplier_id = ?
       ORDER BY st.created_at DESC
       LIMIT 50`,
      [supplierId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve tracking summary' });
        }

        const summary = {
          total: rows.length,
          byStatus: {},
          byCarrier: { UPS: 0, USPS: 0 },
          recent: rows.slice(0, 10)
        };

        rows.forEach(row => {
          summary.byStatus[row.status] = (summary.byStatus[row.status] || 0) + 1;
          summary.byCarrier[row.carrier] = (summary.byCarrier[row.carrier] || 0) + 1;
        });

        res.json(summary);
      }
    );
  } catch (error) {
    console.error('Error getting tracking summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get tracking events
 */
const getTrackingEvents = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    db.get(
      `SELECT id FROM shipment_tracking WHERE tracking_number = ?`,
      [trackingNumber],
      (err, shipment) => {
        if (err || !shipment) {
          return res.status(404).json({ error: 'Tracking number not found' });
        }

        db.all(
          `SELECT * FROM shipment_events WHERE tracking_id = ? ORDER BY timestamp DESC`,
          [shipment.id],
          (err, events) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to retrieve events' });
            }

            res.json({
              trackingNumber,
              events: events.map(e => ({
                id: e.id,
                type: e.event_type,
                location: e.location,
                timestamp: e.timestamp,
                details: e.details,
                createdAt: e.created_at
              }))
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error getting tracking events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Batch track shipments
 */
const batchTrackShipments = async (req, res) => {
  try {
    const { trackingNumbers } = req.body;

    if (!Array.isArray(trackingNumbers) || trackingNumbers.length === 0) {
      return res.status(400).json({ error: 'Invalid tracking numbers' });
    }

    const placeholders = trackingNumbers.map(() => '?').join(',');
    
    db.all(
      `SELECT * FROM shipment_tracking WHERE tracking_number IN (${placeholders})`,
      trackingNumbers,
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve tracking information' });
        }

        res.json({
          success: true,
          count: rows.length,
          shipments: rows.map(row => ({
            trackingNumber: row.tracking_number,
            carrier: row.carrier,
            status: row.status,
            currentLocation: row.current_location,
            estimatedDelivery: row.estimated_delivery
          }))
        });
      }
    );
  } catch (error) {
    console.error('Error in batch tracking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// Shipment Management
// ============================================

/**
 * Get supplier shipments
 */
const getSupplierShipments = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { status, carrier, startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT st.*, o.supplier_id 
      FROM shipment_tracking st
      JOIN orders o ON st.order_id = o.id
      WHERE o.supplier_id = ?
    `;
    const params = [supplierId];

    if (status) {
      query += ` AND st.status = ?`;
      params.push(status);
    }

    if (carrier) {
      query += ` AND st.carrier = ?`;
      params.push(carrier);
    }

    if (startDate) {
      query += ` AND st.created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND st.created_at <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY st.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error getting supplier shipments:', err);
        return res.status(500).json({ error: 'Failed to retrieve shipments' });
      }

      res.json({
        shipments: rows,
        count: rows.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    });
  } catch (error) {
    console.error('Error getting supplier shipments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get shipment details
 */
const getShipmentDetails = async (req, res) => {
  try {
    const { supplierId, trackingNumber } = req.params;

    db.get(
      `SELECT st.*, o.supplier_id 
       FROM shipment_tracking st
       JOIN orders o ON st.order_id = o.id
       WHERE st.tracking_number = ? AND o.supplier_id = ?`,
      [trackingNumber, supplierId],
      (err, shipment) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve shipment details' });
        }

        if (!shipment) {
          return res.status(404).json({ error: 'Shipment not found' });
        }

        // Get events
        db.all(
          `SELECT * FROM shipment_events WHERE tracking_id = ? ORDER BY timestamp DESC`,
          [shipment.id],
          (err, events) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to retrieve shipment events' });
            }

            res.json({
              ...shipment,
              events: events.map(e => ({
                type: e.event_type,
                location: e.location,
                timestamp: e.timestamp,
                details: e.details
              }))
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error getting shipment details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Cancel shipment
 */
const cancelShipment = async (req, res) => {
  try {
    const { supplierId, trackingNumber } = req.params;

    db.get(
      `SELECT st.*, o.supplier_id 
       FROM shipment_tracking st
       JOIN orders o ON st.order_id = o.id
       WHERE st.tracking_number = ? AND o.supplier_id = ?`,
      [trackingNumber, supplierId],
      (err, shipment) => {
        if (err || !shipment) {
          return res.status(404).json({ error: 'Shipment not found' });
        }

        if (shipment.status === 'delivered') {
          return res.status(400).json({ error: 'Cannot cancel delivered shipment' });
        }

        // Mock cancellation
        db.run(
          `UPDATE shipment_tracking SET status = 'exception', updated_at = CURRENT_TIMESTAMP WHERE tracking_number = ?`,
          [trackingNumber],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to cancel shipment' });
            }

            // Add cancellation event
            db.run(
              `INSERT INTO shipment_events (tracking_id, event_type, location, timestamp, details)
               VALUES (?, 'exception', 'Cancelled by shipper', CURRENT_TIMESTAMP, ?)`,
              [shipment.id, JSON.stringify({ reason: 'Cancelled by supplier' })]
            );

            res.json({
              success: true,
              message: 'Shipment cancelled successfully',
              trackingNumber
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error cancelling shipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Hold shipment
 */
const holdShipment = async (req, res) => {
  try {
    const { supplierId, trackingNumber } = req.params;
    const { reason } = req.body;

    db.get(
      `SELECT st.*, o.supplier_id 
       FROM shipment_tracking st
       JOIN orders o ON st.order_id = o.id
       WHERE st.tracking_number = ? AND o.supplier_id = ?`,
      [trackingNumber, supplierId],
      (err, shipment) => {
        if (err || !shipment) {
          return res.status(404).json({ error: 'Shipment not found' });
        }

        // Mock hold
        db.run(
          `INSERT INTO shipment_events (tracking_id, event_type, location, timestamp, details)
           VALUES (?, 'exception', 'On hold', CURRENT_TIMESTAMP, ?)`,
          [shipment.id, JSON.stringify({ reason: reason || 'Held by shipper', type: 'hold' })],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to hold shipment' });
            }

            res.json({
              success: true,
              message: 'Shipment placed on hold',
              trackingNumber,
              reason: reason || 'Held by shipper'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error holding shipment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Schedule pickup
 */
const schedulePickup = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { carrier, date, location, instructions, trackingNumbers } = req.body;

    if (!carrier || !date || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if account is connected
    db.get(
      `SELECT * FROM supplier_shipping_accounts WHERE supplier_id = ? AND carrier = ? AND status = 'active'`,
      [supplierId, carrier],
      (err, account) => {
        if (err || !account) {
          return res.status(400).json({ error: `${carrier} account not connected or inactive` });
        }

        // Mock pickup scheduling
        const pickupId = `PICKUP-${Date.now()}`;
        
        res.json({
          success: true,
          message: 'Pickup scheduled successfully',
          pickupId,
          carrier,
          date,
          location,
          instructions: instructions || null,
          trackingNumbers: trackingNumbers || [],
          confirmationNumber: `CONF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        });
      }
    );
  } catch (error) {
    console.error('Error scheduling pickup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ============================================
// Analytics & Reporting
// ============================================

/**
 * Get shipping metrics for supplier
 */
const getShippingMetrics = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [supplierId];

    if (startDate) {
      dateFilter += ' AND st.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ' AND st.created_at <= ?';
      params.push(endDate);
    }

    db.all(
      `SELECT st.*, o.supplier_id 
       FROM shipment_tracking st
       JOIN orders o ON st.order_id = o.id
       WHERE o.supplier_id = ?${dateFilter}`,
      params,
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve shipping metrics' });
        }

        const metrics = {
          totalShipments: rows.length,
          byCarrier: { UPS: 0, USPS: 0 },
          byStatus: {},
          averageWeight: 0,
          onTimeDeliveryRate: 0,
          estimatedCost: 0
        };

        let totalWeight = 0;
        let deliveredOnTime = 0;
        let totalDelivered = 0;

        rows.forEach(row => {
          metrics.byCarrier[row.carrier] = (metrics.byCarrier[row.carrier] || 0) + 1;
          metrics.byStatus[row.status] = (metrics.byStatus[row.status] || 0) + 1;
          
          if (row.weight) {
            totalWeight += row.weight;
          }

          if (row.status === 'delivered' && row.actual_delivery && row.estimated_delivery) {
            totalDelivered++;
            if (new Date(row.actual_delivery) <= new Date(row.estimated_delivery)) {
              deliveredOnTime++;
            }
          }

          // Mock cost calculation
          metrics.estimatedCost += row.weight * (row.carrier === 'UPS' ? 8.5 : 7.2);
        });

        metrics.averageWeight = rows.length > 0 ? totalWeight / rows.length : 0;
        metrics.onTimeDeliveryRate = totalDelivered > 0 ? (deliveredOnTime / totalDelivered) * 100 : 0;

        res.json(metrics);
      }
    );
  } catch (error) {
    console.error('Error getting shipping metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get carrier comparison
 */
const getCarrierComparison = async (req, res) => {
  try {
    const { supplierId } = req.params;

    db.all(
      `SELECT st.carrier, st.status, st.weight, st.estimated_delivery, st.actual_delivery
       FROM shipment_tracking st
       JOIN orders o ON st.order_id = o.id
       WHERE o.supplier_id = ?`,
      [supplierId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve carrier comparison' });
        }

        const comparison = {
          UPS: {
            totalShipments: 0,
            averageWeight: 0,
            onTimeRate: 0,
            averageCost: 0,
            delivered: 0
          },
          USPS: {
            totalShipments: 0,
            averageWeight: 0,
            onTimeRate: 0,
            averageCost: 0,
            delivered: 0
          }
        };

        const carrierData = { UPS: [], USPS: [] };

        rows.forEach(row => {
          carrierData[row.carrier].push(row);
        });

        ['UPS', 'USPS'].forEach(carrier => {
          const data = carrierData[carrier];
          comparison[carrier].totalShipments = data.length;

          if (data.length > 0) {
            const totalWeight = data.reduce((sum, row) => sum + (row.weight || 0), 0);
            comparison[carrier].averageWeight = totalWeight / data.length;

            const delivered = data.filter(row => row.status === 'delivered');
            comparison[carrier].delivered = delivered.length;

            if (delivered.length > 0) {
              const onTime = delivered.filter(row => 
                row.actual_delivery && row.estimated_delivery &&
                new Date(row.actual_delivery) <= new Date(row.estimated_delivery)
              );
              comparison[carrier].onTimeRate = (onTime.length / delivered.length) * 100;
            }

            comparison[carrier].averageCost = comparison[carrier].averageWeight * (carrier === 'UPS' ? 8.5 : 7.2);
          }
        });

        res.json(comparison);
      }
    );
  } catch (error) {
    console.error('Error getting carrier comparison:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get delivery trends
 */
const getDeliveryTrends = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { period = 'week' } = req.query; // week, month, quarter, year

    db.all(
      `SELECT st.* 
       FROM shipment_tracking st
       JOIN orders o ON st.order_id = o.id
       WHERE o.supplier_id = ? AND st.status = 'delivered'
       ORDER BY st.actual_delivery DESC`,
      [supplierId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve delivery trends' });
        }

        const trends = {
          period,
          totalDelivered: rows.length,
          onTimeDeliveries: 0,
          lateDeliveries: 0,
          averageDeliveryTime: 0,
          exceptionRate: 0
        };

        let totalDeliveryTime = 0;

        rows.forEach(row => {
          if (row.actual_delivery && row.estimated_delivery) {
            const actual = new Date(row.actual_delivery);
            const estimated = new Date(row.estimated_delivery);
            
            if (actual <= estimated) {
              trends.onTimeDeliveries++;
            } else {
              trends.lateDeliveries++;
            }

            if (row.created_at) {
              const created = new Date(row.created_at);
              const deliveryTime = (actual - created) / (1000 * 60 * 60 * 24); // days
              totalDeliveryTime += deliveryTime;
            }
          }
        });

        trends.averageDeliveryTime = rows.length > 0 ? totalDeliveryTime / rows.length : 0;
        trends.onTimeRate = rows.length > 0 ? (trends.onTimeDeliveries / rows.length) * 100 : 0;

        res.json(trends);
      }
    );
  } catch (error) {
    console.error('Error getting delivery trends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Estimate shipping cost
 */
const estimateShippingCost = async (req, res) => {
  try {
    const { carrier, weight, serviceType, origin, destination } = req.body;

    if (!carrier || !weight || !serviceType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Mock cost estimation
    const baseCost = carrier === 'UPS' ? 8.5 : 7.2;
    const multiplier = SERVICE_COST_MULTIPLIERS[serviceType.toLowerCase()] || 1.0;
    const estimatedCost = weight * baseCost * multiplier;

    res.json({
      carrier,
      weight,
      serviceType,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      currency: 'USD',
      estimatedDeliveryDays: calculateEstimatedDelivery(serviceType),
      note: 'This is an estimate. Actual cost may vary based on dimensions and additional services.'
    });
  } catch (error) {
    console.error('Error estimating shipping cost:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get shipping analytics
 */
const getShippingAnalytics = async (req, res) => {
  try {
    const { supplierId } = req.params;

    // Get metrics
    db.all(
      `SELECT st.* 
       FROM shipment_tracking st
       JOIN orders o ON st.order_id = o.id
       WHERE o.supplier_id = ?`,
      [supplierId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve analytics' });
        }

        const analytics = {
          overview: {
            totalShipments: rows.length,
            activeShipments: rows.filter(r => !['delivered', 'exception'].includes(r.status)).length,
            deliveredShipments: rows.filter(r => r.status === 'delivered').length,
            exceptionShipments: rows.filter(r => r.status === 'exception').length
          },
          carriers: {
            UPS: rows.filter(r => r.carrier === 'UPS').length,
            USPS: rows.filter(r => r.carrier === 'USPS').length
          },
          performance: {
            averageDeliveryTime: 0,
            onTimeRate: 0,
            exceptionRate: 0
          },
          costs: {
            totalEstimated: 0,
            averagePerShipment: 0
          }
        };

        // Calculate performance metrics
        const delivered = rows.filter(r => r.status === 'delivered');
        if (delivered.length > 0) {
          let totalTime = 0;
          let onTime = 0;

          delivered.forEach(row => {
            if (row.created_at && row.actual_delivery) {
              const time = (new Date(row.actual_delivery) - new Date(row.created_at)) / (1000 * 60 * 60 * 24);
              totalTime += time;

              if (row.estimated_delivery && new Date(row.actual_delivery) <= new Date(row.estimated_delivery)) {
                onTime++;
              }
            }
          });

          analytics.performance.averageDeliveryTime = totalTime / delivered.length;
          analytics.performance.onTimeRate = (onTime / delivered.length) * 100;
        }

        analytics.performance.exceptionRate = rows.length > 0 
          ? (analytics.overview.exceptionShipments / rows.length) * 100 
          : 0;

        // Calculate costs
        rows.forEach(row => {
          const cost = (row.weight || 0) * (row.carrier === 'UPS' ? 8.5 : 7.2);
          analytics.costs.totalEstimated += cost;
        });

        analytics.costs.averagePerShipment = rows.length > 0 
          ? analytics.costs.totalEstimated / rows.length 
          : 0;

        res.json(analytics);
      }
    );
  } catch (error) {
    console.error('Error getting shipping analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  // UPS Account Management
  linkUPSAccount,
  unlinkUPSAccount,
  getUPSStatus,
  verifyUPSCredentialsEndpoint,
  refreshUPSConnection,
  
  // USPS Account Management
  linkUSPSAccount,
  unlinkUSPSAccount,
  getUSPSStatus,
  verifyUSPSCredentialsEndpoint,
  refreshUSPSConnection,
  
  // Label Generation
  generateUPSLabel,
  generateUSPSLabel,
  getLabel,
  reprintLabel,
  downloadLabel,
  batchGenerateLabels,
  
  // Tracking
  trackShipment,
  getTrackingHistory,
  subscribeToUpdates,
  pollForUpdates,
  getTrackingSummary,
  getTrackingEvents,
  batchTrackShipments,
  
  // Shipment Management
  getSupplierShipments,
  getShipmentDetails,
  cancelShipment,
  holdShipment,
  schedulePickup,
  
  // Analytics & Reporting
  getShippingMetrics,
  getCarrierComparison,
  getDeliveryTrends,
  estimateShippingCost,
  getShippingAnalytics
};
