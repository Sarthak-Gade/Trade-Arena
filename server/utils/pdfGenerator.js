const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateContractNotePDF = ({
  user,
  date,
  trades = [],
  holdings = [],
  walletSummary = {},
  financialSummary = {}
}) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      const reportsDir = path.join(__dirname, '..', 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      const fileName = `contract_note_${user.clientID}_${date}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      const writeStream = fs.createWriteStream(filePath);
      
      doc.pipe(writeStream);
      
      // Theme colors
      const primaryColor = '#1e293b'; // Slate 800
      const secondaryColor = '#0f172a'; // Slate 900
      const accentColor = '#2563eb'; // Blue 600
      const lightBg = '#f8fafc'; // Slate 50
      const borderLine = '#cbd5e1'; // Slate 300
      
      // Header Section
      doc.rect(0, 0, 595.28, 120).fill(primaryColor);
      doc.fillColor('#ffffff')
         .fontSize(24)
         .text('TRADEARENA SECURITIES', 50, 40, { characterSpacing: 1 })
         .fontSize(10)
         .text('Virtual Brokerage & Paper Trading Platform', 50, 70)
         .fontSize(8)
         .text('SEBI Registration No: MOCK123456789 | CIN: L99999DL2026PTC123456', 50, 85);
         
      doc.fillColor('#ffffff')
         .fontSize(14)
         .text('CONTRACT NOTE', 400, 40, { align: 'right' })
         .fontSize(9)
         .text(`Date: ${date}`, 400, 60, { align: 'right' })
         .text(`Client ID: ${user.clientID}`, 400, 75, { align: 'right' })
         .text(`Account No: ${user.tradingAccountNumber}`, 400, 90, { align: 'right' });
         
      // Client Details Info Block
      doc.y = 140;
      doc.fillColor(secondaryColor)
         .fontSize(11)
         .text('TO:', 50, 140)
         .fontSize(12)
         .font('Helvetica-Bold')
         .text(user.username.toUpperCase(), 50, 155)
         .font('Helvetica')
         .fontSize(10)
         .text(`Email: ${user.email}`, 50, 175)
         .text(`Mobile: ${user.mobile}`, 50, 190);
         
      // Table 1: Executed Trades
      doc.fontSize(12).font('Helvetica-Bold').fillColor(accentColor).text('TODAY\'S EXECUTED TRADES', 50, 220);
      
      let tableTop = 240;
      doc.rect(50, tableTop, 495, 20).fill(primaryColor);
      
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('TRADE ID', 55, tableTop + 6, { width: 90 })
         .text('SYMBOL', 150, tableTop + 6, { width: 70 })
         .text('TYPE', 225, tableTop + 6, { width: 50 })
         .text('QTY', 280, tableTop + 6, { width: 40, align: 'right' })
         .text('PRICE (INR)', 330, tableTop + 6, { width: 70, align: 'right' })
         .text('VALUE (INR)', 410, tableTop + 6, { width: 70, align: 'right' })
         .text('NET charges', 485, tableTop + 6, { width: 55, align: 'right' });
         
      let currentY = tableTop + 20;
      doc.font('Helvetica').fillColor(secondaryColor);
      
      trades.forEach((trade, index) => {
        // Alternating background
        if (index % 2 === 0) {
          doc.rect(50, currentY, 495, 20).fill(lightBg);
        }
        
        doc.fillColor(secondaryColor)
           .text(trade._id.toString().slice(-10).toUpperCase(), 55, currentY + 6, { width: 90 })
           .text(trade.symbol, 150, currentY + 6, { width: 70 })
           .text(trade.direction.toUpperCase(), 225, currentY + 6, { width: 50 })
           .text(trade.executionQuantity.toString(), 280, currentY + 6, { width: 40, align: 'right' })
           .text(trade.executionPrice.toFixed(2), 330, currentY + 6, { width: 70, align: 'right' })
           .text((trade.executionQuantity * trade.executionPrice).toFixed(2), 410, currentY + 6, { width: 70, align: 'right' })
           .text(trade.totalCharges.toFixed(2), 485, currentY + 6, { width: 55, align: 'right' });
           
        doc.strokeColor(borderLine).lineWidth(0.5).moveTo(50, currentY + 20).lineTo(545, currentY + 20).stroke();
        currentY += 20;
      });
      
      // Charges Breakdown Summary
      currentY += 15;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(accentColor).text('TAX & CHARGES BREAKDOWN', 50, currentY);
      currentY += 15;
      
      const charges = financialSummary.chargesBreakdown || {};
      const chargesData = [
        { label: 'Virtual Brokerage', value: charges.brokerage || 0 },
        { label: 'Securities Transaction Tax (STT)', value: charges.stt || 0 },
        { label: 'Exchange Transaction Charges', value: charges.exchangeCharges || 0 },
        { label: 'GST (18% on Brokerage & Transaction Charges)', value: charges.gst || 0 },
        { label: 'SEBI Turnover Fee', value: charges.sebiCharges || 0 },
        { label: 'Stamp Duty', value: charges.stampDuty || 0 },
        { label: 'Total Regulatory Charges', value: financialSummary.totalCharges || 0 }
      ];
      
      chargesData.forEach((item, index) => {
        const isTotal = index === chargesData.length - 1;
        doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica')
           .fillColor(secondaryColor)
           .text(item.label, 80, currentY, { width: 280 })
           .text(`INR  ${item.value.toFixed(2)}`, 380, currentY, { width: 100, align: 'right' });
           
        if (isTotal) {
          doc.strokeColor(primaryColor).lineWidth(1).moveTo(80, currentY - 3).lineTo(480, currentY - 3).stroke();
        }
        currentY += 15;
      });
      
      // Financial Summary Block
      currentY += 10;
      doc.rect(50, currentY, 495, 75).fill(lightBg);
      doc.strokeColor(borderLine).rect(50, currentY, 495, 75).stroke();
      
      doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor);
      doc.text('FINANCIAL SUMMARY', 60, currentY + 8);
      
      doc.font('Helvetica').fontSize(8).fillColor(secondaryColor)
         .text(`Gross Buy Value: INR ${financialSummary.grossBuyValue?.toFixed(2) || '0.00'}`, 60, currentY + 25)
         .text(`Gross Sell Value: INR ${financialSummary.grossSellValue?.toFixed(2) || '0.00'}`, 60, currentY + 40)
         .text(`Net Debit/Credit: INR ${(financialSummary.netDebitCredit || 0).toFixed(2)}`, 60, currentY + 55);
         
      doc.font('Helvetica-Bold').fontSize(10);
      const isProfit = (financialSummary.dailyPnl || 0) >= 0;
      doc.fillColor(isProfit ? '#16a34a' : '#dc2626')
         .text(`Daily P&L: INR ${(financialSummary.dailyPnl || 0).toFixed(2)}`, 300, currentY + 25)
         .fillColor(secondaryColor)
         .text(`Closing Balance: INR ${walletSummary.closingBalance?.toFixed(2) || '0.00'}`, 300, currentY + 45);
         
      // Page 2 or Footer Check: PDFKit automatically adds pages if content exceeds. Let's make sure it fits.
      // We will place Holdings snapshot on a new page if the space is limited
      if (currentY > 550) {
        doc.addPage();
        currentY = 50;
      } else {
        currentY += 90;
      }
      
      // Holdings Snapshot
      doc.fontSize(12).font('Helvetica-Bold').fillColor(accentColor).text('PORTFOLIO HOLDINGS SNAPSHOT', 50, currentY);
      currentY += 15;
      
      doc.rect(50, currentY, 495, 20).fill(primaryColor);
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('SYMBOL', 55, currentY + 6, { width: 100 })
         .text('QUANTITY', 160, currentY + 6, { width: 80, align: 'right' })
         .text('AVG BUY PRICE (INR)', 260, currentY + 6, { width: 120, align: 'right' })
         .text('CURRENT VALUE (INR)', 400, currentY + 6, { width: 120, align: 'right' });
         
      currentY += 20;
      doc.font('Helvetica').fillColor(secondaryColor);
      
      if (holdings.length === 0) {
        doc.text('No active holdings.', 55, currentY + 6);
        currentY += 20;
      } else {
        holdings.forEach((holding, index) => {
          if (index % 2 === 0) {
            doc.rect(50, currentY, 495, 20).fill(lightBg);
          }
          
          const curVal = holding.quantity * (holding.currentPrice || holding.averageBuyPrice);
          doc.fillColor(secondaryColor)
             .text(holding.symbol, 55, currentY + 6, { width: 100 })
             .text(holding.quantity.toString(), 160, currentY + 6, { width: 80, align: 'right' })
             .text(holding.averageBuyPrice.toFixed(2), 260, currentY + 6, { width: 120, align: 'right' })
             .text(curVal.toFixed(2), 400, currentY + 6, { width: 120, align: 'right' });
             
          doc.strokeColor(borderLine).lineWidth(0.5).moveTo(50, currentY + 20).lineTo(545, currentY + 20).stroke();
          currentY += 20;
        });
      }
      
      // Footer text
      currentY += 20;
      doc.fontSize(7)
         .fillColor('#64748b')
         .text('This is a computer-generated simulated brokerage contract note. No real funds or real exchange transactions have been executed. TradeArena functions as an educational paper trading system only.', 50, currentY, { align: 'center', width: 495 });
      
      doc.end();
      
      writeStream.on('finish', () => {
        resolve({
          filePath,
          fileName,
          relativeUrl: `/reports/download/${fileName}`
        });
      });
      
      writeStream.on('error', (err) => {
        reject(err);
      });
      
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateContractNotePDF
};
