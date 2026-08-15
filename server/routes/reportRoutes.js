const express = require('express');
const router = Router = express.Router();
const reportService = require('../services/reportService');
const Report = require('../models/Report');
const { protect } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

router.get('/', protect, async (req, res) => {
  try {
    const reports = await reportService.getReportsHistory(req.user._id);
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/reports/download/:fileName - Secure download route
router.get('/download/:fileName', protect, async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Find the report metadata to verify ownership
    const report = await Report.findOne({
      user: req.user._id,
      pdfPath: { $regex: fileName }
    });
    
    if (!report && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to statement' });
    }
    
    const filePath = path.join(__dirname, '..', 'reports', fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'PDF statement not found' });
    }
    
    res.contentType("application/pdf");
    res.download(filePath, fileName);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
