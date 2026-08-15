const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../middleware/auth');
const { sendVerificationEmail, sendOTPEmail, sendForgotPasswordEmail } = require('../utils/emailHelper');

const registerUser = async ({ username, email, mobile, password }) => {
  const emailExists = await User.findOne({ email });
  if (emailExists) throw new Error('Email already registered');
  
  const mobileExists = await User.findOne({ mobile });
  if (mobileExists) throw new Error('Mobile number already registered');
  
  const usernameExists = await User.findOne({ username });
  if (usernameExists) throw new Error('Username already taken');
  
  // Generate random 6 digit verification code for email
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Generate random 6 digit mobile OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  
  const user = new User({
    username,
    email,
    mobile,
    password, // will be hashed in pre-save middleware
    verificationCode,
    otp,
    otpExpires
  });
  
  await user.save();
  
  // Send emails
  await sendVerificationEmail(email, verificationCode);
  await sendOTPEmail(email, otp); // using email fallback for OTP in mock
  
  return {
    userId: user._id,
    email: user.email,
    clientID: user.clientID,
    emailCode: verificationCode,
    mobileOtp: otp,
    message: 'Registration successful. Verification codes sent.'
  };
};

const loginUser = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Check lockout
  if (user.isLocked()) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
    throw new Error(`Account is temporarily locked. Try again in ${minutesLeft} minutes.`);
  }
  
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = Date.now() + 30 * 60 * 1000; // 30 minutes lockout
      await user.save();
      throw new Error('Account locked due to 5 failed attempts. Please try again after 30 minutes.');
    }
    await user.save();
    throw new Error('Invalid email or password');
  }
  
  // Reset failed attempts on success
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  
  user.refreshToken = refreshToken;
  await user.save();
  
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    isMobileVerified: user.isMobileVerified,
    kycStatus: user.kycStatus,
    clientID: user.clientID,
    tradingAccountNumber: user.tradingAccountNumber,
    walletBalance: user.walletBalance,
    accessToken,
    refreshToken
  };
};

const verifyEmailCode = async (userId, code) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  if (user.verificationCode !== code) {
    throw new Error('Invalid email verification code');
  }
  
  user.isEmailVerified = true;
  user.verificationCode = undefined;
  await user.save();
  
  return { success: true, message: 'Email verified successfully' };
};

const verifyMobileOTP = async (userId, otp) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  if (user.otp !== otp) {
    throw new Error('Invalid OTP');
  }
  
  if (Date.now() > user.otpExpires) {
    throw new Error('OTP has expired');
  }
  
  user.isMobileVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();
  
  return { success: true, message: 'Mobile OTP verified successfully' };
};

const sendForgotPasswordCode = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('No account found with this email');
  
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.verificationCode = code; // repurpose field for password reset code
  await user.save();
  
  await sendForgotPasswordEmail(email, code);
  return { success: true, message: 'Password reset code sent to email' };
};

const resetPassword = async (email, code, newPassword) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error('User not found');
  
  if (user.verificationCode !== code) {
    throw new Error('Invalid or expired reset code');
  }
  
  user.password = newPassword; // Will be hashed in pre-save middleware
  user.verificationCode = undefined;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  
  return { success: true, message: 'Password reset successfully' };
};

const refreshUserToken = async (refreshToken) => {
  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'tradearena_secret_refresh');
    const user = await User.findById(decoded.id);
    
    if (!user || user.refreshToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }
    
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    user.refreshToken = newRefreshToken;
    await user.save();
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

const getDevCodes = async (userId) => {
  const user = await User.findById(userId).select('+verificationCode +otp +otpExpires');
  if (!user) throw new Error('User not found');

  return {
    userId: user._id,
    email: user.email,
    mobile: user.mobile,
    isEmailVerified: user.isEmailVerified,
    isMobileVerified: user.isMobileVerified,
    emailCode: user.isEmailVerified ? null : user.verificationCode,
    mobileOtp: user.isMobileVerified ? null : user.otp,
    otpExpires: user.otpExpires,
  };
};

const resendVerificationCodes = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  if (user.isEmailVerified && user.isMobileVerified) {
    throw new Error('Account is already fully verified.');
  }

  let newEmailCode = user.verificationCode;
  let newOtp = user.otp;

  if (!user.isEmailVerified) {
    newEmailCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newEmailCode;
    await sendVerificationEmail(user.email, newEmailCode);
  }

  if (!user.isMobileVerified) {
    newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = newOtp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await sendOTPEmail(user.email, newOtp);
  }

  await user.save();

  return { success: true, message: 'New verification codes sent.' };
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmailCode,
  verifyMobileOTP,
  getDevCodes,
  resendVerificationCodes,
  sendForgotPasswordCode,
  resetPassword,
  refreshUserToken
};
