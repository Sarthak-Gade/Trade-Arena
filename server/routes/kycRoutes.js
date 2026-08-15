const express = require('express');
const router = express.Router();
const kycService = require('../services/kycService');
const { protect } = require('../middleware/auth');
const { validateKYC } = require('../middleware/validation');
const upload = require('../middleware/upload');

// POST /api/kyc/submit (protected, parses multi-part uploads)
router.post('/submit', protect, upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'panCard', maxCount: 1 },
  { name: 'aadhaarCard', maxCount: 1 }
]), validateKYC, async (req, res) => {
  try {
    const kyc = await kycService.submitKYC(req.user._id, req.body, req.files);
    res.status(200).json({ success: true, data: kyc });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/kyc/status (protected)
router.get('/status', protect, async (req, res) => {
  try {
    const kyc = await kycService.getKYCDetails(req.user._id);
    const completion = kycService.getProfileCompletionPercentage(req.user, kyc);
    res.status(200).json({
      success: true,
      data: {
        kycStatus: req.user.kycStatus,
        completionPercentage: completion,
        kycDetails: kyc
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
