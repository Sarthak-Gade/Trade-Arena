const express = require('express');
const router = express.Router();
const ipoService = require('../services/ipoService');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const ipos = await ipoService.getIPODetails();
    res.status(200).json({ success: true, data: ipos });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/apply', protect, async (req, res) => {
  try {
    const { ipoId, quantity, price } = req.body;
    const application = await ipoService.applyIPO(req.user._id, ipoId, Number(quantity), Number(price));
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/applications', protect, async (req, res) => {
  try {
    const apps = await ipoService.getUserApplications(req.user._id);
    res.status(200).json({ success: true, data: apps });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
