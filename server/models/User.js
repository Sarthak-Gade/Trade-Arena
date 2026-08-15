const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isEmailVerified: { type: Boolean, default: false },
  isMobileVerified: { type: Boolean, default: false },
  verificationCode: { type: String }, // Email verification code
  otp: { type: String }, // Mobile OTP code
  otpExpires: { type: Date },
  kycStatus: { type: String, enum: ['pending', 'under_review', 'approved', 'rejected'], default: 'pending' },
  
  // Security
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  
  // Virtual Account Details
  clientID: { type: String, unique: true },
  tradingAccountNumber: { type: String, unique: true },
  walletBalance: { type: Number, default: 1000000.00 }, // 10 Lakhs Default Virtual Money
  openingBalance: { type: Number, default: 1000000.00 }, // Opening balance for EOD Daily Wallet Summary
  dailyClosedPnl: { type: Number, default: 0.00 }, // Accumulated realized PNL for the day
  
  refreshToken: { type: String }
}, {
  timestamps: true
});

// Generate Client ID and Trading Account Number before saving if not present
userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  
  if (!this.clientID) {
    // Generate a random Client ID like TA100000 + random
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    this.clientID = `TA${randomSuffix}`;
  }
  
  if (!this.tradingAccountNumber) {
    // Generate a random Trading Account Number like 12081600 + random
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000);
    this.tradingAccountNumber = `TRD${randomSuffix}`;
  }
});

// Compare password
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

module.exports = mongoose.model('User', userSchema);
