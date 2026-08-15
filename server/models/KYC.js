const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  fullName: { type: String, required: true },
  dob: { type: Date, required: true },
  panNumber: { type: String, required: true, uppercase: true, trim: true },
  aadhaarNumber: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  occupation: { type: String, required: true },
  
  // Document paths / URLs
  profilePhoto: { type: String, required: true },
  panCard: { type: String, required: true },
  aadhaarCard: { type: String, required: true },
  
  status: { type: String, enum: ['pending', 'under_review', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('KYC', kycSchema);
