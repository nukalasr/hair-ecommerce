const Stripe = require('stripe');

/**
 * Initialize Stripe with secret key
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: false,
});

/**
 * Stripe configuration constants
 */
const stripeConfig = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: 'usd',

  // Payment settings
  paymentMethodTypes: ['card'],

  // Shipping calculation
  shippingCost: 10.00, // $10 flat rate
  freeShippingThreshold: 100.00, // Free shipping over $100

  // Tax rate (8%)
  taxRate: 0.08,
};

/**
 * Calculate order total with tax and shipping
 */
const calculateOrderTotal = (subtotal) => {
  const shipping = subtotal >= stripeConfig.freeShippingThreshold ? 0 : stripeConfig.shippingCost;
  const tax = subtotal * stripeConfig.taxRate;
  const total = subtotal + shipping + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

/**
 * Convert dollar amount to cents for Stripe
 */
const dollarsToCents = (dollars) => {
  return Math.round(dollars * 100);
};

/**
 * Convert cents to dollars
 */
const centsToDollars = (cents) => {
  return cents / 100;
};

module.exports = {
  stripe,
  stripeConfig,
  calculateOrderTotal,
  dollarsToCents,
  centsToDollars
};
