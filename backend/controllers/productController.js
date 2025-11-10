const Product = require('../models/Product');
const { ErrorResponse } = require('../middleware/errorHandler');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    const {
      category,
      texture,
      origin,
      minPrice,
      maxPrice,
      minLength,
      maxLength,
      inStock,
      featured,
      search,
      sort,
      page = 1,
      limit = 20
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (category) query.category = category;
    if (texture) query.texture = texture;
    if (origin) query.origin = origin;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (minLength || maxLength) {
      query.length = {};
      if (minLength) query.length.$gte = parseInt(minLength);
      if (maxLength) query.length.$lte = parseInt(maxLength);
    }
    if (inStock === 'true') query.stock = { $gt: 0 };
    if (featured === 'true') query.isFeatured = true;
    if (search) query.$text = { $search: search };

    // Sort
    let sortOption = '-createdAt';
    if (sort) {
      const sortMap = {
        'price-asc': 'price',
        'price-desc': '-price',
        'name-asc': 'name',
        'name-desc': '-name',
        'rating': '-rating',
        'newest': '-createdAt'
      };
      sortOption = sortMap[sort] || sortOption;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const products = await Product.find(query)
      .populate('seller', 'firstName lastName email')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'firstName lastName email');

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private (Seller/Admin)
exports.createProduct = async (req, res, next) => {
  try {
    // Add seller to req.body
    req.body.seller = req.user.id;

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private (Seller/Admin - own products only)
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Check ownership (unless admin)
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to update this product', 403));
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private (Seller/Admin - own products only)
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorResponse('Product not found', 404));
    }

    // Check ownership (unless admin)
    if (product.seller.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse('Not authorized to delete this product', 403));
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
