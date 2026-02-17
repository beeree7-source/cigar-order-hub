/**
 * Contract Service
 * Handles digital contract creation, management, and PDF generation
 */

const db = require('./database');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const { logDocumentAudit } = require('./audit-service');

// Configuration
const CONTRACT_STORAGE_PATH = process.env.CONTRACT_STORAGE_PATH || path.join(__dirname, '..', 'uploads', 'contracts');

// Ensure upload directory exists
if (!fs.existsSync(CONTRACT_STORAGE_PATH)) {
  fs.mkdirSync(CONTRACT_STORAGE_PATH, { recursive: true });
}

/**
 * Generate unique contract number
 */
function generateContractNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `CON-${timestamp}-${random}`;
}

/**
 * Create digital contract
 */
async function createContract(req, res) {
  try {
    const { retailerId, title, content, contractType, expiresAt } = req.body;
    const userId = req.user.id;

    // Verify user is a supplier
    if (req.user.role !== 'supplier') {
      return res.status(403).json({ error: 'Only suppliers can create contracts' });
    }

    // Validate required fields
    if (!retailerId || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields: retailerId, title, content' });
    }

    const contractNumber = generateContractNumber();

    const query = `
      INSERT INTO digital_contracts (
        contract_number, supplier_id, retailer_id, title, content,
        contract_type, status, expires_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      query,
      [
        contractNumber,
        userId,
        retailerId,
        title,
        content,
        contractType || 'sales',
        'draft',
        expiresAt || null,
        userId
      ],
      function(err) {
        if (err) {
          console.error('Error creating contract:', err);
          return res.status(500).json({ error: 'Failed to create contract' });
        }

        const contractId = this.lastID;

        // Log audit event
        logDocumentAudit(
          userId,
          'contract',
          contractId,
          'create',
          { title, contractType },
          req.ip,
          req.get('user-agent')
        ).catch(console.error);

        res.status(201).json({
          message: 'Contract created successfully',
          contractId,
          contractNumber
        });
      }
    );
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Generate PDF from contract
 */
async function generateContractPDF(contractId, contractData) {
  return new Promise((resolve, reject) => {
    try {
      // Validate contractId is a safe integer
      if (!Number.isSafeInteger(contractId) || contractId <= 0) {
        return reject(new Error('Invalid contract ID'));
      }

      const pdfFilename = `contract_${contractId}_${uuidv4()}.pdf`;
      const pdfPath = path.join(CONTRACT_STORAGE_PATH, pdfFilename);

      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Add header
      doc.fontSize(20).text(contractData.title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Contract Number: ${contractData.contract_number}`, { align: 'center' });
      doc.text(`Date: ${new Date(contractData.created_at).toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(2);

      // Add content
      doc.fontSize(11).text(contractData.content, { align: 'justify' });
      doc.moveDown(3);

      // Add signature section
      doc.fontSize(12).text('Signatures:', { underline: true });
      doc.moveDown();

      doc.fontSize(10);
      doc.text('Supplier: ________________________________', { continued: false });
      doc.text(`Date: _______________`);
      doc.moveDown(2);

      doc.text('Retailer: ________________________________', { continued: false });
      doc.text(`Date: _______________`);

      // Add footer
      doc.fontSize(8).text(
        `Generated on ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => {
        resolve({ pdfPath, pdfFilename });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Send contract to retailer
 */
async function sendContractToRetailer(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get contract
    db.get(
      'SELECT * FROM digital_contracts WHERE id = ?',
      [id],
      async (err, contract) => {
        if (err || !contract) {
          return res.status(404).json({ error: 'Contract not found' });
        }

        // Verify user is the supplier
        if (req.user.id !== contract.supplier_id) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Verify contract is in draft status
        if (contract.status !== 'draft') {
          return res.status(400).json({ error: 'Contract already sent' });
        }

        try {
          // Generate PDF if not already generated
          let pdfPath = contract.pdf_path;
          if (!pdfPath || !fs.existsSync(pdfPath)) {
            const pdfResult = await generateContractPDF(id, contract);
            pdfPath = pdfResult.pdfPath;

            // Update contract with PDF path
            db.run(
              'UPDATE digital_contracts SET pdf_path = ? WHERE id = ?',
              [pdfPath, id],
              (err) => {
                if (err) console.error('Error updating PDF path:', err);
              }
            );
          }

          // Update contract status to 'sent'
          db.run(
            `UPDATE digital_contracts 
             SET status = 'sent', sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [id],
            (err) => {
              if (err) {
                console.error('Error updating contract status:', err);
                return res.status(500).json({ error: 'Failed to send contract' });
              }

              // Log audit event
              logDocumentAudit(
                userId,
                'contract',
                id,
                'send',
                { retailerId: contract.retailer_id },
                req.ip,
                req.get('user-agent')
              ).catch(console.error);

              res.json({
                message: 'Contract sent successfully',
                contractId: id,
                status: 'sent'
              });
            }
          );
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          res.status(500).json({ error: 'Failed to generate contract PDF' });
        }
      }
    );
  } catch (error) {
    console.error('Send contract error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get contract details
 */
async function getContractDetails(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      SELECT 
        c.*,
        s.name as supplier_name,
        s.email as supplier_email,
        r.name as retailer_name,
        r.email as retailer_email
      FROM digital_contracts c
      LEFT JOIN users s ON c.supplier_id = s.id
      LEFT JOIN users r ON c.retailer_id = r.id
      WHERE c.id = ?
    `;

    db.get(query, [id], (err, contract) => {
      if (err || !contract) {
        return res.status(404).json({ error: 'Contract not found' });
      }

      // Verify user is authorized (supplier or retailer)
      const isSupplier = req.user.role === 'supplier' && req.user.id === contract.supplier_id;
      const isRetailer = req.user.role === 'retailer' && req.user.id === contract.retailer_id;

      if (!isSupplier && !isRetailer) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Update viewed_at if retailer is viewing for first time
      if (isRetailer && !contract.viewed_at && contract.status === 'sent') {
        db.run(
          `UPDATE digital_contracts 
           SET status = 'viewed', viewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [id],
          (err) => {
            if (err) console.error('Error updating viewed status:', err);
          }
        );
        contract.status = 'viewed';
        contract.viewed_at = new Date().toISOString();
      }

      // Get signatures
      db.all(
        `SELECT 
          cs.*,
          u.name as signer_name,
          u.email as signer_email
         FROM contract_signatures cs
         LEFT JOIN users u ON cs.signer_id = u.id
         WHERE cs.contract_id = ?`,
        [id],
        (err, signatures) => {
          if (err) {
            console.error('Error fetching signatures:', err);
            signatures = [];
          }

          // Remove sensitive data
          const sanitizedContract = {
            ...contract,
            pdf_path: undefined,
            pdfUrl: contract.pdf_path ? `/api/protected/contracts/${id}/pdf` : null
          };

          const sanitizedSignatures = signatures.map(sig => ({
            ...sig,
            signature_image_path: undefined
          }));

          res.json({
            contract: sanitizedContract,
            signatures: sanitizedSignatures
          });
        }
      );
    });
  } catch (error) {
    console.error('Get contract details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get supplier's contracts
 */
async function getSupplierContracts(req, res) {
  try {
    const { supplierId } = req.params;
    const userId = req.user.id;

    // Verify user is the supplier
    if (req.user.role !== 'supplier' || req.user.id !== parseInt(supplierId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const query = `
      SELECT 
        c.*,
        r.name as retailer_name,
        r.email as retailer_email
      FROM digital_contracts c
      LEFT JOIN users r ON c.retailer_id = r.id
      WHERE c.supplier_id = ?
      ORDER BY c.created_at DESC
    `;

    db.all(query, [supplierId], (err, contracts) => {
      if (err) {
        console.error('Error fetching contracts:', err);
        return res.status(500).json({ error: 'Failed to fetch contracts' });
      }

      const sanitizedContracts = contracts.map(contract => ({
        ...contract,
        pdf_path: undefined,
        content: undefined // Don't include full content in list
      }));

      res.json({ contracts: sanitizedContracts });
    });
  } catch (error) {
    console.error('Get supplier contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get pending contracts for retailer
 */
async function getPendingContracts(req, res) {
  try {
    const { retailerId } = req.params;
    const userId = req.user.id;

    // Verify user is the retailer
    if (req.user.role !== 'retailer' || req.user.id !== parseInt(retailerId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const query = `
      SELECT 
        c.*,
        s.name as supplier_name,
        s.email as supplier_email
      FROM digital_contracts c
      LEFT JOIN users s ON c.supplier_id = s.id
      WHERE c.retailer_id = ? AND c.status IN ('sent', 'viewed')
      ORDER BY c.sent_at DESC
    `;

    db.all(query, [retailerId], (err, contracts) => {
      if (err) {
        console.error('Error fetching pending contracts:', err);
        return res.status(500).json({ error: 'Failed to fetch contracts' });
      }

      const sanitizedContracts = contracts.map(contract => ({
        ...contract,
        pdf_path: undefined,
        content: undefined
      }));

      res.json({ contracts: sanitizedContracts });
    });
  } catch (error) {
    console.error('Get pending contracts error:', error);
    res.status(500).json({ error: 'Internal server error' });
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

    const validStatuses = ['draft', 'sent', 'viewed', 'signed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    db.get(
      'SELECT * FROM digital_contracts WHERE id = ?',
      [id],
      (err, contract) => {
        if (err || !contract) {
          return res.status(404).json({ error: 'Contract not found' });
        }

        // Only supplier can update contract status (except signing)
        if (req.user.id !== contract.supplier_id) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        db.run(
          `UPDATE digital_contracts 
           SET status = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [status, id],
          (err) => {
            if (err) {
              console.error('Error updating contract status:', err);
              return res.status(500).json({ error: 'Failed to update status' });
            }

            // Log audit event
            logDocumentAudit(
              userId,
              'contract',
              id,
              'status_update',
              { status },
              req.ip,
              req.get('user-agent')
            ).catch(console.error);

            res.json({
              message: 'Contract status updated',
              contractId: id,
              status
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Update contract status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get contract PDF
 */
async function getContractPDF(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    db.get(
      'SELECT * FROM digital_contracts WHERE id = ?',
      [id],
      (err, contract) => {
        if (err || !contract) {
          return res.status(404).json({ error: 'Contract not found' });
        }

        // Verify user is authorized
        const isSupplier = req.user.role === 'supplier' && req.user.id === contract.supplier_id;
        const isRetailer = req.user.role === 'retailer' && req.user.id === contract.retailer_id;

        if (!isSupplier && !isRetailer) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if PDF exists
        if (!contract.pdf_path || !fs.existsSync(contract.pdf_path)) {
          return res.status(404).json({ error: 'PDF not generated yet' });
        }

        // Log audit event
        logDocumentAudit(
          userId,
          'contract',
          id,
          'download_pdf',
          { contractNumber: contract.contract_number },
          req.ip,
          req.get('user-agent')
        ).catch(console.error);

        // Send PDF
        res.download(contract.pdf_path, `${contract.contract_number}.pdf`);
      }
    );
  } catch (error) {
    console.error('Get contract PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  createContract,
  sendContractToRetailer,
  getContractDetails,
  getSupplierContracts,
  getPendingContracts,
  updateContractStatus,
  generateContractPDF,
  getContractPDF
};
