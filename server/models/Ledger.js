const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true }, // positive for credits, negative for debits
  type: { 
    type: String, 
    enum: ['deposit', 'withdrawal', 'trade_debit', 'trade_credit', 'charges', 'dividend', 'other'], 
    required: true 
  },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  balanceAfter: { type: Number, required: true }, // Wallet balance after this transaction
  description: { type: String },
  referenceId: { type: String } // Can link to Order ID, Trade ID, or Deposit ID
}, {
  timestamps: true
});

module.exports = mongoose.model('Ledger', ledgerSchema);
