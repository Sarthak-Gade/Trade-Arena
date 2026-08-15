const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true, uppercase: true },
  quantity: { type: Number, required: true, default: 0 },
  averageBuyPrice: { type: Number, required: true, default: 0 },
  totalCost: { type: Number, required: true, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Holding', holdingSchema);
