import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useDispatch, useSelector } from 'react-redux';
import { updateStockQuotes, setIndices, setMarketMovers, setSessionStatus } from '../store/marketSlice';
import { updateWalletBalance } from '../store/authSlice';
import { updatePortfolioRealtime } from '../store/portfolioSlice';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  // Use a ref to get the latest user._id without it being a dependency
  // This prevents reconnecting every time walletBalance changes
  const userIdRef = useRef(null);
  const userId = useSelector((state) => state.auth.user?._id);
  userIdRef.current = userId;

  useEffect(() => {
    // Only connect if user is logged in
    if (!isAuthenticated || !userId) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected:', newSocket.id);
      // Join private user room for notifications and execution details
      if (userIdRef.current) {
        newSocket.emit('join', userIdRef.current);
      }
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket.IO connection error:', err.message);
    });

    // Live stock feed
    newSocket.on('stock-quotes', (stocks) => {
      dispatch(updateStockQuotes(stocks));
    });

    // Live indices feed
    newSocket.on('indices', (indices) => {
      dispatch(setIndices(indices));
    });

    // Gainers & Losers
    newSocket.on('market-movers', (movers) => {
      dispatch(setMarketMovers(movers));
    });

    // Market session status (OPEN / CLOSED / PRE_MARKET)
    newSocket.on('market-session', (data) => {
      dispatch(setSessionStatus(data.status));
    });

    // Live Wallet update
    newSocket.on('wallet-update', (data) => {
      if (data.balance !== undefined) {
        dispatch(updateWalletBalance(data.balance));
      }
    });

    // Live Portfolio holding adjustments
    newSocket.on('portfolio-update', (data) => {
      dispatch(updatePortfolioRealtime(data));
    });

    // Order executed notification
    newSocket.on('order-executed', (order) => {
      console.log('🎯 Order Executed:', order?.symbol, order?.direction, order?.executionPrice);
    });

    return () => {
      newSocket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, userId]);
  
  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
