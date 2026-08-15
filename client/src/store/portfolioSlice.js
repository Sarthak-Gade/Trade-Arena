import { createSlice } from '@reduxjs/toolkit';

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState: {
    holdings: [],
    positions: [],
    summary: {
      walletBalance: 0,
      holdingsValue: 0,
      holdingsCost: 0,
      totalUnrealizedPnl: 0,
      totalRealizedPnl: 0,
      portfolioValue: 0,
      dayPnl: 0
    },
    watchlist: [], // List of symbols
    loading: false,
    error: null
  },
  reducers: {
    fetchPortfolioStart: (state) => {
      state.loading = true;
    },
    fetchPortfolioSuccess: (state, action) => {
      state.loading = false;
      state.holdings = action.payload.holdings || [];
      state.positions = action.payload.positions || [];
      state.summary = {
        walletBalance: action.payload.walletBalance || 0,
        holdingsValue: action.payload.holdingsValue || 0,
        holdingsCost: action.payload.holdingsCost || 0,
        totalUnrealizedPnl: action.payload.totalUnrealizedPnl || 0,
        totalRealizedPnl: action.payload.totalRealizedPnl || 0,
        portfolioValue: action.payload.portfolioValue || 0,
        dayPnl: action.payload.dayPnl || 0
      };
      state.error = null;
    },
    fetchPortfolioFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    updatePortfolioRealtime: (state, action) => {
      if (action.payload.holdings !== undefined) {
        state.holdings = action.payload.holdings;
      }
      if (action.payload.positions !== undefined) {
        state.positions = action.payload.positions;
      }
      // Also update summary totals if provided by socket event
      if (action.payload.walletBalance !== undefined) {
        state.summary.walletBalance = action.payload.walletBalance;
      }
      if (action.payload.portfolioValue !== undefined) {
        state.summary.portfolioValue = action.payload.portfolioValue;
      }
      if (action.payload.totalUnrealizedPnl !== undefined) {
        state.summary.totalUnrealizedPnl = action.payload.totalUnrealizedPnl;
      }
      if (action.payload.dayPnl !== undefined) {
        state.summary.dayPnl = action.payload.dayPnl;
      }
    },
    setWatchlist: (state, action) => {
      state.watchlist = action.payload;
    },
    addToWatchlist: (state, action) => {
      if (!state.watchlist.includes(action.payload)) {
        state.watchlist.push(action.payload);
      }
    },
    removeFromWatchlist: (state, action) => {
      state.watchlist = state.watchlist.filter(sym => sym !== action.payload);
    }
  }
});

export const {
  fetchPortfolioStart,
  fetchPortfolioSuccess,
  fetchPortfolioFailure,
  updatePortfolioRealtime,
  setWatchlist,
  addToWatchlist,
  removeFromWatchlist
} = portfolioSlice.actions;

export default portfolioSlice.reducer;
