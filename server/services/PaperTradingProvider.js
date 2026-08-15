const marketDataService = require('./marketDataService');

/**
 * PaperTradingProvider
 * Responsible for checking if simulated conditions match the order target criteria.
 */

const checkOrderMatch = (order, currentPrice) => {
  const { orderType, direction, price, triggerPrice } = order;
  
  if (orderType === 'market') {
    return { matches: true, executionPrice: currentPrice };
  }
  
  if (orderType === 'limit') {
    // Buy Limit: Execute when price falls to or below limit price
    if (direction === 'buy' && currentPrice <= price) {
      return { matches: true, executionPrice: currentPrice };
    }
    // Sell Limit: Execute when price rises to or above limit price
    if (direction === 'sell' && currentPrice >= price) {
      return { matches: true, executionPrice: currentPrice };
    }
  }
  
  if (orderType === 'stop_loss') {
    // Buy Stop Loss (Trigger): Execute when price rises to or above trigger price
    if (direction === 'buy' && currentPrice >= triggerPrice) {
      return { matches: true, executionPrice: currentPrice };
    }
    // Sell Stop Loss (Trigger): Execute when price falls to or below trigger price
    if (direction === 'sell' && currentPrice <= triggerPrice) {
      return { matches: true, executionPrice: currentPrice };
    }
  }
  
  if (orderType === 'take_profit') {
    // Buy Take Profit: Execute when price rises to or above trigger price
    if (direction === 'buy' && currentPrice >= triggerPrice) {
      return { matches: true, executionPrice: currentPrice };
    }
    // Sell Take Profit: Execute when price falls to or below trigger price
    if (direction === 'sell' && currentPrice <= triggerPrice) {
      return { matches: true, executionPrice: currentPrice };
    }
  }
  
  return { matches: false };
};

module.exports = {
  checkOrderMatch
};
