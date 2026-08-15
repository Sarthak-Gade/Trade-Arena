/**
 * Virtual Brokerage Charges Engine
 * Calculates standard Indian stock market regulatory charges and brokerage fees.
 */

const calculateCharges = ({ direction, quantity, price, isIntraday = false }) => {
  const tradeValue = quantity * price;
  
  // 1. Brokerage: Flat ₹20 or 0.05% (whichever is lower) for delivery, 0.03% or ₹20 for intraday
  const brokerageRate = isIntraday ? 0.0003 : 0.0005;
  const maxBrokerage = 20;
  const rawBrokerage = tradeValue * brokerageRate;
  const brokerage = Number(Math.min(rawBrokerage, maxBrokerage).toFixed(2));
  
  // 2. Securities Transaction Tax (STT)
  // Delivery: 0.1% on Buy & Sell
  // Intraday: 0% on Buy, 0.025% on Sell
  let sttRate = 0;
  if (isIntraday) {
    sttRate = direction === 'sell' ? 0.00025 : 0;
  } else {
    sttRate = 0.001; // 0.1% on both buy and sell
  }
  const stt = Number((tradeValue * sttRate).toFixed(2));
  
  // 3. Exchange Transaction Charges: 0.00345% of trade value (NSE equity rate)
  const exchangeChargesRate = 0.0000345;
  const exchangeCharges = Number((tradeValue * exchangeChargesRate).toFixed(2));
  
  // 4. SEBI Turnover Fee: 0.0001% of trade value (₹10 per crore)
  const sebiRate = 0.000001;
  const sebiCharges = Number((tradeValue * sebiRate).toFixed(2));
  
  // 5. GST: 18% of (Brokerage + Exchange Charges + SEBI Turnover Fee)
  const gstRate = 0.18;
  const gst = Number(((brokerage + exchangeCharges + sebiCharges) * gstRate).toFixed(2));
  
  // 6. Stamp Duty
  // Delivery: 0.015% on Buy, 0% on Sell
  // Intraday: 0.003% on Buy, 0% on Sell
  let stampDutyRate = 0;
  if (direction === 'buy') {
    stampDutyRate = isIntraday ? 0.00003 : 0.00015;
  }
  const stampDuty = Number((tradeValue * stampDutyRate).toFixed(2));
  
  // Total charges
  const totalCharges = Number(
    (brokerage + stt + exchangeCharges + gst + sebiCharges + stampDuty).toFixed(2)
  );
  
  return {
    brokerage,
    stt,
    exchangeCharges,
    sebiCharges,
    gst,
    stampDuty,
    totalCharges,
    tradeValue
  };
};

module.exports = {
  calculateCharges
};
