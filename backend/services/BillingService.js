/**
 * Billing Service
 * Handles billing cycle management, invoicing, and payments
 */

const {
  BillingHistoryModel,
  PaymentMethodModel,
  SubscriptionModel,
  SubscriptionTierModel
} = require('../models/SubscriptionModels');

class BillingService {
  constructor() {
    this.billingModel = new BillingHistoryModel();
    this.paymentModel = new PaymentMethodModel();
    this.subscriptionModel = new SubscriptionModel();
    this.tierModel = new SubscriptionTierModel();
  }

  /**
   * Get billing history for a retailer
   * @param {number} retailerId - Retailer ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getBillingHistory(retailerId, options = {}) {
    try {
      return await this.billingModel.getRetailerBillingHistory(retailerId, options);
    } catch (error) {
      throw new Error(`Failed to get billing history: ${error.message}`);
    }
  }

  /**
   * Get a specific invoice
   * @param {number} invoiceId - Invoice ID
   * @param {number} retailerId - Retailer ID (for security check)
   * @returns {Promise<Object>}
   */
  async getInvoice(invoiceId, retailerId) {
    try {
      const invoice = await this.billingModel.findById(invoiceId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Security check - ensure invoice belongs to retailer
      if (invoice.retailer_id !== retailerId) {
        throw new Error('Access denied');
      }

      return invoice;
    } catch (error) {
      throw new Error(`Failed to get invoice: ${error.message}`);
    }
  }

  /**
   * Get unpaid invoices for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Array>}
   */
  async getUnpaidInvoices(retailerId) {
    try {
      return await this.billingModel.getUnpaidInvoices(retailerId);
    } catch (error) {
      throw new Error(`Failed to get unpaid invoices: ${error.message}`);
    }
  }

  /**
   * Create an invoice
   * @param {Object} data - Invoice data
   * @returns {Promise<number>} Invoice ID
   */
  async createInvoice(data) {
    try {
      const {
        retailerId,
        subscriptionId,
        invoiceType = 'subscription',
        amount,
        taxAmount = 0,
        description,
        dueDate
      } = data;

      const totalAmount = amount + taxAmount;
      const invoiceNumber = await this.billingModel.generateInvoiceNumber();
      const now = new Date();
      const due = dueDate ? new Date(dueDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const invoiceId = await this.billingModel.create({
        retailer_id: retailerId,
        subscription_id: subscriptionId,
        invoice_number: invoiceNumber,
        invoice_type: invoiceType,
        amount: amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency: 'USD',
        status: 'pending',
        invoice_date: now.toISOString(),
        due_date: due.toISOString(),
        description: description || 'Subscription payment'
      });

      return invoiceId;
    } catch (error) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  /**
   * Mark an invoice as paid
   * @param {number} invoiceId - Invoice ID
   * @param {Object} paymentData - Payment data
   * @returns {Promise<void>}
   */
  async markInvoicePaid(invoiceId, paymentData = {}) {
    try {
      const {
        paymentMethod = 'card',
        stripePaymentIntentId = null,
        paidAt = new Date().toISOString()
      } = paymentData;

      await this.billingModel.update(invoiceId, {
        status: 'paid',
        paid_at: paidAt,
        payment_method: paymentMethod,
        stripe_payment_intent_id: stripePaymentIntentId
      });
    } catch (error) {
      throw new Error(`Failed to mark invoice as paid: ${error.message}`);
    }
  }

  /**
   * Mark an invoice as failed
   * @param {number} invoiceId - Invoice ID
   * @param {string} reason - Failure reason
   * @returns {Promise<void>}
   */
  async markInvoiceFailed(invoiceId, reason = '') {
    try {
      await this.billingModel.update(invoiceId, {
        status: 'failed',
        metadata: JSON.stringify({ failure_reason: reason })
      });
    } catch (error) {
      throw new Error(`Failed to mark invoice as failed: ${error.message}`);
    }
  }

  /**
   * Issue a refund
   * @param {number} originalInvoiceId - Original invoice ID
   * @param {number} refundAmount - Refund amount
   * @param {string} reason - Refund reason
   * @returns {Promise<number>} Refund invoice ID
   */
  async issueRefund(originalInvoiceId, refundAmount, reason = '') {
    try {
      const originalInvoice = await this.billingModel.findById(originalInvoiceId);
      
      if (!originalInvoice) {
        throw new Error('Original invoice not found');
      }

      if (originalInvoice.status !== 'paid') {
        throw new Error('Can only refund paid invoices');
      }

      // Create refund invoice (negative amount)
      const refundInvoiceId = await this.createInvoice({
        retailerId: originalInvoice.retailer_id,
        subscriptionId: originalInvoice.subscription_id,
        invoiceType: 'refund',
        amount: -refundAmount,
        taxAmount: 0,
        description: `Refund for ${originalInvoice.invoice_number}: ${reason}`
      });

      // Mark as paid immediately (refund processed)
      await this.markInvoicePaid(refundInvoiceId, {
        paymentMethod: 'refund'
      });

      // Update original invoice metadata
      await this.billingModel.update(originalInvoiceId, {
        metadata: JSON.stringify({
          refunded: true,
          refund_amount: refundAmount,
          refund_invoice_id: refundInvoiceId,
          refund_reason: reason
        })
      });

      return refundInvoiceId;
    } catch (error) {
      throw new Error(`Failed to issue refund: ${error.message}`);
    }
  }

  /**
   * Get payment methods for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Array>}
   */
  async getPaymentMethods(retailerId) {
    try {
      return await this.paymentModel.getRetailerPaymentMethods(retailerId);
    } catch (error) {
      throw new Error(`Failed to get payment methods: ${error.message}`);
    }
  }

  /**
   * Add a payment method
   * @param {Object} data - Payment method data
   * @returns {Promise<number>} Payment method ID
   */
  async addPaymentMethod(data) {
    try {
      const {
        retailerId,
        paymentType,
        isDefault = false,
        stripePaymentMethodId,
        cardBrand,
        cardLast4,
        cardExpMonth,
        cardExpYear,
        billingName,
        billingEmail,
        billingAddress
      } = data;

      // If this is the first payment method or marked as default, make it default
      const existing = await this.paymentModel.getRetailerPaymentMethods(retailerId);
      const shouldBeDefault = isDefault || existing.length === 0;

      const paymentMethodId = await this.paymentModel.create({
        retailer_id: retailerId,
        payment_type: paymentType,
        is_default: shouldBeDefault ? 1 : 0,
        stripe_payment_method_id: stripePaymentMethodId,
        card_brand: cardBrand,
        card_last4: cardLast4,
        card_exp_month: cardExpMonth,
        card_exp_year: cardExpYear,
        billing_name: billingName,
        billing_email: billingEmail,
        billing_address: billingAddress ? JSON.stringify(billingAddress) : null,
        is_active: 1
      });

      // If this should be default, unset other defaults
      if (shouldBeDefault) {
        await this.paymentModel.setDefaultPaymentMethod(paymentMethodId, retailerId);
      }

      return paymentMethodId;
    } catch (error) {
      throw new Error(`Failed to add payment method: ${error.message}`);
    }
  }

  /**
   * Set default payment method
   * @param {number} paymentMethodId - Payment method ID
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<void>}
   */
  async setDefaultPaymentMethod(paymentMethodId, retailerId) {
    try {
      // Verify payment method belongs to retailer
      const paymentMethod = await this.paymentModel.findById(paymentMethodId);
      
      if (!paymentMethod || paymentMethod.retailer_id !== retailerId) {
        throw new Error('Payment method not found or access denied');
      }

      await this.paymentModel.setDefaultPaymentMethod(paymentMethodId, retailerId);
    } catch (error) {
      throw new Error(`Failed to set default payment method: ${error.message}`);
    }
  }

  /**
   * Remove a payment method
   * @param {number} paymentMethodId - Payment method ID
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<void>}
   */
  async removePaymentMethod(paymentMethodId, retailerId) {
    try {
      // Verify payment method belongs to retailer
      const paymentMethod = await this.paymentModel.findById(paymentMethodId);
      
      if (!paymentMethod || paymentMethod.retailer_id !== retailerId) {
        throw new Error('Payment method not found or access denied');
      }

      // Don't allow removing the last payment method if there's an active subscription
      const subscription = await this.subscriptionModel.getActiveSubscription(retailerId);
      const allMethods = await this.paymentModel.getRetailerPaymentMethods(retailerId);
      
      if (subscription && allMethods.length === 1) {
        throw new Error('Cannot remove the last payment method while subscription is active');
      }

      // Soft delete (mark as inactive)
      await this.paymentModel.update(paymentMethodId, { is_active: 0 });

      // If this was the default, set another as default
      if (paymentMethod.is_default) {
        const remaining = await this.paymentModel.getRetailerPaymentMethods(retailerId);
        if (remaining.length > 0) {
          await this.paymentModel.setDefaultPaymentMethod(remaining[0].id, retailerId);
        }
      }
    } catch (error) {
      throw new Error(`Failed to remove payment method: ${error.message}`);
    }
  }

  /**
   * Calculate total revenue for a period
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<number>}
   */
  async calculateRevenue(startDate, endDate) {
    try {
      return await this.billingModel.getTotalRevenue(startDate, endDate);
    } catch (error) {
      throw new Error(`Failed to calculate revenue: ${error.message}`);
    }
  }

  /**
   * Get billing summary for a retailer
   * @param {number} retailerId - Retailer ID
   * @returns {Promise<Object>}
   */
  async getBillingSummary(retailerId) {
    try {
      const subscription = await this.subscriptionModel.getActiveSubscription(retailerId);
      const unpaidInvoices = await this.getUnpaidInvoices(retailerId);
      const paymentMethods = await this.getPaymentMethods(retailerId);

      // Calculate total outstanding
      const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

      // Get next billing date
      let nextBillingDate = null;
      if (subscription) {
        nextBillingDate = subscription.current_period_end;
      }

      return {
        subscription: subscription ? {
          tier: subscription.tier_name,
          status: subscription.status,
          billingCycle: subscription.billing_cycle,
          nextBillingDate,
          amount: subscription.billing_cycle === 'monthly' 
            ? subscription.monthly_price 
            : subscription.annual_price
        } : null,
        unpaidInvoices: unpaidInvoices.length,
        totalOutstanding,
        paymentMethods: paymentMethods.length,
        hasDefaultPayment: paymentMethods.some(pm => pm.is_default)
      };
    } catch (error) {
      throw new Error(`Failed to get billing summary: ${error.message}`);
    }
  }

  /**
   * Process overdue invoices (called by cron job)
   * @returns {Promise<Object>}
   */
  async processOverdueInvoices() {
    try {
      const now = new Date().toISOString();
      const query = `
        SELECT *
        FROM retailer_billing_history
        WHERE status = 'pending'
          AND due_date < ?
      `;
      
      const overdueInvoices = await this.billingModel.query(query, [now]);
      const results = { processed: 0, failed: 0 };

      for (const invoice of overdueInvoices) {
        try {
          // Here you would integrate with payment processor (Stripe, etc.)
          // For now, we'll just mark them as failed
          await this.markInvoiceFailed(invoice.id, 'Payment overdue');
          results.processed++;
        } catch (error) {
          console.error(`Failed to process invoice ${invoice.id}:`, error);
          results.failed++;
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to process overdue invoices: ${error.message}`);
    }
  }
}

module.exports = BillingService;
