const Order = require('../models/Order');
const User = require('../models/User');
const Holding = require('../models/Holding');
const Position = require('../models/Position');
const Trade = require('../models/Trade');
const Ledger = require('../models/Ledger');
const Stock = require('../models/Stock');
const Notification = require('../models/Notification');
const { calculateCharges } = require('../utils/calculations');
const marketDataService = require('./marketDataService');

// Retrieve Socket.IO global instance from express server
let ioInstance = null;
const setSocketIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

/**
 * Places a new order.
 */
const placeOrder = async (userId, orderData) => {
  const { symbol, quantity, orderType, direction, price, triggerPrice, isIntraday = false } = orderData;
  
  // 1. Fetch current price
  const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
  if (!stock) {
    throw new Error('Stock not found in master list');
  }
  
  const currentPrice = stock.currentPrice;
  const targetPrice = orderType === 'market' ? currentPrice : price;
  
  // 2. Calculate estimated charges
  const charges = calculateCharges({
    direction,
    quantity,
    price: targetPrice,
    isIntraday
  });
  
  // 3. Fetch User
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  // 4. Validate Account Status — only block in REAL broker mode
  // In PAPER trading (simulator), allow trading with pending/under_review KYC too.
  const isBrokerMode = process.env.TRADING_MODE === 'REAL';
  const isKycRejected = user.kycStatus === 'rejected';
  
  if (isBrokerMode && user.kycStatus !== 'approved') {
    throw new Error('KYC verification is required to trade with real money. Please complete your KYC.');
  }
  if (isKycRejected) {
    throw new Error('Your KYC was rejected. Please re-submit your KYC documents to resume trading.');
  }
  
  const totalRequiredFunds = direction === 'buy' ? (quantity * targetPrice) + charges.totalCharges : charges.totalCharges;
  
  // 5. Buy check
  if (direction === 'buy') {
    if (user.walletBalance < totalRequiredFunds) {
      throw new Error(`Insufficient funds. Required: INR ${totalRequiredFunds.toFixed(2)}, Available: INR ${user.walletBalance.toFixed(2)}`);
    }
    
    // Debit funds immediately to block them for this order
    user.walletBalance -= totalRequiredFunds;
    await user.save();
    
    // Add ledger entry for blocked funds
    await Ledger.create({
      user: userId,
      amount: -totalRequiredFunds,
      type: 'trade_debit',
      status: 'completed',
      balanceAfter: user.walletBalance,
      description: `Blocked funds for ${direction.toUpperCase()} ${orderType.toUpperCase()} order on ${symbol} (Qty: ${quantity})`
    });
  } else {
    // Sell check: User must own the stock
    if (!isIntraday) {
      const holding = await Holding.findOne({ user: userId, symbol: symbol.toUpperCase() });
      if (!holding || holding.quantity < quantity) {
        throw new Error(`Insufficient holdings. You only own ${holding ? holding.quantity : 0} shares of ${symbol}`);
      }
      
      // Block holding quantity: decrement holding immediately
      holding.quantity -= quantity;
      if (holding.quantity === 0) {
        await holding.deleteOne();
      } else {
        holding.totalCost = holding.quantity * holding.averageBuyPrice;
        await holding.save();
      }
    } else {
      // Intraday short position check
      const position = await Position.findOne({ user: userId, symbol: symbol.toUpperCase() });
      const currentQty = position ? position.quantity : 0;
      // If shorting, net quantity is negative, which is fine for intraday
    }
  }
  
  // 6. Check Market Session status
  const sessionStatus = marketDataService.getMarketSessionStatus();
  
  const order = new Order({
    user: userId,
    symbol: symbol.toUpperCase(),
    quantity,
    orderType,
    direction,
    price: orderType === 'market' ? undefined : price,
    triggerPrice: ['stop_loss', 'take_profit'].includes(orderType) ? triggerPrice : undefined,
    status: sessionStatus !== 'OPEN' ? 'queued' : (orderType === 'market' ? 'executed' : 'pending'),
    brokerage: charges.brokerage,
    stt: charges.stt,
    exchangeCharges: charges.exchangeCharges,
    gst: charges.gst,
    sebiCharges: charges.sebiCharges,
    stampDuty: charges.stampDuty,
    totalCharges: charges.totalCharges,
    executionProvider: process.env.TRADING_MODE === 'REAL' ? 'broker' : 'paper'
  });
  
  await order.save();
  
  // Send notification about order placement
  await Notification.create({
    user: userId,
    title: `Order ${order.status.toUpperCase()}`,
    message: `${direction.toUpperCase()} order of ${quantity} shares of ${symbol} is ${order.status}`,
    type: 'order'
  });
  
  // Real-time update to Socket.IO clients
  if (ioInstance) {
    ioInstance.to(userId.toString()).emit('order-placed', order);
    ioInstance.to(userId.toString()).emit('wallet-update', { balance: user.walletBalance });
  }
  
  // 7. If status is already 'executed' (market order placed during open market), complete transaction
  if (order.status === 'executed') {
    await executeTrade(order, targetPrice, isIntraday);
  }
  
  return order;
};

/**
 * Modifies an existing pending/queued order.
 */
const modifyOrder = async (userId, orderId, modifyData) => {
  const { newPrice, newQuantity } = modifyData;
  const order = await Order.findOne({ _id: orderId, user: userId });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (!['pending', 'queued'].includes(order.status)) {
    throw new Error(`Cannot modify order with status: ${order.status}`);
  }
  
  const user = await User.findById(userId);
  const stock = await Stock.findOne({ symbol: order.symbol });
  const currentPrice = stock.currentPrice;
  
  const originalQty = order.quantity;
  const originalPrice = order.price || currentPrice;
  const originalCharges = order.totalCharges;
  
  const targetPrice = order.orderType === 'market' ? currentPrice : (newPrice || order.price);
  const targetQty = newQuantity || order.quantity;
  
  // Re-calculate charges
  const newCharges = calculateCharges({
    direction: order.direction,
    quantity: targetQty,
    price: targetPrice,
    isIntraday: false
  });
  
  // Update fund allocations for BUY orders
  if (order.direction === 'buy') {
    const originalTotalBlocked = (originalQty * originalPrice) + originalCharges;
    const newTotalRequired = (targetQty * targetPrice) + newCharges.totalCharges;
    const diff = newTotalRequired - originalTotalBlocked;
    
    if (diff > 0 && user.walletBalance < diff) {
      throw new Error(`Insufficient funds to modify order. Additional INR ${diff.toFixed(2)} needed.`);
    }
    
    user.walletBalance -= diff;
    await user.save();
    
    // Add ledger entry
    await Ledger.create({
      user: userId,
      amount: -diff,
      type: 'trade_debit',
      status: 'completed',
      balanceAfter: user.walletBalance,
      description: `Adjusted blocked funds for modified ${order.direction.toUpperCase()} order on ${order.symbol}`
    });
  } else {
    // Sell Order Holdings Adjustment
    const holding = await Holding.findOne({ user: userId, symbol: order.symbol });
    const diffQty = targetQty - originalQty;
    
    if (diffQty > 0) {
      if (!holding || holding.quantity < diffQty) {
        throw new Error(`Insufficient holdings to increase order size. Available: ${holding ? holding.quantity : 0}`);
      }
      holding.quantity -= diffQty;
    } else if (diffQty < 0) {
      // Return shares to holdings
      if (holding) {
        holding.quantity += Math.abs(diffQty);
      } else {
        await Holding.create({
          user: userId,
          symbol: order.symbol,
          quantity: Math.abs(diffQty),
          averageBuyPrice: currentPrice,
          totalCost: Math.abs(diffQty) * currentPrice
        });
      }
    }
    
    if (holding) {
      holding.totalCost = holding.quantity * holding.averageBuyPrice;
      await holding.save();
    }
  }
  
  order.quantity = targetQty;
  if (order.orderType !== 'market') {
    order.price = targetPrice;
  }
  order.brokerage = newCharges.brokerage;
  order.stt = newCharges.stt;
  order.exchangeCharges = newCharges.exchangeCharges;
  order.gst = newCharges.gst;
  order.sebiCharges = newCharges.sebiCharges;
  order.stampDuty = newCharges.stampDuty;
  order.totalCharges = newCharges.totalCharges;
  
  await order.save();
  
  // Notify
  if (ioInstance) {
    ioInstance.to(userId.toString()).emit('order-modified', order);
    ioInstance.to(userId.toString()).emit('wallet-update', { balance: user.walletBalance });
  }
  
  return order;
};

/**
 * Cancels a pending or queued order.
 */
const cancelOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new Error('Order not found');
  }
  
  if (!['pending', 'queued'].includes(order.status)) {
    throw new Error(`Cannot cancel order in state: ${order.status}`);
  }
  
  const user = await User.findById(userId);
  const stock = await Stock.findOne({ symbol: order.symbol });
  const currentPrice = stock ? stock.currentPrice : (order.price || 0);
  
  // Refund locked resources
  if (order.direction === 'buy') {
    const refundAmount = (order.quantity * (order.price || currentPrice)) + order.totalCharges;
    user.walletBalance += refundAmount;
    await user.save();
    
    await Ledger.create({
      user: userId,
      amount: refundAmount,
      type: 'trade_credit',
      status: 'completed',
      balanceAfter: user.walletBalance,
      description: `Refunded blocked funds from cancelled ${order.direction.toUpperCase()} order on ${order.symbol}`
    });
  } else {
    // Refund holding shares — find original average buy price from trade history or position
    const holding = await Holding.findOne({ user: userId, symbol: order.symbol });
    
    // Try to get the real average buy price from position record or trade history
    const Position = require('../models/Position');
    const Trade = require('../models/Trade');
    let avgBuyPrice = currentPrice; // fallback
    const position = await Position.findOne({ user: userId, symbol: order.symbol });
    if (position && position.averageBuyPrice > 0) {
      avgBuyPrice = position.averageBuyPrice;
    } else {
      // Last resort: look up most recent buy trade
      const lastBuyTrade = await Trade.findOne({ user: userId, symbol: order.symbol, direction: 'buy' }).sort({ createdAt: -1 });
      if (lastBuyTrade) avgBuyPrice = lastBuyTrade.executionPrice;
    }

    if (holding) {
      holding.quantity += order.quantity;
      holding.totalCost = holding.quantity * holding.averageBuyPrice;
      await holding.save();
    } else {
      await Holding.create({
        user: userId,
        symbol: order.symbol,
        quantity: order.quantity,
        averageBuyPrice: avgBuyPrice,
        totalCost: order.quantity * avgBuyPrice
      });
    }
  }
  
  order.status = 'cancelled';
  await order.save();
  
  // Send notification
  await Notification.create({
    user: userId,
    title: 'Order Cancelled',
    message: `Your ${order.direction.toUpperCase()} order of ${order.quantity} shares of ${order.symbol} was cancelled.`,
    type: 'order'
  });
  
  // Notify
  if (ioInstance) {
    ioInstance.to(userId.toString()).emit('order-cancelled', order);
    ioInstance.to(userId.toString()).emit('wallet-update', { balance: user.walletBalance });
  }
  
  return order;
};

/**
 * Central Ledger and Portfolio bookkeeper for successfully matched/executed trades.
 */
const executeTrade = async (order, executionPrice, isIntraday = false) => {
  const userId = order.user;
  const user = await User.findById(userId);
  
  if (order.status !== 'executed') {
    order.status = 'executed';
    order.executedAt = Date.now();
  }
  
  // Recompute charges at final execution price
  const charges = calculateCharges({
    direction: order.direction,
    quantity: order.quantity,
    price: executionPrice,
    isIntraday
  });
  
  order.brokerage = charges.brokerage;
  order.stt = charges.stt;
  order.exchangeCharges = charges.exchangeCharges;
  order.gst = charges.gst;
  order.sebiCharges = charges.sebiCharges;
  order.stampDuty = charges.stampDuty;
  order.totalCharges = charges.totalCharges;
  await order.save();
  
  // 1. Create Trade Record
  const trade = new Trade({
    user: userId,
    order: order._id,
    symbol: order.symbol,
    executionPrice,
    executionQuantity: order.quantity,
    direction: order.direction,
    brokerage: charges.brokerage,
    stt: charges.stt,
    exchangeCharges: charges.exchangeCharges,
    gst: charges.gst,
    sebiCharges: charges.sebiCharges,
    stampDuty: charges.stampDuty,
    totalCharges: charges.totalCharges
  });
  await trade.save();
  
  // 2. Perform Portfolio adjustments
  let holding = await Holding.findOne({ user: userId, symbol: order.symbol });
  let position = await Position.findOne({ user: userId, symbol: order.symbol });
  
  if (!position) {
    position = new Position({ user: userId, symbol: order.symbol });
  }
  
  const tradeValue = order.quantity * executionPrice;
  
  if (order.direction === 'buy') {
    // Buying actions
    if (!isIntraday) {
      if (holding) {
        // Update existing holding with weighted average price
        const oldQty = holding.quantity;
        const oldAvg = holding.averageBuyPrice;
        const newQty = oldQty + order.quantity;
        const newAvg = ((oldQty * oldAvg) + (order.quantity * executionPrice)) / newQty;
        holding.quantity = newQty;
        holding.averageBuyPrice = Number(newAvg.toFixed(2));
        holding.totalCost = newQty * holding.averageBuyPrice;
        await holding.save();
      } else {
        holding = await Holding.create({
          user: userId,
          symbol: order.symbol,
          quantity: order.quantity,
          averageBuyPrice: Number(executionPrice.toFixed(2)),
          totalCost: tradeValue
        });
      }
    }
    
    // Position Update
    const oldPositionQty = position.quantity;
    const oldBuyQty = position.buyQty;
    const oldAvgBuy = position.averageBuyPrice;
    
    position.quantity += order.quantity;
    position.buyQty += order.quantity;
    position.averageBuyPrice = Number((((oldBuyQty * oldAvgBuy) + (order.quantity * executionPrice)) / position.buyQty).toFixed(2));
    await position.save();
    
    // Fund reconciliation:
    // When order was placed, we blocked: (qty * price) + charges.
    // Refund the difference or deduct the extra charges based on final execution price.
    const priceToVerify = order.price || executionPrice; // limit price if limit order
    const blockedAmount = (order.quantity * priceToVerify) + order.totalCharges; // charges saved at placement
    const actualCost = tradeValue + charges.totalCharges;
    
    const diff = blockedAmount - actualCost; // if positive, we refund difference. if negative, we deduct additional
    user.walletBalance += diff;
    await user.save();
    
    if (diff !== 0) {
      await Ledger.create({
        user: userId,
        amount: diff,
        type: diff > 0 ? 'trade_credit' : 'trade_debit',
        status: 'completed',
        balanceAfter: user.walletBalance,
        description: `Settled execution price difference for Buy order on ${order.symbol} (Execution: ${executionPrice.toFixed(2)}, Placed: ${priceToVerify.toFixed(2)})`
      });
    }
    
  } else {
    // Selling actions
    // If not intraday, holding quantity was already deducted during placement
    // Cash settlement:
    const creditAmount = tradeValue - charges.totalCharges;
    user.walletBalance += creditAmount;
    
    // Calculate P&L: Realized P&L is calculated based on holding's averageBuyPrice
    // Find holding to check average buy price.
    // Wait, the holding quantity was already decremented, but we need averageBuyPrice.
    // If holding was deleted because quantity hit 0, we can look up from position or trade records.
    // Position maintains averageBuyPrice
    const costBasis = position.averageBuyPrice || executionPrice;
    const grossPnl = order.quantity * (executionPrice - costBasis);
    const netPnl = grossPnl - charges.totalCharges;
    
    user.dailyClosedPnl += netPnl;
    await user.save();
    
    // Position update
    position.quantity -= order.quantity;
    position.sellQty += order.quantity;
    const oldSellQty = position.sellQty - order.quantity;
    const oldAvgSell = position.averageSellPrice;
    position.averageSellPrice = Number((((oldSellQty * oldAvgSell) + (order.quantity * executionPrice)) / position.sellQty).toFixed(2));
    position.realizedPnl += netPnl;
    await position.save();
    
    await Ledger.create({
      user: userId,
      amount: creditAmount,
      type: 'trade_credit',
      status: 'completed',
      balanceAfter: user.walletBalance,
      description: `Credited sales proceeds from Sell order on ${order.symbol} (Qty: ${order.quantity})`
    });
    
    await Ledger.create({
      user: userId,
      amount: -charges.totalCharges,
      type: 'charges',
      status: 'completed',
      balanceAfter: user.walletBalance,
      description: `Deducted transaction charges on Sell order for ${order.symbol}`
    });
  }
  
  // Notification
  await Notification.create({
    user: userId,
    title: 'Order Executed',
    message: `Your ${order.direction.toUpperCase()} order of ${order.quantity} shares of ${order.symbol} was executed at INR ${executionPrice.toFixed(2)}.`,
    type: 'order'
  });
  
  // Emit to socket
  if (ioInstance) {
    ioInstance.to(userId.toString()).emit('order-executed', order);
    ioInstance.to(userId.toString()).emit('trade-added', trade);
    ioInstance.to(userId.toString()).emit('wallet-update', { balance: user.walletBalance, dailyClosedPnl: user.dailyClosedPnl });
    
    // Fetch refreshed positions/holdings to push with full summary
    const activeHoldings = await Holding.find({ user: userId });
    const activePositions = await Position.find({ user: userId });
    
    // Compute live portfolio value for real-time summary update
    const totalUnrealizedPnl = activePositions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0);
    const holdingsValue = activeHoldings.reduce((sum, h) => sum + (h.currentValue || h.totalCost || 0), 0);
    
    ioInstance.to(userId.toString()).emit('portfolio-update', {
      holdings: activeHoldings,
      positions: activePositions,
      walletBalance: user.walletBalance,
      portfolioValue: user.walletBalance + holdingsValue,
      totalUnrealizedPnl,
      dayPnl: user.dailyClosedPnl || 0
    });
  }
  
  console.log(`[OMS] Order ${order._id} successfully executed at ${executionPrice}`);
};

module.exports = {
  placeOrder,
  modifyOrder,
  cancelOrder,
  executeTrade,
  setSocketIO,
  getIO
};
