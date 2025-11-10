const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide product description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Please provide product price'],
    min: [0, 'Price cannot be negative'],
    max: [100000, 'Price cannot exceed $100,000']
  },
  category: {
    type: String,
    required: [true, 'Please provide product category'],
    enum: {
      values: ['virgin-hair', 'remy-hair', 'synthetic', 'closure', 'frontal', 'wig'],
      message: 'Invalid category'
    }
  },
  texture: {
    type: String,
    required: [true, 'Please provide hair texture'],
    enum: {
      values: ['straight', 'wavy', 'curly', 'kinky', 'body-wave', 'deep-wave'],
      message: 'Invalid texture'
    }
  },
  length: {
    type: Number,
    required: [true, 'Please provide hair length'],
    min: [8, 'Length must be at least 8 inches'],
    max: [40, 'Length cannot exceed 40 inches']
  },
  origin: {
    type: String,
    required: [true, 'Please provide hair origin'],
    enum: {
      values: ['brazilian', 'peruvian', 'malaysian', 'indian', 'cambodian', 'vietnamese'],
      message: 'Invalid origin'
    }
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  imageUrl: {
    type: String,
    required: [true, 'Please provide product image URL'],
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating cannot be less than 0'],
    max: [5, 'Rating cannot exceed 5']
  },
  numReviews: {
    type: Number,
    default: 0,
    min: [0, 'Number of reviews cannot be negative']
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  specifications: {
    weight: Number,
    bundles: Number,
    color: String,
    colorable: {
      type: Boolean,
      default: true
    },
    bleachable: {
      type: Boolean,
      default: true
    }
  },
  shippingInfo: {
    weight: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ seller: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ rating: -1 });
ProductSchema.index({ name: 'text', description: 'text' });

// Virtual for checking if product is in stock
ProductSchema.virtual('inStock').get(function() {
  return this.stock > 0;
});

// Virtual for checking low stock
ProductSchema.virtual('lowStock').get(function() {
  return this.stock > 0 && this.stock <= 5;
});

// Pre-save middleware to validate price
ProductSchema.pre('save', function(next) {
  // Round price to 2 decimal places
  if (this.isModified('price')) {
    this.price = Math.round(this.price * 100) / 100;
  }
  next();
});

// Static method to get products by category
ProductSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort('-createdAt');
};

// Static method to get featured products
ProductSchema.statics.findFeatured = function(limit = 8) {
  return this.find({ isFeatured: true, isActive: true })
    .limit(limit)
    .sort('-rating');
};

// Static method to search products
ProductSchema.statics.searchProducts = function(searchTerm) {
  return this.find(
    { $text: { $search: searchTerm }, isActive: true },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Method to update stock
ProductSchema.methods.updateStock = async function(quantity, operation = 'subtract') {
  if (operation === 'subtract') {
    if (this.stock < quantity) {
      throw new Error('Insufficient stock');
    }
    this.stock -= quantity;
  } else if (operation === 'add') {
    this.stock += quantity;
  }

  await this.save();
  return this;
};

module.exports = mongoose.model('Product', ProductSchema);
