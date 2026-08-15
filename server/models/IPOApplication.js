const mongoose = require('mongoose');

const ipoApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ipo: { type: mongoose.Schema.Types.ObjectId, ref: 'IPO', required: true },
  appliedQuantity: { type: Number, required: true },
  appliedPrice: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['applied', 'allotted', 'not_allotted', 'cancelled'], 
    default: 'applied' 
  },
  fundsBlocked: { type: Number, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('IPOApplication', ipoApplicationSchema);
