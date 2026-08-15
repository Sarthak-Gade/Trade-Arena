const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const apiRoutes = require('./routes');
const { initMarketDataSimulator } = require('./services/marketDataService');
const { initScheduler } = require('./cron/scheduler');
const { setSocketIO } = require('./services/orderService');

// Initialize app
const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = socketIo(server, {
  cors: {
    origin: '*', // In production, replace with actual frontend domains
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Pass Socket.IO instance to OMS orderService
setSocketIO(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static directories
// Make KYC uploads and Reports web-accessible
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/reports', express.static(path.join(__dirname, 'reports')));

// Mount API index
app.use('/api', apiRoutes);

// Simple healthcheck endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', serverTime: new Date() });
});

// Socket.IO Events
io.on('connection', (socket) => {
  console.log(`Socket Client Connected: ${socket.id}`);
  
  // User authentication subscription room
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId.toString());
      console.log(`Socket client ${socket.id} joined room: ${userId}`);
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket Client Disconnected: ${socket.id}`);
  });
});

// Connect to Database
connectDB().then(() => {
  // Start Market Data Simulator
  initMarketDataSimulator(io);
  
  // Start Cron Jobs
  initScheduler();
  
  // Start Express Server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`TradeArena Backend Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database connection failed:', err.message);
});
