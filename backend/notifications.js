const db = require('./database');

/**
 * Email Notifications Service
 * Handles email notifications with HTML templates
 * Supports: low stock alerts, order confirmations, shipment notifications, 
 * payment reminders, and weekly summaries
 */

// Mock email service (simulates sending emails)
// In production, replace with nodemailer/SendGrid
// NOTE: This is a development mock - emails are only logged to console
// Email addresses are NOT validated and no actual emails are sent
const sendEmail = async (to, subject, body) => {
  // Simulate email sending delay
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`📧 [MOCK EMAIL] To: ${to}, Subject: ${subject}`);
      resolve({ success: true, messageId: Date.now().toString() });
    }, 100);
  });
};

/**
 * Email template generator
 */
const generateEmailTemplate = (type, data) => {
  const templates = {
    low_stock: {
      subject: `Low Stock Alert: ${data.productName}`,
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Low Stock Alert</h2>
            <p>The following product is running low on stock:</p>
            <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <strong>Product:</strong> ${data.productName}<br>
              <strong>SKU:</strong> ${data.sku}<br>
              <strong>Current Stock:</strong> ${data.stock} units<br>
              <strong>Minimum Stock:</strong> ${data.minStock || 10} units
            </div>
            <p>Please restock this item to avoid order fulfillment delays.</p>
          </body>
        </html>
      `
    },
    order_confirmation: {
      subject: `Order Confirmation #${data.orderId}`,
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Order Confirmation</h2>
            <p>Thank you for your order! Your order has been confirmed.</p>
            <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <strong>Order ID:</strong> ${data.orderId}<br>
              <strong>Date:</strong> ${data.createdAt}<br>
              <strong>Status:</strong> ${data.status}<br>
              <strong>Total Items:</strong> ${data.itemCount}
            </div>
            <p>We'll notify you when your order ships.</p>
          </body>
        </html>
      `
    },
    shipment: {
      subject: `Order #${data.orderId} Shipped`,
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Your Order Has Shipped!</h2>
            <p>Good news! Your order is on its way.</p>
            <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <strong>Order ID:</strong> ${data.orderId}<br>
              <strong>Tracking Number:</strong> ${data.trackingNumber || 'N/A'}<br>
              <strong>Carrier:</strong> ${data.carrier || 'Standard Shipping'}<br>
              <strong>Estimated Delivery:</strong> ${data.estimatedDelivery || 'Within 5-7 business days'}
            </div>
          </body>
        </html>
      `
    },
    payment_reminder: {
      subject: `Payment Reminder - Invoice #${data.invoiceNumber}`,
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Payment Reminder</h2>
            <p>This is a friendly reminder that payment is due for the following invoice:</p>
            <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <strong>Invoice Number:</strong> ${data.invoiceNumber}<br>
              <strong>Amount Due:</strong> $${data.amountDue}<br>
              <strong>Due Date:</strong> ${data.dueDate}<br>
              <strong>Days Past Due:</strong> ${data.daysPastDue || 0}
            </div>
            <p>Please submit payment at your earliest convenience.</p>
          </body>
        </html>
      `
    },
    weekly_summary: {
      subject: `Weekly Summary - ${data.weekRange}`,
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Weekly Summary Report</h2>
            <p>Here's your business summary for ${data.weekRange}:</p>
            <div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">
              <strong>Total Orders:</strong> ${data.totalOrders}<br>
              <strong>Revenue:</strong> $${data.revenue}<br>
              <strong>New Customers:</strong> ${data.newCustomers}<br>
              <strong>Pending Orders:</strong> ${data.pendingOrders}
            </div>
            <p>Keep up the great work!</p>
          </body>
        </html>
      `
    }
  };

  return templates[type] || { subject: 'Notification', body: 'You have a new notification.' };
};

/**
 * Send test email
 */
const sendTestEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const template = generateEmailTemplate('order_confirmation', {
      orderId: 'TEST-123',
      createdAt: new Date().toLocaleString(),
      status: 'Confirmed',
      itemCount: 5
    });

    const result = await sendEmail(email, template.subject, template.body);

    // Log notification
    db.run(
      `INSERT INTO notifications (user_id, type, subject, body, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'test', template.subject, template.body, 'sent']
    );

    res.json({ 
      success: true, 
      message: 'Test email sent successfully',
      messageId: result.messageId 
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
};

/**
 * Get notification settings
 */
const getNotificationSettings = async (req, res) => {
  try {
    db.get(
      `SELECT * FROM notification_settings WHERE user_id = ?`,
      [req.user.id],
      (err, settings) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Return default settings if none exist
        if (!settings) {
          return res.json({
            user_id: req.user.id,
            email_alerts: 1,
            sms_alerts: 0,
            low_stock_alert: 1,
            order_confirmation: 1,
            shipment_notification: 1,
            payment_reminder: 1,
            weekly_summary: 1
          });
        }

        res.json(settings);
      }
    );
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

/**
 * Update notification settings
 */
const updateNotificationSettings = async (req, res) => {
  try {
    const {
      email_alerts,
      sms_alerts,
      low_stock_alert,
      order_confirmation,
      shipment_notification,
      payment_reminder,
      weekly_summary
    } = req.body;

    // Check if settings exist
    db.get(
      `SELECT id FROM notification_settings WHERE user_id = ?`,
      [req.user.id],
      (err, existing) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existing) {
          // Update existing settings
          db.run(
            `UPDATE notification_settings 
             SET email_alerts = ?, sms_alerts = ?, low_stock_alert = ?,
                 order_confirmation = ?, shipment_notification = ?,
                 payment_reminder = ?, weekly_summary = ?
             WHERE user_id = ?`,
            [email_alerts, sms_alerts, low_stock_alert, order_confirmation,
             shipment_notification, payment_reminder, weekly_summary, req.user.id],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to update settings' });
              }
              res.json({ success: true, message: 'Settings updated successfully' });
            }
          );
        } else {
          // Insert new settings
          db.run(
            `INSERT INTO notification_settings 
             (user_id, email_alerts, sms_alerts, low_stock_alert, 
              order_confirmation, shipment_notification, payment_reminder, weekly_summary)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, email_alerts, sms_alerts, low_stock_alert, 
             order_confirmation, shipment_notification, payment_reminder, weekly_summary],
            (err) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to create settings' });
              }
              res.json({ success: true, message: 'Settings created successfully' });
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};

/**
 * Get notification history
 */
const getNotificationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ?
    `;
    const params = [req.user.id];

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY sent_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    db.all(query, params, (err, notifications) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM notifications WHERE user_id = ?`;
      const countParams = [req.user.id];
      if (type) {
        countQuery += ` AND type = ?`;
        countParams.push(type);
      }

      db.get(countQuery, countParams, (err, result) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          notifications,
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
    console.error('Error fetching notification history:', error);
    res.status(500).json({ error: 'Failed to fetch notification history' });
  }
};

/**
 * Send low stock alert email
 */
const sendLowStockAlert = async (userId, productData) => {
  try {
    // Get user email
    db.get(`SELECT email FROM users WHERE id = ?`, [userId], async (err, user) => {
      if (err || !user) return;

      // Check if user has low stock alerts enabled
      db.get(
        `SELECT low_stock_alert FROM notification_settings WHERE user_id = ?`,
        [userId],
        async (err, settings) => {
          if (settings && !settings.low_stock_alert) return;

          const template = generateEmailTemplate('low_stock', productData);
          await sendEmail(user.email, template.subject, template.body);

          // Log notification
          db.run(
            `INSERT INTO notifications (user_id, type, subject, body, status) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, 'low_stock', template.subject, template.body, 'sent']
          );
        }
      );
    });
  } catch (error) {
    console.error('Error sending low stock alert:', error);
  }
};

module.exports = {
  sendTestEmail,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationHistory,
  sendLowStockAlert,
  generateEmailTemplate,
  sendEmail
};
