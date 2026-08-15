const KYC = require('../models/KYC');
const User = require('../models/User');
const Notification = require('../models/Notification');

const submitKYC = async (userId, kycData, files) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  if (!files || !files.profilePhoto || !files.panCard || !files.aadhaarCard) {
    throw new Error('All KYC documents (Profile Photo, PAN Card, Aadhaar Card) are required');
  }
  
  // Clean paths to be web-accessible
  const profilePhoto = files.profilePhoto[0].path.replace(/\\/g, '/');
  const panCard = files.panCard[0].path.replace(/\\/g, '/');
  const aadhaarCard = files.aadhaarCard[0].path.replace(/\\/g, '/');
  
  // Check if KYC already exists
  let kyc = await KYC.findOne({ user: userId });
  
  if (kyc) {
    kyc.fullName = kycData.fullName;
    kyc.dob = new Date(kycData.dob);
    kyc.panNumber = kycData.panNumber.toUpperCase();
    kyc.aadhaarNumber = kycData.aadhaarNumber;
    kyc.address = kycData.address;
    kyc.city = kycData.city;
    kyc.state = kycData.state;
    kyc.pincode = kycData.pincode;
    kyc.occupation = kycData.occupation;
    kyc.profilePhoto = profilePhoto;
    kyc.panCard = panCard;
    kyc.aadhaarCard = aadhaarCard;
    kyc.status = 'under_review';
    kyc.rejectionReason = undefined;
    await kyc.save();
  } else {
    kyc = new KYC({
      user: userId,
      fullName: kycData.fullName,
      dob: new Date(kycData.dob),
      panNumber: kycData.panNumber.toUpperCase(),
      aadhaarNumber: kycData.aadhaarNumber,
      address: kycData.address,
      city: kycData.city,
      state: kycData.state,
      pincode: kycData.pincode,
      occupation: kycData.occupation,
      profilePhoto,
      panCard,
      aadhaarCard,
      status: 'under_review'
    });
    await kyc.save();
  }
  
  // Update User state
  user.kycStatus = 'under_review';
  await user.save();
  
  // Notification
  await Notification.create({
    user: userId,
    title: 'KYC Submitted',
    message: 'Your KYC documents have been submitted and are under review.',
    type: 'system'
  });
  
  return kyc;
};

const getKYCDetails = async (userId) => {
  const kyc = await KYC.findOne({ user: userId });
  if (!kyc) return null;
  return kyc;
};

const getProfileCompletionPercentage = (user, kyc) => {
  let score = 0;
  let total = 8;
  
  if (user.username) score++;
  if (user.email && user.isEmailVerified) score++;
  if (user.mobile && user.isMobileVerified) score++;
  
  if (kyc) {
    if (kyc.fullName) score++;
    if (kyc.panNumber) score++;
    if (kyc.aadhaarNumber) score++;
    if (kyc.profilePhoto) score++;
    if (kyc.status === 'approved') score++;
  }
  
  return Math.round((score / total) * 100);
};

// Admin workflow
const reviewKYC = async (kycId, status, rejectionReason) => {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Invalid KYC review status');
  }
  
  const kyc = await KYC.findById(kycId);
  if (!kyc) throw new Error('KYC record not found');
  
  kyc.status = status;
  if (status === 'rejected') {
    kyc.rejectionReason = rejectionReason || 'Documents mismatch / unclear';
  } else {
    kyc.rejectionReason = undefined;
  }
  await kyc.save();
  
  // Update user KYC status
  const user = await User.findById(kyc.user);
  if (user) {
    user.kycStatus = status;
    await user.save();
    
    // Notification
    await Notification.create({
      user: user._id,
      title: status === 'approved' ? 'KYC Approved' : 'KYC Rejected',
      message: status === 'approved' 
        ? 'Congratulations! Your trading account is now active.' 
        : `Your KYC was rejected. Reason: ${kyc.rejectionReason}`,
      type: 'system'
    });
  }
  
  return kyc;
};

module.exports = {
  submitKYC,
  getKYCDetails,
  getProfileCompletionPercentage,
  reviewKYC
};
