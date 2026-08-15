const Order = require('../models/Order');
const PaperTradingProvider = require('./PaperTradingProvider');
const BrokerProvider = require('./BrokerProvider');
const marketDataService = require('./marketDataService');

/**
 * Execution Service
 * Coordinates simulated trade matching or routes to external broker interfaces.
 */

const getProvider = () => {
  const mode = process.env.TRADING_MODE || 'PAPER';
  return mode === 'REAL' ? BrokerProvider : PaperTradingProvider;
};

/**
 * Invoked on every price tick of a stock to match pending/queued orders.
 */
const matchOrdersForStock = async (symbol, currentPrice) => {
  const sessionStatus = marketDataService.getMarketSessionStatus();
  
  // Outside market hours, do not execute orders (keep them queued/pending)
  if (sessionStatus === 'CLOSED') {
    return;
  }
  
  try {
    // Find all pending or queued orders for this stock symbol
    const activeOrders = await Order.find({
      symbol: symbol.toUpperCase(),
      status: { $in: ['pending', 'queued'] }
    });
    
    if (activeOrders.length === 0) return;
    
    const provider = getProvider();
    const orderService = require('./orderService'); // resolve circular dependency
    
    for (const order of activeOrders) {
      try {
        const { matches, executionPrice } = provider.checkOrderMatch(order, currentPrice);
        
        if (matches) {
          console.log(`[ExecutionEngine] Order ${order._id} MATCHED for ${symbol} at price ${executionPrice}`);
          await orderService.executeTrade(order, executionPrice);
        }
      } catch (err) {
        console.error(`[ExecutionEngine] Failed to execute order ${order._id}:`, err.message);
      }
    }
  } catch (error) {
    console.error(`[ExecutionEngine] Error matching orders for ${symbol}:`, error.message);
  }
};

/**
 * Triggered at market open to execute queued market orders.
 */
const executeQueuedMarketOrders = async () => {
  console.log('[ExecutionEngine] Executing queued market orders on market open...');
  try {
    const queuedOrders = await Order.find({ status: 'queued', orderType: 'market' });
    const Stock = require('../models/Stock');
    const orderService = require('./orderService');
    
    for (const order of queuedOrders) {
      const stock = await Stock.findOne({ symbol: order.symbol });
      if (stock) {
        await orderService.executeTrade(order, stock.currentPrice);
      }
    }
  } catch (error) {
    console.error('[ExecutionEngine] Error executing queued market orders:', error.message);
  }
};

module.exports = {
  matchOrdersForStock,
  executeQueuedMarketOrders
};
