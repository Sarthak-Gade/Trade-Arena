# TradeArena — Full Bug Audit Report

> Compared against Groww, Zerodha Kite, and Upstox web apps.

---

## 🔴 CRITICAL Bugs (App-Breaking)

### BUG-01 · Stock model missing `indices` field → `index` in DB
**File:** `server/models/Stock.js`  
**Root Cause:** `initialStocks` seeds with `indices: [...]` but the Mongoose schema has no `indices` field defined. MongoDB silently drops unknown fields (strict mode). The `getIndexStocks` filter on the client works from the local hardcoded map, so it works — but any DB query for `{ indices: { $in: ['NIFTY 50'] } }` will return nothing.  
**Fix:** Add `indices` field to the Stock schema.

---

### BUG-02 · `executeTrade` BUY logic: `originalHolding` === `holding` (double-fetch same document)
**File:** `server/services/orderService.js` · Lines 384–408  
**Root Cause:** On a BUY, the code checks `if (holding)` then fetches `originalHolding = await Holding.findOne(...)` — this is the *same* document. In the `else` branch inside `if (holding)`, it creates a new holding even though `holding` was non-null. This means if you already own a stock, a new Holding document is created instead of updating the existing one — resulting in **duplicate holdings** in the DB.  
**Fix:** Remove the inner re-fetch of `originalHolding`; use `holding` directly.

---

### BUG-03 · `cancelOrder` for SELL: restores holding at `currentPrice` instead of original `averageBuyPrice`
**File:** `server/services/orderService.js` · Lines 293–300  
**Root Cause:** When cancelling a sell order, if the holding was deleted (quantity hit 0), a *new* holding is created with `averageBuyPrice: currentPrice` (current market price) instead of the actual historical buy price. This corrupts P&L permanently.  
**Fix:** Store the `averageBuyPrice` in the Order document or look it up from Trade history.

---

### BUG-04 · `syncRealPrices` creates a new `NseIndia()` instance on *every* 60-second tick
**File:** `server/services/marketDataService.js` — `syncRealPrices()`  
**Root Cause:** Inside the `for` loop over each index, `new NseIndia()` is instantiated 6 times per sync run, each establishing its own cookie session. NSE will rate-limit/block these parallel sessions quickly.  
**Fix:** Create the `NseIndia` instance **once** outside the loop and reuse it.

---

## 🟠 HIGH Bugs (Wrong Behavior / Data Loss)

### BUG-05 · Hammer pattern detection logic is inverted
**File:** `client/src/pages/Terminal.jsx` · Line 592  
```js
// Current code — always FALSE because !isGreenC === false is constant:
else if (lowerWick > bodySize * 2.5 && upperWick < bodySize * 0.5 && !isGreenC === false)
```
`!isGreenC === false` evaluates to `(!isGreenC) === false` → `isGreenC === true` which is always checking green candles. But `!== false` is equivalent to a no-op filter. The real intent was probably `!isGreenC` (bearish candle is NOT a requirement for Hammer). The condition is a precedence bug.  
**Fix:** Remove the third condition entirely, or change to `&& lowerWick > 0`.

---

### BUG-06 · Histogram chart bars drawn to hardcoded y=180, not the chart baseline
**File:** `client/src/pages/Terminal.jsx` · Line 497  
```js
height={Math.max(180 - y, 1)}  // ❌ 180 is not the baseline — baseline is getY(minPrice) ≈ 170
```
All histogram bars are drawn from their top to pixel 180, which makes every bar the wrong height. Bars should go from the candle top down to the chart's bottom baseline (170px in the coordinate system).  
**Fix:** `height={Math.max(getY(minPrice) - y, 1)}` where `minPrice` is the chart's min.

---

### BUG-07 · Order ticket charges display: field name mismatch (`stamp` vs `stampDuty`)
**File:** `client/src/pages/Terminal.jsx` · Line 983  
```js
charges.stamp ?? 0  // ❌ estimateCharges() returns { stampDuty, ... } not { stamp }
```
`charges.stamp` is always `undefined`, so stamp duty always shows ₹0.00.  
**Fix:** Change to `charges.stampDuty ?? 0`.

---

### BUG-08 · Limit/Stop-Loss price field not pre-filled with current LTP
**File:** `client/src/pages/Terminal.jsx`  
**Root Cause:** When switching to `limit` or `stop_loss` order type, the price input starts at `0`. Real apps (Zerodha, Groww) auto-fill the current LTP. A user must manually type the price, and accidentally submitting at ₹0 would corrupt data.  
**Fix:** Add a `useEffect` that sets `price` and `triggerPrice` to `currentPrice` when order type changes to limit/stop_loss.

---

### BUG-09 · Open Orders not refreshed after socket `order-executed` event
**File:** `client/src/pages/Terminal.jsx`  
**Root Cause:** The socket context fires `order-executed` but Terminal.jsx only calls `fetchOpenOrders()` after the user *submits* a new order. If an existing limit order gets executed by the price engine, the Open Orders table still shows it as "pending" until the user manually refreshes or places another order.  
**Fix:** Listen to `order-executed` socket event in Terminal and call `fetchOpenOrders()` + `fetchTradeLogs()`.

---

## 🟡 MEDIUM Bugs (Missing Features / UX Issues)

### BUG-10 · Stock model missing `indices` field in Mongoose schema
**File:** `server/models/Stock.js`  
The `indices` array (which index the stock belongs to) is seeded into MongoDB but not defined in the schema. Strict mode drops it silently. Add `indices: [{ type: String }]` to the schema.

---

### BUG-11 · No 52-week High/Low displayed on Terminal stock header
**Comparison:** Every real trading app (Groww, Zerodha, Upstox) shows 52W H/L prominently next to the LTP.  
**Root Cause:** The stock header only shows LTP, Prev Close, Day High, Day Low — no 52W data.  
**Fix:** Add 52W High/Low fields to the stock seed data and display them in the Terminal header.

---

### BUG-12 · `openOrders` API query only fetches `?status=pending` — misses `queued` orders
**File:** `client/src/pages/Terminal.jsx` · Line 108  
```js
api.get('/orders?status=pending')  // misses 'queued' orders
```
Limit orders placed when market is closed are saved as `queued`, not `pending`. These never show in the Open Orders tab.  
**Fix:** `api.get('/orders?status=pending,queued')` or `/orders?status[]=pending&status[]=queued`.

---

### BUG-13 · Trade History table capped at 10 entries with no pagination
**File:** `client/src/pages/Terminal.jsx` · Line 829  
`tradeHistory.slice(0, 10)` — only shows 10 trades with no "Load More" or pagination.

---

### BUG-14 · Search results dropdown `position: absolute` overlaps fixed elements
**File:** `client/src/pages/Terminal.jsx` · Line 238  
The search results popup uses `absolute left-4 top-16` without a `relative` parent at the correct scope. On small screens or when the sidebar is visible, it renders in the wrong position.  
**Fix:** Wrap the search section in `relative` and use `top-full` instead of hardcoded `top-16`.

---

### BUG-15 · Wallet Balance in Navbar uses stale Redux `auth.user.walletBalance` not live socket-updated value
**File:** `client/src/components/Navbar.jsx` (assumed)  
**Root Cause:** `updateWalletBalance` is dispatched to `authSlice`, but if Navbar reads `user.walletBalance` instead of the updated slice value, it shows stale data after a trade.

---

### BUG-16 · `indices` field in `initialStocks` clashes with Stock schema's `index` field (old code)
**Root Cause:** Old DB records have `index: [...]` (no 's'). New seeded records use `indices: [...]`. Both coexist in MongoDB, causing schema inconsistency. DB must be migrated or the schema/seed must be standardized.

---

## 🔵 LOW / UX Polish Issues

### BUG-17 · `MM` symbol displayed instead of `M&M` (Mahindra & Mahindra)
In the watchlist and terminal, the stock shows as `MM` which is confusing. Real apps always show `M&M`.

### BUG-18 · No market depth / Level 2 data (bid/ask spread)
Real terminals (Zerodha, Upstox) show bid/ask prices. TradeArena has no bid-ask simulation.

### BUG-19 · P&L in Dashboard "Equity Curve Growth" chart does not reflect real trades
The chart is hardcoded/simulated, not driven by real trade execution events.

### BUG-20 · KYC blocks ALL trading — real platforms allow limited trading with pending KYC
The `placeOrder` throws error if `kycStatus !== 'approved'`. In paper trading context, KYC should not block trades.

---

## Priority Fix Order
1. BUG-02 (duplicate holdings on buy) — data corruption
2. BUG-04 (NseIndia instance leak) — API blocking
3. BUG-07 (stamp duty always ₹0) — wrong charges display
4. BUG-05 (hammer pattern inverted) — wrong signals
5. BUG-06 (histogram wrong height) — broken chart
6. BUG-08 (limit price not pre-filled) — UX regression vs real apps
7. BUG-09 (open orders stale after execution) — stale data
8. BUG-12 (queued orders not shown) — missing orders
9. BUG-10/BUG-16 (schema mismatch) — silent data drop
10. BUG-20 (KYC blocks paper trading) — frustrating UX
