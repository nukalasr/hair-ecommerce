export const environment = {
  production: false,
  // Stripe Publishable Key (Test Mode)
  // Replace with your own test key from https://dashboard.stripe.com/test/apikeys
  stripePublishableKey: 'pk_test_51234567890abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz',

  // API Configuration
  // In production, replace with your actual backend API URL
  apiUrl: 'http://localhost:3000/api',

  // Tax rate (8%)
  taxRate: 0.08,

  // Shipping configuration
  freeShippingThreshold: 100,
  shippingCost: 10
};
