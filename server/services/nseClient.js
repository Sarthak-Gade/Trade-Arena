/**
 * nseClient.js — Singleton NSE India data client
 *
 * Wraps the `stock-nse-india` npm package with:
 *   - Rate limiting (min 400ms between requests)
 *   - Per-symbol result cache (30s TTL) to prevent hammering NSE
 *   - Graceful fallback: returns null instead of throwing on errors
 */

let nseIndia = null;

// Lazy-load the ESM package using dynamic import (it's an ESM module)
const getNseClient = async () => {
  if (!nseIndia) {
    try {
      const mod = await import('stock-nse-india');
      const NseIndia = mod.NseIndia || mod.default?.NseIndia || mod.default;
      nseIndia = new NseIndia();
      console.log('[NSE Client] stock-nse-india client initialized.');
    } catch (err) {
      console.warn('[NSE Client] Failed to initialize stock-nse-india:', err.message);
      return null;
    }
  }
  return nseIndia;
};

// Simple in-memory cache: { symbol -> { data, expiresAt } }
const cache = new Map();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

// Rate limiter: enforce minimum gap between outgoing requests
let lastRequestTime = 0;
const MIN_REQUEST_GAP_MS = 400;

const rateLimitedWait = async () => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_GAP_MS) {
    await new Promise(res => setTimeout(res, MIN_REQUEST_GAP_MS - elapsed));
  }
  lastRequestTime = Date.now();
};

/**
 * Fetch real-time equity quote for a single symbol from NSE.
 * Returns null on failure (caller should use cached/simulated price).
 *
 * @param {string} symbol - NSE symbol e.g. "RELIANCE"
 * @returns {Object|null} - { lastPrice, open, dayHigh, dayLow, previousClose, totalTradedVolume } or null
 */
const getEquityQuote = async (symbol) => {
  // Check cache
  const cached = cache.get(symbol);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const client = await getNseClient();
  if (!client) return null;

  try {
    await rateLimitedWait();
    const details = await client.getEquityDetails(symbol);
    const pd = details?.priceInfo;
    if (!pd) return null;

    const result = {
      lastPrice: pd.lastPrice,
      open: pd.open,
      dayHigh: pd.intraDayHighLow?.max || pd.weekHighLow?.max || pd.lastPrice,
      dayLow: pd.intraDayHighLow?.min || pd.weekHighLow?.min || pd.lastPrice,
      previousClose: pd.previousClose,
      totalTradedVolume: details?.marketDeptOrderBook?.tradeInfo?.totalTradedVolume || 0
    };

    // Cache it
    cache.set(symbol, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    // Silently ignore — NSE might block or rate-limit us
    if (err.message?.includes('403') || err.message?.includes('401') || err.message?.includes('429')) {
      console.warn(`[NSE Client] Blocked (${err.message?.substring(0, 40)}) for ${symbol} — using last known price.`);
    }
    return null;
  }
};

/**
 * Fetch real NSE index values for major indices.
 * Returns an array of { name, value, change, pctChange } or null on failure.
 */
const getIndicesData = async () => {
  const cacheKey = '__indices__';
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const client = await getNseClient();
  if (!client) return null;

  try {
    await rateLimitedWait();
    const data = await client.getEquityStockIndices('NIFTY 50');
    if (!data?.metadata) return null;

    // We'll parse a few key indices from the response
    const meta = data.metadata;
    const result = [
      {
        name: 'NIFTY 50',
        value: Math.round(meta.last || 0),
        change: Number((meta.change || 0).toFixed(2)),
        pctChange: Number((meta.percentChange || 0).toFixed(2))
      }
    ];

    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  } catch (err) {
    console.warn('[NSE Client] Failed to fetch index data:', err.message?.substring(0, 60));
    return null;
  }
};

/**
 * Fetch 1-month historical OHLCV data for a symbol.
 * Returns array of { date, open, high, low, close, volume } or null.
 */
const getEquityHistory = async (symbol) => {
  const cacheKey = `hist_${symbol}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const client = await getNseClient();
  if (!client) return null;

  try {
    await rateLimitedWait();
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 31);

    const fmt = (d) => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };

    const data = await client.getEquityHistoricalData(symbol, {
      start: fmt(fromDate),
      end: fmt(toDate)
    });

    if (!data?.data?.length) return null;

    const history = data.data
      .filter(row => row.CH_OPENING_PRICE != null)
      .map(row => ({
        date: row.CH_TIMESTAMP?.split('T')[0] || row.CH_TIMESTAMP,
        open: Number(row.CH_OPENING_PRICE),
        high: Number(row.CH_TRADE_HIGH_PRICE),
        low: Number(row.CH_TRADE_LOW_PRICE),
        close: Number(row.CH_CLOSING_PRICE),
        volume: Number(row.CH_TOT_TRADED_QTY || 0)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Cache for 5 minutes (historical data changes infrequently)
    cache.set(cacheKey, { data: history, expiresAt: Date.now() + 5 * 60 * 1000 });
    return history;
  } catch (err) {
    console.warn(`[NSE Client] Failed to fetch history for ${symbol}:`, err.message?.substring(0, 60));
    return null;
  }
};

module.exports = { getEquityQuote, getIndicesData, getEquityHistory };
