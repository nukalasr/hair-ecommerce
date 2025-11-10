# Stripe Payment Integration Guide

This document explains how the Stripe payment integration works in this Angular hair ecommerce application and what's needed to make it fully functional.

## Overview

The application includes **client-side Stripe integration** using `@stripe/stripe-js`. However, **a backend API is required** for production use to securely handle payment processing.

---

## Current Implementation Status

### ✅ What's Implemented (Client-Side)

1. **Stripe SDK Integration**
   - `@stripe/stripe-js` package installed
   - `PaymentService` created with Stripe integration methods
   - Environment configuration for Stripe publishable keys

2. **Order Management**
   - `OrderService` for creating and managing orders
   - Order model with payment status tracking
   - Order success page with order details

3. **Checkout Flow**
   - Updated checkout component with payment options
   - Mock payment processing for testing
   - Order totals calculation (subtotal, shipping, tax)

4. **Security Features**
   - Stock validation before order placement
   - Address validation with ZIP code format checking
   - Secure order ID generation
   - No client-side card data storage

### ❌ What's Missing (Requires Backend)

1. **Payment Intent Creation**
   - Backend API endpoint to create Stripe payment intents
   - Server-side amount validation
   - Currency and metadata handling

2. **Payment Confirmation**
   - Webhook handling for payment status
   - Server-side order status updates
   - Payment verification

3. **Security**
   - Stripe secret key (server-side only)
   - Payment amount validation
   - Anti-fraud measures

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Angular Frontend                                       │
│  ┌──────────────┐        ┌──────────────┐             │
│  │  Checkout    │───────▶│   Payment    │             │
│  │  Component   │        │   Service    │             │
│  └──────────────┘        └──────┬───────┘             │
│                                  │                      │
└──────────────────────────────────┼──────────────────────┘
                                   │
                         Needs Backend API
                                   │
┌──────────────────────────────────▼──────────────────────┐
│  Backend API (Node.js/Express/etc.)                     │
│  ┌──────────────────────────────────────────────┐      │
│  │  POST /api/create-checkout-session           │      │
│  │  - Creates Stripe Checkout Session           │      │
│  │  - Returns session ID                        │      │
│  └──────────────────────────────────────────────┘      │
│  ┌──────────────────────────────────────────────┐      │
│  │  POST /webhook/stripe                        │      │
│  │  - Receives payment confirmation             │      │
│  │  - Updates order status                      │      │
│  └──────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Stripe API                                             │
│  - Payment Processing                                   │
│  - Card Tokenization                                    │
│  - 3D Secure Authentication                             │
└─────────────────────────────────────────────────────────┘
```

---

## Setup Instructions

### 1. Get Stripe API Keys

1. Create a Stripe account at https://stripe.com
2. Go to Dashboard → Developers → API Keys
3. Copy your **Publishable Key** and **Secret Key**

**Test Mode Keys:**
- Publishable: `pk_test_...`
- Secret: `sk_test_...`

**Live Mode Keys:**
- Publishable: `pk_live_...`
- Secret: `sk_live_...`

### 2. Configure Frontend

Update the publishable key in environment files:

**`src/environments/environment.ts` (Development):**
```typescript
export const environment = {
  production: false,
  stripePublishableKey: 'pk_test_YOUR_TEST_KEY_HERE',
  apiUrl: 'http://localhost:3000/api'
};
```

**`src/environments/environment.prod.ts` (Production):**
```typescript
export const environment = {
  production: true,
  stripePublishableKey: 'pk_live_YOUR_LIVE_KEY_HERE',
  apiUrl: 'https://your-api.com/api'
};
```

### 3. Create Backend API (Required)

You need to create a backend server with the following endpoints:

#### Option A: Node.js/Express Backend

**Install dependencies:**
```bash
npm install stripe express cors dotenv
```

**Create `server.js`:**
```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Create Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { amount, currency, customerEmail, orderItems, shippingAddress } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: orderItems.map(item => ({
        price_data: {
          currency: currency,
          product_data: {
            name: item.name,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
      customer_email: customerEmail,
      metadata: {
        shippingAddress: JSON.stringify(shippingAddress)
      }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe Webhook Handler
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Update your database - mark order as paid
    console.log('Payment successful:', session.id);

    // TODO: Update order status in your database
  }

  res.json({ received: true });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**Environment variables (`.env`):**
```
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET
FRONTEND_URL=http://localhost:4200
```

#### Option B: Use Serverless Functions

Deploy backend endpoints as serverless functions on:
- **Vercel** - Vercel Functions
- **Netlify** - Netlify Functions
- **AWS** - Lambda Functions
- **Google Cloud** - Cloud Functions

### 4. Update Frontend to Call Backend

**In `src/app/services/payment.service.ts`:**

Replace the mock implementation with actual HTTP calls:

```typescript
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

constructor(private http: HttpClient) {
  this.stripePromise = loadStripe(environment.stripePublishableKey);
  this.initializeStripe();
}

createCheckoutSession(orderData: any): Observable<{ sessionId: string; error?: string }> {
  return this.http.post<{ sessionId: string }>(
    `${environment.apiUrl}/create-checkout-session`,
    orderData
  ).pipe(
    catchError(error => {
      console.error('Error creating checkout session:', error);
      return of({ sessionId: '', error: error.message });
    })
  );
}
```

**In `src/app/app.config.ts`:**

Add HTTP client provider:

```typescript
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient()  // Add this
  ]
};
```

### 5. Configure Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-api.com/webhook/stripe`
3. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret
5. Add to your backend environment variables

---

## Testing

### Test Mode Cards

Use these test card numbers in Stripe Checkout (test mode):

| Card Number         | Description          |
|---------------------|----------------------|
| 4242 4242 4242 4242 | Success              |
| 4000 0025 0000 3155 | 3D Secure Required   |
| 4000 0000 0000 9995 | Declined             |
| 4000 0000 0000 0069 | Expired Card         |

**Test Details:**
- **Expiry:** Any future date (e.g., 12/34)
- **CVV:** Any 3 digits (e.g., 123)
- **ZIP:** Any 5 digits (e.g., 12345)

### Testing the Flow

1. Start your backend server
2. Start Angular app: `npm start`
3. Add items to cart
4. Proceed to checkout
5. Fill in shipping address
6. Select "Stripe (Secure Payment)"
7. Click "Place Order"
8. Complete payment on Stripe Checkout page
9. Get redirected to order success page

---

## Current Demo Behavior

Without a backend, the application uses **mock payment processing**:

1. User selects "Mock Payment (Demo Only)"
2. Order is created locally
3. Mock transaction ID is generated
4. Order is saved to localStorage
5. User is redirected to success page with demo notice

**This is for demonstration purposes only** and should not be used in production.

---

## Security Considerations

### ✅ What We Do Right

1. **Never store card data** - Handled by Stripe
2. **Validate addresses** - ZIP code format validation
3. **Stock validation** - Check inventory before order
4. **Secure IDs** - Cryptographically random order IDs
5. **HTTPS only** - Stripe requires HTTPS in production

### ⚠️ Important Security Rules

1. **NEVER expose secret keys** - Server-side only
2. **Always validate server-side** - Don't trust client data
3. **Use webhooks** - Don't rely on client callbacks
4. **Validate amounts** - Recalculate totals on server
5. **Log everything** - Track payment attempts and failures

---

## Production Checklist

Before going live with Stripe payments:

- [ ] Backend API deployed and secured
- [ ] Stripe live keys configured (not test keys)
- [ ] HTTPS enabled on all endpoints
- [ ] Webhook endpoint configured and tested
- [ ] Webhook signing secret stored securely
- [ ] Database connected for order storage
- [ ] Email notifications set up
- [ ] Error logging implemented (Sentry, etc.)
- [ ] Rate limiting added to API endpoints
- [ ] CORS properly configured
- [ ] Environment variables secured (not in code)
- [ ] Payment testing completed with test cards
- [ ] Refund/cancellation flow implemented
- [ ] Customer support contact ready
- [ ] Privacy policy and terms of service published
- [ ] PCI compliance reviewed (handled by Stripe)

---

## Alternative: Stripe Payment Element

Instead of Stripe Checkout, you can use Stripe Payment Element for embedded payments:

**Benefits:**
- Customizable design
- Stays on your site
- More control over UX

**Drawbacks:**
- More complex implementation
- Need to handle 3D Secure
- More PCI responsibility

**Implementation example available in:**
`src/app/services/payment.service.ts` - See `createElements()` and `confirmCardPayment()` methods

---

## Cost

Stripe charges **2.9% + $0.30** per successful card charge.

**Example:**
- Order total: $100.00
- Stripe fee: $3.20
- You receive: $96.80

For exact pricing, see: https://stripe.com/pricing

---

## Support Resources

- **Stripe Documentation:** https://stripe.com/docs
- **Stripe Checkout Guide:** https://stripe.com/docs/payments/checkout
- **Testing Guide:** https://stripe.com/docs/testing
- **Webhook Guide:** https://stripe.com/docs/webhooks
- **API Reference:** https://stripe.com/docs/api

---

## Troubleshooting

### "Backend API required" error

**Solution:** Implement the backend API as described in this document.

### Stripe Checkout not loading

**Check:**
1. Publishable key is correct
2. Key matches environment (test/live)
3. Internet connection available
4. Browser console for errors

### Webhook not receiving events

**Check:**
1. Webhook URL is publicly accessible
2. HTTPS is enabled (required)
3. Signing secret is correct
4. Events are selected in Stripe Dashboard
5. Backend is processing webhook correctly

### Payment succeeds but order not updated

**Solution:** Implement webhook handler to update order status server-side.

---

## Conclusion

This application has a complete client-side Stripe integration ready to go. To make it production-ready:

1. Create a backend API (Node.js example provided)
2. Configure Stripe keys
3. Set up webhooks
4. Connect to database
5. Test thoroughly
6. Deploy securely

The hard work of PCI compliance, card tokenization, and secure payment processing is handled by Stripe, making it relatively straightforward to accept payments securely.

---

**Last Updated:** 2025-01-06
**Stripe API Version:** 2023-10-16
