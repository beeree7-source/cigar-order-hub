/**
 * Email Service Configuration
 * Used for sending notifications, invoices, and alerts
 */

module.exports = {
  // Service provider (gmail, sendgrid, smtp, etc.)
  service: process.env.EMAIL_SERVICE || 'gmail',
  
  // SMTP Configuration
  smtp: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  },
  
  // Default sender
  from: process.env.EMAIL_FROM || 'noreply@cigar-order-hub.com',
  
  // Email templates
  templates: {
    lowStock: {
      minStock: 10,
      alertThreshold: 5
    },
    invoiceReminder: {
      daysBeforeDue: 7,
      daysAfterDue: 3
    },
    weeklySummary: {
      dayOfWeek: 1, // Monday
      hour: 9 // 9 AM
    }
  },
  
  // Rate limiting
  rateLimit: {
    maxPerHour: 100,
    maxPerDay: 1000
  }
};
