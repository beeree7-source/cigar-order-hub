const db = require('./database');

/**
 * Invoice Generation Service
 * Handles invoice creation, PDF generation, and management
 */

/**
 * Generate invoice number with format INV-YYYY-NNN
 * TODO: In production, query database for the last invoice number and increment
 * to ensure uniqueness instead of using random numbers
 */
const generateInvoiceNumber = async () => {
  return new Promise((resolve) => {
    const year = new Date().getFullYear();
    
    // Query for the highest invoice number this year
    db.get(
      `SELECT invoice_number FROM invoices 
       WHERE invoice_number LIKE ? 
       ORDER BY invoice_number DESC LIMIT 1`,
      [`INV-${year}-%`],
      (err, row) => {
        if (err || !row) {
          // Start with 001 if no invoices exist
          resolve(`INV-${year}-001`);
        } else {
          // Extract number and increment
          const lastNumber = parseInt(row.invoice_number.split('-')[2]) || 0;
          const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
          resolve(`INV-${year}-${nextNumber}`);
        }
      }
    );
  });
};

/**
 * Calculate invoice totals
 */
const calculateInvoiceTotals = (items, taxRate = 0.08, discount = 0) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
  
  const discountAmount = discount > 0 ? (subtotal * discount / 100) : 0;
  const subtotalAfterDiscount = subtotal - discountAmount;
  const tax = subtotalAfterDiscount * taxRate;
  const total = subtotalAfterDiscount + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discountAmount * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

/**
 * Generate invoice for an order
 */
const generateInvoice = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const { discount = 0, taxRate = 0.08, paymentTerms = 'Net 30', notes = '' } = req.body;

    // Check if invoice already exists for this order
    db.get(
      `SELECT * FROM invoices WHERE order_id = ?`,
      [orderId],
      (err, existingInvoice) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingInvoice) {
          return res.status(400).json({ 
            error: 'Invoice already exists for this order',
            invoice: existingInvoice 
          });
        }

        // Get order details
        db.get(
          `SELECT o.*, u.name as retailer_name, u.email as retailer_email
           FROM orders o
           JOIN users u ON o.retailer_id = u.id
           WHERE o.id = ?`,
          [orderId],
          (err, order) => {
            if (err) {
              return res.status(500).json({ error: 'Database error' });
            }

            if (!order) {
              return res.status(404).json({ error: 'Order not found' });
            }

            // Parse items and calculate totals
            const items = JSON.parse(order.items);
            const totals = calculateInvoiceTotals(items, taxRate, discount);

            // Calculate due date (default 30 days)
            const daysToAdd = parseInt(paymentTerms.replace(/\D/g, '')) || 30;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + daysToAdd);

            // Generate unique invoice number
            generateInvoiceNumber().then((invoiceNumber) => {
              // Create invoice
            db.run(
              `INSERT INTO invoices 
               (order_id, invoice_number, total, tax, discount, subtotal, 
                due_date, status, payment_terms, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                orderId,
                invoiceNumber,
                totals.total,
                totals.tax,
                totals.discount,
                totals.subtotal,
                dueDate.toISOString().split('T')[0],
                'unpaid',
                paymentTerms,
                notes
              ],
              function(err) {
                if (err) {
                  console.error('Error creating invoice:', err);
                  return res.status(500).json({ error: 'Failed to create invoice' });
                }

                res.json({
                  success: true,
                  invoice: {
                    id: this.lastID,
                    invoice_number: invoiceNumber,
                    order_id: orderId,
                    ...totals,
                    due_date: dueDate.toISOString().split('T')[0],
                    status: 'unpaid',
                    payment_terms: paymentTerms,
                    notes
                  }
                });
              });
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

/**
 * Get all invoices
 */
const getInvoices = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT i.*, o.retailer_id, u.name as retailer_name, u.email as retailer_email
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN users u ON o.retailer_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    db.all(query, params, (err, invoices) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM invoices WHERE 1=1`;
      const countParams = [];
      if (status) {
        countQuery += ` AND status = ?`;
        countParams.push(status);
      }

      db.get(countQuery, countParams, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          invoices,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        });
      });
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

/**
 * Get invoice details
 */
const getInvoiceDetails = async (req, res) => {
  try {
    const { id } = req.params;

    db.get(
      `SELECT i.*, o.items, o.retailer_id, o.supplier_id, o.status as order_status,
              u.name as retailer_name, u.email as retailer_email,
              s.name as supplier_name, s.email as supplier_email
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       JOIN users u ON o.retailer_id = u.id
       JOIN users s ON o.supplier_id = s.id
       WHERE i.id = ?`,
      [id],
      (err, invoice) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!invoice) {
          return res.status(404).json({ error: 'Invoice not found' });
        }

        // Parse items
        invoice.items = JSON.parse(invoice.items);

        res.json(invoice);
      }
    );
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
};

/**
 * Generate PDF for invoice (mock implementation)
 */
const getInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get invoice details
    db.get(
      `SELECT i.*, o.items, o.retailer_id, o.supplier_id,
              u.name as retailer_name, u.email as retailer_email,
              s.name as supplier_name, s.email as supplier_email
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       JOIN users u ON o.retailer_id = u.id
       JOIN users s ON o.supplier_id = s.id
       WHERE i.id = ?`,
      [id],
      (err, invoice) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!invoice) {
          return res.status(404).json({ error: 'Invoice not found' });
        }

        // Mock PDF generation (in production, use PDFKit)
        const items = JSON.parse(invoice.items);
        const pdfContent = `
=================================================
                    INVOICE
=================================================

Invoice Number: ${invoice.invoice_number}
Date: ${invoice.created_at}
Due Date: ${invoice.due_date}
Payment Terms: ${invoice.payment_terms}

-------------------------------------------------
BILL TO:
${invoice.retailer_name}
${invoice.retailer_email}

FROM:
${invoice.supplier_name}
${invoice.supplier_email}
-------------------------------------------------

ITEMS:
${items.map((item, i) => `
${i + 1}. ${item.name}
   SKU: ${item.sku}
   Quantity: ${item.quantity}
   Price: $${item.price}
   Total: $${(item.quantity * item.price).toFixed(2)}
`).join('\n')}

-------------------------------------------------
Subtotal:        $${invoice.subtotal.toFixed(2)}
Discount:        -$${invoice.discount.toFixed(2)}
Tax:             $${invoice.tax.toFixed(2)}
-------------------------------------------------
TOTAL:           $${invoice.total.toFixed(2)}
-------------------------------------------------

Status: ${invoice.status.toUpperCase()}

${invoice.notes ? `\nNotes:\n${invoice.notes}` : ''}

=================================================
        `;

        // Send as plain text (in production, send PDF)
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoice_number}.txt"`);
        res.send(pdfContent);
      }
    );
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

/**
 * Send invoice via email
 */
const sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { sendEmail } = require('./notifications');

    // Get invoice details
    db.get(
      `SELECT i.*, u.email as retailer_email, u.name as retailer_name
       FROM invoices i
       JOIN orders o ON i.order_id = o.id
       JOIN users u ON o.retailer_id = u.id
       WHERE i.id = ?`,
      [id],
      async (err, invoice) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!invoice) {
          return res.status(404).json({ error: 'Invoice not found' });
        }

        const emailBody = `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Invoice ${invoice.invoice_number}</h2>
              <p>Dear ${invoice.retailer_name},</p>
              <p>Please find your invoice attached.</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
                <strong>Invoice Number:</strong> ${invoice.invoice_number}<br>
                <strong>Amount Due:</strong> $${invoice.total.toFixed(2)}<br>
                <strong>Due Date:</strong> ${invoice.due_date}<br>
                <strong>Payment Terms:</strong> ${invoice.payment_terms}
              </div>
              <p>Thank you for your business!</p>
            </body>
          </html>
        `;

        await sendEmail(
          invoice.retailer_email,
          `Invoice ${invoice.invoice_number}`,
          emailBody
        );

        // Log notification
        db.run(
          `INSERT INTO notifications (user_id, type, subject, body, status)
           SELECT retailer_id, 'invoice', ?, ?, 'sent'
           FROM orders WHERE id = ?`,
          [`Invoice ${invoice.invoice_number}`, emailBody, invoice.order_id]
        );

        res.json({ 
          success: true, 
          message: 'Invoice email sent successfully' 
        });
      }
    );
  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({ error: 'Failed to send invoice email' });
  }
};

/**
 * Mark invoice as paid
 */
const markInvoicePaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { status = 'paid' } = req.body;

    db.run(
      `UPDATE invoices SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Invoice not found' });
        }

        res.json({ 
          success: true, 
          message: `Invoice marked as ${status}` 
        });
      }
    );
  } catch (error) {
    console.error('Error updating invoice status:', error);
    res.status(500).json({ error: 'Failed to update invoice status' });
  }
};

module.exports = {
  generateInvoice,
  getInvoices,
  getInvoiceDetails,
  getInvoicePDF,
  sendInvoiceEmail,
  markInvoicePaid
};
