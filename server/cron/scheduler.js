const cron = require('node-cron');
const { runDailyEODReportEngine } = require('../services/reportService');
const { executeQueuedMarketOrders } = require('../services/executionService');

const initScheduler = () => {
  console.log('[Scheduler] Initializing cron schedules...');
  
  // 1. Daily EOD Contract Note generation (Runs Monday to Friday at 16:00 IST / 4:00 PM)
  // Standard cron format: minute hour day-of-month month day-of-week
  // Runs at 16:00 (4:00 PM)
  cron.schedule('0 16 * * 1-5', async () => {
    console.log('[Scheduler] Running scheduled EOD report compilation...');
    const dateStr = new Date().toISOString().split('T')[0];
    await runDailyEODReportEngine(dateStr);
  }, {
    timezone: 'Asia/Kolkata'
  });
  
  // 2. Market Open Trigger (Runs Monday to Friday at 09:15 IST)
  // Executes queued market orders placed outside market hours.
  cron.schedule('15 9 * * 1-5', async () => {
    console.log('[Scheduler] Market has opened. Processing queued pre-market orders...');
    await executeQueuedMarketOrders();
  }, {
    timezone: 'Asia/Kolkata'
  });
  
  console.log('[Scheduler] Cron jobs scheduled successfully.');
};

module.exports = {
  initScheduler
};
