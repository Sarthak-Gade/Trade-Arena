import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPortfolioStart, fetchPortfolioSuccess, fetchPortfolioFailure } from '../store/portfolioSlice';
import api from '../utils/api';
import { Briefcase, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, PieChart } from 'lucide-react';

const Portfolio = () => {
  const dispatch = useDispatch();
  const { holdings, positions, summary, loading } = useSelector((state) => state.portfolio);
  
  useEffect(() => {
    fetchPortfolio();
  }, []);
  
  const fetchPortfolio = async () => {
    dispatch(fetchPortfolioStart());
    try {
      const res = await api.get('/portfolio/summary');
      dispatch(fetchPortfolioSuccess(res.data.data));
    } catch (err) {
      dispatch(fetchPortfolioFailure(err.response?.data?.message || 'Error loading portfolio'));
    }
  };
  
  const totalUnrealizedPnlGreen = summary.totalUnrealizedPnl >= 0;
  const totalRealizedPnlGreen = summary.totalRealizedPnl >= 0;
  const dayPnlGreen = summary.dayPnl >= 0;
  
  if (loading) {
    return <div className="p-6 text-center text-xs text-gray-500">Loading portfolio valuations...</div>;
  }
  
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white font-sans">Portfolio holdings</h2>
          <p className="text-xs text-gray-400">Track delivery investments, active intraday contracts, and absolute performance metrics</p>
        </div>
        
        <button 
          onClick={fetchPortfolio}
          className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-gray-700/60"
        >
          Refresh
        </button>
      </div>
      
      {/* Portfolio valuation card summaries */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Portfolio Value */}
        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Portfolio Value</span>
          <h3 className="text-xl font-black text-white mt-1">₹{summary.portfolioValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          <div className="text-[10px] text-gray-500 mt-2">
            Asset cost basis: <span className="text-white font-semibold">₹{summary.holdingsCost?.toLocaleString('en-IN')}</span>
          </div>
        </div>
        
        {/* Unrealized PNL */}
        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Unrealized P&L (absolute)</span>
          <h3 className={`text-xl font-black mt-1 ${totalUnrealizedPnlGreen ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{summary.totalUnrealizedPnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <div className="text-[10px] text-gray-500 mt-2 flex items-center">
            {totalUnrealizedPnlGreen ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 text-emerald-400" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 text-red-400" />}
            <span className={totalUnrealizedPnlGreen ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
              {summary.holdingsCost > 0 ? ((summary.totalUnrealizedPnl / summary.holdingsCost) * 100).toFixed(2) : '0.00'}% Return
            </span>
          </div>
        </div>
        
        {/* Realized PNL */}
        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Realized profit/loss</span>
          <h3 className={`text-xl font-black mt-1 ${totalRealizedPnlGreen ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{summary.totalRealizedPnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <div className="text-[10px] text-gray-500 mt-2">
            Locked returns via sales proceeds
          </div>
        </div>
        
        {/* Today's Day change */}
        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col justify-between h-28 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/5 rounded-full blur-xl"></div>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Today's Day P&L change</span>
          <h3 className={`text-xl font-black mt-1 ${dayPnlGreen ? 'text-emerald-400' : 'text-red-400'}`}>
            ₹{summary.dayPnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </h3>
          <div className="text-[10px] text-gray-500 mt-2">
            Fluctuation since market pre-open
          </div>
        </div>
      </div>
      
      {/* Holdings Section */}
      <div className="glass-card rounded-2xl p-6 border border-gray-800">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
          <Briefcase className="w-4 h-4 mr-2 text-blue-500" />
          Delivery Investment Holdings
        </h3>
        
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b border-gray-850 pb-2">
                <th className="py-2.5">Symbol</th>
                <th>Company Name</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Avg Cost</th>
                <th className="text-right">Total Cost Basis</th>
                <th className="text-right">LTP Price</th>
                <th className="text-right">Current Value</th>
                <th className="text-right">Unrealized P&L</th>
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 ? (
                <tr><td colSpan="8" className="text-center text-gray-500 py-6">No delivery holdings found. Buy stocks via the Trading Terminal.</td></tr>
              ) : (
                holdings.map(h => {
                  const isGreen = h.unrealizedPnl >= 0;
                  return (
                    <tr key={h.symbol} className="border-b border-gray-900/60 hover:bg-gray-855/20 py-2">
                      <td className="font-extrabold text-white py-3">{h.symbol}</td>
                      <td className="text-gray-400">{h.companyName}</td>
                      <td className="text-right font-semibold">{h.quantity}</td>
                      <td className="text-right">₹{h.averageBuyPrice.toFixed(2)}</td>
                      <td className="text-right">₹{h.totalCost?.toLocaleString('en-IN')}</td>
                      <td className="text-right font-bold text-white">₹{h.currentPrice?.toFixed(2)}</td>
                      <td className="text-right font-bold text-white">₹{h.currentValue?.toLocaleString('en-IN')}</td>
                      <td className={`text-right font-black ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{h.unrealizedPnl?.toLocaleString('en-IN')} ({h.pnlPercentage}%)
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Positions Section */}
      <div className="glass-card rounded-2xl p-6 border border-gray-800">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2 text-emerald-500" />
          Active Open Positions
        </h3>
        
        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 border-b border-gray-850 pb-2">
                <th className="py-2.5">Symbol</th>
                <th>Company Name</th>
                <th className="text-right">Net Quantity</th>
                <th className="text-right">Buy Qty</th>
                <th className="text-right">Sell Qty</th>
                <th className="text-right">Avg Price</th>
                <th className="text-right">LTP Price</th>
                <th className="text-right">Realized P&L</th>
                <th className="text-right">Unrealized P&L</th>
              </tr>
            </thead>
            <tbody>
              {positions.length === 0 ? (
                <tr><td colSpan="9" className="text-center text-gray-500 py-6">No active open positions.</td></tr>
              ) : (
                positions.map(p => {
                  const isRealizedGreen = p.realizedPnl >= 0;
                  const isUnrealizedGreen = p.unrealizedPnl >= 0;
                  return (
                    <tr key={p.symbol} className="border-b border-gray-900/60 hover:bg-gray-855/20 py-2">
                      <td className="font-extrabold text-white py-3">{p.symbol}</td>
                      <td className="text-gray-400">{p.companyName}</td>
                      <td className={`text-right font-black ${p.quantity > 0 ? 'text-emerald-400' : p.quantity < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        {p.quantity}
                      </td>
                      <td className="text-right">{p.buyQty}</td>
                      <td className="text-right">{p.sellQty}</td>
                      <td className="text-right">₹{p.averageBuyPrice.toFixed(2)}</td>
                      <td className="text-right font-bold text-white">₹{p.currentPrice?.toFixed(2)}</td>
                      <td className={`text-right font-semibold ${isRealizedGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{p.realizedPnl.toFixed(2)}
                      </td>
                      <td className={`text-right font-semibold ${isUnrealizedGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₹{p.unrealizedPnl.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
