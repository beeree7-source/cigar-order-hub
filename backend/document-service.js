/**
 * Document Service
 * Handles document uploads, scanning, enhancement, and management
 */

const db = require('./database');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { logDocumentAudit } = require('./audit-service');

// Configuration
const DOCUMENT_STORAGE_PATH = process.env.DOCUMENT_STORAGE_PATH || path.join(__dirname, '..', 'uploads', 'documents');
const MAX_FILE_SIZE = parseInt(process.env.MAX_DOCUMENT_SIZE || '52428800'); // 50MB default
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword' // .doc
];

// Ensure upload directory exists
if (!fs.existsSync(DOCUMENT_STORAGE_PATH)) {
  fs.mkdirSync(DOCUMENT_STORAGE_PATH, { recursive: true });
}

/**
 * Validate document file
 */
function validateDocumentFile(file) {
  const errors = [];

  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1048576}MB`);
  }

  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed. Allowed types: PDF, JPG, PNG, DOCX, DOC`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get secure file path for document
 */
function getSecureFilePath(supplierId, retailerId, filename) {
  const supplierDir = path.join(DOCUMENT_STORAGE_PATH, `supplier_${supplierId}`);
  const retailerDir = path.join(supplierDir, `retailer_${retailerId}`);
  
  if (!fs.existsSync(retailerDir)) {
    fs.mkdirSync(retailerDir, { recursive: true });
  }
  
  return path.join(retailerDir, filename);
}

/**
 * Upload document
 */
async function uploadDocument(req, res) {
  try {
    const { supplierId, retailerId, documentType, description } = req.body;
    const file = req.file;
    const userId = req.user.id;

    // Validate file
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    // Verify user is authorized
    if (req.user.role !== 'supplier' || req.user.id !== parseInt(supplierId)) {
      return res.status(403).json({ error: 'Unauthorized to upload documents for this supplier' });
    }

    // Generate secure filename
    const fileExt = path.extname(file.originalname);
    const secureFilename = `${uuidv4()}${fileExt}`;
    const filePath = getSecureFilePath(supplierId, retailerId, secureFilename);

    // Move file to secure location
    fs.renameSync(file.path, filePath);

    // Save to database
    const query = `
      INSERT INTO supplier_documents (
        supplier_id, retailer_id, filename, original_filename,
        file_path, file_type, file_size, document_type,
        description, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        supplierId,
        retailerId,
        secureFilename,
        file.originalname,
        filePath,
        file.mimetype,
        file.size,
        documentType || 'other',
        description || null,
        userId
      ],
      function(err) {
        if (err) {
          console.error('Error saving document:', err);
          // Clean up file
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          return res.status(500).json({ error: 'Failed to save document' });
        }

        const documentId = this.lastID;

        // Log audit event
        logDocumentAudit(
          userId,
          'document',
          documentId,
          'upload',
          { filename: file.originalname, size: file.size, type: file.mimetype },
          req.ip,
          req.get('user-agent')
        ).catch(console.error);

        res.status(201).json({
          message: 'Document uploaded successfully',
          documentId,
          filename: secureFilename
        });
      }
    );
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Scan and enhance document (auto-crop, contrast adjustment)
 */
async function scanAndEnhanceDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get document info
    db.get(
      'SELECT * FROM supplier_documents WHERE id = ?',
      [id],
      async (err, document) => {
        if (err || !document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // Verify user is authorized
        if (req.user.role !== 'supplier' && req.user.id !== document.supplier_id) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Only process image files
        if (!document.file_type.startsWith('image/')) {
          return res.status(400).json({ error: 'Document enhancement only available for images' });
        }

        try {
          // Process image with sharp
          const image = sharp(document.file_path);
          const metadata = await image.metadata();

          // Auto-enhance: normalize brightness and contrast
          const enhancedFilename = `${path.parse(document.filename).name}_enhanced${path.extname(document.filename)}`;
          const enhancedPath = path.join(path.dirname(document.file_path), enhancedFilename);

          await image
            .normalize() // Auto-adjust brightness and contrast
            .sharpen() // Sharpen edges
            .toFile(enhancedPath);

          // Update database to point to enhanced version
          db.run(
            `UPDATE supplier_documents 
             SET file_path = ?, filename = ?, scan_enhanced = 1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [enhancedPath, enhancedFilename, id],
            (err) => {
              if (err) {
                console.error('Error updating document:', err);
                return res.status(500).json({ error: 'Failed to update document' });
              }

              // Delete original file
              if (fs.existsSync(document.file_path)) {
                fs.unlinkSync(document.file_path);
              }

              // Log audit event
              logDocumentAudit(
                userId,
                'document',
                id,
                'enhance',
                { enhanced: true },
                req.ip,
                req.get('user-agent')
              ).catch(console.error);

              res.json({
                message: 'Document enhanced successfully',
                documentId: id,
                enhanced: true
              });
            }
          );
        } catch (imageError) {
          console.error('Image processing error:', imageError);
          res.status(500).json({ error: 'Failed to process image' });
        }
      }
    );
  } catch (error) {
    console.error('Enhance document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get supplier documents for a specific retailer
 */
async function getSupplierDocuments(req, res) {
  try {
    const { supplierId, retailerId } = req.params;
    const userId = req.user.id;

    // Verify user is authorized (supplier or retailer)
    if (req.user.role === 'supplier' && req.user.id !== parseInt(supplierId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.user.role === 'retailer' && req.user.id !== parseInt(retailerId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const query = `
      SELECT 
        d.*,
        u.name as uploader_name
      FROM supplier_documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.supplier_id = ? AND d.retailer_id = ?
      ORDER BY d.created_at DESC
    `;

    db.all(query, [supplierId, retailerId], (err, documents) => {
      if (err) {
        console.error('Error fetching documents:', err);
        return res.status(500).json({ error: 'Failed to fetch documents' });
      }

      // Remove sensitive file paths from response
      const sanitizedDocs = documents.map(doc => ({
        ...doc,
        file_path: undefined,
        downloadUrl: `/api/protected/documents/${doc.id}/download`
      }));

      res.json({ documents: sanitizedDocs });
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Download/retrieve document
 */
async function getDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    db.get(
      'SELECT * FROM supplier_documents WHERE id = ?',
      [id],
      (err, document) => {
        if (err || !document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // Verify user is authorized
        const isSupplier = req.user.role === 'supplier' && req.user.id === document.supplier_id;
        const isRetailer = req.user.role === 'retailer' && req.user.id === document.retailer_id;
        
        if (!isSupplier && !isRetailer) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if file exists
        if (!fs.existsSync(document.file_path)) {
          return res.status(404).json({ error: 'File not found on server' });
        }

        // Log audit event
        logDocumentAudit(
          userId,
          'document',
          id,
          'download',
          { filename: document.original_filename },
          req.ip,
          req.get('user-agent')
        ).catch(console.error);

        // Send file
        res.download(document.file_path, document.original_filename);
      }
    );
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Delete document
 */
async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    db.get(
      'SELECT * FROM supplier_documents WHERE id = ?',
      [id],
      (err, document) => {
        if (err || !document) {
          return res.status(404).json({ error: 'Document not found' });
        }

        // Only supplier can delete their own documents
        if (req.user.role !== 'supplier' || req.user.id !== document.supplier_id) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Delete file from filesystem
        if (fs.existsSync(document.file_path)) {
          fs.unlinkSync(document.file_path);
        }

        // Delete from database
        db.run('DELETE FROM supplier_documents WHERE id = ?', [id], (err) => {
          if (err) {
            console.error('Error deleting document:', err);
            return res.status(500).json({ error: 'Failed to delete document' });
          }

          // Log audit event
          logDocumentAudit(
            userId,
            'document',
            id,
            'delete',
            { filename: document.original_filename },
            req.ip,
            req.get('user-agent')
          ).catch(console.error);

          res.json({ message: 'Document deleted successfully' });
        });
      }
    );
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  uploadDocument,
  scanAndEnhanceDocument,
  getSupplierDocuments,
  getDocument,
  deleteDocument,
  validateDocumentFile,
  DOCUMENT_STORAGE_PATH,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES
};
