const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productImage: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  items: [OrderItemSchema],
  shippingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'USA'
    }
  },
  billingAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'USA'
    }
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shipping: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    default: 'stripe'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  stripeCheckoutSessionId: {
    type: String,
    sparse: true
  },
  transactionId: {
    type: String
  },
  paidAt: {
    type: Date
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  trackingNumber: {
    type: String
  },
  shippedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  estimatedDelivery: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ stripePaymentIntentId: 1 });
OrderSchema.index({ stripeCheckoutSessionId: 1 });

// Pre-save middleware to generate order number
OrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.orderNumber) {
    // Generate order number: ORD-YYYYMMDD-XXXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.orderNumber = `ORD-${dateStr}-${randomStr}`;
  }
  next();
});

// Pre-save middleware to calculate estimated delivery
OrderSchema.pre('save', function(next) {
  if (this.isNew && !this.estimatedDelivery) {
    // Estimate 3-5 business days
    const days = Math.floor(Math.random() * 3) + 3;
    this.estimatedDelivery = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
  next();
});

// Method to mark as paid
OrderSchema.methods.markAsPaid = function(paymentIntent) {
  this.paymentStatus = 'paid';
  this.paidAt = new Date();
  if (paymentIntent) {
    this.transactionId = paymentIntent.id;
    this.stripePaymentIntentId = paymentIntent.id;
  }
  if (this.orderStatus === 'pending') {
    this.orderStatus = 'processing';
  }
  return this.save();
};

// Method to mark as shipped
OrderSchema.methods.markAsShipped = function(trackingNumber) {
  this.orderStatus = 'shipped';
  this.trackingNumber = trackingNumber;
  this.shippedAt = new Date();
  return this.save();
};

// Method to mark as delivered
OrderSchema.methods.markAsDelivered = function() {
  this.orderStatus = 'delivered';
  this.deliveredAt = new Date();
  return this.save();
};

// Method to cancel order
OrderSchema.methods.cancelOrder = function(reason) {
  if (this.orderStatus === 'shipped' || this.orderStatus === 'delivered') {
    throw new Error('Cannot cancel order that has been shipped or delivered');
  }
  this.orderStatus = 'cancelled';
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

// Virtual for checking if order can be cancelled
OrderSchema.virtual('canBeCancelled').get(function() {
  return this.orderStatus !== 'shipped' &&
         this.orderStatus !== 'delivered' &&
         this.orderStatus !== 'cancelled';
});

// Virtual for checking if refund is possible
OrderSchema.virtual('canBeRefunded').get(function() {
  return this.paymentStatus === 'paid' &&
         this.orderStatus !== 'delivered' &&
         this.orderStatus !== 'cancelled';
});

// Static method to get user orders
OrderSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId }).sort('-createdAt');
};

// Static method to get orders by status
OrderSchema.statics.findByStatus = function(status) {
  return this.find({ orderStatus: status }).sort('-createdAt');
};

// Static method to get revenue stats
OrderSchema.statics.getRevenueStats = async function(startDate, endDate) {
  const match = {
    paymentStatus: 'paid',
    createdAt: {}
  };

  if (startDate) match.createdAt.$gte = new Date(startDate);
  if (endDate) match.createdAt.$lte = new Date(endDate);

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$total' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$total' }
      }
    }
  ]);

  return stats[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0
  };
};

module.exports = mongoose.model('Order', OrderSchema);
