const express = require('express');
const router = express.Router();
const walletService = require('../services/walletService');
const { protect } = require('../middleware/auth');

router.post('/deposit', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await walletService.addVirtualFunds(req.user._id, Number(amount));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/withdraw', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    const result = await walletService.simulateWithdrawal(req.user._id, Number(amount));
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/ledger', protect, async (req, res) => {
  try {
    const ledger = await walletService.getWalletLedger(req.user._id);
    res.status(200).json({ success: true, data: ledger });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/summary', protect, async (req, res) => {
  try {
    const summary = await walletService.getDailyWalletSummary(req.user._id);
    res.status(200).json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
