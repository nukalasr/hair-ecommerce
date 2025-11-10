const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  cancelOrder
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { orderValidation, mongoIdValidation } = require('../middleware/validators');

router.route('/')
  .get(protect, getOrders)
  .post(protect, orderValidation, createOrder);

router.route('/:id')
  .get(protect, mongoIdValidation('id'), getOrder);

router.route('/:id/status')
  .put(protect, authorize('admin', 'seller'), mongoIdValidation('id'), updateOrderStatus);

router.route('/:id/cancel')
  .put(protect, mongoIdValidation('id'), cancelOrder);

module.exports = router;
