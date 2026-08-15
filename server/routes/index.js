const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const kycRoutes = require('./kycRoutes');
const walletRoutes = require('./walletRoutes');
const marketRoutes = require('./marketRoutes');
const orderRoutes = require('./orderRoutes');
const portfolioRoutes = require('./portfolioRoutes');
const reportRoutes = require('./reportRoutes');
const ipoRoutes = require('./ipoRoutes');
const journalRoutes = require('./journalRoutes');
const leaderboardRoutes = require('./leaderboardRoutes');
const adminRoutes = require('./adminRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/kyc', kycRoutes);
router.use('/wallet', walletRoutes);
router.use('/market', marketRoutes);
router.use('/orders', orderRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/reports', reportRoutes);
router.use('/ipos', ipoRoutes);
router.use('/journal', journalRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
