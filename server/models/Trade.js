const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  symbol: { type: String, required: true, uppercase: true },
  executionPrice: { type: Number, required: true },
  executionQuantity: { type: Number, required: true },
  direction: { type: String, enum: ['buy', 'sell'], required: true },
  
  // Historical charge snapshot
  brokerage: { type: Number, default: 0 },
  stt: { type: Number, default: 0 },
  exchangeCharges: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },
  sebiCharges: { type: Number, default: 0 },
  stampDuty: { type: Number, default: 0 },
  totalCharges: { type: Number, default: 0 },
  
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Trade', tradeSchema);
