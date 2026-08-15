const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: 'My Watchlist' },
  stocks: [{ type: String, uppercase: true }] // Array of symbols
}, {
  timestamps: true
});

module.exports = mongoose.model('Watchlist', watchlistSchema);
