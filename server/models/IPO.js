const mongoose = require('mongoose');

const ipoSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  symbol: { type: String, required: true, unique: true, uppercase: true },
  priceRange: { type: String, required: true }, // e.g., "450 - 475"
  minQuantity: { type: Number, required: true }, // Lot size
  openDate: { type: Date, required: true },
  closeDate: { type: Date, required: true },
  listingDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['open', 'closed', 'allotted', 'listed'], 
    default: 'open' 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('IPO', ipoSchema);
