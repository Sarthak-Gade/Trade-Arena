const express = require('express');
const router = express.Router();
const kycService = require('../services/kycService');
const ipoService = require('../services/ipoService');
const { runDailyEODReportEngine } = require('../services/reportService');
const KYC = require('../models/KYC');
const User = require('../models/User');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const { protect, admin } = require('../middleware/auth');

// List all KYC records
router.get('/kyc', protect, admin, async (req, res) => {
  try {
    const records = await KYC.find().populate('user', 'username email clientID').sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Review (approve/reject) a KYC record
router.post('/kyc/:id/review', protect, admin, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const reviewed = await kycService.reviewKYC(req.params.id, status, rejectionReason);
    res.status(200).json({ success: true, data: reviewed });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Create IPO listing
router.post('/ipos', protect, admin, async (req, res) => {
  try {
    const ipo = await ipoService.createIPO(req.body);
    res.status(201).json({ success: true, data: ipo });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Allot IPO
router.post('/ipos/:id/allot', protect, admin, async (req, res) => {
  try {
    const result = await ipoService.allotIPO(req.params.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Manual EOD Report Engine trigger (extremely useful for development & testing!)
router.post('/trigger-eod', protect, admin, async (req, res) => {
  try {
    const { date } = req.body; // option to pass a custom date string YYYY-MM-DD
    const dateStr = date || new Date().toISOString().split('T')[0];
    const result = await runDailyEODReportEngine(dateStr);
    
    if (result.success) {
      res.status(200).json({ success: true, message: `EOD Job finished. Generated ${result.reportsGenerated} contract notes.` });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Fetch system dashboard metrics
router.get('/metrics', protect, admin, async (req, res) => {
  try {
    const totalTraders = await User.countDocuments({ role: 'user' });
    const pendingKYC = await KYC.countDocuments({ status: 'pending' });
    const approvedKYC = await KYC.countDocuments({ status: 'approved' });
    const totalOrders = await Order.countDocuments();
    const totalTrades = await Trade.countDocuments();
    
    // Aggregate Brokerage and Total charges generated from executed orders
    const executedOrders = await Order.find({ status: 'executed' });
    let totalBrokerage = 0;
    let totalRegulatoryCharges = 0;
    let totalVolume = 0;
    
    executedOrders.forEach(o => {
      totalBrokerage += o.brokerage;
      totalRegulatoryCharges += (o.totalCharges - o.brokerage);
      totalVolume += (o.quantity * (o.price || 1)); // simple proxy
    });
    
    res.status(200).json({
      success: true,
      data: {
        totalTraders,
        pendingKYC,
        approvedKYC,
        totalOrders,
        totalTrades,
        totalBrokerage: Number(totalBrokerage.toFixed(2)),
        totalRegulatoryCharges: Number(totalRegulatoryCharges.toFixed(2)),
        totalVolume: Number(totalVolume.toFixed(2)),
        platformRevenue: Number((totalBrokerage).toFixed(2)) // Virtual earnings for platform
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
