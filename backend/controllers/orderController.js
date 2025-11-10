const Order = require('../models/Order');
const Product = require('../models/Product');
const { ErrorResponse } = require('../middleware/errorHandler');
const { calculateOrderTotal } = require('../config/stripe');

// @desc    Get all orders (for admin) or user's orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res, next) => {
  try {
    let query;

    // Admin can see all orders, users see only their own
    if (req.user.role === 'admin') {
      query = Order.find();
    } else {
      query = Order.find({ user: req.user.id });
    }

    const orders = await query
      .populate('user', 'firstName lastName email')
      .populate('items.product', 'name imageUrl')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name imageUrl category');

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check ownership (unless admin)
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to view this order', 403));
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new order (for mock payments)
// @route   POST /api/orders
// @access  Private
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, billingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return next(new ErrorResponse('No order items provided', 400));
    }

    // Validate stock and calculate totals
    let subtotal = 0;
    const orderItems = [];

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

      orderItems.push({
        product: product._id,
        productName: product.name,
        productImage: product.imageUrl,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal
      });

      // Reduce stock
      await product.updateStock(item.quantity, 'subtract');
    }

    // Calculate totals
    const orderTotal = calculateOrderTotal(subtotal);

    // Create order
    const order = await Order.create({
      user: req.user.id,
      userEmail: req.user.email,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      items: orderItems,
      shippingAddress,
      billingAddress,
      subtotal: orderTotal.subtotal,
      shipping: orderTotal.shipping,
      tax: orderTotal.tax,
      total: orderTotal.total,
      paymentMethod: paymentMethod || 'mock',
      paymentStatus: paymentMethod === 'mock' ? 'paid' : 'pending',
      paidAt: paymentMethod === 'mock' ? new Date() : undefined,
      orderStatus: paymentMethod === 'mock' ? 'processing' : 'pending'
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin/Seller)
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, trackingNumber } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    if (status === 'shipped' && trackingNumber) {
      await order.markAsShipped(trackingNumber);
    } else if (status === 'delivered') {
      await order.markAsDelivered();
    } else {
      order.orderStatus = status;
      await order.save();
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse('Order not found', 404));
    }

    // Check ownership (unless admin)
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to cancel this order', 403));
    }

    const { reason } = req.body;
    await order.cancelOrder(reason || 'Cancelled by user');

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        await product.updateStock(item.quantity, 'add');
      }
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
