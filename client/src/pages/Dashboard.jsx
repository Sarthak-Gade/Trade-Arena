import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchPortfolioStart, fetchPortfolioSuccess, fetchPortfolioFailure } from '../store/portfolioSlice';
import { setIndices, setMarketMovers, setSelectedSymbol, setStocks } from '../store/marketSlice';
import api from '../utils/api';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Award, DollarSign, Percent, AlertCircle, Loader, X } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const { summary } = useSelector((state) => state.portfolio);
  const { indices, gainers, losers, stocks } = useSelector((state) => state.market);
  
  const [analytics, setAnalytics] = useState(null);
  const [kycProgress, setKycProgress] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [indexConstituents, setIndexConstituents] = useState(null);

  // Explicit hardcoded symbol lists — mirrors server INDEX_CONSTITUENTS
  // Updated from API on mount; this local copy ensures modal works immediately.
  const LOCAL_INDEX_CONSTITUENTS = {
    'NIFTY 50': ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','BHARTIARTL','LT','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','WIPRO','HCLTECH','SUNPHARMA','MARUTI','TATAMOTORS','MM','NTPC','POWERGRID','COALINDIA','ONGC','BPCL','ADANIENT','ADANIPORTS','GRASIM','TATASTEEL','JSWSTEEL','HINDALCO','ULTRACEMCO','ASIANPAINT','TITAN','EICHERMOT','HEROMOTOCO','BAJAJ-AUTO','DIVISLAB','CIPLA','DRREDDY','APOLLOHOSP','NESTLEIND','BRITANNIA','TATACONSUM','BAJAJFINSV','HDFCLIFE','SBILIFE','INDUSINDBK','TECHM','ZOMATO','TRENT'],
    'NIFTY NEXT 50': ['BANKBARODA','PNB','AUBANK','IRCTC','HAL','SIEMENS','DLF','VEDL','LTIM','PERSISTENT','TORNTPHARM','MPHASIS','COFORGE'],
    'NIFTY BANK': ['HDFCBANK','ICICIBANK','AXISBANK','KOTAKBANK','SBIN','INDUSINDBK','BANKBARODA','PNB','AUBANK','BANDHANBNK','FEDERALBNK','IDFCFIRSTB'],
    'NIFTY IT': ['TCS','INFY','WIPRO','HCLTECH','TECHM','MPHASIS','LTIM','PERSISTENT','COFORGE'],
    'NIFTY PHARMA': ['SUNPHARMA','DIVISLAB','CIPLA','DRREDDY','APOLLOHOSP','TORNTPHARM','LUPIN','AUROPHARMA','ALKEM'],
    'NIFTY FINANCIAL SERVICES': ['HDFCBANK','ICICIBANK','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','BAJAJFINSV','HDFCLIFE','SBILIFE','INDUSINDBK','AUBANK'],
    'SENSEX': ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','BHARTIARTL','LT','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','WIPRO','HCLTECH','SUNPHARMA','MARUTI','TATAMOTORS','MM','NTPC','ONGC','ADANIPORTS','GRASIM','TATASTEEL','HINDALCO','ULTRACEMCO','ASIANPAINT','TITAN','NESTLEIND','TATACONSUM'],
    'BSE 100': ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','BHARTIARTL','LT','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','WIPRO','HCLTECH','SUNPHARMA','MARUTI','TATAMOTORS','NTPC','BSE','CDSL'],
    'BSE 200': ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','BHARTIARTL','LT','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','WIPRO','HCLTECH','SUNPHARMA','MARUTI','TATAMOTORS','NTPC','BSE','CDSL','PAYTM','NYKAA','DLF'],
    'BSE 500': null, // all stocks
  };

  const getIndexStocks = (indexName) => {
    if (!stocks || !stocks.length) return [];
    const map = indexConstituents || LOCAL_INDEX_CONSTITUENTS;
    const symbolList = map[indexName];
    if (symbolList === null) return stocks; // BSE 500 = all
    if (!symbolList) return stocks.filter(s => s.exchange === 'NSE');
    // Filter stocks by symbol list, preserving order
    const stockMap = Object.fromEntries(stocks.map(s => [s.symbol, s]));
    return symbolList.map(sym => stockMap[sym]).filter(Boolean);
  };
  
  useEffect(() => {
    const loadDashboardData = async () => {
      dispatch(fetchPortfolioStart());
      try {
        // Fetch all dashboard data in parallel
        const [summaryRes, statsRes, kycRes, indicesRes, moversRes, constitRes, stocksRes] = await Promise.allSettled([
          api.get('/portfolio/summary'),
          api.get('/portfolio/analytics'),
          api.get('/kyc/status'),
          api.get('/market/indices'),
          api.get('/market/movers'),
          api.get('/market/index-constituents'),
          api.get('/market/stocks'),
        ]);
        
        if (summaryRes.status === 'fulfilled') {
          dispatch(fetchPortfolioSuccess(summaryRes.value.data.data));
        }
        if (statsRes.status === 'fulfilled') {
          setAnalytics(statsRes.value.data.data);
        }
        if (kycRes.status === 'fulfilled') {
          setKycProgress(kycRes.value.data.data.completionPercentage || 0);
        }
        // Seed Redux market state from REST (pre-WebSocket)
        if (indicesRes.status === 'fulfilled') {
          dispatch(setIndices(indicesRes.value.data.data));
        }
        if (moversRes.status === 'fulfilled') {
          dispatch(setMarketMovers(moversRes.value.data.data));
        }
        // Update index constituent maps from server
        if (constitRes.status === 'fulfilled') {
          setIndexConstituents(constitRes.value.data.data);
        }
        // Pre-load all stocks into Redux so index modal works
        if (stocksRes.status === 'fulfilled' && stocksRes.value.data.data?.length > 0) {
          dispatch(setStocks(stocksRes.value.data.data));
        }
      } catch (err) {
        dispatch(fetchPortfolioFailure(err.response?.data?.message || 'Error loading dashboard'));
      } finally {
        setLoadingStats(false);
      }
    };
    
    loadDashboardData();
  }, [dispatch]);
  
  // Recharts colors
  const COLORS = ['#10b981', '#ef4444'];
  
  const pieData = analytics ? [
    { name: 'Wins', value: analytics.winRate },
    { name: 'Losses', value: analytics.lossRate }
  ] : [];
  
  if (loadingStats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* KYC Alert Banner */}
      {user && user.kycStatus !== 'approved' && (
        <div className="bg-blue-900/20 border border-blue-800/40 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-sm font-bold text-white">KYC Status: {user?.kycStatus?.toUpperCase()}</p>
              <p className="text-xs text-gray-400">Complete your profile KYC verification to enable live paper trading. Your profile is {kycProgress}% complete.</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/kyc')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            Complete KYC
          </button>
        </div>
      )}
      
      {/* Major Indices Dashboard */}
      <div>
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Major Indices</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {indices.slice(0, 5).map((idx) => {
            const isGreen = idx.change >= 0;
            return (
              <div 
                key={idx.name} 
                onClick={() => setSelectedIndex(idx.name)}
                className="glass-card rounded-2xl p-4 border border-gray-800/80 shadow-md hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-900/5 cursor-pointer transition-all active:scale-[0.98]"
              >
                <p className="text-xs text-gray-400 font-bold truncate">{idx.name}</p>
                <h4 className="text-lg font-extrabold text-white mt-1">₹{idx.value.toLocaleString('en-IN')}</h4>
                <div className={`flex items-center text-xs font-semibold mt-1 ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isGreen ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                  <span>{isGreen ? '+' : ''}{idx.change} ({idx.pctChange}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Portfolio Value Summary Card Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Value */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 shadow-md flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl"></div>
          <div>
            <span className="text-xs text-gray-400 font-semibold">Total Portfolio Value</span>
            <h3 className="text-2xl font-black text-white mt-1">₹{summary.portfolioValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <div className={`flex items-center text-xs font-semibold mt-2 ${summary.dayPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>Day P&L: ₹{summary.dayPnl?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="bg-blue-600/10 text-blue-400 p-3 rounded-xl border border-blue-800/20">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        
        {/* Available cash */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 shadow-md flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl"></div>
          <div>
            <span className="text-xs text-gray-400 font-semibold">Available Margin</span>
            <h3 className="text-2xl font-black text-white mt-1">₹{summary.walletBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
            <p className="text-xs text-gray-400 mt-2">Opening: ₹{user?.openingBalance?.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-emerald-600/10 text-emerald-400 p-3 rounded-xl border border-emerald-800/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        
        {/* CAGR */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 shadow-md flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 font-semibold">Annualized Return (CAGR)</span>
            <h3 className="text-2xl font-black text-white mt-1">{analytics?.cagr || 0}%</h3>
            <p className="text-xs text-gray-400 mt-2">Relative Net Profit: ₹{analytics?.netProfit?.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-yellow-600/10 text-yellow-400 p-3 rounded-xl border border-yellow-800/20">
            <Percent className="w-5 h-5" />
          </div>
        </div>
        
        {/* Win Rate */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 shadow-md flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 font-semibold">Win Rate Ratio</span>
            <h3 className="text-2xl font-black text-white mt-1">{analytics?.winRate || 0}%</h3>
            <p className="text-xs text-gray-400 mt-2">Total Closed: {analytics?.totalTrades || 0} trades</p>
          </div>
          <div className="bg-purple-600/10 text-purple-400 p-3 rounded-xl border border-purple-800/20">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Equity Curve (2/3 width) */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 shadow-md md:col-span-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Equity Curve Growth</h3>
          <div className="h-72">
            {analytics?.equityCurve ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.equityCurve}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={10} 
                    domain={['dataMin - 10000', 'dataMax + 10000']}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', color: '#fff' }}
                    formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Portfolio Value']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">
                Loading Growth Data...
              </div>
            )}
          </div>
        </div>
        
        {/* Win/Loss Pie (1/3 width) */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 shadow-md flex flex-col justify-between">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Trade Win/Loss Ratios</h3>
          <div className="h-48 flex items-center justify-center relative">
            {analytics?.totalTrades > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `${val}%`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-gray-500 text-center">
                No closed trades yet to analyze ratios.
              </div>
            )}
            {analytics?.totalTrades > 0 && (
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-white">{analytics.winRate}%</span>
                <span className="text-[10px] text-gray-500 uppercase font-bold">Win Rate</span>
              </div>
            )}
          </div>
          
          <div className="flex justify-around text-xs border-t border-gray-800 pt-3 mt-2">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
              <span className="text-gray-400">Wins ({analytics?.winRate}%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-red-500 rounded-full"></span>
              <span className="text-gray-400">Losses ({analytics?.lossRate}%)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Grid: Movers vs Stats details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Market Movers */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 shadow-md md:col-span-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Market Movers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Gainers */}
            <div>
              <h4 className="text-xs font-bold text-emerald-400 flex items-center mb-3">
                <ArrowUpRight className="w-4 h-4 mr-1" />
                TOP GAINERS
              </h4>
              <div className="space-y-2">
                {gainers.map((g) => (
                  <div key={g.symbol} className="flex justify-between items-center p-2 hover:bg-gray-800/20 rounded-xl border border-gray-900 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">{g.symbol}</p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[130px]">{g.companyName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">₹{g.price.toFixed(2)}</p>
                      <p className="text-[10px] text-emerald-400 font-semibold">+{g.pctChange}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Top Losers */}
            <div>
              <h4 className="text-xs font-bold text-red-400 flex items-center mb-3">
                <ArrowDownRight className="w-4 h-4 mr-1" />
                TOP LOSERS
              </h4>
              <div className="space-y-2">
                {losers.map((l) => (
                  <div key={l.symbol} className="flex justify-between items-center p-2 hover:bg-gray-800/20 rounded-xl border border-gray-900 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-white">{l.symbol}</p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[130px]">{l.companyName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">₹{l.price.toFixed(2)}</p>
                      <p className="text-[10px] text-red-400 font-semibold">{l.pctChange}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Performance Statistics details */}
        <div className="glass-card rounded-2xl p-6 border border-gray-800 shadow-md">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Trading Analytics</h3>
          <div className="space-y-3.5 text-xs">
            <div className="flex justify-between border-b border-gray-900 pb-2">
              <span className="text-gray-400">Profit Factor Ratio</span>
              <span className="font-bold text-white">{analytics?.profitFactor || 1}</span>
            </div>
            <div className="flex justify-between border-b border-gray-900 pb-2">
              <span className="text-gray-400">Average Profit / Win</span>
              <span className="font-bold text-emerald-400">₹{analytics?.avgProfit?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-b border-gray-900 pb-2">
              <span className="text-gray-400">Average Loss / Fail</span>
              <span className="font-bold text-red-400">₹{analytics?.avgLoss?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-b border-gray-900 pb-2">
              <span className="text-gray-400">Best Trade P&L</span>
              <span className="font-bold text-emerald-400">₹{analytics?.bestTrade?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between border-b border-gray-900 pb-2">
              <span className="text-gray-400">Worst Trade P&L</span>
              <span className="font-bold text-red-400">₹{analytics?.worstTrade?.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Portfolio Cost</span>
              <span className="font-bold text-white">₹{summary.holdingsCost?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Index Constituents Modal */}
      {selectedIndex && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedIndex(null); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Modal Card */}
          <div className="relative z-10 w-full max-w-2xl glass-card rounded-2xl border border-gray-700/60 shadow-2xl shadow-black/40 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/40">
              <div>
                <h2 className="text-base font-extrabold text-white tracking-tight">{selectedIndex}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {getIndexStocks(selectedIndex).length} constituent stocks · Live prices
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Live Index Value */}
                {(() => {
                  const idxData = indices.find(i => i.name === selectedIndex);
                  if (!idxData) return null;
                  const isGreen = idxData.change >= 0;
                  return (
                    <div className="text-right">
                      <p className="text-lg font-black text-white">₹{idxData.value.toLocaleString('en-IN')}</p>
                      <p className={`text-xs font-bold flex items-center justify-end ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isGreen ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                        {isGreen ? '+' : ''}{idxData.change} ({idxData.pctChange}%)
                      </p>
                    </div>
                  );
                })()}
                <button 
                  onClick={() => setSelectedIndex(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-2 px-6 py-2 bg-gray-900/60 border-b border-gray-800/60 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Symbol / Company</div>
              <div className="col-span-2 text-right">LTP</div>
              <div className="col-span-2 text-right">Change</div>
              <div className="col-span-2 text-right">Sector</div>
              <div className="col-span-1 text-right">Trade</div>
            </div>

            {/* Stock List */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-800/40">
              {getIndexStocks(selectedIndex).length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No stocks found for this index yet. Market data is loading...
                </div>
              ) : (
                getIndexStocks(selectedIndex).map((stock, idx) => {
                  const change = stock.currentPrice - stock.prevClose;
                  const pct = stock.prevClose > 0 ? (change / stock.prevClose) * 100 : 0;
                  const isGreen = change >= 0;
                  return (
                    <div 
                      key={stock.symbol}
                      className="grid grid-cols-12 gap-2 px-6 py-3 hover:bg-gray-800/30 transition-colors cursor-pointer group"
                      onClick={() => {
                        dispatch(setSelectedSymbol(stock.symbol));
                        navigate('/terminal');
                        setSelectedIndex(null);
                      }}
                    >
                      <div className="col-span-1 flex items-center text-[10px] text-gray-600 font-mono">{idx + 1}</div>
                      <div className="col-span-4 flex items-center space-x-2">
                        <div className="w-7 h-7 bg-blue-900/20 border border-blue-800/20 rounded-lg flex items-center justify-center text-[9px] font-black text-blue-400 shrink-0">
                          {stock.symbol.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors truncate">{stock.symbol}</p>
                          <p className="text-[9px] text-gray-500 truncate max-w-[100px]">{stock.companyName}</p>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-end">
                        <span className="text-xs font-bold text-white">₹{stock.currentPrice.toFixed(2)}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-end">
                        <div className={`flex items-center text-[10px] font-bold ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isGreen ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                          {pct.toFixed(2)}%
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-end">
                        <span className="text-[9px] text-gray-500 truncate text-right">{stock.sector}</span>
                      </div>
                      <div className="col-span-1 flex items-center justify-end">
                        <div className="w-6 h-6 rounded-lg bg-blue-600/10 border border-blue-800/20 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-500 transition-all">
                          <TrendingUp className="w-3 h-3 text-blue-400 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/30 flex justify-between items-center">
              <p className="text-[10px] text-gray-600">Click any stock to open it in the Trading Terminal</p>
              <button
                onClick={() => setSelectedIndex(null)}
                className="text-xs text-gray-400 hover:text-white font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
