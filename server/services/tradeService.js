const Trade = require('../models/Trade');

const getTradeHistory = async (userId, filters = {}) => {
  const query = { user: userId };
  
  if (filters.symbol) {
    query.symbol = filters.symbol.toUpperCase();
  }
  
  if (filters.direction) {
    query.direction = filters.direction;
  }
  
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }
  
  return await Trade.find(query).sort({ createdAt: -1 });
};

module.exports = {
  getTradeHistory
};
