import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import marketReducer from './marketSlice';
import portfolioReducer from './portfolioSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    market: marketReducer,
    portfolio: portfolioReducer
  }
});
