import { createSlice } from '@reduxjs/toolkit';

const marketSlice = createSlice({
  name: 'market',
  initialState: {
    stocks: [],
    indices: [],
    gainers: [],
    losers: [],
    selectedSymbol: 'RELIANCE',
    sessionStatus: 'OPEN',
    loading: false,
    error: null
  },
  reducers: {
    setStocks: (state, action) => {
      state.stocks = action.payload;
    },
    updateStockQuotes: (state, action) => {
      // action.payload is the list of updated stocks from socket.io tick
      state.stocks = action.payload;
    },
    setIndices: (state, action) => {
      state.indices = action.payload;
    },
    setMarketMovers: (state, action) => {
      state.gainers = action.payload.gainers || [];
      state.losers = action.payload.losers || [];
    },
    setSelectedSymbol: (state, action) => {
      state.selectedSymbol = action.payload.toUpperCase();
    },
    setSessionStatus: (state, action) => {
      state.sessionStatus = action.payload;
    }
  }
});

export const {
  setStocks,
  updateStockQuotes,
  setIndices,
  setMarketMovers,
  setSelectedSymbol,
  setSessionStatus
} = marketSlice.actions;

export default marketSlice.reducer;
