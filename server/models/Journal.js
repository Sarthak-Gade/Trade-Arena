const mongoose = require('mongoose');

const journalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  trade: { type: mongoose.Schema.Types.ObjectId, ref: 'Trade' }, // optional direct association
  symbol: { type: String, uppercase: true }, // copy for fast lookup
  entryReason: { type: String },
  exitReason: { type: String },
  strategy: { type: String },
  notes: { type: String },
  learnings: { type: String }
}, {
  timestamps: true
});

module.exports = mongoose.model('Journal', journalSchema);
