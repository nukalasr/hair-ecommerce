export const environment = {
  production: true,
  // Stripe Publishable Key (Live Mode)
  // Replace with your live key from https://dashboard.stripe.com/apikeys
  stripePublishableKey: 'pk_live_REPLACE_WITH_YOUR_LIVE_KEY',

  // Production API URL
  apiUrl: 'https://your-api.com/api',

  // Sentry Error Monitoring
  // REQUIRED for production - Create a project at https://sentry.io and add your DSN
  sentryDsn: 'https://YOUR_SENTRY_DSN@o0.ingest.sentry.io/0000000',

  // Tax rate (8%)
  taxRate: 0.08,

  // Shipping configuration
  freeShippingThreshold: 100,
  shippingCost: 10
};
