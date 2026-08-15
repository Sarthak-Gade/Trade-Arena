# TradeArena Virtual Brokerage & Paper Trading Platform

TradeArena is a production-grade, full-stack MERN (MongoDB, Express, React, Node) application that functions as a complete virtual paper trading brokerage ecosystem.

## Key Features
* **Real User Onboarding & Auth**: JWT-protected authentication, failed login tracking (account lockout for 30 minutes after 5 attempts), mobile/email OTP verifications.
* **KYC Profile System**: Details collection (DOB, PAN, Aadhaar) and multi-part document uploads with administrative review approval status tracking.
* **Wallet Ledger**: virtual money deposits simulation, withdrawal requests simulation, and running ledger statement history audits.
* **Market Simulator**: Real-time Socket.IO stock quotes tick updates (Brownian motion random walks) for major NSE/BSE tickers, NIFTY and SENSEX indices.
* **Execution & OMS**: Provider-based order execution (`PaperTradingProvider` vs real `BrokerProvider`) for market, limit, stop-loss, and take-profit orders.
* **Taxes & Brokerage Engine**: Dynamic calculations matching standard Indian stock market rates (GST, STT, SEBI turnover fees, Stamp duty, and Exchange charges).
* **Automated EOD Statement Engine**: Daily cron schedules compiling transactions into professional PDF Contract Notes, archiving records, and sending email attachments.
* **Podium Leaderboards & Journals**: ROI performance scorecard rankings and quantitative/qualitative trading journal diaries.
* **Admin Dashboard**: Verification consoles, manual triggers for testing, IPO listing launchers, and business performance metrics.

---

## Directory Structure

```text
TradeArena/
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # Layouts (Navbar, Sidebar, protection gates)
│   │   ├── store/          # Redux Toolkit Slices (Auth, Market, Portfolio)
│   │   ├── context/        # Socket.IO connection contexts
│   │   ├── pages/          # Terminal, Portfolio, Ledger, KYC, Admin, IPO, Journal...
│   │   ├── utils/          # Axios API wrappers
│   │   ├── App.jsx         # Routes mappings
│   │   └── main.jsx        # Mount entrypoint
│   ├── tailwind.config.js  # custom dark theme palettes
│   └── package.json
│
└── server/                 # Node.js + Express Backend
    ├── config/             # DB Mongoose connections
    ├── cron/               # Cron schedulers (node-cron EOD statements)
    ├── middleware/         # Session protect, rate limiters, file uploads
    ├── models/             # Mongoose Schemas (User, Orders, Trades, Portfolio)
    ├── routes/             # API routes routing mappings
    ├── services/           # Decoupled domain business services (Microservice-ready)
    ├── utils/              # PDF statement generators, brokerage calculators
    ├── uploads/            # Local document vaults
    ├── reports/            # Compiled Statement PDFs
    └── server.js           # Server runner
```

---

## Getting Started

### Prerequisites
* **Node.js** (v16+)
* **MongoDB** (Local daemon running on `27017` or MongoDB Atlas URI)

### Setup & Installation

1. Clone or copy project directory structure:
   ```bash
   cd TradeArena
   ```

2. Setup Backend configurations:
   Create a `.env` file in the `server/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/tradearena
   JWT_SECRET=tradearena_super_secret_access_key_2026
   JWT_REFRESH_SECRET=tradearena_super_secret_refresh_key_2026
   TRADING_MODE=PAPER
   MARKET_SESSION_MODE=ALWAYS_OPEN
   ```

3. Launch Server:
   ```bash
   cd server
   npm install
   npm run dev
   ```

4. Launch Client React:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## API Endpoints List

### Authentication `/api/auth`
* `POST /register` - SignUp user, sends codes
* `POST /login` - Sign in, returns JWTs
* `POST /verify-email` - Validate email verification code
* `POST /verify-mobile` - Validate mobile OTP code
* `POST /forgot-password` - Requests reset code
* `POST /reset-password` - Resets password using valid code

### Market `/api/market`
* `GET /stocks` - Lists stock master list with LTP quotes
* `GET /stocks/:symbol` - Retrieves specific stock information
* `GET /session` - Dynamic session schedules status (Open/Closed)

### Orders `/api/orders`
* `POST /` - Places market, limit, or stop-loss orders
* `PUT /:id` - Modifies active order ticket
* `DELETE /:id` - Cancels pending order
* `GET /` - Retrieves user order lists
* `GET /history/trades` - Retrieves executed trades list

### Portfolios `/api/portfolio`
* `GET /summary` - valuation totals, costs, day's gains, holdings, and active positions
* `GET /analytics` - CAGR returns, Win/Loss ratios, profit factor logs, and equity curve logs

### Wallet `/api/wallet`
* `POST /deposit` - Simulate funds credit
* `POST /withdraw` - Simulate funds debit
* `GET /ledger` - Audit transaction ledger history
* `GET /summary` - Today's ledger summary

### Reports `/api/reports`
* `GET /` - List PDF statement metadata history
* `GET /download/:fileName` - Secure statement download (prevents IDOR)

### Admin `/api/admin`
* `GET /metrics` - Platform stats (active users, virtual fees, system volumes)
* `GET /kyc` - Lists pending KYC profiles review queue
* `POST /kyc/:id/review` - Approves / Rejects KYC submissions
* `POST /ipos` - Launches new virtual IPOs
* `POST /ipos/:id/allot` - Triggers allotment bids calculation
* `POST /trigger-eod` - Manually fires EOD report statements compilation
