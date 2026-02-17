/**
 * Audit Service
 * Handles audit logging for document and contract actions
 */

const db = require('./database');

/**
 * Log document audit event
 */
async function logDocumentAudit(userId, entityType, entityId, action, details, ipAddress, userAgent) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO document_audit_logs (
        user_id, entity_type, entity_id, action, details, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const detailsJson = details ? JSON.stringify(details) : null;

    db.run(
      query,
      [userId, entityType, entityId, action, detailsJson, ipAddress, userAgent],
      function(err) {
        if (err) {
          console.error('Error logging audit event:', err);
          reject(err);
        } else {
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Get audit log for entity
 */
async function getAuditLog(req, res) {
  try {
    const { entityType, entityId } = req.params;
    const userId = req.user.id;

    // Validate entity type
    if (!['document', 'contract', 'signature'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    // Get the entity to verify permissions
    let query;
    if (entityType === 'document') {
      query = 'SELECT supplier_id, retailer_id FROM supplier_documents WHERE id = ?';
    } else if (entityType === 'contract') {
      query = 'SELECT supplier_id, retailer_id FROM digital_contracts WHERE id = ?';
    } else if (entityType === 'signature') {
      query = `
        SELECT dc.supplier_id, dc.retailer_id 
        FROM contract_signatures cs
        JOIN digital_contracts dc ON cs.contract_id = dc.id
        WHERE cs.id = ?
      `;
    }

    db.get(query, [entityId], (err, entity) => {
      if (err || !entity) {
        return res.status(404).json({ error: 'Entity not found' });
      }

      // Verify user is authorized
      const isSupplier = req.user.role === 'supplier' && req.user.id === entity.supplier_id;
      const isRetailer = req.user.role === 'retailer' && req.user.id === entity.retailer_id;

      if (!isSupplier && !isRetailer) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Get audit logs
      const auditQuery = `
        SELECT 
          dal.*,
          u.name as user_name,
          u.email as user_email
        FROM document_audit_logs dal
        LEFT JOIN users u ON dal.user_id = u.id
        WHERE dal.entity_type = ? AND dal.entity_id = ?
        ORDER BY dal.created_at DESC
      `;

      db.all(auditQuery, [entityType, entityId], (err, logs) => {
        if (err) {
          console.error('Error fetching audit logs:', err);
          return res.status(500).json({ error: 'Failed to fetch audit logs' });
        }

        const sanitizedLogs = logs.map(log => ({
          id: log.id,
          userName: log.user_name,
          action: log.action,
          details: log.details ? JSON.parse(log.details) : null,
          ipAddress: log.ip_address,
          createdAt: log.created_at
        }));

        res.json({ auditLogs: sanitizedLogs });
      });
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  logDocumentAudit,
  getAuditLog
};
