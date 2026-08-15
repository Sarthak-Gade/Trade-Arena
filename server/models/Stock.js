const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
  companyName: { type: String, required: true },
  exchange: { type: String, enum: ['NSE', 'BSE'], default: 'NSE' },
  isin: { type: String, required: true, unique: true },
  sector: { type: String, required: true },
  industry: { type: String, required: true },
  marketCap: { type: Number }, // in Crores
  listingStatus: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  indices: [{ type: String }], // e.g. ['NIFTY 50', 'NIFTY BANK', 'SENSEX']

  // 52-week high/low (updated by NSE sync)
  week52High: { type: Number },
  week52Low: { type: Number },

  // Real-time details (maintained by Market Data Simulator)
  currentPrice: { type: Number, required: true },
  prevClose: { type: Number, required: true },
  openPrice: { type: Number, required: true },
  highPrice: { type: Number, required: true },
  lowPrice: { type: Number, required: true },
  volume: { type: Number, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Stock', stockSchema);
