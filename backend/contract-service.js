/**
 * Digital Contract Service
 * Handles contract creation, sending, PDF generation, and lifecycle management
 */

const db = require('./database');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { logDocumentAction } = require('./document-service');

// Configuration
const CONTRACT_DIR = process.env.CONTRACT_STORAGE_PATH || path.join(__dirname, '../uploads/contracts');

// Ensure contract directory exists
if (!fs.existsSync(CONTRACT_DIR)) {
  fs.mkdirSync(CONTRACT_DIR, { recursive: true });
}

/**
 * Get contract directory for supplier-retailer pair
 */
function getContractDirectory(supplierId, retailerId) {
  const dirPath = path.join(CONTRACT_DIR, supplierId.toString(), retailerId.toString());
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Generate PDF from contract content
 */
async function generateContractPDF(contractId, contractName, contractContent, supplierId, retailerId, signatureData = null) {
  return new Promise((resolve, reject) => {
    try {
      const contractDir = getContractDirectory(supplierId, retailerId);
      const pdfFilename = `contract_${contractId}_${Date.now()}.pdf`;
      const pdfPath = path.join(contractDir, pdfFilename);

      // Create PDF document
      const doc = new PDFDocument({ 
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Pipe to file
      const writeStream = fs.createWriteStream(pdfPath);
      doc.pipe(writeStream);

      // Add header
      doc.fontSize(20).text(contractName, { align: 'center' });
      doc.moveDown(1);

      // Add contract content
      doc.fontSize(12);
      const lines = contractContent.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          doc.text(line, { align: 'left', lineGap: 5 });
        } else {
          doc.moveDown(0.5);
        }
      });

      // Add signature if provided
      if (signatureData) {
        doc.moveDown(2);
        doc.fontSize(12).text('Signature:', { underline: true });
        doc.moveDown(0.5);
        
        if (signatureData.signature_type === 'draw' && signatureData.signature_image_path) {
          // Add signature image
          if (fs.existsSync(signatureData.signature_image_path)) {
            doc.image(signatureData.signature_image_path, { width: 200, height: 100 });
          }
        } else if (signatureData.signature_type === 'type') {
          // Add typed signature
          doc.font('Courier').fontSize(18).text(signatureData.signature_data);
          doc.font('Helvetica').fontSize(12);
        }
        
        doc.moveDown(0.5);
        doc.text(`Signed by: ${signatureData.signer_name}`);
        doc.text(`Date: ${new Date(signatureData.signed_date).toLocaleString()}`);
      } else {
        // Add signature placeholder
        doc.moveDown(2);
        doc.fontSize(12).text('_________________________________', { align: 'left' });
        doc.text('Signature', { align: 'left' });
        doc.moveDown(1);
        doc.text('_________________________________', { align: 'left' });
        doc.text('Date', { align: 'left' });
      }

      // Add footer
      doc.moveDown(2);
      doc.fontSize(10).text(
        `Generated on ${new Date().toLocaleString()}`,
        { align: 'center' }
      );

      // Finalize PDF
      doc.end();

      // Wait for write to complete
      writeStream.on('finish', () => {
        resolve(pdfPath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Create new contract
 */
async function createContract(req, res) {
  try {
    const { supplierId, retailerId, contractName, contractContent, signatureRequiredBy } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate inputs
    if (!supplierId || !retailerId || !contractName || !contractContent) {
      return res.status(400).json({ 
        error: 'Supplier ID, Retailer ID, contract name, and content are required' 
      });
    }

    // Authorization check (only supplier or admin can create contracts)
    if (userRole !== 'admin' && userId !== parseInt(supplierId)) {
      return res.status(403).json({ error: 'Only the supplier or admin can create contracts' });
    }

    // Insert contract into database
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO digital_contracts 
         (supplier_id, retailer_id, contract_name, contract_content, status, created_by, signature_required_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [supplierId, retailerId, contractName, contractContent, 'draft', userId, signatureRequiredBy || null],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    // Generate initial PDF (without signature)
    const pdfPath = await generateContractPDF(
      result.id, 
      contractName, 
      contractContent, 
      supplierId, 
      retailerId
    );

    // Update contract with PDF path
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE digital_contracts SET pdf_file_path = ? WHERE id = ?',
        [pdfPath, result.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log action
    await logDocumentAction('contract', result.id, 'create', userId, ipAddress, 
      `Created contract: ${contractName}`);

    res.json({
      success: true,
      message: 'Contract created successfully',
      contractId: result.id
    });

  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: error.message || 'Failed to create contract' });
  }
}

/**
 * Send contract to retailer for signing
 */
async function sendContractToRetailer(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get contract
    const contract = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM digital_contracts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Authorization check
    if (userRole !== 'admin' && userId !== contract.supplier_id) {
      return res.status(403).json({ error: 'Only the supplier or admin can send contracts' });
    }

    // Check contract status
    if (contract.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft contracts can be sent' });
    }

    // Update contract status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE digital_contracts SET status = ?, sent_date = datetime(\'now\') WHERE id = ?',
        ['sent', id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log action
    await logDocumentAction('contract', id, 'send', userId, ipAddress, 
      `Sent contract to retailer for signing`);

    // TODO: Send email notification to retailer
    // This would integrate with the existing email notification system

    res.json({
      success: true,
      message: 'Contract sent to retailer successfully'
    });

  } catch (error) {
    console.error('Error sending contract:', error);
    res.status(500).json({ error: 'Failed to send contract' });
  }
}

/**
 * Get contract details
 */
async function getContractDetails(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get contract with signature info
    const contract = await new Promise((resolve, reject) => {
      db.get(
        `SELECT c.*, 
                s.id as signature_id, s.signer_name, s.signature_type, s.signed_date as signature_date,
                u1.name as supplier_name, u2.name as retailer_name
         FROM digital_contracts c
         LEFT JOIN contract_signatures s ON c.id = s.contract_id
         LEFT JOIN users u1 ON c.supplier_id = u1.id
         LEFT JOIN users u2 ON c.retailer_id = u2.id
         WHERE c.id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Authorization check
    if (userRole !== 'admin' && userId !== contract.supplier_id && userId !== contract.retailer_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Log view action
    await logDocumentAction('contract', id, 'view', userId, ipAddress, 
      'Viewed contract details');

    // Update status to viewed if it was sent
    if (contract.status === 'sent' && userId === contract.retailer_id) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE digital_contracts SET status = ? WHERE id = ? AND status = ?',
          ['viewed', id, 'sent'],
          (err) => { if (err) console.error(err); resolve(); }
        );
      });
      contract.status = 'viewed';
    }

    res.json({ contract });

  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Failed to fetch contract details' });
  }
}

/**
 * Get supplier's contracts
 */
async function getSupplierContracts(req, res) {
  try {
    const { supplierId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Authorization check
    if (userRole !== 'admin' && userId !== parseInt(supplierId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const contracts = await new Promise((resolve, reject) => {
      db.all(
        `SELECT c.id, c.contract_name, c.status, c.created_date, c.sent_date, c.signed_date,
                c.retailer_id, u.name as retailer_name,
                s.id as signature_id
         FROM digital_contracts c
         LEFT JOIN users u ON c.retailer_id = u.id
         LEFT JOIN contract_signatures s ON c.id = s.contract_id
         WHERE c.supplier_id = ?
         ORDER BY c.created_date DESC`,
        [supplierId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({ contracts });

  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ error: 'Failed to fetch contracts' });
  }
}

/**
 * Get pending contracts for retailer
 */
async function getPendingContracts(req, res) {
  try {
    const { retailerId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Authorization check
    if (userRole !== 'admin' && userId !== parseInt(retailerId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const contracts = await new Promise((resolve, reject) => {
      db.all(
        `SELECT c.id, c.contract_name, c.status, c.sent_date, c.signature_required_by,
                c.supplier_id, u.name as supplier_name
         FROM digital_contracts c
         LEFT JOIN users u ON c.supplier_id = u.id
         WHERE c.retailer_id = ? AND c.status IN ('sent', 'viewed')
         ORDER BY c.sent_date DESC`,
        [retailerId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({ contracts });

  } catch (error) {
    console.error('Error fetching pending contracts:', error);
    res.status(500).json({ error: 'Failed to fetch pending contracts' });
  }
}

/**
 * Update contract status
 */
async function updateContractStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate status
    const validStatuses = ['draft', 'sent', 'viewed', 'signed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Get contract
    const contract = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM digital_contracts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Authorization check
    if (userRole !== 'admin' && userId !== contract.supplier_id) {
      return res.status(403).json({ error: 'Only the supplier or admin can update contract status' });
    }

    // Update status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE digital_contracts SET status = ? WHERE id = ?',
        [status, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log action
    await logDocumentAction('contract', id, 'update', userId, ipAddress, 
      `Updated contract status to: ${status}`);

    res.json({
      success: true,
      message: 'Contract status updated successfully'
    });

  } catch (error) {
    console.error('Error updating contract status:', error);
    res.status(500).json({ error: 'Failed to update contract status' });
  }
}

/**
 * Get contract audit log
 */
async function getContractAuditLog(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get contract to check authorization
    const contract = await new Promise((resolve, reject) => {
      db.get(
        'SELECT supplier_id, retailer_id FROM digital_contracts WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Authorization check
    if (userRole !== 'admin' && userId !== contract.supplier_id && userId !== contract.retailer_id) {
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
        ['contract', id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    res.json({ logs });

  } catch (error) {
    console.error('Error fetching contract audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
}

module.exports = {
  createContract,
  sendContractToRetailer,
  getContractDetails,
  getSupplierContracts,
  getPendingContracts,
  updateContractStatus,
  getContractAuditLog,
  generateContractPDF
};
