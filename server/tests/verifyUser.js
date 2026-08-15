const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/db');
const User = require('../models/User');

const verifyTestUser = async () => {
  await connectDB();
  const user = await User.findOne({ email: 'tester@tradearena.local' });
  if (user) {
    user.isEmailVerified = true;
    user.isMobileVerified = true;
    user.kycStatus = 'approved';
    await user.save();
    console.log('Test user tester@tradearena.local is now fully verified and approved.');
  } else {
    console.log('Test user not found. Run verify.js first.');
  }
  process.exit(0);
};

verifyTestUser();
