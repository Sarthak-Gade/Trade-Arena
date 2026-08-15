const User = require('../models/User');
const Trade = require('../models/Trade');
const Holding = require('../models/Holding');
const Report = require('../models/Report');
const { generateContractNotePDF } = require('../utils/pdfGenerator');
const { sendEmail } = require('../utils/emailHelper');
const path = require('path');
const fs = require('fs');

const runDailyEODReportEngine = async (targetDateString) => {
  console.log('[EOD Report Engine] Starting daily roll-up jobs...');
  
  // Default to today's date YYYY-MM-DD
  const todayStr = targetDateString || new Date().toISOString().split('T')[0];
  
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  
  try {
    const users = await User.find();
    console.log(`[EOD Report Engine] Found ${users.length} registered users to analyze.`);
    
    let reportsGenerated = 0;
    
    for (const user of users) {
      // Find today's trades
      const todayTrades = await Trade.find({
        user: user._id,
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      });
      
      if (todayTrades.length === 0) {
        // Skip inactive users
        console.log(`[EOD Report Engine] User ${user.username} (${user.clientID}) had no trades today. Skipping.`);
        // Just roll over their opening balance to match their current wallet balance
        user.openingBalance = user.walletBalance;
        user.dailyClosedPnl = 0;
        await user.save();
        continue;
      }
      
      console.log(`[EOD Report Engine] Generating contract note for active user: ${user.username} (${todayTrades.length} trades)`);
      
      // Calculate charges breakdowns
      let grossBuyValue = 0;
      let grossSellValue = 0;
      let totalChargesObj = {
        brokerage: 0,
        stt: 0,
        exchangeCharges: 0,
        gst: 0,
        sebiCharges: 0,
        stampDuty: 0
      };
      
      todayTrades.forEach(t => {
        const val = t.executionQuantity * t.executionPrice;
        if (t.direction === 'buy') {
          grossBuyValue += val;
        } else {
          grossSellValue += val;
        }
        
        totalChargesObj.brokerage += t.brokerage;
        totalChargesObj.stt += t.stt;
        totalChargesObj.exchangeCharges += t.exchangeCharges;
        totalChargesObj.gst += t.gst;
        totalChargesObj.sebiCharges += t.sebiCharges;
        totalChargesObj.stampDuty += t.stampDuty;
      });
      
      const totalCharges = Number(
        Object.values(totalChargesObj).reduce((acc, curr) => acc + curr, 0).toFixed(2)
      );
      
      const netDebitCredit = grossSellValue - grossBuyValue - totalCharges;
      
      const userHoldings = await Holding.find({ user: user._id });
      const Stock = require('../models/Stock');
      const symbols = userHoldings.map(h => h.symbol);
      const stocks = await Stock.find({ symbol: { $in: symbols } });
      const stockMap = new Map(stocks.map(s => [s.symbol, s]));
      
      const holdingList = userHoldings.map(h => {
        const stock = stockMap.get(h.symbol);
        return {
          symbol: h.symbol,
          quantity: h.quantity,
          averageBuyPrice: h.averageBuyPrice,
          currentPrice: stock ? stock.currentPrice : h.averageBuyPrice
        };
      });
      
      const walletSummary = {
        openingBalance: user.openingBalance,
        deposits: 0, // deposits are separate, can query Ledger if needed.
        charges: totalCharges,
        closingBalance: user.walletBalance
      };
      
      const financialSummary = {
        grossBuyValue,
        grossSellValue,
        netDebitCredit,
        dailyPnl: user.dailyClosedPnl,
        totalCharges,
        chargesBreakdown: totalChargesObj
      };
      
      // Generate PDF
      const pdfMeta = await generateContractNotePDF({
        user,
        date: todayStr,
        trades: todayTrades,
        holdings: holdingList,
        walletSummary,
        financialSummary
      });
      
      // Save report in DB
      const report = new Report({
        user: user._id,
        type: 'contract_note',
        date: todayStr,
        pdfPath: pdfMeta.filePath,
        pdfUrl: pdfMeta.relativeUrl,
        emailSent: false
      });
      
      // Send Email with PDF attachment
      const emailSent = await sendEmail({
        to: user.email,
        subject: `TradeArena EOD Contract Note - ${todayStr}`,
        text: `Dear ${user.username},\n\nPlease find attached your EOD Contract Note for ${todayStr}.\n\nTradeArena Paper Trading platform.`,
        html: `
          <h3>TradeArena Statement</h3>
          <p>Dear ${user.username.toUpperCase()},</p>
          <p>Please find attached your digital contract note statement for the trading day <strong>${todayStr}</strong>.</p>
          <p>This statement contains your trade logs, charges breakdown, and portfolio valuations.</p>
        `,
        attachments: [
          {
            filename: pdfMeta.fileName,
            path: pdfMeta.filePath
          }
        ]
      });
      
      report.emailSent = emailSent;
      await report.save();
      
      // Roll over User balances
      user.openingBalance = user.walletBalance;
      user.dailyClosedPnl = 0;
      await user.save();
      
      reportsGenerated++;
    }
    
    console.log(`[EOD Report Engine] Done. Generated ${reportsGenerated} contract notes.`);
    return { success: true, reportsGenerated };
  } catch (error) {
    console.error('[EOD Report Engine] Critical error in EOD job run:', error.message);
    return { success: false, error: error.message };
  }
};

const getReportsHistory = async (userId) => {
  return await Report.find({ user: userId }).sort({ createdAt: -1 });
};

module.exports = {
  runDailyEODReportEngine,
  getReportsHistory
};
