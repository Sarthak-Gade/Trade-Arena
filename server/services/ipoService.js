const IPO = require('../models/IPO');
const IPOApplication = require('../models/IPOApplication');
const User = require('../models/User');
const Holding = require('../models/Holding');
const Ledger = require('../models/Ledger');
const Notification = require('../models/Notification');

const createIPO = async (ipoData) => {
  const ipo = new IPO({
    companyName: ipoData.companyName,
    symbol: ipoData.symbol.toUpperCase(),
    priceRange: ipoData.priceRange,
    minQuantity: ipoData.minQuantity,
    openDate: new Date(ipoData.openDate),
    closeDate: new Date(ipoData.closeDate),
    listingDate: new Date(ipoData.listingDate)
  });
  
  await ipo.save();
  return ipo;
};

const applyIPO = async (userId, ipoId, quantity, price) => {
  const ipo = await IPO.findById(ipoId);
  if (!ipo) throw new Error('IPO not found');
  
  if (ipo.status !== 'open') {
    throw new Error('IPO is not open for bidding');
  }
  
  if (quantity < ipo.minQuantity) {
    throw new Error(`Minimum bid quantity is ${ipo.minQuantity} shares`);
  }
  
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  const requiredBlockedFunds = quantity * price;
  if (user.walletBalance < requiredBlockedFunds) {
    throw new Error(`Insufficient wallet balance. Required: INR ${requiredBlockedFunds.toFixed(2)}, Available: INR ${user.walletBalance.toFixed(2)}`);
  }
  
  // Block funds
  user.walletBalance -= requiredBlockedFunds;
  await user.save();
  
  const application = new IPOApplication({
    user: userId,
    ipo: ipoId,
    appliedQuantity: quantity,
    appliedPrice: price,
    fundsBlocked: requiredBlockedFunds,
    status: 'applied'
  });
  
  await application.save();
  
  await Ledger.create({
    user: userId,
    amount: -requiredBlockedFunds,
    type: 'trade_debit',
    status: 'completed',
    balanceAfter: user.walletBalance,
    description: `Blocked funds for IPO Application: ${ipo.companyName} (${ipo.symbol})`
  });
  
  await Notification.create({
    user: userId,
    title: 'IPO Application Submitted',
    message: `You applied for ${quantity} shares of ${ipo.symbol} IPO at INR ${price}.`,
    type: 'system'
  });
  
  return application;
};

const allotIPO = async (ipoId) => {
  const ipo = await IPO.findById(ipoId);
  if (!ipo) throw new Error('IPO not found');
  
  if (ipo.status !== 'open' && ipo.status !== 'closed') {
    throw new Error('IPO allotment cannot be processed in its current status');
  }
  
  const applications = await IPOApplication.find({ ipo: ipoId, status: 'applied' });
  console.log(`[IPO Allotment] Processing ${applications.length} applications for ${ipo.symbol}`);
  
  for (const app of applications) {
    const user = await User.findById(app.user);
    if (!user) continue;
    
    // Virtual Allotment Algorithm: 50% probability of allotment
    const isAllotted = Math.random() >= 0.5;
    
    if (isAllotted) {
      app.status = 'allotted';
      await app.save();
      
      // Credit shares to holdings
      let holding = await Holding.findOne({ user: user._id, symbol: ipo.symbol });
      if (holding) {
        const oldQty = holding.quantity;
        const oldAvg = holding.averageBuyPrice;
        const newQty = oldQty + app.appliedQuantity;
        const newAvg = ((oldQty * oldAvg) + (app.appliedQuantity * app.appliedPrice)) / newQty;
        
        holding.quantity = newQty;
        holding.averageBuyPrice = Number(newAvg.toFixed(2));
        holding.totalCost = newQty * newAvg;
        await holding.save();
      } else {
        await Holding.create({
          user: user._id,
          symbol: ipo.symbol,
          quantity: app.appliedQuantity,
          averageBuyPrice: app.appliedPrice,
          totalCost: app.appliedQuantity * app.appliedPrice
        });
      }
      
      // Create a simulated Stock Master record for listing day if it doesn't exist
      const Stock = require('../models/Stock');
      const stockExists = await Stock.findOne({ symbol: ipo.symbol });
      if (!stockExists) {
        await Stock.create({
          symbol: ipo.symbol,
          companyName: ipo.companyName,
          exchange: 'NSE',
          isin: `INE${Math.floor(100000000 + Math.random() * 900000000)}`,
          sector: 'IPO Listing',
          industry: 'IPO Listing',
          currentPrice: app.appliedPrice,
          prevClose: app.appliedPrice,
          openPrice: app.appliedPrice,
          highPrice: app.appliedPrice,
          lowPrice: app.appliedPrice
        });
      }
      
      await Ledger.create({
        user: user._id,
        amount: -app.fundsBlocked,
        type: 'charges',
        status: 'completed',
        balanceAfter: user.walletBalance,
        description: `Settled payment for IPO allotment of ${ipo.symbol}`
      });
      
      await Notification.create({
        user: user._id,
        title: 'IPO Allotment Successful',
        message: `Congratulations! You were allotted ${app.appliedQuantity} shares of ${ipo.symbol} IPO.`,
        type: 'system'
      });
      
    } else {
      app.status = 'not_allotted';
      await app.save();
      
      // Refund blocked funds
      user.walletBalance += app.fundsBlocked;
      await user.save();
      
      await Ledger.create({
        user: user._id,
        amount: app.fundsBlocked,
        type: 'trade_credit',
        status: 'completed',
        balanceAfter: user.walletBalance,
        description: `Refunded blocked funds for unsuccessful IPO bid: ${ipo.symbol}`
      });
      
      await Notification.create({
        user: user._id,
        title: 'IPO Allotment Unsuccessful',
        message: `Your bid for ${app.appliedQuantity} shares of ${ipo.symbol} was not allotted. Blocked funds refunded.`,
        type: 'system'
      });
    }
  }
  
  ipo.status = 'allotted';
  await ipo.save();
  
  return { success: true, processedBids: applications.length };
};

const getIPODetails = async () => {
  return await IPO.find().sort({ openDate: -1 });
};

const getUserApplications = async (userId) => {
  return await IPOApplication.find({ user: userId }).populate('ipo').sort({ createdAt: -1 });
};

module.exports = {
  createIPO,
  applyIPO,
  allotIPO,
  getIPODetails,
  getUserApplications
};
