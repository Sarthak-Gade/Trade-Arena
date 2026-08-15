const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const KYC = require('../models/KYC');
const Stock = require('../models/Stock');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const Ledger = require('../models/Ledger');

const authService = require('../services/authService');
const kycService = require('../services/kycService');
const walletService = require('../services/walletService');
const orderService = require('../services/orderService');
const reportService = require('../services/reportService');
const { seedStocks } = require('../services/marketDataService');

const runEndToEndTest = async () => {
  console.log('--- STARTING END-TO-END INTEGRATION TEST FOR TRADEARENA ---');
  
  try {
    // 1. Connect to Database
    await connectDB();
    console.log('1. Database connected.');
    
    // 2. Seed stock master data
    await seedStocks();
    console.log('2. Stocks seeded.');
    
    // Clean old test user if exists
    const testEmail = 'tester@tradearena.local';
    await User.deleteOne({ email: testEmail });
    await KYC.deleteMany({});
    
    // 3. Register user
    console.log('3. Registering test user...');
    const regResult = await authService.registerUser({
      username: 'tester_pro',
      email: testEmail,
      mobile: '9876501234',
      password: 'securePassword123'
    });
    console.log('User registered:', regResult);
    
    const user = await User.findById(regResult.userId);
    
    // 4. Force Approve KYC directly for testing
    console.log('4. Approving KYC for tester...');
    user.kycStatus = 'approved';
    await user.save();
    console.log('KYC Status:', user.kycStatus);
    
    // 5. Check wallet initial funds
    console.log('5. Wallet balance (opening):', user.walletBalance);
    
    // 6. Place a Limit Buy Order for RELIANCE
    console.log('6. Placing a Buy Limit Order for RELIANCE...');
    const reliance = await Stock.findOne({ symbol: 'RELIANCE' });
    const targetPrice = reliance.currentPrice - 10; // set limit price slightly below current
    
    const order = await orderService.placeOrder(user._id, {
      symbol: 'RELIANCE',
      quantity: 50,
      orderType: 'limit',
      direction: 'buy',
      price: targetPrice
    });
    console.log('Limit Order Placed:', {
      id: order._id,
      symbol: order.symbol,
      qty: order.quantity,
      price: order.price,
      status: order.status,
      charges: order.totalCharges
    });
    
    // 7. Manually match order (simulating price drop to limit price)
    console.log('7. Simulating price tick meeting target price...');
    const executionService = require('../services/executionService');
    await executionService.matchOrdersForStock('RELIANCE', targetPrice);
    
    // Verify execution
    const updatedOrder = await Order.findById(order._id);
    console.log('Order status after tick:', updatedOrder.status);
    
    const trades = await Trade.find({ user: user._id });
    console.log('Executed trades count:', trades.length);
    if (trades.length > 0) {
      console.log('Trade executed price:', trades[0].executionPrice);
    }
    
    // 8. Trigger EOD Contract Note PDF Compiler
    console.log('8. Triggering manual EOD Report Compiler...');
    const reportResult = await reportService.runDailyEODReportEngine();
    console.log('Report compilation result:', reportResult);
    
    console.log('--- TEST COMPLETED SUCCESSFULLY ---');
    process.exit(0);
    
  } catch (error) {
    console.error('CRITICAL ERROR DURING INTEGRATION TEST:', error.message);
    process.exit(1);
  }
};

runEndToEndTest();
