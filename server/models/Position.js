const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true, uppercase: true },
  quantity: { type: Number, default: 0 }, // net quantity: positive for long, negative for short, 0 for squared-off
  buyQty: { type: Number, default: 0 },
  sellQty: { type: Number, default: 0 },
  averageBuyPrice: { type: Number, default: 0 },
  averageSellPrice: { type: Number, default: 0 },
  realizedPnl: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Position', positionSchema);
