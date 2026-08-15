const express = require('express');
const router = express.Router();
const leaderboardService = require('../services/leaderboardService');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const list = await leaderboardService.getLeaderboard();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
