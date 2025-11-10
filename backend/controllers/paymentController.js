const { stripe, calculateOrderTotal, dollarsToCents } = require('../config/stripe');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { ErrorResponse } = require('../middleware/errorHandler');

/**
 * @desc    Create Stripe Checkout Session
 * @route   POST /api/payments/create-checkout-session
 * @access  Private
 */
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { items, shippingAddress, billingAddress } = req.body;

    if (!items || items.length === 0) {
      return next(new ErrorResponse('Cart is empty', 400));
    }

    // Validate stock and calculate totals
    let subtotal = 0;
    const lineItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product) {
        return next(new ErrorResponse(`Product ${item.product} not found`, 404));
      }

      if (product.stock < item.quantity) {
        return next(
          new ErrorResponse(
            `Insufficient stock for ${product.name}. Available: ${product.stock}`,
            400
          )
        );
      }

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            description: `${product.texture} ${product.category}`,
            images: [product.imageUrl]
          },
          unit_amount: dollarsToCents(product.price)
        },
        quantity: item.quantity
      });
    }

    // Calculate order totals
    const orderTotal = calculateOrderTotal(subtotal);

    // Add shipping as a line item if not free
    if (orderTotal.shipping > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping',
            description: 'Standard shipping'
          },
          unit_amount: dollarsToCents(orderTotal.shipping)
        },
        quantity: 1
      });
    }

    // Add tax as a line item
    if (orderTotal.tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax',
            description: 'Sales tax (8%)'
          },
          unit_amount: dollarsToCents(orderTotal.tax)
        },
        quantity: 1
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout`,
      customer_email: req.user.email,
      client_reference_id: req.user.id,
      metadata: {
        userId: req.user.id.toString(),
        shippingAddress: JSON.stringify(shippingAddress),
        billingAddress: JSON.stringify(billingAddress),
        items: JSON.stringify(items.map(i => ({
          product: i.product,
          quantity: i.quantity
        })))
      }
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Stripe Webhook Handler
 * @route   POST /api/payments/webhook
 * @access  Public (Stripe only)
 */
exports.webhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * @desc    Get payment intent client secret
 * @route   POST /api/payments/create-payment-intent
 * @access  Private
 */
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return next(new ErrorResponse('Invalid amount', 400));
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: dollarsToCents(amount),
      currency: 'usd',
      metadata: {
        userId: req.user.id.toString()
      }
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle successful checkout session completion
 */
async function handleCheckoutComplete(session) {
  try {
    const metadata = session.metadata;
    const userId = metadata.userId;
    const items = JSON.parse(metadata.items);
    const shippingAddress = JSON.parse(metadata.shippingAddress);
    const billingAddress = JSON.parse(metadata.billingAddress);

    // Get user
    const User = require('../models/User');
    const user = await User.findById(userId);

    if (!user) {
      console.error('User not found for checkout session:', userId);
      return;
    }

    // Calculate totals
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      const itemSubtotal = product.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.imageUrl,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal
      });

      // Update product stock
      await product.updateStock(item.quantity, 'subtract');
    }

    const orderTotal = calculateOrderTotal(subtotal);

    // Create order
    const order = await Order.create({
      user: userId,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal: orderTotal.subtotal,
      shipping: orderTotal.shipping,
      tax: orderTotal.tax,
      total: orderTotal.total,
      paymentMethod: 'stripe',
      paymentStatus: 'paid',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      transactionId: session.payment_intent,
      paidAt: new Date(),
      orderStatus: 'processing'
    });

    console.log('✅ Order created successfully:', order.orderNumber);

    // TODO: Send order confirmation email
  } catch (error) {
    console.error('Error handling checkout complete:', error);
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentSuccess(paymentIntent) {
  console.log('✅ Payment succeeded:', paymentIntent.id);
  // Additional payment success handling if needed
}

/**
 * Handle failed payment intent
 */
async function handlePaymentFailed(paymentIntent) {
  console.log('❌ Payment failed:', paymentIntent.id);

  // Find and update order
  const order = await Order.findOne({
    stripePaymentIntentId: paymentIntent.id
  });

  if (order) {
    order.paymentStatus = 'failed';
    await order.save();
  }
}

module.exports = exports;
