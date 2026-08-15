const User = require('../models/User');
const Holding = require('../models/Holding');
const Stock = require('../models/Stock');

const getLeaderboard = async () => {
  const users = await User.find({ role: 'user' });
  const allHoldings = await Holding.find();
  const stocks = await Stock.find();
  const stockMap = new Map(stocks.map(s => [s.symbol, s]));
  
  // Group holdings by user ID
  const userHoldingsMap = new Map();
  allHoldings.forEach(h => {
    if (!userHoldingsMap.has(h.user.toString())) {
      userHoldingsMap.set(h.user.toString(), []);
    }
    userHoldingsMap.get(h.user.toString()).push(h);
  });
  
  const initialFunds = 1000000.00; // 10 Lakhs base
  const rankingList = [];
  
  users.forEach(user => {
    const userIdStr = user._id.toString();
    const userHoldings = userHoldingsMap.get(userIdStr) || [];
    
    let holdingsValue = 0;
    userHoldings.forEach(h => {
      const stock = stockMap.get(h.symbol);
      const curPrice = stock ? stock.currentPrice : h.averageBuyPrice;
      holdingsValue += h.quantity * curPrice;
    });
    
    const portfolioValue = user.walletBalance + holdingsValue;
    const netProfit = portfolioValue - initialFunds;
    const roi = (netProfit / initialFunds) * 100;
    
    rankingList.push({
      userId: user._id,
      username: user.username,
      clientID: user.clientID,
      walletBalance: Number(user.walletBalance.toFixed(2)),
      portfolioValue: Number(portfolioValue.toFixed(2)),
      netProfit: Number(netProfit.toFixed(2)),
      roi: Number(roi.toFixed(2))
    });
  });
  
  // Sort descending by ROI
  rankingList.sort((a, b) => b.roi - a.roi);
  
  // Add rank index
  return rankingList.map((item, index) => ({
    rank: index + 1,
    ...item
  }));
};

module.exports = {
  getLeaderboard
};
