const Holding = require('../models/Holding');
const User = require('../models/User');
const Ledger = require('../models/Ledger');
const Notification = require('../models/Notification');
const Stock = require('../models/Stock');

const processDividend = async (symbol, dividendPerShare) => {
  console.log(`[CorporateActions] Processing Dividend for ${symbol}: INR ${dividendPerShare} per share`);
  
  const holdings = await Holding.find({ symbol: symbol.toUpperCase() });
  let count = 0;
  
  for (const holding of holdings) {
    const user = await User.findById(holding.user);
    if (!user) continue;
    
    const dividendAmount = holding.quantity * dividendPerShare;
    user.walletBalance += dividendAmount;
    await user.save();
    
    await Ledger.create({
      user: user._id,
      amount: dividendAmount,
      type: 'dividend',
      status: 'completed',
      balanceAfter: user.walletBalance,
      description: `Dividend credited: ${dividendPerShare} INR/share for ${holding.quantity} shares of ${symbol}`
    });
    
    await Notification.create({
      user: user._id,
      title: 'Dividend Credited',
      message: `You received INR ${dividendAmount.toFixed(2)} in dividends for your holdings in ${symbol}.`,
      type: 'wallet'
    });
    
    count++;
  }
  
  return { success: true, accountsProcessed: count };
};

const processStockSplit = async (symbol, splitFactor) => {
  // e.g. Split factor of 2 means 1 share becomes 2 shares
  console.log(`[CorporateActions] Processing Stock Split for ${symbol}: Split factor ${splitFactor}`);
  
  const holdings = await Holding.find({ symbol: symbol.toUpperCase() });
  let count = 0;
  
  // Adjust Stock master currentPrice as well
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  if (stock) {
    stock.currentPrice = Number((stock.currentPrice / splitFactor).toFixed(2));
    stock.prevClose = Number((stock.prevClose / splitFactor).toFixed(2));
    stock.openPrice = Number((stock.openPrice / splitFactor).toFixed(2));
    stock.highPrice = Number((stock.highPrice / splitFactor).toFixed(2));
    stock.lowPrice = Number((stock.lowPrice / splitFactor).toFixed(2));
    await stock.save();
  }
  
  for (const holding of holdings) {
    const oldQty = holding.quantity;
    const oldAvg = holding.averageBuyPrice;
    
    holding.quantity = oldQty * splitFactor;
    holding.averageBuyPrice = Number((oldAvg / splitFactor).toFixed(2));
    holding.totalCost = holding.quantity * holding.averageBuyPrice;
    await holding.save();
    
    await Notification.create({
      user: holding.user,
      title: 'Stock Split Processed',
      message: `Stock split for ${symbol} processed. Your holding of ${oldQty} shares at INR ${oldAvg} is now ${holding.quantity} shares at INR ${holding.averageBuyPrice}.`,
      type: 'system'
    });
    
    count++;
  }
  
  return { success: true, holdingsAdjusted: count };
};

const processBonusIssue = async (symbol, bonusRatio) => {
  // e.g., Bonus ratio of 1 means 1 bonus share for every 1 share held (ratio 1:1)
  console.log(`[CorporateActions] Processing Bonus Issue for ${symbol}: Ratio ${bonusRatio}:1`);
  
  const holdings = await Holding.find({ symbol: symbol.toUpperCase() });
  let count = 0;
  
  for (const holding of holdings) {
    const oldQty = holding.quantity;
    const oldAvg = holding.averageBuyPrice;
    
    const bonusQty = oldQty * bonusRatio;
    holding.quantity = oldQty + bonusQty;
    // Average price drops because total cost stays the same but shares increase
    holding.averageBuyPrice = Number((holding.totalCost / holding.quantity).toFixed(2));
    await holding.save();
    
    await Notification.create({
      user: holding.user,
      title: 'Bonus Shares Credited',
      message: `Bonus issue of ${bonusRatio}:1 for ${symbol} processed. Received ${bonusQty} bonus shares. Total holdings: ${holding.quantity}.`,
      type: 'system'
    });
    
    count++;
  }
  
  return { success: true, holdingsAdjusted: count };
};

module.exports = {
  processDividend,
  processStockSplit,
  processBonusIssue
};
