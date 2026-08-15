import { createSlice } from '@reduxjs/toolkit';

let initialUser = null;
try {
  const userVal = localStorage.getItem('user');
  if (userVal && userVal !== 'undefined') {
    initialUser = JSON.parse(userVal);
  }
} catch (e) {
  console.error('Failed to parse user from localStorage:', e);
}

const initialToken = localStorage.getItem('accessToken') || null;

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    accessToken: initialToken,
    isAuthenticated: !!initialToken,
    loading: false,
    error: null,
  },
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      
      const { accessToken, refreshToken, ...userDetails } = action.payload;
      
      state.user = userDetails;
      state.accessToken = accessToken;
      state.error = null;
      
      localStorage.setItem('user', JSON.stringify(userDetails));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    updateKycStatus: (state, action) => {
      if (state.user) {
        state.user.kycStatus = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateWalletBalance: (state, action) => {
      if (state.user) {
        state.user.walletBalance = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    }
  }
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  updateKycStatus,
  updateWalletBalance
} = authSlice.actions;

export default authSlice.reducer;
