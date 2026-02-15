# Subscription Setup Guide

## Introduction
This guide provides comprehensive documentation on the subscription tier payment system implemented in the Cigar Order Hub. It covers different subscription levels, payment processing, and user management.

## Subscription Tiers
### 1. Basic Tier
- **Description**: Ideal for casual users.
- **Cost**: $10/month
- **Benefits**:
  - Access to basic features.

### 2. Premium Tier
- **Description**: For frequent users requiring more features.
- **Cost**: $25/month
- **Benefits**:
  - All Basic Tier features.
  - Priority customer support.
  - Exclusive discounts on products.

### 3. VIP Tier
- **Description**: The ultimate experience for enthusiasts.
- **Cost**: $50/month
- **Benefits**:
  - All Premium Tier features.
  - Early access to new products.
  - Invitations to exclusive events.

## Payment Processing
Payment for subscriptions is handled through a secure payment gateway. Ensure the following is set up:
- **API Key**: Obtain your API key from the payment provider.
- **Webhook URL**: Set up a webhook URL to handle asynchronous notifications from the payment provider.

### Example Payment Request
```json
{
  "amount": 2500,  // amount in cents for Premium Tier
  "currency": "USD",
  "payment_method": "card",
  "description": "Subscription fee for Premium Tier"
}
```

## User Management

### Subscribing to a Tier
Users can subscribe through the following steps:
1. **Select Subscription Tier**: Choose the desired subscription from the options.
2. **Enter Payment Information**: Fill out the payment form with valid card details.
3. **Confirmation**: Once the payment is processed, users will receive a confirmation email.

### Managing Subscriptions
Users can manage their subscriptions from the dashboard where they can:
- Upgrade or downgrade their subscription tier.
- View billing history.
- Cancel subscription.

## FAQ
**Q1**: How can I change my subscription tier?
**A1**: You can change your tier from the user dashboard.

**Q2**: What happens if I miss a payment?
**A2**: You will receive an email notification, and your account may be temporarily suspended until the payment is processed.

## Conclusion
This guide should serve as a comprehensive resource for managing subscriptions within the Cigar Order Hub. For any further assistance, please contact support at support@cigarorderhub.com.
