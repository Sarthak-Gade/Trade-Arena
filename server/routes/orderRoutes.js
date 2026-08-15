const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const tradeService = require('../services/tradeService');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');

// Place a trade order
router.post('/', protect, validateOrder, async (req, res) => {
  try {
    const order = await orderService.placeOrder(req.user._id, req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Modify a pending order
router.put('/:id', protect, async (req, res) => {
  try {
    const order = await orderService.modifyOrder(req.user._id, req.params.id, req.body);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Cancel a pending order
router.delete('/:id', protect, async (req, res) => {
  try {
    const order = await orderService.cancelOrder(req.user._id, req.params.id);
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Fetch active/pending orders and history for the user
router.get('/', protect, async (req, res) => {
  try {
    const filter = { user: req.user._id };
    
    // Support both ?status=pending and ?status[]=pending&status[]=queued
    const statusParam = req.query['status[]'] || req.query.status;
    if (statusParam) {
      const statusArray = Array.isArray(statusParam)
        ? statusParam
        : statusParam.includes(',') ? statusParam.split(',') : [statusParam];
      filter.status = statusArray.length === 1 ? statusArray[0] : { $in: statusArray };
    }
    
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Fetch trade history records for the user
router.get('/history/trades', protect, async (req, res) => {
  try {
    const trades = await tradeService.getTradeHistory(req.user._id, req.query);
    res.status(200).json({ success: true, data: trades });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
