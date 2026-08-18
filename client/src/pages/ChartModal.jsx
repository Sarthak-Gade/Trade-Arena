import React, { useState, useEffect, useCallback } from 'react';
import {
  X, BarChart2, Activity, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Minus, RefreshCw
} from 'lucide-react';
import api from '../utils/api';

const TIMEFRAMES = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 31 },
  { label: '3M', days: 92 },
  { label: '6M', days: 183 },
  { label: '1Y', days: 365 },
];

const CHART_TYPES = [
  { id: 'candlestick', label: 'Candle' },
  { id: 'line',        label: 'Line' },
  { id: 'area',        label: 'Area' },
  { id: 'histogram',   label: 'Bar' },
];

// ── Pattern Detection ─────────────────────────────────────────────────────────
function detectPatterns(data) {
  const patterns = [];
  for (let i = 1; i < data.length; i++) {
    const c = data[i], p = data[i - 1];
    const bodySize = Math.abs(c.close - c.open);
    const totalRange = c.high - c.low || 0.0001;
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const isGreenC = c.close >= c.open;
    const isGreenP = p.close >= p.open;

    if (bodySize / totalRange < 0.1)
      patterns.push({ date: c.date, name: 'Doji', type: 'neutral', desc: 'Indecision — possible reversal' });
    else if (lowerWick > bodySize * 2.5 && upperWick < bodySize * 0.5 && lowerWick > 0)
      patterns.push({ date: c.date, name: 'Hammer', type: 'bullish', desc: 'Bullish reversal at bottom' });
    else if (upperWick > bodySize * 2.5 && lowerWick < bodySize * 0.5)
      patterns.push({ date: c.date, name: 'Shooting Star', type: 'bearish', desc: 'Bearish reversal at top' });
    else if (!isGreenP && isGreenC && c.open < p.close && c.close > p.open)
      patterns.push({ date: c.date, name: 'Bullish Engulfing', type: 'bullish', desc: 'Strong buy signal' });
    else if (isGreenP && !isGreenC && c.open > p.close && c.close < p.open)
      patterns.push({ date: c.date, name: 'Bearish Engulfing', type: 'bearish', desc: 'Strong sell signal' });

    if (i >= 2) {
      const pp = data[i - 2];
      const isGreenPP = pp.close >= pp.open;
      if (!isGreenPP && Math.abs(p.close - p.open) < Math.abs(pp.close - pp.open) * 0.3 && isGreenC && c.close > (pp.open + pp.close) / 2)
        patterns.push({ date: c.date, name: 'Morning Star', type: 'bullish', desc: '3-candle bullish reversal' });
      if (isGreenPP && Math.abs(p.close - p.open) < Math.abs(pp.close - pp.open) * 0.3 && !isGreenC && c.close < (pp.open + pp.close) / 2)
        patterns.push({ date: c.date, name: 'Evening Star', type: 'bearish', desc: '3-candle bearish reversal' });
    }
  }
  return patterns.slice(-6).reverse();
}

// ── SVG Chart ─────────────────────────────────────────────────────────────────
function ChartSVG({ chartData, chartType, hoveredIndex, onHover, onLeave }) {
  if (!chartData || chartData.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        <RefreshCw className="w-4 h-4 mr-2 animate-spin text-blue-500" />
        Loading chart data…
      </div>
    );
  }

  const prices = chartData.flatMap(d => [d.open, d.close, d.high, d.low]);
  const minPrice = Math.min(...prices) * 0.997;
  const maxPrice = Math.max(...prices) * 1.003;
  const priceRange = maxPrice - minPrice || 1;

  const VW = 960, PH = 280, VOLH = 70, PAD_L = 72, PAD_R = 10, PAD_T = 12;
  const chartW = VW - PAD_L - PAD_R;
  const volBase = PAD_T + PH + 55 + VOLH;
  const VH = volBase + 30;

  const getX = (idx) => PAD_L + (idx / Math.max(chartData.length - 1, 1)) * chartW;
  const getY = (price) => PAD_T + PH - ((price - minPrice) / priceRange) * PH;
  const maxVol = Math.max(...chartData.map(d => d.volume)) || 1;
  const getVolY = (v) => volBase - (v / maxVol) * VOLH;

  const linePoints = chartData.map((d, i) => `${getX(i)},${getY(d.close)}`).join(' ');
  const areaBottom = PAD_T + PH;
  const areaPoints = `${getX(0)},${areaBottom} ${linePoints} ${getX(chartData.length - 1)},${areaBottom}`;

  const gridLevels = [0, 0.2, 0.4, 0.6, 0.8, 1];
  const labelCount = Math.min(7, chartData.length);
  const dateLabelIdxs = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (chartData.length - 1))
  );

  const hovered = hoveredIndex !== null && chartData[hoveredIndex] ? chartData[hoveredIndex] : null;
  const hovX = hoveredIndex !== null ? getX(hoveredIndex) : null;
  const hovY = hovered ? getY(hovered.close) : null;
  const hovColor = hovered ? (hovered.close >= hovered.open ? '#10b981' : '#ef4444') : '#fff';

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="w-full h-full select-none"
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const pct = (mouseX - (PAD_L / VW) * rect.width) / ((chartW / VW) * rect.width);
        const idx = Math.round(pct * (chartData.length - 1));
        onHover(idx >= 0 && idx < chartData.length ? idx : null);
      }}
      onMouseLeave={onLeave}
    >
      <defs>
        <linearGradient id="cmAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
        </linearGradient>
        <filter id="cmGlow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* BG */}
      <rect x="0" y="0" width={VW} height={VH} fill="#07101a" />

      {/* Y-axis grid */}
      {gridLevels.map((pct, i) => {
        const gPrice = maxPrice - pct * priceRange;
        const gy = getY(gPrice);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={gy} x2={VW - PAD_R} y2={gy}
              stroke="#1a2840" strokeWidth="1" strokeDasharray="4 6" />
            <text x={PAD_L - 6} y={gy + 4} fill="#3a5070" fontSize="10"
              textAnchor="end" fontFamily="'JetBrains Mono','Courier New',monospace">
              ₹{Math.round(gPrice).toLocaleString('en-IN')}
            </text>
          </g>
        );
      })}

      {/* Volume separator */}
      <line x1={PAD_L} y1={PAD_T + PH + 40} x2={VW - PAD_R} y2={PAD_T + PH + 40}
        stroke="#1a2840" strokeWidth="1" />
      <text x={PAD_L - 6} y={volBase - VOLH / 2 + 4} fill="#243550"
        fontSize="9" textAnchor="end" fontFamily="monospace">VOL</text>

      {/* Volume bars */}
      {chartData.map((d, idx) => {
        const x = getX(idx);
        const vy = getVolY(d.volume);
        const isG = d.close >= d.open;
        const barW = Math.max(chartW / chartData.length * 0.55, 1.2);
        return (
          <rect key={`v${idx}`}
            x={x - barW / 2} y={vy} width={barW}
            height={Math.max(volBase - vy, 1)}
            fill={isG ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}
            opacity={hoveredIndex === idx ? 1 : 0.7}
          />
        );
      })}

      {/* Line chart */}
      {chartType === 'line' && (
        <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Area chart */}
      {chartType === 'area' && (
        <g>
          <polygon points={areaPoints} fill="url(#cmAreaGrad)" stroke="none" />
          <polyline points={linePoints} fill="none" stroke="#3b82f6" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" filter="url(#cmGlow)" />
        </g>
      )}

      {/* Histogram */}
      {chartType === 'histogram' && (
        <g>
          {chartData.map((d, idx) => {
            const x = getX(idx);
            const yTop = getY(d.close);
            const yBase = getY(minPrice);
            const isG = d.close >= d.open;
            const barW = Math.max(chartW / chartData.length * 0.55, 2);
            return (
              <rect key={`h${idx}`} x={x - barW / 2} y={yTop} width={barW}
                height={Math.max(yBase - yTop, 1)}
                fill={isG ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)'}
                stroke={isG ? '#10b981' : '#ef4444'} strokeWidth="1"
                opacity={hoveredIndex === idx ? 1 : 0.8} />
            );
          })}
        </g>
      )}

      {/* Candlestick */}
      {chartType === 'candlestick' && (
        <g>
          {chartData.map((d, idx) => {
            const x = getX(idx);
            const yO = getY(d.open), yC = getY(d.close);
            const yH = getY(d.high), yL = getY(d.low);
            const isG = d.close >= d.open;
            const col = isG ? '#10b981' : '#ef4444';
            const fill = isG ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
            const barW = Math.max(chartW / chartData.length * 0.55, 2);
            const isHov = hoveredIndex === idx;
            return (
              <g key={`c${idx}`} opacity={isHov ? 1 : 0.88}>
                <line x1={x} y1={yH} x2={x} y2={yL}
                  stroke={col} strokeWidth={isHov ? 1.5 : 1} />
                <rect x={x - barW / 2} y={Math.min(yO, yC)} width={barW}
                  height={Math.max(Math.abs(yO - yC), 1.5)}
                  fill={isHov ? col : fill} stroke={col}
                  strokeWidth={isHov ? 1.5 : 1} rx="0.5" />
              </g>
            );
          })}
        </g>
      )}

      {/* Crosshair */}
      {hoveredIndex !== null && hovered && (
        <g>
          <line x1={hovX} y1={PAD_T} x2={hovX} y2={PAD_T + PH + 40}
            stroke="#4a6080" strokeWidth="1" strokeDasharray="4 4" opacity="0.9" />
          <line x1={PAD_L} y1={hovY} x2={VW - PAD_R} y2={hovY}
            stroke="#4a6080" strokeWidth="1" strokeDasharray="4 4" opacity="0.9" />
          {/* Price pill */}
          <rect x="0" y={hovY - 10} width={PAD_L - 2} height="20" rx="4" fill={hovColor} opacity="0.95" />
          <text x={PAD_L - 8} y={hovY + 4} fill="#fff" fontSize="9" textAnchor="end"
            fontFamily="'JetBrains Mono','Courier New',monospace" fontWeight="bold">
            ₹{hovered.close.toFixed(1)}
          </text>
          {/* Date pill */}
          <rect
            x={Math.min(Math.max(hovX - 32, PAD_L), VW - PAD_R - 64)}
            y={PAD_T + PH + 20} width="64" height="18" rx="4"
            fill={hovColor} opacity="0.9" />
          <text
            x={Math.min(Math.max(hovX, PAD_L + 32), VW - PAD_R - 32)}
            y={PAD_T + PH + 33} fill="#fff" fontSize="9" textAnchor="middle"
            fontFamily="'JetBrains Mono','Courier New',monospace">
            {hovered.date}
          </text>
          {/* Crosshair dot */}
          <circle cx={hovX} cy={hovY} r="5" fill={hovColor}
            stroke="#fff" strokeWidth="1.5" filter="url(#cmGlow)" />
        </g>
      )}

      {/* X-axis date labels */}
      {dateLabelIdxs.filter(i => i < chartData.length).map((i, key) => (
        <text key={key} x={getX(i)} y={PAD_T + PH + 38} fill="#243550" fontSize="9"
          textAnchor="middle" fontFamily="monospace">
          {chartData[i]?.date?.slice(5)}
        </text>
      ))}
    </svg>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function ChartModal({ selectedStock, socket, onClose, onTrade }) {
  const [timeframe, setTimeframe] = useState('1M');
  const [chartType, setChartType] = useState('candlestick');
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [visible, setVisible] = useState(false);
  const [livePrice, setLivePrice] = useState(selectedStock?.currentPrice || 0);

  const symbol = selectedStock?.symbol;

  // Mount animation
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fetch history
  useEffect(() => {
    if (!symbol) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/market/stocks/${symbol}/history?timeframe=${timeframe}`);
        if (res.data?.success) setHistoricalData(res.data.data);
      } catch (err) {
        console.error('ChartModal history error:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [symbol, timeframe]);

  // Live price socket
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      const upd = data?.stocks?.find?.(s => s.symbol === symbol);
      if (upd) setLivePrice(upd.currentPrice);
    };
    socket.on('market-tick', handler);
    return () => socket.off('market-tick', handler);
  }, [socket, symbol]);

  // Sync livePrice from prop
  useEffect(() => {
    if (selectedStock?.currentPrice) setLivePrice(selectedStock.currentPrice);
  }, [selectedStock?.currentPrice]);

  // Merge live price into last candle
  const chartData = React.useMemo(() => {
    if (!historicalData.length || !selectedStock) return historicalData;
    const data = [...historicalData];
    const li = data.length - 1;
    data[li] = {
      ...data[li],
      close: livePrice,
      high: Math.max(data[li].high, livePrice),
      low: Math.min(data[li].low, livePrice),
    };
    return data;
  }, [historicalData, selectedStock, livePrice]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 260);
  }, [onClose]);

  const handleTrade = (direction) => {
    handleClose();
    setTimeout(() => onTrade(direction), 270);
  };

  if (!selectedStock) return null;

  const prevClose = selectedStock.prevClose || 0;
  const change = livePrice - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;
  const isGreen = change >= 0;

  const hudData = hoveredIndex !== null && chartData[hoveredIndex]
    ? chartData[hoveredIndex]
    : chartData[chartData.length - 1];
  const hudIsGreen = hudData ? hudData.close >= hudData.open : true;

  const patterns = detectPatterns(chartData);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.25s' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className="relative w-full h-full max-w-[1440px] max-h-[97vh] rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(145deg,#08101c 0%,#060d18 60%,#050b14 100%)',
          border: '1px solid rgba(59,130,246,0.12)',
          boxShadow: '0 0 100px rgba(59,130,246,0.06), 0 50px 100px rgba(0,0,0,0.8)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(10px)',
          transition: 'transform 0.28s cubic-bezier(0.34,1.4,0.64,1)',
        }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.025)' }}>

          <div className="flex items-center gap-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-2xl tracking-tight">{symbol}</span>
                <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20
                  px-2 py-0.5 rounded-full font-bold uppercase">{selectedStock.exchange}</span>
                {selectedStock.sector && (
                  <span className="text-[9px] bg-gray-800/60 text-gray-500 px-2 py-0.5 rounded-full">
                    {selectedStock.sector}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-[11px] mt-0.5">{selectedStock.companyName}</p>
            </div>

            <div className="pl-5 border-l" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-baseline gap-2.5">
                <span className="text-white font-black text-3xl tabular-nums">
                  ₹{livePrice.toFixed(2)}
                </span>
                <span className={`flex items-center gap-0.5 text-sm font-bold
                  ${isGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isGreen ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {isGreen ? '+' : ''}{change.toFixed(2)} ({isGreen ? '+' : ''}{changePct.toFixed(2)}%)
                </span>
              </div>
              <p className="text-gray-600 text-[10px] mt-0.5">Prev Close ₹{prevClose.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="chart-modal-buy-btn"
              onClick={() => handleTrade('buy')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg,#047857,#10b981)',
                boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
              }}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Buy
            </button>
            <button
              id="chart-modal-sell-btn"
              onClick={() => handleTrade('sell')}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                transition-all hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg,#991b1b,#ef4444)',
                boxShadow: '0 4px 20px rgba(239,68,68,0.3)',
              }}
            >
              <Minus className="w-3.5 h-3.5" /> Sell
            </button>
            <button
              id="chart-modal-close-btn"
              onClick={handleClose}
              className="p-2.5 rounded-xl border text-gray-500 hover:text-white
                hover:border-gray-500 transition-all"
              style={{ borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between px-6 py-2 border-b shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.01)' }}>

          {/* Timeframes */}
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-xl border"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.label}
                onClick={() => setTimeframe(tf.label)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                  timeframe === tf.label
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Chart types */}
          <div className="flex items-center gap-0.5 bg-black/40 p-0.5 rounded-xl border"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {CHART_TYPES.map(ct => (
              <button
                key={ct.id}
                onClick={() => setChartType(ct.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                  chartType === ct.id
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                {ct.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Chart */}
          <div className="flex-1 flex flex-col min-w-0 px-2 py-2">
            {/* OHLCV HUD */}
            {hudData && (
              <div className="flex items-center gap-5 px-3 pb-1.5 mb-1 border-b text-xs shrink-0"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <span className="text-gray-600 font-mono text-[10px]">{hudData.date}</span>
                {[['O', hudData.open], ['H', hudData.high], ['L', hudData.low], ['C', hudData.close]].map(([lbl, v]) => (
                  <span key={lbl}>
                    <span className="text-gray-600 font-mono">{lbl} </span>
                    <span className={`font-bold font-mono ${hudIsGreen ? 'text-emerald-400' : 'text-red-400'}`}>
                      ₹{v.toFixed(2)}
                    </span>
                  </span>
                ))}
                <span>
                  <span className="text-gray-600 font-mono">Vol </span>
                  <span className="text-blue-400 font-bold font-mono">
                    {hudData.volume > 1e6
                      ? `${(hudData.volume / 1e6).toFixed(2)}M`
                      : `${(hudData.volume / 1000).toFixed(1)}K`}
                  </span>
                </span>
                {loading && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-blue-400">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Loading…
                  </span>
                )}
              </div>
            )}

            {/* Chart SVG */}
            <div className="flex-1 min-h-0">
              <ChartSVG
                chartData={chartData}
                chartType={chartType}
                hoveredIndex={hoveredIndex}
                onHover={setHoveredIndex}
                onLeave={() => setHoveredIndex(null)}
              />
            </div>
          </div>

          {/* Right sidebar */}
          <div className="w-60 shrink-0 border-l flex flex-col gap-4 overflow-y-auto px-4 py-4"
            style={{
              borderColor: 'rgba(255,255,255,0.05)',
              background: 'rgba(255,255,255,0.015)',
            }}>

            {/* Key Stats */}
            <div>
              <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-3">Key Stats</h4>
              <div className="space-y-2">
                {[
                  { label: 'Day High',   val: `₹${selectedStock.highPrice?.toFixed(2)}`,  color: 'text-emerald-400' },
                  { label: 'Day Low',    val: `₹${selectedStock.lowPrice?.toFixed(2)}`,   color: 'text-red-400' },
                  { label: 'Open',       val: `₹${selectedStock.openPrice?.toFixed(2)}`,  color: 'text-blue-400' },
                  { label: 'Prev Close', val: `₹${prevClose.toFixed(2)}`,                  color: 'text-gray-300' },
                  ...(selectedStock.week52High ? [{ label: '52W High', val: `₹${Number(selectedStock.week52High).toFixed(2)}`, color: 'text-emerald-300' }] : []),
                  ...(selectedStock.week52Low  ? [{ label: '52W Low',  val: `₹${Number(selectedStock.week52Low).toFixed(2)}`,  color: 'text-red-300' }] : []),
                  ...(selectedStock.marketCap  ? [{ label: 'Mkt Cap',  val: `₹${(selectedStock.marketCap / 1000).toFixed(0)}B`, color: 'text-purple-400' }] : []),
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-600">{label}</span>
                    <span className={`text-[11px] font-bold font-mono ${color}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 52W Range slider */}
            {selectedStock.week52High && selectedStock.week52Low && (() => {
              const lo = Number(selectedStock.week52Low);
              const hi = Number(selectedStock.week52High);
              const pct = hi > lo ? Math.min(Math.max(((livePrice - lo) / (hi - lo)) * 100, 2), 98) : 50;
              return (
                <div>
                  <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">52W Range</h4>
                  <div className="relative h-2 rounded-full overflow-hidden"
                    style={{ background: 'linear-gradient(90deg,#7f1d1d,#14532d)' }}>
                    <div className="absolute top-0 bottom-0 w-3 -translate-x-1/2 rounded-full bg-white shadow-lg shadow-white/50"
                      style={{ left: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] text-gray-600 font-mono">
                    <span>₹{lo.toFixed(0)}</span>
                    <span>₹{hi.toFixed(0)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Detected Patterns */}
            {patterns.length > 0 && (
              <div>
                <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                  Patterns · {timeframe}
                </h4>
                <div className="space-y-1.5">
                  {patterns.map((pat, i) => (
                    <div key={i} title={pat.desc}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold ${
                        pat.type === 'bullish'
                          ? 'bg-emerald-900/15 border-emerald-900/30 text-emerald-400'
                          : pat.type === 'bearish'
                          ? 'bg-red-900/15 border-red-900/30 text-red-400'
                          : 'bg-gray-800/20 border-gray-700/30 text-gray-400'
                      }`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        pat.type === 'bullish' ? 'bg-emerald-400' : pat.type === 'bearish' ? 'bg-red-400' : 'bg-gray-500'
                      }`} />
                      <span className="flex-1">{pat.name}</span>
                      <span className="text-[9px] opacity-40 font-mono">{pat.date?.slice(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indices */}
            {selectedStock.indices?.length > 0 && (
              <div>
                <h4 className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">Indices</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedStock.indices.map(idx => (
                    <span key={idx}
                      className="text-[9px] bg-blue-900/15 border border-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">
                      {idx}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-1.5 border-t flex items-center justify-between shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.2)' }}>
          <span className="text-[10px] text-gray-700">
            Press <kbd className="bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-mono text-[9px]">Esc</kbd> to close
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-gray-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · {timeframe}
          </span>
        </div>
      </div>
    </div>
  );
}
