const express = require('express');
const router = express.Router();
const journalService = require('../services/journalService');
const { protect } = require('../middleware/auth');

router.post('/', protect, async (req, res) => {
  try {
    const journal = await journalService.addJournalEntry(req.user._id, req.body);
    res.status(201).json({ success: true, data: journal });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const entries = await journalService.getJournalEntries(req.user._id);
    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
