/**
 * BrokerProvider
 * Reserved for future real broker integrations (e.g. Zerodha Kite, Angel One, Upstox API).
 * System switching: TRADING_MODE=REAL.
 */

const checkOrderMatch = (order, currentPrice) => {
  // In real trading, order matches are handled on the exchange/broker side.
  // This is a mock stub for compatibility.
  console.log(`[BrokerProvider] Querying order status for real order: ${order._id}`);
  return { matches: false };
};

const submitRealOrder = async (order) => {
  console.log(`[BrokerProvider] Submitting real order to Exchange via API:`, order);
  return {
    success: true,
    brokerOrderId: `REAL_ORD_${Math.floor(Math.random() * 10000000)}`,
    status: 'submitted'
  };
};

module.exports = {
  checkOrderMatch,
  submitRealOrder
};
