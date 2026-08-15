const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const marketDataService = require('../services/marketDataService');
const { protect } = require('../middleware/auth');

// Get all listed stocks with latest price quotes
router.get('/stocks', protect, async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ symbol: 1 });
    res.status(200).json({ success: true, data: stocks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get specific stock quote
router.get('/stocks/:symbol', protect, async (req, res) => {
  try {
    const stock = await Stock.findOne({ symbol: req.params.symbol.toUpperCase() });
    if (!stock) return res.status(404).json({ success: false, message: 'Stock symbol not found' });
    res.status(200).json({ success: true, data: stock });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get stock 1-month history — tries real NSE data first, falls back to generated
router.get('/stocks/:symbol/history', protect, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const stock = await Stock.findOne({ symbol });
    if (!stock) return res.status(404).json({ success: false, message: 'Stock symbol not found' });

    // Try real NSE historical data first
    try {
      const nseClient = require('../services/nseClient');
      const realHistory = await nseClient.getEquityHistory(symbol);
      if (realHistory && realHistory.length >= 5) {
        return res.status(200).json({ success: true, data: realHistory, source: 'nse' });
      }
    } catch (nseErr) {
      // fall through to generated history
    }

    // Fallback: deterministic generated 30-day OHLCV
    const history = marketDataService.getStockHistory(stock.symbol, stock);
    res.status(200).json({ success: true, data: history, source: 'simulated' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get computed market indices (REST fallback for initial page load)
router.get('/indices', protect, async (req, res) => {
  try {
    const stocks = await Stock.find();
    if (!stocks.length) {
      return res.status(200).json({ success: true, data: [] });
    }
    const indices = marketDataService.calculateIndices(stocks);
    res.status(200).json({ success: true, data: indices });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get top gainers and losers
router.get('/movers', protect, async (req, res) => {
  try {
    const stocks = await Stock.find();
    const withChange = stocks.map(s => {
      const change = s.currentPrice - s.prevClose;
      const pctChange = s.prevClose > 0 ? (change / s.prevClose) * 100 : 0;
      return {
        symbol: s.symbol,
        companyName: s.companyName,
        price: s.currentPrice,
        change: Number(change.toFixed(2)),
        pctChange: Number(pctChange.toFixed(2))
      };
    });
    const gainers = [...withChange].sort((a, b) => b.pctChange - a.pctChange).slice(0, 5);
    const losers  = [...withChange].sort((a, b) => a.pctChange - b.pctChange).slice(0, 5);
    res.status(200).json({ success: true, data: { gainers, losers } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get explicit index constituents (used by Dashboard modal)
router.get('/index-constituents', protect, (req, res) => {
  try {
    res.status(200).json({ success: true, data: marketDataService.INDEX_CONSTITUENTS });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Search stocks
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.status(200).json({ success: true, data: [] });
    }
    const regex = new RegExp(q.trim(), 'i');
    const stocks = await Stock.find({
      $or: [{ symbol: regex }, { companyName: regex }]
    }).limit(15).sort({ symbol: 1 });
    res.status(200).json({ success: true, data: stocks });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get market session status
router.get('/session', protect, async (req, res) => {
  try {
    const status = marketDataService.getMarketSessionStatus();
    res.status(200).json({ success: true, data: { status, timestamp: new Date() } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
