const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { validateRegister, validateLogin } = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

// Rate limit login/register attempts
const authLimiter = rateLimiter(15, 15 * 60 * 1000); // 15 requests per 15 minutes

router.post('/register', validateRegister, async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const { userId, code } = req.body;
    const result = await authService.verifyEmailCode(userId, code);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/verify-mobile', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const result = await authService.verifyMobileOTP(userId, otp);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DEV-ONLY: Fetch pending verification codes for a user
// Only works when SMTP is not configured (local/dev mode)
router.get('/dev-codes/:userId', async (req, res) => {
  try {
    const isDev = !process.env.SMTP_HOST || process.env.SMTP_HOST.trim() === '';
    if (!isDev) {
      return res.status(403).json({ success: false, message: 'This endpoint is only available in development mode.' });
    }
    const result = await authService.getDevCodes(req.params.userId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Resend verification codes (generates new ones and saves them)
router.post('/resend-verification', async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await authService.resendVerificationCodes(userId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.sendForgotPasswordCode(email);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const result = await authService.resetPassword(email, code, newPassword);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshUserToken(refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(401).json({ success: false, message: error.message });
  }
});

module.exports = router;
