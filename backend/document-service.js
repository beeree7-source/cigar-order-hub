/**
 * Document Management Service
 * Handles document uploads, scanning, enhancement, and retrieval
 */

const db = require('./database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

// Configuration
const UPLOAD_DIR = process.env.DOCUMENT_STORAGE_PATH || path.join(__dirname, '../uploads/documents');
const MAX_FILE_SIZE = parseInt(process.env.MAX_DOCUMENT_SIZE || '52428800'); // 50MB default
const ALLOWED_FILE_TYPES = (process.env.ALLOWED_DOCUMENT_TYPES || 'pdf,jpg,jpeg,png,doc,docx').split(',');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Log document action to audit trail
 */
function logDocumentAction(entityType, entityId, action, userId, ipAddress, notes = '', metadata = null) {
  return new Promise((resolve, reject) => {
    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    db.run(
      `INSERT INTO document_audit_logs (entity_type, entity_id, action, user_id, ip_address, notes, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [entityType, entityId, action, userId, ipAddress, notes, metadataStr],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Validate file type and size
 */
function validateDocumentFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Check file type
  const fileExt = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (!ALLOWED_FILE_TYPES.includes(fileExt)) {
    throw new Error(`File type .${fileExt} is not allowed. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`);
  }

  return true;
}

/**
 * Generate secure filename using hash
 */
function generateSecureFilename(originalName, supplierId, retailerId) {
  const timestamp = Date.now();
  const hash = crypto.createHash('sha256')
    .update(`${originalName}-${supplierId}-${retailerId}-${timestamp}`)
    .digest('hex')
    .substring(0, 16);
  const ext = path.extname(originalName);
  return `${hash}_${timestamp}${ext}`;
}

/**
 * Get supplier-retailer directory path
 */
function getDocumentDirectory(supplierId, retailerId) {
  const dirPath = path.join(UPLOAD_DIR, supplierId.toString(), retailerId.toString());
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Upload document
 */
async function uploadDocument(req, res) {
  try {
    const { supplierId, retailerId, documentType, notes } = req.body;
    const file = req.file;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate inputs
    if (!supplierId || !retailerId) {
      return res.status(400).json({ error: 'Supplier ID and Retailer ID are required' });
    }

    // Validate file
    validateDocumentFile(file);

    // Generate secure filename and path
    const secureFilename = generateSecureFilename(file.originalname, supplierId, retailerId);
    const documentDir = getDocumentDirectory(supplierId, retailerId);
    const filePath = path.join(documentDir, secureFilename);

    // Move file to destination
    fs.renameSync(file.path, filePath);

    // Store in database
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO supplier_documents 
         (supplier_id, retailer_id, filename, file_path, file_type, file_size, uploader_id, document_type, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [supplierId, retailerId, file.originalname, filePath, file.mimetype, file.size, userId, documentType || 'other', notes || ''],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    // Log action
    await logDocumentAction('document', result.id, 'upload', userId, ipAddress, 
      `Uploaded document: ${file.originalname}`, 
      { fileSize: file.size, fileType: file.mimetype });

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      documentId: result.id,
      filename: file.originalname
    });

  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
}

/**
 * Scan and enhance document (auto-crop, contrast adjustment)
 */
async function scanAndEnhanceDocument(req, res) {
  try {
    const { documentId } = req.params;
    const { enhance } = req.body;
    const userId = req.user.id;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get document from database
    const document = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM supplier_documents WHERE id = ? AND status = ?',
        [documentId, 'active'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file is an image
    if (!document.file_type.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files can be enhanced' });
    }

    // Read the original image
    const imageBuffer = fs.readFileSync(document.file_path);
    let sharpImage = sharp(imageBuffer);

    // Apply enhancements
    if (enhance !== false) {
      sharpImage = sharpImage
        .normalize() // Auto-contrast
        .sharpen() // Sharpen edges
        .trim(); // Auto-crop whitespace
    }

    // Save enhanced image
    const enhancedPath = document.file_path.replace(/(\.[^.]+)$/, '_enhanced$1');
    await sharpImage.toFile(enhancedPath);

    // Update database with enhanced version
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE supplier_documents SET file_path = ?, notes = ? WHERE id = ?',
        [enhancedPath, `${document.notes}\nEnhanced on ${new Date().toISOString()}`, documentId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Delete original file
    fs.unlinkSync(document.file_path);

    // Log action
    await logDocumentAction('document', documentId, 'update', userId, ipAddress, 
      'Document enhanced with auto-crop and contrast adjustment');

    res.json({
      success: true,
      message: 'Document enhanced successfully',
      documentId: documentId
    });

  } catch (error) {
    console.error('Error enhancing document:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance document' });
  }
}

/**
 * Get supplier documents for a specific retailer
 */
async function getSupplierDocuments(req, res) {
  try {
    const { supplierId, retailerId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Authorization check
    if (userRole !== 'admin' && userId !== parseInt(supplierId) && userId !== parseInt(retailerId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const documents = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, supplier_id, retailer_id, filename, file_type, file_size, 
                upload_date, uploader_id, document_type, status, notes
         FROM supplier_documents 
         WHERE supplier_id = ? AND retailer_id = ? AND status = ?
         ORDER BY upload_date DESC`,
        [supplierId, retailerId, 'active'],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({ documents });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

/**
 * Download/retrieve document
 */
async function getDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get document from database
    const document = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM supplier_documents WHERE id = ? AND status = ?',
        [id, 'active'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Authorization check
    if (userRole !== 'admin' && userId !== document.supplier_id && userId !== document.retailer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ error: 'Document file not found on server' });
    }

    // Log action
    await logDocumentAction('document', id, 'download', userId, ipAddress, 
      `Downloaded document: ${document.filename}`);

    // Send file
    res.download(document.file_path, document.filename);

  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
}

/**
 * Delete document
 */
async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get document from database
    const document = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM supplier_documents WHERE id = ? AND status = ?',
        [id, 'active'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Authorization check (only supplier or admin can delete)
    if (userRole !== 'admin' && userId !== document.supplier_id) {
      return res.status(403).json({ error: 'Only the uploader or admin can delete this document' });
    }

    // Soft delete - mark as deleted
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE supplier_documents SET status = ? WHERE id = ?',
        ['deleted', id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log action
    await logDocumentAction('document', id, 'delete', userId, ipAddress, 
      `Deleted document: ${document.filename}`);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
}

/**
 * Get document audit log
 */
async function getDocumentAuditLog(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get document to check authorization
    const document = await new Promise((resolve, reject) => {
      db.get(
        'SELECT supplier_id, retailer_id FROM supplier_documents WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Authorization check
    if (userRole !== 'admin' && userId !== document.supplier_id && userId !== document.retailer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get audit logs
    const logs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT dal.*, u.name as user_name
         FROM document_audit_logs dal
         LEFT JOIN users u ON dal.user_id = u.id
         WHERE dal.entity_type = ? AND dal.entity_id = ?
         ORDER BY dal.timestamp DESC`,
        ['document', id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({ logs });

  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
}

module.exports = {
  uploadDocument,
  scanAndEnhanceDocument,
  getSupplierDocuments,
  getDocument,
  deleteDocument,
  getDocumentAuditLog,
  validateDocumentFile,
  logDocumentAction
};
