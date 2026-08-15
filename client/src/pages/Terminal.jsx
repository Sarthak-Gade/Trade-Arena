import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSelectedSymbol, setStocks } from '../store/marketSlice';
import { fetchPortfolioSuccess } from '../store/portfolioSlice';
import api from '../utils/api';
import { useSocket } from '../context/SocketContext';
import { Search, Plus, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, X } from 'lucide-react';

const Terminal = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { stocks, selectedSymbol } = useSelector((state) => state.market);
  const { holdings, positions } = useSelector((state) => state.portfolio);
  const socket = useSocket();
  
  // Local state
  const [search, setSearch] = useState('');
  const [watchlist, setWatchlist] = useState([]);
  const [openOrders, setOpenOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('holdings'); // holdings, positions, open_orders, trade_history
  const [tradeHistory, setTradeHistory] = useState([]);
  
  // Order ticket state
  const [direction, setDirection] = useState('buy'); // buy, sell
  const [orderType, setOrderType] = useState('market'); // market, limit, stop_loss, take_profit
  const [quantity, setQuantity] = useState(10);
  const [price, setPrice] = useState(0);
  const [triggerPrice, setTriggerPrice] = useState(0);
  const [isIntraday, setIsIntraday] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  
  // Chart pricing history tracking
  const selectedStock = stocks.find(s => s.symbol === selectedSymbol) || null;
  const currentPrice = selectedStock ? selectedStock.currentPrice : 0;
  
  const [historicalData, setHistoricalData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chartType, setChartType] = useState('candlestick'); // candlestick, line, histogram
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Watchlist & UI sync — initial REST load so watchlist shows before first socket tick
  useEffect(() => {
    let localWL = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY'];
    try {
      const stored = localStorage.getItem(`watchlist_${user?._id}`);
      if (stored && stored !== 'undefined') {
        localWL = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse watchlist from localStorage:', e);
    }
    setWatchlist(localWL);

    // Pre-seed Redux stocks from REST so watchlist is not blank on first render
    const loadStocks = async () => {
      try {
        const res = await api.get('/market/stocks');
        if (res.data?.data?.length > 0) {
          dispatch(setStocks(res.data.data));
        }
      } catch (err) {
        console.error('Could not pre-load stocks:', err.message);
      }
    };
    loadStocks();

    fetchOpenOrders();
    fetchTradeLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch 1-month history data when selected stock changes
  useEffect(() => {
    if (!selectedSymbol) return;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const res = await api.get(`/market/stocks/${selectedSymbol}/history`);
        if (res.data?.success) {
          setHistoricalData(res.data.data);
        }
      } catch (err) {
        console.error('Error fetching stock history:', err.message);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [selectedSymbol]);

  // Merge latest dynamic socket tick into the final element of historicalData
  const chartData = React.useMemo(() => {
    if (!historicalData.length || !selectedStock) return historicalData;
    const data = [...historicalData];
    const lastIndex = data.length - 1;
    data[lastIndex] = {
      ...data[lastIndex],
      close: selectedStock.currentPrice,
      high: Math.max(data[lastIndex].high, selectedStock.currentPrice, selectedStock.highPrice),
      low: Math.min(data[lastIndex].low, selectedStock.currentPrice, selectedStock.lowPrice),
      open: selectedStock.openPrice
    };
    return data;
  }, [historicalData, selectedStock]);
  
  // BUG-08 Fix: Auto-fill limit/stop price when order type changes
  useEffect(() => {
    if (['limit', 'stop_loss', 'take_profit'].includes(orderType) && currentPrice > 0) {
      setPrice(currentPrice);
      setTriggerPrice(currentPrice);
    }
  }, [orderType, currentPrice]);

  // BUG-09 Fix: Listen to socket order-executed to refresh open orders + trade history in real time
  useEffect(() => {
    if (!socket) return;
    const handleOrderExecuted = () => {
      fetchOpenOrders();
      fetchTradeLogs();
      refreshPortfolio();
    };
    socket.on('order-executed', handleOrderExecuted);
    return () => socket.off('order-executed', handleOrderExecuted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const fetchOpenOrders = async () => {
    try {
      // BUG-12 Fix: Include 'queued' orders (limit orders placed when market is closed)
      const res = await api.get('/orders?status[]=pending&status[]=queued');
      setOpenOrders(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };
  
  const fetchTradeLogs = async () => {
    try {
      const res = await api.get('/orders/history/trades');
      setTradeHistory(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };
  
  const refreshPortfolio = async () => {
    try {
      const res = await api.get('/portfolio/summary');
      dispatch(fetchPortfolioSuccess(res.data.data));
    } catch (err) {
      console.error(err);
    }
  };
  
  // Watchlist Actions
  const addToWatchlistLocal = (sym) => {
    if (!watchlist.includes(sym)) {
      const next = [...watchlist, sym];
      setWatchlist(next);
      localStorage.setItem(`watchlist_${user?._id}`, JSON.stringify(next));
    }
  };
  
  const removeFromWatchlistLocal = (sym) => {
    const next = watchlist.filter(s => s !== sym);
    setWatchlist(next);
    localStorage.setItem(`watchlist_${user?._id}`, JSON.stringify(next));
  };
  
  // Order submission
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setOrderError('');
    setOrderSuccess('');
    setSubmittingOrder(true);
    
    try {
      const orderPayload = {
        symbol: selectedSymbol,
        quantity: Number(quantity),
        orderType,
        direction,
        isIntraday,
        price: orderType === 'limit' ? Number(price) : undefined,
        triggerPrice: ['stop_loss', 'take_profit'].includes(orderType) ? Number(triggerPrice) : undefined
      };
      
      const res = await api.post('/orders', orderPayload);
      setOrderSuccess(`Order placed successfully: ${res.data.data.status.toUpperCase()}`);
      
      // Reset details
      fetchOpenOrders();
      fetchTradeLogs();
      refreshPortfolio();
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Error submitting order ticket.');
    } finally {
      setSubmittingOrder(false);
    }
  };
  
  const handleCancelOrder = async (orderId) => {
    try {
      await api.delete(`/orders/${orderId}`);
      fetchOpenOrders();
      refreshPortfolio();
    } catch (err) {
      console.error(err);
    }
  };
  
  // Dynamic Brokerage estimation
  const estimateCharges = () => {
    const targetPrice = orderType === 'market' ? currentPrice : price;
    const val = quantity * targetPrice;
    if (!val) return { totalCharges: 0, stampDuty: 0, gst: 0, stt: 0, brokerage: 0 };
    
    const brokerageRate = isIntraday ? 0.0003 : 0.0005;
    const brokerage = Math.min(val * brokerageRate, 20);
    const stt = isIntraday ? (direction === 'sell' ? val * 0.00025 : 0) : (val * 0.001);
    const exchange = val * 0.0000345;
    const sebi = val * 0.000001;
    const gst = (brokerage + exchange + sebi) * 0.18;
    const stamp = direction === 'buy' ? (isIntraday ? val * 0.00003 : val * 0.00015) : 0;
    
    return {
      brokerage: Number(brokerage.toFixed(2)),
      stt: Number(stt.toFixed(2)),
      exchange: Number(exchange.toFixed(2)),
      gst: Number(gst.toFixed(2)),
      stamp: Number(stamp.toFixed(2)),
      totalCharges: Number((brokerage + stt + exchange + gst + stamp).toFixed(2))
    };
  };
  
  const charges = estimateCharges();
  const searchResults = search.trim() 
    ? stocks.filter(s => s.symbol.includes(search.toUpperCase()) || s.companyName.toUpperCase().includes(search.toUpperCase())) 
    : [];
    
  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-62px)]">
      
      {/* 1. Left Sidebar: Watchlists & Stock Search */}
      <div className="w-80 border-r border-gray-800 flex flex-col shrink-0 bg-darkBg/30">
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 pl-10 pr-4 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              placeholder="Search stocks (Reliance, TCS...)"
            />
          </div>
          
          {/* Search results popup */}
          {search.trim() !== '' && (
            <div className="absolute left-4 top-16 w-72 max-h-60 overflow-y-auto glass-card rounded-xl border border-gray-800 p-2 shadow-2xl z-50 text-xs">
              <div className="flex justify-between items-center text-gray-500 pb-1.5 border-b border-gray-800 px-1">
                <span>Search Results</span>
                <button onClick={() => setSearch('')}><X className="w-3.5 h-3.5" /></button>
              </div>
              {searchResults.length === 0 ? (
                <div className="p-2 text-center text-gray-500">No stock found</div>
              ) : (
                searchResults.map(s => (
                  <div key={s.symbol} className="flex justify-between items-center p-2 hover:bg-gray-800 rounded transition-colors mt-1">
                    <div className="cursor-pointer flex-1" onClick={() => { dispatch(setSelectedSymbol(s.symbol)); setSearch(''); }}>
                      <p className="font-bold text-white">{s.symbol}</p>
                      <p className="text-[10px] text-gray-500 truncate max-w-[130px]">{s.companyName}</p>
                    </div>
                    <button 
                      onClick={() => addToWatchlistLocal(s.symbol)}
                      className="text-blue-500 p-1 hover:bg-blue-600/10 rounded"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Watchlist tickers */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">My Watchlist</h4>
          {watchlist.map(sym => {
            const stock = stocks.find(s => s.symbol === sym);
            if (!stock) return null;
            const isGreen = stock.currentPrice >= stock.prevClose;
            const change = stock.currentPrice - stock.prevClose;
            const pct = (change / stock.prevClose) * 100;
            
            return (
              <div 
                key={sym} 
                onClick={() => dispatch(setSelectedSymbol(sym))}
                className={`flex justify-between items-center p-3 rounded-xl border border-gray-800/60 hover:bg-gray-800/20 cursor-pointer transition-colors ${
                  selectedSymbol === sym ? 'bg-blue-600/5 border-blue-500/30' : 'bg-gray-950/20'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-white">{stock.symbol}</p>
                  <p className="text-[9px] text-gray-500 truncate max-w-[120px]">{stock.companyName}</p>
                </div>
                <div className="text-right flex items-center space-x-3">
                  <div>
                    <p className="text-xs font-bold text-white">₹{stock.currentPrice.toFixed(2)}</p>
                    <p className={`text-[9px] font-semibold flex items-center justify-end ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isGreen ? '+' : ''}{pct.toFixed(2)}%
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFromWatchlistLocal(sym); }}
                    className="text-gray-600 hover:text-red-400 p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 2. Middle Pane:svg Chart & Tab details */}
      <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
        
        {/* selected stock info */}
        {selectedStock && (
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/20 flex-wrap gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-lg">{selectedStock.symbol}</span>
                <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded font-bold">{selectedStock.exchange}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5">{selectedStock.companyName}</p>
            </div>
            
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 block">LTP</span>
                <span className="font-black text-white text-lg">₹{selectedStock.currentPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Prev Close</span>
                <span className="font-bold text-gray-400 block mt-1">₹{selectedStock.prevClose.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Day High</span>
                <span className="font-bold text-emerald-400 block mt-1">₹{selectedStock.highPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block">Day Low</span>
                <span className="font-bold text-red-400 block mt-1">₹{selectedStock.lowPrice.toFixed(2)}</span>
              </div>
              {selectedStock.week52High && (
                <div>
                  <span className="text-[10px] text-gray-500 block">52W High</span>
                  <span className="font-bold text-emerald-300 block mt-1">₹{Number(selectedStock.week52High).toFixed(2)}</span>
                </div>
              )}
              {selectedStock.week52Low && (
                <div>
                  <span className="text-[10px] text-gray-500 block">52W Low</span>
                  <span className="font-bold text-red-300 block mt-1">₹{Number(selectedStock.week52Low).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* SVG HISTORICAL CHART */}
        <div className="flex-1 bg-[#0b0f19] p-4 flex flex-col justify-between overflow-hidden relative">
          <div className="flex justify-between items-center mb-2 z-10">
            <div className="text-xs font-bold text-gray-400 uppercase flex items-center">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-blue-500 ${loadingHistory ? 'animate-spin' : ''}`} />
              {selectedSymbol} - 1 Month Chart
            </div>
            
            <div className="flex space-x-1 bg-gray-950/60 p-0.5 rounded-xl border border-gray-800/80">
              {['candlestick', 'line', 'histogram'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChartType(type)}
                  className={`px-2.5 py-1 text-[9px] font-bold uppercase rounded-lg transition-all ${
                    chartType === type 
                      ? 'bg-blue-600 text-white shadow shadow-blue-500/20' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* HUD for hover details */}
          {(() => {
            const activeData = hoveredIndex !== null && chartData[hoveredIndex] 
              ? chartData[hoveredIndex] 
              : chartData[chartData.length - 1];
            
            if (!activeData) return <div className="h-6" />;
            
            const isGreen = activeData.close >= activeData.open;
            
            return (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-400 font-semibold mb-2 border-b border-gray-900 pb-1.5">
                <span className="text-gray-500 uppercase font-bold">{activeData.date}</span>
                <span>O: <span className={isGreen ? 'text-emerald-400' : 'text-red-400'}>₹{activeData.open.toFixed(2)}</span></span>
                <span>H: <span className={isGreen ? 'text-emerald-400' : 'text-red-400'}>₹{activeData.high.toFixed(2)}</span></span>
                <span>L: <span className={isGreen ? 'text-emerald-400' : 'text-red-400'}>₹{activeData.low.toFixed(2)}</span></span>
                <span>C: <span className={isGreen ? 'text-emerald-400' : 'text-red-400'}>₹{activeData.close.toFixed(2)}</span></span>
                <span>Vol: <span className="text-blue-400">{(activeData.volume / 1000).toFixed(1)}K</span></span>
              </div>
            );
          })()}
          
          <div className="flex-1 w-full flex items-end justify-center min-h-[220px] relative">
            {loadingHistory ? (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                Loading historical chart...
              </div>
            ) : chartData.length > 1 ? (
              (() => {
                const prices = chartData.flatMap(d => [d.open, d.close, d.high, d.low]);
                const minPrice = Math.min(...prices) * 0.998;
                const maxPrice = Math.max(...prices) * 1.002;
                const priceRange = maxPrice - minPrice;
                
                const chartWidth = 460;
                const chartHeight = 150; // price drawing height
                
                const getX = (idx) => 25 + (idx / (chartData.length - 1)) * chartWidth;
                const getY = (price) => 170 - ((price - minPrice) / priceRange) * chartHeight;
                
                const volumes = chartData.map(d => d.volume);
                const maxVolume = Math.max(...volumes) || 1;
                const getVolY = (vol) => 240 - (vol / maxVolume) * 40;
                
                // Construct line paths
                const linePoints = chartData.map((d, idx) => `${getX(idx)},${getY(d.close)}`).join(' ');
                const areaPoints = `${getX(0)},240 ${linePoints} ${getX(chartData.length - 1)},240`;
                
                return (
                  <svg 
                    viewBox="0 0 500 250" 
                    className="w-full h-full stroke-blue-500 fill-none overflow-visible select-none"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mouseX = e.clientX - rect.left;
                      const percent = (mouseX - (25 / 500) * rect.width) / ((460 / 500) * rect.width);
                      const idx = Math.round(percent * (chartData.length - 1));
                      if (idx >= 0 && idx < chartData.length) {
                        setHoveredIndex(idx);
                      } else {
                        setHoveredIndex(null);
                      }
                    }}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Grid Lines & Labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const price = maxPrice - pct * priceRange;
                      const y = getY(price);
                      return (
                        <g key={idx} className="opacity-40">
                          <line x1="20" y1={y} x2="485" y2={y} stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
                          <text x="490" y={y + 3} fill="#64748b" fontSize="8" className="text-right font-semibold fill-gray-500 stroke-none animate-none">
                            ₹{Math.round(price)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Volume Grid Background */}
                    <line x1="20" y1="200" x2="485" y2="200" stroke="#1e293b" strokeWidth="1" className="opacity-30" />
                    
                    {/* Render Volume Bars */}
                    {chartData.map((d, idx) => {
                      const x = getX(idx);
                      const yVol = getVolY(d.volume);
                      const isGreen = d.close >= d.open;
                      return (
                        <rect
                          key={`vol-${idx}`}
                          x={x - 3}
                          y={yVol}
                          width="6"
                          height={Math.max(240 - yVol, 1)}
                          fill={isGreen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}
                          stroke={isGreen ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}
                          strokeWidth="0.5"
                        />
                      );
                    })}

                    {/* Render Price Chart based on Type */}
                    {chartType === 'line' && (
                      <g>
                        <polygon points={areaPoints} fill="url(#areaGrad)" stroke="none" />
                        <polyline points={linePoints} stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </g>
                    )}

                    {chartType === 'histogram' && (
                      <g>
                        {chartData.map((d, idx) => {
                          const x = getX(idx);
                          const yTop = getY(d.close);
                          // BUG-06 Fix: use getY(minPrice) as the actual chart baseline
                          const yBaseline = getY(minPrice);
                          const isGreen = d.close >= d.open;
                          return (
                            <rect
                              key={`hist-${idx}`}
                              x={x - 3}
                              y={yTop}
                              width="6"
                              height={Math.max(yBaseline - yTop, 1)}
                              fill={isGreen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
                              stroke={isGreen ? '#10b981' : '#ef4444'}
                              strokeWidth="1.2"
                            />
                          );
                        })}
                      </g>
                    )}

                    {chartType === 'candlestick' && (
                      <g>
                        {chartData.map((d, idx) => {
                          const x = getX(idx);
                          const yOpen = getY(d.open);
                          const yClose = getY(d.close);
                          const yHigh = getY(d.high);
                          const yLow = getY(d.low);
                          const isGreen = d.close >= d.open;
                          const strokeColor = isGreen ? '#10b981' : '#ef4444';
                          const fillColor = isGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
                          
                          return (
                            <g key={`candle-${idx}`}>
                              {/* Wick */}
                              <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={strokeColor} strokeWidth="1.2" />
                              {/* Body */}
                              <rect
                                x={x - 4}
                                y={Math.min(yOpen, yClose)}
                                width="8"
                                height={Math.max(Math.abs(yOpen - yClose), 1.5)}
                                fill={fillColor}
                                stroke={strokeColor}
                                strokeWidth="1.2"
                              />
                            </g>
                          );
                        })}
                      </g>
                    )}

                    {/* Interactive Crosshairs & Dot */}
                    {hoveredIndex !== null && chartData[hoveredIndex] && (() => {
                      const d = chartData[hoveredIndex];
                      const x = getX(hoveredIndex);
                      const y = getY(d.close);
                      const strokeColor = d.close >= d.open ? '#10b981' : '#ef4444';
                      return (
                        <g>
                          {/* Vertical crosshair */}
                          <line x1={x} y1="10" x2={x} y2="240" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" className="opacity-60" />
                          {/* Horizontal crosshair */}
                          <line x1="20" y1={y} x2="485" y2={y} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" className="opacity-60" />
                          {/* Dot at crosshair intersection */}
                          <circle cx={x} cy={y} r="4" fill={strokeColor} stroke="#fff" strokeWidth="1" />
                        </g>
                      );
                    })()}
                  </svg>
                );
              })()
            ) : (
              <div className="text-xs text-gray-500">Awaiting Price Quote History...</div>
            )}
          </div>
          
          {/* Time axis */}
          <div className="flex justify-between text-[9px] text-gray-500 px-3 border-t border-gray-900 pt-1.5 mt-2">
            <span>{chartData[0]?.date || 'Waiting'}</span>
            <span>{chartData[Math.floor(chartData.length / 2)]?.date || ''}</span>
            <span>{chartData[chartData.length - 1]?.date || 'LTP'}</span>
          </div>

          {/* Chart Pattern Detection Panel */}
          {chartData.length >= 3 && (() => {
            const patterns = [];
            const data = chartData;

            for (let i = 1; i < data.length; i++) {
              const c = data[i];
              const p = data[i - 1];
              const bodySize = Math.abs(c.close - c.open);
              const totalRange = c.high - c.low;
              const upperWick = c.high - Math.max(c.open, c.close);
              const lowerWick = Math.min(c.open, c.close) - c.low;
              const isGreenC = c.close >= c.open;
              const isGreenP = p.close >= p.open;
              const pBodySize = Math.abs(p.close - p.open);

              // Doji: body is less than 10% of total range
              if (totalRange > 0 && bodySize / totalRange < 0.1) {
                patterns.push({ date: c.date, name: 'Doji', type: 'neutral', desc: 'Indecision — market may reverse' });
              }
              // BUG-05 Fix: Hammer — small body, long lower wick (removed broken precedence condition)
              else if (lowerWick > bodySize * 2.5 && upperWick < bodySize * 0.5 && lowerWick > 0) {
                patterns.push({ date: c.date, name: 'Hammer', type: 'bullish', desc: 'Bullish reversal signal at bottom' });
              }
              // Shooting Star: small body, long upper wick, at top
              else if (upperWick > bodySize * 2.5 && lowerWick < bodySize * 0.5) {
                patterns.push({ date: c.date, name: 'Shooting Star', type: 'bearish', desc: 'Bearish reversal signal at top' });
              }
              // Bullish Engulfing
              else if (!isGreenP && isGreenC && c.open < p.close && c.close > p.open) {
                patterns.push({ date: c.date, name: 'Bullish Engulfing', type: 'bullish', desc: 'Strong buy signal: bullish candle engulfs prior bearish' });
              }
              // Bearish Engulfing
              else if (isGreenP && !isGreenC && c.open > p.close && c.close < p.open) {
                patterns.push({ date: c.date, name: 'Bearish Engulfing', type: 'bearish', desc: 'Strong sell signal: bearish candle engulfs prior bullish' });
              }
              // Piercing Line
              else if (!isGreenP && isGreenC && c.open < p.low && c.close > (p.open + p.close) / 2) {
                patterns.push({ date: c.date, name: 'Piercing Line', type: 'bullish', desc: 'Bullish pattern: closes above midpoint of prior bearish candle' });
              }
              // Dark Cloud Cover
              else if (isGreenP && !isGreenC && c.open > p.high && c.close < (p.open + p.close) / 2) {
                patterns.push({ date: c.date, name: 'Dark Cloud Cover', type: 'bearish', desc: 'Bearish reversal: closes below midpoint of prior bullish candle' });
              }

              // Three candle patterns
              if (i >= 2) {
                const pp = data[i - 2];
                const isGreenPP = pp.close >= pp.open;
                // Morning Star
                if (!isGreenPP && Math.abs(p.close - p.open) < Math.abs(pp.close - pp.open) * 0.3 && isGreenC && c.close > (pp.open + pp.close) / 2) {
                  patterns.push({ date: c.date, name: 'Morning Star', type: 'bullish', desc: 'Strong 3-candle bullish reversal pattern' });
                }
                // Evening Star
                if (isGreenPP && Math.abs(p.close - p.open) < Math.abs(pp.close - pp.open) * 0.3 && !isGreenC && c.close < (pp.open + pp.close) / 2) {
                  patterns.push({ date: c.date, name: 'Evening Star', type: 'bearish', desc: 'Strong 3-candle bearish reversal pattern' });
                }
              }
            }

            // Show only the last 5 patterns for recent relevance
            const recent = patterns.slice(-5).reverse();

            if (recent.length === 0) return null;

            return (
              <div className="border-t border-gray-900/80 pt-2 mt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Detected Patterns (Last 30 Days)</p>
                  <span className="text-[9px] text-blue-400 font-semibold">{recent.length} signal{recent.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map((pat, idx) => (
                    <div
                      key={idx}
                      title={pat.desc}
                      className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[9px] font-bold cursor-default transition-all hover:scale-105 ${
                        pat.type === 'bullish'
                          ? 'bg-emerald-900/20 border-emerald-800/40 text-emerald-400'
                          : pat.type === 'bearish'
                          ? 'bg-red-900/20 border-red-800/40 text-red-400'
                          : 'bg-gray-900/40 border-gray-800/40 text-gray-400'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pat.type === 'bullish' ? 'bg-emerald-400' : pat.type === 'bearish' ? 'bg-red-400' : 'bg-gray-400'}`} />
                      <span>{pat.name}</span>
                      <span className="text-[8px] opacity-60 font-normal">{pat.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
        
        {/* Bottom Portfolio & order tables tabs */}
        <div className="h-60 border-t border-gray-800 flex flex-col overflow-hidden bg-gray-950/10">
          <div className="flex border-b border-gray-800 bg-gray-900/40 text-xs">
            {['holdings', 'positions', 'open_orders', 'trade_history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 font-bold uppercase transition-all duration-200 border-b-2 ${
                  activeTab === tab ? 'text-blue-500 border-blue-500 bg-blue-900/5' : 'text-gray-400 border-transparent hover:text-white'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-auto p-4 text-xs">
            {activeTab === 'holdings' && (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800 pb-2">
                    <th>Symbol</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Avg Price</th>
                    <th className="text-right">LTP</th>
                    <th className="text-right">Cost</th>
                    <th className="text-right">Current Value</th>
                    <th className="text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.length === 0 ? (
                    <tr><td colSpan="7" className="text-center text-gray-500 py-6">No delivery holdings in account.</td></tr>
                  ) : (
                    holdings.map(h => {
                      const isGreen = h.unrealizedPnl >= 0;
                      return (
                        <tr key={h.symbol} className="border-b border-gray-900/60 hover:bg-gray-800/10 py-1.5">
                          <td className="font-bold text-white py-2">{h.symbol}</td>
                          <td className="text-right">{h.quantity}</td>
                          <td className="text-right">₹{h.averageBuyPrice.toFixed(2)}</td>
                          <td className="text-right">₹{h.currentPrice?.toFixed(2)}</td>
                          <td className="text-right">₹{h.totalCost?.toLocaleString('en-IN')}</td>
                          <td className="text-right">₹{h.currentValue?.toLocaleString('en-IN')}</td>
                          <td className={`text-right font-semibold ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                            ₹{h.unrealizedPnl?.toLocaleString('en-IN')} ({h.pnlPercentage}%)
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
            
            {activeTab === 'positions' && (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th>Symbol</th>
                    <th className="text-right">Net Qty</th>
                    <th className="text-right">Buy Qty</th>
                    <th className="text-right">Sell Qty</th>
                    <th className="text-right">Avg Price</th>
                    <th className="text-right">LTP</th>
                    <th className="text-right">Realized P&L</th>
                    <th className="text-right">Unrealized P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.length === 0 ? (
                    <tr><td colSpan="8" className="text-center text-gray-500 py-6">No active intraday or derivatives positions.</td></tr>
                  ) : (
                    positions.map(p => {
                      const isRealizedGreen = p.realizedPnl >= 0;
                      const isUnrealizedGreen = p.unrealizedPnl >= 0;
                      return (
                        <tr key={p.symbol} className="border-b border-gray-900/60 hover:bg-gray-800/10 py-1.5">
                          <td className="font-bold text-white py-2">{p.symbol}</td>
                          <td className={`text-right font-semibold ${p.quantity > 0 ? 'text-emerald-400' : p.quantity < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            {p.quantity}
                          </td>
                          <td className="text-right">{p.buyQty}</td>
                          <td className="text-right">{p.sellQty}</td>
                          <td className="text-right">₹{p.averageBuyPrice.toFixed(2)}</td>
                          <td className="text-right">₹{p.currentPrice?.toFixed(2)}</td>
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
            )}
            
            {activeTab === 'open_orders' && (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th>Symbol</th>
                    <th>Type</th>
                    <th>Direction</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Limit Price</th>
                    <th className="text-right">Trigger Price</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.length === 0 ? (
                    <tr><td colSpan="8" className="text-center text-gray-500 py-6">No open pending orders.</td></tr>
                  ) : (
                    openOrders.map(o => (
                      <tr key={o._id} className="border-b border-gray-900/60 hover:bg-gray-800/10 py-1.5">
                        <td className="font-bold text-white py-2">{o.symbol}</td>
                        <td className="capitalize">{o.orderType}</td>
                        <td className={`font-bold capitalize ${o.direction === 'buy' ? 'text-blue-400' : 'text-red-400'}`}>{o.direction}</td>
                        <td className="text-right">{o.quantity}</td>
                        <td className="text-right">{o.price ? `₹${o.price.toFixed(2)}` : '-'}</td>
                        <td className="text-right">{o.triggerPrice ? `₹${o.triggerPrice.toFixed(2)}` : '-'}</td>
                        <td>
                          <span className="bg-yellow-900/20 border border-yellow-800/40 text-yellow-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                            {o.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <button 
                            onClick={() => handleCancelOrder(o._id)}
                            className="bg-red-600/10 border border-red-800/30 text-red-400 hover:bg-red-600 hover:text-white px-2 py-0.5 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
            
            {activeTab === 'trade_history' && (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th>Date</th>
                    <th>Symbol</th>
                    <th>Type</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Execution Price</th>
                    <th className="text-right">Charges</th>
                    <th className="text-right">Trade Value</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.length === 0 ? (
                    <tr><td colSpan="7" className="text-center text-gray-500 py-6">No historical trades found.</td></tr>
                  ) : (
                    tradeHistory.slice(0, 10).map(t => (
                      <tr key={t._id} className="border-b border-gray-900/60 hover:bg-gray-800/10 py-1.5">
                        <td className="py-2">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="font-bold text-white">{t.symbol}</td>
                        <td className={`font-bold capitalize ${t.direction === 'buy' ? 'text-blue-400' : 'text-red-400'}`}>{t.direction}</td>
                        <td className="text-right">{t.executionQuantity}</td>
                        <td className="text-right">₹{t.executionPrice.toFixed(2)}</td>
                        <td className="text-right text-gray-400">₹{t.totalCharges.toFixed(2)}</td>
                        <td className="text-right font-bold text-white">₹{(t.executionQuantity * t.executionPrice).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      {/* 3. Right Pane: Order Ticket Card */}
      <div className="w-80 p-4 border-l border-gray-800 shrink-0 flex flex-col justify-between bg-darkBg/20 overflow-y-auto">
        <form onSubmit={handlePlaceOrder} className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Ticket</h3>
          
          {orderError && (
            <div className="p-3 bg-red-900/20 border border-red-800/40 text-red-400 text-xs rounded-xl flex items-center">
              <span>{orderError}</span>
            </div>
          )}
          
          {orderSuccess && (
            <div className="p-3 bg-emerald-900/20 border border-emerald-800/40 text-emerald-400 text-xs rounded-xl">
              {orderSuccess}
            </div>
          )}
          
          {/* Buy vs Sell direction */}
          <div className="flex p-0.5 bg-gray-900/80 rounded-xl border border-gray-800/60">
            <button 
              type="button" 
              onClick={() => setDirection('buy')}
              className={`flex-1 py-1.5 text-xs font-bold uppercase transition-colors rounded-lg ${
                direction === 'buy' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Buy
            </button>
            <button 
              type="button" 
              onClick={() => setDirection('sell')}
              className={`flex-1 py-1.5 text-xs font-bold uppercase transition-colors rounded-lg ${
                direction === 'sell' ? 'bg-red-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sell
            </button>
          </div>
          
          {/* Intraday vs Delivery toggle */}
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400">Intraday (MIS)</span>
            <input 
              type="checkbox"
              checked={isIntraday}
              onChange={(e) => setIsIntraday(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-900 rounded border-gray-800 focus:ring-blue-500 focus:ring-2 focus:ring-offset-gray-900"
            />
          </div>
          
          {/* Order Type selects */}
          <div>
            <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1.5">Order Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {['market', 'limit', 'stop_loss', 'take_profit'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setOrderType(type)}
                  className={`py-1.5 text-[10px] font-bold uppercase border rounded-xl transition-all ${
                    orderType === type 
                      ? 'bg-gray-800 text-white border-blue-500 shadow-md' 
                      : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
                  }`}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          {/* Quantity Field */}
          <div>
            <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1.5">Quantity</label>
            <input 
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              min="1"
              required
            />
          </div>
          
          {/* Limit Price Field */}
          {orderType === 'limit' && (
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1.5">Limit Price (₹)</label>
              <input 
                type="number"
                value={price}
                onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                step="0.05"
                required
              />
            </div>
          )}
          
          {/* Trigger Price Field */}
          {['stop_loss', 'take_profit'].includes(orderType) && (
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1.5">Trigger Price (₹)</label>
              <input 
                type="number"
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                step="0.05"
                required
              />
            </div>
          )}
          
          {/* Brokerage charges breakdown pane */}
          <div className="bg-gray-950/80 border border-gray-800 p-3 rounded-2xl text-[10px] space-y-2">
            <h4 className="font-bold text-gray-400 border-b border-gray-900 pb-1.5">Estimated Charges & Taxes</h4>
            <div className="flex justify-between">
              <span className="text-gray-500">Trade Value:</span>
              <span className="font-semibold text-white">₹{(quantity * (orderType === 'market' ? currentPrice : price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Virtual Brokerage:</span>
              <span className="text-gray-300">₹{charges.brokerage.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">STT (Taxes):</span>
              <span className="text-gray-300">₹{charges.stt.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">GST (18% charges):</span>
              <span className="text-gray-300">₹{charges.gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Stamp Duty:</span>
              {/* BUG-07 Fix: estimateCharges returns stampDuty not stamp */}
              <span className="text-gray-300">₹{(charges.stampDuty ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-950 pt-2 font-bold text-xs">
              <span className="text-gray-400">Total transaction cost:</span>
              <span className="text-blue-400">₹{charges.totalCharges.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={submittingOrder || user?.kycStatus === 'rejected'}
            className={`w-full font-bold py-2.5 rounded-xl text-xs uppercase transition-all shadow-lg text-white ${
              user?.kycStatus === 'rejected' ? 'bg-gray-800 cursor-not-allowed opacity-50' :
              direction === 'buy' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25' : 'bg-red-600 hover:bg-red-700 shadow-red-500/25'
            }`}
          >
            {user?.kycStatus === 'rejected' ? 'KYC Rejected — Cannot Trade' :
             submittingOrder ? 'Submitting Order...' : `${direction} ${selectedSymbol}`}
          </button>
        </form>
      </div>
      
    </div>
  );
};

export default Terminal;
