const User = require('../models/User');
const Ledger = require('../models/Ledger');

const addVirtualFunds = async (userId, amount) => {
  if (amount <= 0) {
    throw new Error('Deposit amount must be greater than zero');
  }
  
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  user.walletBalance += amount;
  await user.save();
  
  const ledger = await Ledger.create({
    user: userId,
    amount,
    type: 'deposit',
    status: 'completed',
    balanceAfter: user.walletBalance,
    description: `Added Virtual Funds to trading account via simulator`
  });
  
  return {
    walletBalance: user.walletBalance,
    ledger
  };
};

const simulateWithdrawal = async (userId, amount) => {
  if (amount <= 0) {
    throw new Error('Withdrawal amount must be greater than zero');
  }
  
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  if (user.walletBalance < amount) {
    throw new Error(`Insufficient funds for withdrawal. Available: INR ${user.walletBalance.toFixed(2)}`);
  }
  
  user.walletBalance -= amount;
  await user.save();
  
  const ledger = await Ledger.create({
    user: userId,
    amount: -amount,
    type: 'withdrawal',
    status: 'completed',
    balanceAfter: user.walletBalance,
    description: `Simulated withdrawal of funds`
  });
  
  return {
    walletBalance: user.walletBalance,
    ledger
  };
};

const getWalletLedger = async (userId) => {
  return await Ledger.find({ user: userId }).sort({ createdAt: -1 });
};

const getDailyWalletSummary = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  // Calculate today's aggregates
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  const todayTransactions = await Ledger.find({
    user: userId,
    createdAt: { $gte: startOfDay, $lte: endOfDay }
  });
  
  let deposits = 0;
  let withdrawals = 0;
  let tradeDebits = 0;
  let tradeCredits = 0;
  let totalCharges = 0;
  
  todayTransactions.forEach(t => {
    if (t.type === 'deposit') deposits += t.amount;
    else if (t.type === 'withdrawal') withdrawals += Math.abs(t.amount);
    else if (t.type === 'trade_debit') tradeDebits += Math.abs(t.amount);
    else if (t.type === 'trade_credit') tradeCredits += t.amount;
    else if (t.type === 'charges') totalCharges += Math.abs(t.amount);
  });
  
  return {
    openingBalance: user.openingBalance || (user.walletBalance - deposits + withdrawals),
    deposits,
    withdrawals,
    tradeDebits,
    tradeCredits,
    totalCharges,
    closingBalance: user.walletBalance
  };
};

module.exports = {
  addVirtualFunds,
  simulateWithdrawal,
  getWalletLedger,
  getDailyWalletSummary
};
