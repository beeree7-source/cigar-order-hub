const express = require('express');
const {
  generateInvoice,
  getInvoices,
  getInvoiceDetails,
  getInvoicePDF,
  sendInvoiceEmail,
  markInvoicePaid
} = require('./invoices');

const router = express.Router();

router.post('/order/:id/generate', generateInvoice);
router.get('/', getInvoices);
router.get('/:id', getInvoiceDetails);
router.get('/:id/pdf', getInvoicePDF);
router.post('/:id/email', sendInvoiceEmail);
router.post('/:id/pay', (req, res) => {
  req.body = { ...req.body, status: 'paid' };
  return markInvoicePaid(req, res);
});
router.patch('/:id/status', markInvoicePaid);

module.exports = router;
