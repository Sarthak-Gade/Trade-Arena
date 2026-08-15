const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true, uppercase: true },
  quantity: { type: Number, required: true, min: 1 },
  orderType: { type: String, enum: ['market', 'limit', 'stop_loss', 'take_profit'], required: true },
  direction: { type: String, enum: ['buy', 'sell'], required: true },
  price: { type: Number }, // Limit price
  triggerPrice: { type: Number }, // Stop loss / take profit trigger price
  
  status: { 
    type: String, 
    enum: ['pending', 'queued', 'executed', 'cancelled', 'rejected'], 
    default: 'pending' 
  },
  
  // Charge details (calculated by Virtual Brokerage Charges Engine)
  brokerage: { type: Number, default: 0 },
  stt: { type: Number, default: 0 },
  exchangeCharges: { type: Number, default: 0 },
  gst: { type: Number, default: 0 },
  sebiCharges: { type: Number, default: 0 },
  stampDuty: { type: Number, default: 0 },
  totalCharges: { type: Number, default: 0 },
  
  rejectionReason: { type: String },
  executionProvider: { type: String, enum: ['paper', 'broker'], default: 'paper' },
  gtc: { type: Boolean, default: false }, // Good Till Cancelled
  executedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
