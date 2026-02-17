/**
 * Signature Service
 * Handles e-signature workflow, validation, and storage
 */

const db = require('./database');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logDocumentAudit } = require('./audit-service');

// Configuration
const SIGNATURE_STORAGE_PATH = process.env.SIGNATURE_STORAGE_PATH || path.join(__dirname, '..', 'uploads', 'signatures');

// Ensure upload directory exists
if (!fs.existsSync(SIGNATURE_STORAGE_PATH)) {
  fs.mkdirSync(SIGNATURE_STORAGE_PATH, { recursive: true });
}

/**
 * Validate signature data
 */
function validateSignature(signatureType, signatureData) {
  const errors = [];

  if (!signatureType || !['draw', 'type', 'upload'].includes(signatureType)) {
    errors.push('Invalid signature type');
  }

  if (!signatureData) {
    errors.push('Signature data is required');
  }

  if (signatureType === 'draw' && !signatureData.startsWith('data:image/png;base64,')) {
    errors.push('Invalid signature image format for drawn signature');
  }

  if (signatureType === 'type' && signatureData.length < 2) {
    errors.push('Typed signature must be at least 2 characters');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Save signature image to file
 */
async function saveSignatureImage(signatureData, contractId) {
  return new Promise((resolve, reject) => {
    try {
      // Extract base64 data
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Generate filename
      const filename = `signature_${contractId}_${uuidv4()}.png`;
      const filePath = path.join(SIGNATURE_STORAGE_PATH, filename);

      // Write file
      fs.writeFile(filePath, buffer, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve({ filePath, filename });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Initialize signature workflow
 */
async function initializeSignatureWorkflow(req, res) {
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

        // Verify user is the retailer
        if (req.user.role !== 'retailer' || req.user.id !== contract.retailer_id) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if contract is in correct status
        if (!['sent', 'viewed'].includes(contract.status)) {
          return res.status(400).json({ error: 'Contract not ready for signing' });
        }

        // Check if already signed
        db.get(
          'SELECT * FROM contract_signatures WHERE contract_id = ? AND signer_id = ?',
          [id, userId],
          (err, existingSignature) => {
            if (existingSignature) {
              return res.status(400).json({ error: 'Contract already signed by this user' });
            }

            res.json({
              message: 'Ready to sign',
              contractId: id,
              signerId: userId,
              signerRole: 'retailer'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Initialize signature workflow error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Save signature
 */
async function saveSignature(req, res) {
  try {
    const { id } = req.params;
    const { signatureType, signatureData } = req.body;
    const userId = req.user.id;

    // Validate signature
    const validation = validateSignature(signatureType, signatureData);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors.join(', ') });
    }

    // Get contract
    db.get(
      'SELECT * FROM digital_contracts WHERE id = ?',
      [id],
      async (err, contract) => {
        if (err || !contract) {
          return res.status(404).json({ error: 'Contract not found' });
        }

        // Verify user is the retailer
        if (req.user.role !== 'retailer' || req.user.id !== contract.retailer_id) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if already signed
        db.get(
          'SELECT * FROM contract_signatures WHERE contract_id = ? AND signer_id = ?',
          [id, userId],
          async (err, existingSignature) => {
            if (existingSignature) {
              return res.status(400).json({ error: 'Contract already signed' });
            }

            try {
              let signatureImagePath = null;

              // Save signature image if it's a drawn or uploaded signature
              if (signatureType === 'draw' || signatureType === 'upload') {
                const imageResult = await saveSignatureImage(signatureData, id);
                signatureImagePath = imageResult.filePath;
              }

              // Insert signature
              const query = `
                INSERT INTO contract_signatures (
                  contract_id, signer_id, signer_role, signature_type,
                  signature_data, signature_image_path, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `;

              db.run(
                query,
                [
                  id,
                  userId,
                  'retailer',
                  signatureType,
                  signatureData,
                  signatureImagePath,
                  req.ip,
                  req.get('user-agent')
                ],
                function(err) {
                  if (err) {
                    console.error('Error saving signature:', err);
                    // Clean up image file if it was created
                    if (signatureImagePath && fs.existsSync(signatureImagePath)) {
                      fs.unlinkSync(signatureImagePath);
                    }
                    return res.status(500).json({ error: 'Failed to save signature' });
                  }

                  const signatureId = this.lastID;

                  // Update contract status to 'signed'
                  db.run(
                    `UPDATE digital_contracts 
                     SET status = 'signed', signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`,
                    [id],
                    (err) => {
                      if (err) {
                        console.error('Error updating contract status:', err);
                      }

                      // Log audit event
                      logDocumentAudit(
                        userId,
                        'signature',
                        signatureId,
                        'sign',
                        { contractId: id, signatureType },
                        req.ip,
                        req.get('user-agent')
                      ).catch(console.error);

                      res.status(201).json({
                        message: 'Signature saved successfully',
                        signatureId,
                        contractId: id,
                        status: 'signed'
                      });
                    }
                  );
                }
              );
            } catch (imageError) {
              console.error('Error saving signature image:', imageError);
              res.status(500).json({ error: 'Failed to save signature image' });
            }
          }
        );
      }
    );
  } catch (error) {
    console.error('Save signature error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get signature status
 */
async function getSignatureStatus(req, res) {
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

        // Get all signatures for this contract
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
              return res.status(500).json({ error: 'Failed to fetch signatures' });
            }

            const sanitizedSignatures = signatures.map(sig => ({
              id: sig.id,
              signerName: sig.signer_name,
              signerRole: sig.signer_role,
              signatureType: sig.signature_type,
              signedAt: sig.signed_at
            }));

            res.json({
              contractId: id,
              status: contract.status,
              signatures: sanitizedSignatures,
              isSigned: contract.status === 'signed' || contract.status === 'completed',
              signedAt: contract.signed_at
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Get signature status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Complete contract signing
 */
async function completeContractSigning(req, res) {
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

        // Only supplier can complete contract
        if (req.user.role !== 'supplier' || req.user.id !== contract.supplier_id) {
          return res.status(403).json({ error: 'Unauthorized' });
        }

        // Check if contract is signed
        if (contract.status !== 'signed') {
          return res.status(400).json({ error: 'Contract must be signed first' });
        }

        // Update contract status to 'completed'
        db.run(
          `UPDATE digital_contracts 
           SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [id],
          (err) => {
            if (err) {
              console.error('Error completing contract:', err);
              return res.status(500).json({ error: 'Failed to complete contract' });
            }

            // Log audit event
            logDocumentAudit(
              userId,
              'contract',
              id,
              'complete',
              { status: 'completed' },
              req.ip,
              req.get('user-agent')
            ).catch(console.error);

            res.json({
              message: 'Contract completed successfully',
              contractId: id,
              status: 'completed'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Complete contract signing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  initializeSignatureWorkflow,
  saveSignature,
  getSignatureStatus,
  completeContractSigning,
  validateSignature
};
