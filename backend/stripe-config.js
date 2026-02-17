// stripe-config.js

const stripe = require('stripe')('YOUR_SECRET_KEY'); // Replace with your actual secret key

// Utility functions for customer management

/**
 * Create a new customer in Stripe
 * @param {string} email - Customer's email address
 * @returns {Promise} - Promise resolving with the created customer
 */
const createCustomer = async (email) => {
    return await stripe.customers.create({ email });
};

/**
 * Create a checkout session for a specific product
 * @param {string} priceId - Price ID for the Stripe product
 * @param {string} successUrl - URL to redirect to on success
 * @param {string} cancelUrl - URL to redirect to on cancel
 * @returns {Promise} - Promise resolving with the created session
 */
const createCheckoutSession = async (priceId, successUrl, cancelUrl) => {
    return await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
    });
};

// Subscription management

/**
 * Create a subscription for a customer
 * @param {string} customerId - The customer's ID in Stripe
 * @param {string} priceId - Price ID for subscription
 * @returns {Promise} - Promise resolving with the created subscription
 */
const createSubscription = async (customerId, priceId) => {
    return await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
    });
};

// Webhook verification

/**
 * Verify the webhook signature
 * @param {string} payload - The payload of the webhook
 * @param {string} sig - The webhook signature
 * @returns {boolean} - Returns true if the signature is valid
 */
const verifyWebhookSignature = (payload, sig) => {
    const endpointSecret = 'YOUR_ENDPOINT_SECRET'; // Set your endpoint secret
    try {
        return stripe.webhooks.verifyHeader(payload, sig, endpointSecret);
    } catch (err) {
        return false;
    }
};

module.exports = {
    createCustomer,
    createCheckoutSession,
    createSubscription,
    verifyWebhookSignature,
};