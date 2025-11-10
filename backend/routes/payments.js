const express = require('express');
const router = express.Router();
const {
  createCheckoutSession,
  webhookHandler,
  createPaymentIntent
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Webhook route MUST be before express.json() middleware
router.post('/webhook', express.raw({ type: 'application/json' }), webhookHandler);

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/create-payment-intent', protect, createPaymentIntent);

module.exports = router;
