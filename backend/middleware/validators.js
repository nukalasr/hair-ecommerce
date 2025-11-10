const { body, param, query, validationResult } = require('express-validator');

/**
 * Validate results and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * User Registration Validation
 */
exports.registerValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name cannot exceed 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('role')
    .optional()
    .isIn(['buyer', 'seller', 'admin']).withMessage('Invalid role'),

  validate
];

/**
 * User Login Validation
 */
exports.loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  validate
];

/**
 * Product Creation/Update Validation
 */
exports.productValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ max: 200 }).withMessage('Product name cannot exceed 200 characters'),

  body('description')
    .trim()
    .notEmpty().withMessage('Product description is required')
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0, max: 100000 }).withMessage('Price must be between $0 and $100,000'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['virgin-hair', 'remy-hair', 'synthetic', 'closure', 'frontal', 'wig'])
    .withMessage('Invalid category'),

  body('texture')
    .notEmpty().withMessage('Texture is required')
    .isIn(['straight', 'wavy', 'curly', 'kinky', 'body-wave', 'deep-wave'])
    .withMessage('Invalid texture'),

  body('length')
    .notEmpty().withMessage('Length is required')
    .isInt({ min: 8, max: 40 }).withMessage('Length must be between 8 and 40 inches'),

  body('origin')
    .notEmpty().withMessage('Origin is required')
    .isIn(['brazilian', 'peruvian', 'malaysian', 'indian', 'cambodian', 'vietnamese'])
    .withMessage('Invalid origin'),

  body('stock')
    .notEmpty().withMessage('Stock is required')
    .isInt({ min: 0 }).withMessage('Stock cannot be negative'),

  body('imageUrl')
    .trim()
    .notEmpty().withMessage('Image URL is required')
    .isURL().withMessage('Please provide a valid image URL'),

  validate
];

/**
 * Order Creation Validation
 */
exports.orderValidation = [
  body('items')
    .isArray({ min: 1 }).withMessage('Order must contain at least one item'),

  body('items.*.product')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID'),

  body('items.*.quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),

  body('shippingAddress.street')
    .trim()
    .notEmpty().withMessage('Street address is required'),

  body('shippingAddress.city')
    .trim()
    .notEmpty().withMessage('City is required'),

  body('shippingAddress.state')
    .trim()
    .notEmpty().withMessage('State is required'),

  body('shippingAddress.zipCode')
    .trim()
    .notEmpty().withMessage('ZIP code is required')
    .matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid ZIP code format'),

  validate
];

/**
 * MongoDB ID Validation
 */
exports.mongoIdValidation = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage('Invalid ID format'),

  validate
];

/**
 * Pagination Validation
 */
exports.paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  validate
];

/**
 * Address Validation
 */
exports.addressValidation = [
  body('street')
    .trim()
    .notEmpty().withMessage('Street address is required')
    .isLength({ max: 200 }).withMessage('Street address cannot exceed 200 characters'),

  body('city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),

  body('state')
    .trim()
    .notEmpty().withMessage('State is required')
    .isLength({ max: 50 }).withMessage('State cannot exceed 50 characters'),

  body('zipCode')
    .trim()
    .notEmpty().withMessage('ZIP code is required')
    .matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid ZIP code format'),

  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country cannot exceed 100 characters'),

  validate
];
