/**
 * E-Signature Service
 * Handles digital signature submission, validation, and contract signing workflow
 */

const db = require('./database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { logDocumentAction } = require('./document-service');
const { generateContractPDF } = require('./contract-service');

// Configuration
const SIGNATURE_DIR = process.env.SIGNATURE_STORAGE_PATH || path.join(__dirname, '../uploads/signatures');

// Ensure signature directory exists
if (!fs.existsSync(SIGNATURE_DIR)) {
  fs.mkdirSync(SIGNATURE_DIR, { recursive: true });
}

/**
 * Get signature directory for contract
 */
function getSignatureDirectory(contractId) {
  const dirPath = path.join(SIGNATURE_DIR, contractId.toString());
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Validate signature data
 */
function validateSignature(signatureType, signatureData) {
  if (!signatureType || !signatureData) {
    throw new Error('Signature type and data are required');
  }

  const validTypes = ['draw', 'type', 'upload'];
  if (!validTypes.includes(signatureType)) {
    throw new Error('Invalid signature type. Must be: draw, type, or upload');
  }

  // Type-specific validation
  if (signatureType === 'type') {
    if (signatureData.length < 2 || signatureData.length > 100) {
      throw new Error('Typed signature must be between 2 and 100 characters');
    }
  } else if (signatureType === 'draw' || signatureType === 'upload') {
    // Validate base64 image data
    if (!signatureData.startsWith('data:image/')) {
      throw new Error('Signature must be a valid base64 image');
    }
  }

  return true;
}

/**
 * Save signature image to file
 */
async function saveSignatureImage(contractId, signatureData) {
  const signatureDir = getSignatureDirectory(contractId);
  const filename = `signature_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.png`;
  const filepath = path.join(signatureDir, filename);

  // Extract base64 data
  const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  // Save to file
  fs.writeFileSync(filepath, buffer);

  return filepath;
}

/**
 * Initialize signature workflow
 */
async function initializeSignatureWorkflow(req, res) {
  try {
    const { contractId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get contract
    const contract = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM digital_contracts WHERE id = ?',
        [contractId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    // Authorization check (only retailer or admin can sign)
    if (userRole !== 'admin' && userId !== contract.retailer_id) {
      return res.status(403).json({ error: 'Only the retailer can sign this contract' });
    }

    // Check if contract is in correct status
    if (!['sent', 'viewed'].includes(contract.status)) {
      return res.status(400).json({ 
        error: 'Contract must be in sent or viewed status to be signed' 
      });
    }

    // Check if already signed
    const existingSignature = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM contract_signatures WHERE contract_id = ?',
        [contractId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingSignature) {
      return res.status(400).json({ error: 'Contract has already been signed' });
    }

    // Log action
    await logDocumentAction('contract', contractId, 'view', userId, ipAddress, 
      'Initialized signature workflow');

    res.json({
      success: true,
      message: 'Signature workflow initialized',
      contract: {
        id: contract.id,
        name: contract.contract_name,
        content: contract.contract_content,
        status: contract.status
      }
    });

  } catch (error) {
    console.error('Error initializing signature workflow:', error);
    res.status(500).json({ error: 'Failed to initialize signature workflow' });
  }
}

/**
 * Save signature (draw/type/upload)
 */
async function saveSignature(req, res) {
  try {
    const { contractId } = req.params;
    const { signatureType, signatureData, signerName } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Get contract
    const contract = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM digital_contracts WHERE id = ?',
        [contractId],
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
    if (userRole !== 'admin' && userId !== contract.retailer_id) {
      return res.status(403).json({ error: 'Only the retailer can sign this contract' });
    }

    // Validate signature
    validateSignature(signatureType, signatureData);

    // Check if already signed
    const existingSignature = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM contract_signatures WHERE contract_id = ?',
        [contractId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingSignature) {
      return res.status(400).json({ error: 'Contract has already been signed' });
    }

    // Save signature image if needed
    let signatureImagePath = null;
    if (signatureType === 'draw' || signatureType === 'upload') {
      signatureImagePath = await saveSignatureImage(contractId, signatureData);
    }

    // Get signer info
    const signer = await new Promise((resolve, reject) => {
      db.get(
        'SELECT name FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const finalSignerName = signerName || signer.name;

    // Save signature to database
    const signatureResult = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO contract_signatures 
         (contract_id, signer_id, signer_name, signature_type, signature_data, signature_image_path, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [contractId, userId, finalSignerName, signatureType, signatureData, signatureImagePath, ipAddress, userAgent],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    // Update contract status to signed
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE digital_contracts SET status = ?, signed_date = datetime(\'now\') WHERE id = ?',
        ['signed', contractId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log action
    await logDocumentAction('contract', contractId, 'sign', userId, ipAddress, 
      `Contract signed using ${signatureType} signature`);

    res.json({
      success: true,
      message: 'Signature saved successfully',
      signatureId: signatureResult.id
    });

  } catch (error) {
    console.error('Error saving signature:', error);
    res.status(500).json({ error: error.message || 'Failed to save signature' });
  }
}

/**
 * Get signature status
 */
async function getSignatureStatus(req, res) {
  try {
    const { contractId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get contract
    const contract = await new Promise((resolve, reject) => {
      db.get(
        'SELECT supplier_id, retailer_id, status FROM digital_contracts WHERE id = ?',
        [contractId],
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

    // Get signature if exists
    const signature = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, signer_name, signature_type, signed_date
         FROM contract_signatures 
         WHERE contract_id = ?`,
        [contractId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    res.json({
      contractStatus: contract.status,
      isSigned: signature !== null && signature !== undefined,
      signature: signature || null
    });

  } catch (error) {
    console.error('Error getting signature status:', error);
    res.status(500).json({ error: 'Failed to get signature status' });
  }
}

/**
 * Complete contract signing (generate final PDF with signature)
 */
async function completeContractSigning(req, res) {
  try {
    const { contractId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get contract with signature
    const contract = await new Promise((resolve, reject) => {
      db.get(
        `SELECT c.*, s.*
         FROM digital_contracts c
         LEFT JOIN contract_signatures s ON c.id = s.contract_id
         WHERE c.id = ?`,
        [contractId],
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

    // Check if contract is signed
    if (!contract.signature_type) {
      return res.status(400).json({ error: 'Contract has not been signed yet' });
    }

    // Generate final PDF with signature
    const signatureData = {
      signer_name: contract.signer_name,
      signature_type: contract.signature_type,
      signature_data: contract.signature_data,
      signature_image_path: contract.signature_image_path,
      signed_date: contract.signed_date
    };

    const finalPdfPath = await generateContractPDF(
      contract.id,
      contract.contract_name,
      contract.contract_content,
      contract.supplier_id,
      contract.retailer_id,
      signatureData
    );

    // Update contract with final PDF and completed status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE digital_contracts SET pdf_file_path = ?, status = ?, completed_date = datetime(\'now\') WHERE id = ?',
        [finalPdfPath, 'completed', contractId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log action
    await logDocumentAction('contract', contractId, 'update', userId, ipAddress, 
      'Contract signing completed, final PDF generated');

    res.json({
      success: true,
      message: 'Contract signing completed successfully',
      pdfAvailable: true
    });

  } catch (error) {
    console.error('Error completing contract signing:', error);
    res.status(500).json({ error: 'Failed to complete contract signing' });
  }
}

/**
 * Download signed contract PDF
 */
async function downloadSignedContract(req, res) {
  try {
    const { contractId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Get contract
    const contract = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM digital_contracts WHERE id = ?',
        [contractId],
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

    // Check if PDF exists
    if (!contract.pdf_file_path || !fs.existsSync(contract.pdf_file_path)) {
      return res.status(404).json({ error: 'Contract PDF not found' });
    }

    // Log action
    await logDocumentAction('contract', contractId, 'download', userId, ipAddress, 
      'Downloaded signed contract PDF');

    // Send file
    res.download(contract.pdf_file_path, `${contract.contract_name.replace(/[^a-z0-9]/gi, '_')}.pdf`);

  } catch (error) {
    console.error('Error downloading contract:', error);
    res.status(500).json({ error: 'Failed to download contract' });
  }
}

module.exports = {
  initializeSignatureWorkflow,
  saveSignature,
  getSignatureStatus,
  completeContractSigning,
  downloadSignedContract,
  validateSignature
};
