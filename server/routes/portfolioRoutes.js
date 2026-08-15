const express = require('express');
const router = express.Router();
const portfolioService = require('../services/portfolioService');
const analyticsService = require('../services/analyticsService');
const { protect } = require('../middleware/auth');

router.get('/summary', protect, async (req, res) => {
  try {
    const summary = await portfolioService.getPortfolioSummary(req.user._id);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/analytics', protect, async (req, res) => {
  try {
    const stats = await analyticsService.getAnalyticsDashboard(req.user._id);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/holdings', protect, async (req, res) => {
  try {
    const holdings = await portfolioService.getPortfolioHoldings(req.user._id);
    res.status(200).json({ success: true, data: holdings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/positions', protect, async (req, res) => {
  try {
    const positions = await portfolioService.getPortfolioPositions(req.user._id);
    res.status(200).json({ success: true, data: positions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
