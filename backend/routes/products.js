const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { productValidation, mongoIdValidation, paginationValidation } = require('../middleware/validators');

router.route('/')
  .get(paginationValidation, getProducts)
  .post(protect, authorize('seller', 'admin'), productValidation, createProduct);

router.route('/:id')
  .get(mongoIdValidation('id'), getProduct)
  .put(protect, authorize('seller', 'admin'), mongoIdValidation('id'), productValidation, updateProduct)
  .delete(protect, authorize('seller', 'admin'), mongoIdValidation('id'), deleteProduct);

module.exports = router;
