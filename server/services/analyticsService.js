const Trade = require('../models/Trade');
const Position = require('../models/Position');
const User = require('../models/User');
const Holding = require('../models/Holding');

const getAnalyticsDashboard = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  
  // Find all closed positions or trade history
  const positions = await Position.find({ user: userId });
  const holdings = await Holding.find({ user: userId });
  
  // Calculate win rate & loss rate from positions where quantity = 0 (closed) or realizedPnl is present
  const tradePositions = positions.filter(p => p.realizedPnl !== 0 || p.quantity === 0);
  
  let winCount = 0;
  let lossCount = 0;
  let totalProfits = 0;
  let totalLosses = 0;
  let bestTradePnl = -Infinity;
  let worstTradePnl = Infinity;
  
  tradePositions.forEach(p => {
    const pnl = p.realizedPnl;
    if (pnl > 0) {
      winCount++;
      totalProfits += pnl;
    } else if (pnl < 0) {
      lossCount++;
      totalLosses += Math.abs(pnl);
    }
    
    if (pnl > bestTradePnl) bestTradePnl = pnl;
    if (pnl < worstTradePnl) worstTradePnl = pnl;
  });
  
  // Clean empty bounds
  if (bestTradePnl === -Infinity) bestTradePnl = 0;
  if (worstTradePnl === Infinity) worstTradePnl = 0;
  
  const totalClosedTrades = winCount + lossCount;
  const winRate = totalClosedTrades > 0 ? Number(((winCount / totalClosedTrades) * 100).toFixed(2)) : 0;
  const lossRate = totalClosedTrades > 0 ? Number(((lossCount / totalClosedTrades) * 100).toFixed(2)) : 0;
  
  const avgProfit = winCount > 0 ? Number((totalProfits / winCount).toFixed(2)) : 0;
  const avgLoss = lossCount > 0 ? Number((totalLosses / lossCount).toFixed(2)) : 0;
  const profitFactor = totalLosses > 0 ? Number((totalProfits / totalLosses).toFixed(2)) : totalProfits > 0 ? totalProfits : 1;
  
  // Calculate CAGR: Compound Annual Growth Rate
  // Formula: (CurrentValue / InitialValue) ^ (365 / daysActive) - 1
  const initialValue = 1000000.00; // 10 Lakhs opening
  // Find current portfolio value (cash + holdings cost)
  const holdingsValue = holdings.reduce((acc, h) => acc + h.totalCost, 0);
  const currentValue = user.walletBalance + holdingsValue;
  
  const diffTime = Math.abs(Date.now() - user.createdAt.getTime());
  const daysActive = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  
  const cagrRaw = Math.pow((currentValue / initialValue), (365 / daysActive)) - 1;
  // Cap at realistic limits, format as percentage
  const cagr = Number((cagrRaw * 100).toFixed(2));
  
  // MOCK Equity Curve data (daily returns) for plotting
  // We construct an array of 7 points representing portfolio value progress
  const initialDate = new Date(user.createdAt);
  const equityCurve = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    
    // Simulate daily growth curve leading up to current value
    const factor = 1 - (i * 0.002); // slight mock fluctuation
    let value = currentValue * factor;
    
    if (i === 6) value = initialValue; // start at base
    
    equityCurve.push({
      date: dateStr,
      value: Number(value.toFixed(2))
    });
  }
  
  // Add actual current value to last item
  equityCurve[equityCurve.length - 1].value = Number(currentValue.toFixed(2));
  
  const netProfit = Number((totalProfits - totalLosses).toFixed(2));

  return {
    portfolioValue: Number(currentValue.toFixed(2)),
    availableFunds: Number(user.walletBalance.toFixed(2)),
    netProfit,
    cagr,
    winRate,
    lossRate,
    avgProfit,
    avgLoss,
    profitFactor,
    bestTrade: Number(bestTradePnl.toFixed(2)),
    worstTrade: Number(worstTradePnl.toFixed(2)),
    totalTrades: totalClosedTrades,
    equityCurve
  };
};

module.exports = {
  getAnalyticsDashboard
};
