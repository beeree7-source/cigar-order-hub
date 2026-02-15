const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const logger = require('pino')(); // Sample logger

// Rate limit to prevent abuse of the email sending
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Set up Nodemailer transport
const transporter = nodemailer.createTransport({
  service: 'Gmail', // Example with Gmail
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(to, subject, text) {
  try {
    // Input validation
    if (!to || !subject || !text) {
      throw new Error('All fields are required');
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}`);
  } catch (error) {
    logger.error(`Failed to send email: ${error.message}`);
    throw new Error('Failed to send email'); // Rethrow for further handling
  }
}

module.exports = { sendEmail, emailLimiter };