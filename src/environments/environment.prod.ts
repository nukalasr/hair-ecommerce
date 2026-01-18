/**
 * Production Environment Configuration
 *
 * IMPORTANT: Before deploying to production, you MUST:
 * 1. Get Stripe live API keys from https://dashboard.stripe.com/apikeys
 * 2. Deploy backend API and get the production URL
 * 3. Create Sentry project at https://sentry.io and get DSN
 * 4. Update all values below with real production credentials
 *
 * SECURITY: These values will be visible in the compiled JavaScript bundle.
 * Only put publishable/public keys here. NEVER put secret keys.
 */

export const environment = {
  production: true,

  // Stripe Publishable Key (Live Mode)
  // Get from: https://dashboard.stripe.com/apikeys
  // Use LIVE key starting with: pk_live_...
  // NOTE: For testing, you can use test key: pk_test_...
  stripePublishableKey: '', // TODO: Add your Stripe publishable key

  // Production API URL
  // Example: 'https://api.yourdomain.com/api' or 'https://your-app.railway.app/api'
  // IMPORTANT: Must match your deployed backend URL
  apiUrl: '', // TODO: Add your backend API URL

  // Sentry Error Monitoring DSN
  // Get from: https://sentry.io (create a new Angular project)
  // Leave empty to disable error monitoring
  sentryDsn: '', // TODO: Add your Sentry DSN (optional but recommended)

  // Tax rate (8% - update based on your location)
  taxRate: 0.08,

  // Shipping configuration
  freeShippingThreshold: 100,
  shippingCost: 10
};

/**
 * Deployment Checklist:
 *
 * Before building for production (npm run build:prod):
 * ✅ stripePublishableKey - Added Stripe key
 * ✅ apiUrl - Added backend API URL
 * ✅ sentryDsn - Added Sentry DSN (optional)
 * ✅ Backend deployed and accessible
 * ✅ Database connected (MongoDB Atlas)
 * ✅ Environment variables configured on hosting platform
 *
 * Security Reminders:
 * ❌ NEVER put secret keys (sk_live_..., sk_test_...) in this file
 * ❌ NEVER commit real credentials to git
 * ✅ Only publishable/public keys are safe here
 * ✅ Configure backend environment variables separately
 */
