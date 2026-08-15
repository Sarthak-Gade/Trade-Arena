const Holding = require('../models/Holding');
const Position = require('../models/Position');
const User = require('../models/User');
const Stock = require('../models/Stock');

const getPortfolioHoldings = async (userId) => {
  const holdings = await Holding.find({ user: userId });
  const symbols = holdings.map(h => h.symbol);
  
  const stocks = await Stock.find({ symbol: { $in: symbols } });
  const stockMap = new Map(stocks.map(s => [s.symbol, s]));
  
  return holdings.map(h => {
    const stock = stockMap.get(h.symbol);
    const currentPrice = stock ? stock.currentPrice : h.averageBuyPrice;
    const prevClose = stock ? stock.prevClose : h.averageBuyPrice;
    
    const currentValue = h.quantity * currentPrice;
    const totalCost = h.totalCost;
    const unrealizedPnl = currentValue - totalCost;
    const pnlPercentage = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;
    const dayPnl = h.quantity * (currentPrice - prevClose);
    
    return {
      _id: h._id,
      symbol: h.symbol,
      companyName: stock ? stock.companyName : h.symbol,
      quantity: h.quantity,
      averageBuyPrice: h.averageBuyPrice,
      totalCost: Number(totalCost.toFixed(2)),
      currentPrice,
      currentValue: Number(currentValue.toFixed(2)),
      unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
      pnlPercentage: Number(pnlPercentage.toFixed(2)),
      dayPnl: Number(dayPnl.toFixed(2))
    };
  });
};

const getPortfolioPositions = async (userId) => {
  const positions = await Position.find({ user: userId });
  const symbols = positions.map(p => p.symbol);
  
  const stocks = await Stock.find({ symbol: { $in: symbols } });
  const stockMap = new Map(stocks.map(s => [s.symbol, s]));
  
  return positions.map(p => {
    const stock = stockMap.get(p.symbol);
    const currentPrice = stock ? stock.currentPrice : 0;
    
    let unrealizedPnl = 0;
    
    if (p.quantity > 0) {
      // Long position
      unrealizedPnl = p.quantity * (currentPrice - p.averageBuyPrice);
    } else if (p.quantity < 0) {
      // Short position
      unrealizedPnl = Math.abs(p.quantity) * (p.averageSellPrice - currentPrice);
    }
    
    return {
      _id: p._id,
      symbol: p.symbol,
      companyName: stock ? stock.companyName : p.symbol,
      quantity: p.quantity, // net quantity
      buyQty: p.buyQty,
      sellQty: p.sellQty,
      averageBuyPrice: p.averageBuyPrice,
      averageSellPrice: p.averageSellPrice,
      currentPrice,
      realizedPnl: Number(p.realizedPnl.toFixed(2)),
      unrealizedPnl: Number(unrealizedPnl.toFixed(2)),
      totalPnl: Number((p.realizedPnl + unrealizedPnl).toFixed(2))
    };
  });
};

const getPortfolioSummary = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  const holdings = await getPortfolioHoldings(userId);
  const positions = await getPortfolioPositions(userId);
  
  const holdingsValue = holdings.reduce((acc, h) => acc + h.currentValue, 0);
  const holdingsCost = holdings.reduce((acc, h) => acc + h.totalCost, 0);
  
  const holdingsUnrealizedPnl = holdings.reduce((acc, h) => acc + h.unrealizedPnl, 0);
  const positionsUnrealizedPnl = positions.reduce((acc, p) => acc + p.unrealizedPnl, 0);
  const positionsRealizedPnl = positions.reduce((acc, p) => acc + p.realizedPnl, 0);
  
  const totalUnrealizedPnl = holdingsUnrealizedPnl + positionsUnrealizedPnl;
  const totalRealizedPnl = positionsRealizedPnl;
  const portfolioValue = user.walletBalance + holdingsValue;
  
  // Day change
  const holdingsDayPnl = holdings.reduce((acc, h) => acc + h.dayPnl, 0);
  // For open positions, day change is based on current vs average price or daily open price if tracked.
  // Standard day P&L calculation: holdings day change + active positions unrealized PNL
  const totalDayPnl = holdingsDayPnl + positionsUnrealizedPnl;
  
  return {
    walletBalance: Number(user.walletBalance.toFixed(2)),
    holdingsValue: Number(holdingsValue.toFixed(2)),
    holdingsCost: Number(holdingsCost.toFixed(2)),
    totalUnrealizedPnl: Number(totalUnrealizedPnl.toFixed(2)),
    totalRealizedPnl: Number(totalRealizedPnl.toFixed(2)),
    portfolioValue: Number(portfolioValue.toFixed(2)),
    dayPnl: Number(totalDayPnl.toFixed(2)),
    holdings,
    positions
  };
};

module.exports = {
  getPortfolioHoldings,
  getPortfolioPositions,
  getPortfolioSummary
};
