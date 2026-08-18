const Stock = require('../models/Stock');
const { calculateCharges } = require('../utils/calculations');

// Global refs
let ioInstance = null;
let simulatorIntervalId = null;

// Real index values fetched from NSE (null = not yet fetched, use calculated fallback)
let realIndexValues = {};

// ─── Symbol Mapping ────────────────────────────────────────────────────────────
// NSE uses "M&M" but we store "MM" in DB to avoid URL-encoding issues.
const NSE_TO_DB = { 'M&M': 'MM', 'BAJAJ-AUTO': 'BAJAJ-AUTO' };
const DB_TO_NSE = { 'MM': 'M&M' };
const toNseSym = (s) => DB_TO_NSE[s] || s;

// ─── Full Stock Master (70+ stocks) ────────────────────────────────────────────
// Prices are realistic approximate values as of June 2025.
// They will be overwritten by real NSE data within 60 seconds of server start.
const initialStocks = [
  // ============= NIFTY 50 =============
  { symbol: 'RELIANCE',   companyName: 'Reliance Industries Ltd.',                exchange: 'NSE', isin: 'INE002A01018', sector: 'Energy',          industry: 'Oil & Gas',             indices: ['NIFTY 50','SENSEX'],                              marketCap: 1750000, currentPrice: 1414.00,  prevClose: 1410.00 },
  { symbol: 'TCS',        companyName: 'Tata Consultancy Services Ltd.',           exchange: 'NSE', isin: 'INE467B01029', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY 50','NIFTY IT','SENSEX'],                   marketCap: 1250000, currentPrice: 3520.00,  prevClose: 3510.00 },
  { symbol: 'HDFCBANK',   companyName: 'HDFC Bank Ltd.',                           exchange: 'NSE', isin: 'INE040A01034', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY 50','NIFTY BANK','SENSEX'],                 marketCap: 1100000, currentPrice: 1720.00,  prevClose: 1715.00 },
  { symbol: 'INFY',       companyName: 'Infosys Ltd.',                             exchange: 'NSE', isin: 'INE009A01021', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY 50','NIFTY IT','SENSEX'],                   marketCap:  650000, currentPrice: 1543.00,  prevClose: 1540.00 },
  { symbol: 'ICICIBANK',  companyName: 'ICICI Bank Ltd.',                          exchange: 'NSE', isin: 'INE090A01021', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY 50','NIFTY BANK','SENSEX'],                 marketCap:  700000, currentPrice: 1398.00,  prevClose: 1390.00 },
  { symbol: 'HINDUNILVR', companyName: 'Hindustan Unilever Ltd.',                  exchange: 'NSE', isin: 'INE030A01027', sector: 'Consumer Goods',   industry: 'FMCG',                  indices: ['NIFTY 50','SENSEX'],                              marketCap:  610000, currentPrice: 2420.00,  prevClose: 2435.00 },
  { symbol: 'ITC',        companyName: 'ITC Ltd.',                                 exchange: 'NSE', isin: 'INE154A01025', sector: 'Consumer Goods',   industry: 'FMCG',                  indices: ['NIFTY 50','SENSEX'],                              marketCap:  540000, currentPrice:  456.00,  prevClose:  454.00 },
  { symbol: 'BHARTIARTL', companyName: 'Bharti Airtel Ltd.',                       exchange: 'NSE', isin: 'INE397D01024', sector: 'Telecom',          industry: 'Telecommunication',     indices: ['NIFTY 50','SENSEX'],                              marketCap:  480000, currentPrice: 1857.00,  prevClose: 1850.00 },
  { symbol: 'LT',         companyName: 'Larsen & Toubro Ltd.',                     exchange: 'NSE', isin: 'INE018A01030', sector: 'Construction',     industry: 'Engineering',           indices: ['NIFTY 50','SENSEX'],                              marketCap:  380000, currentPrice: 3612.00,  prevClose: 3620.00 },
  { symbol: 'AXISBANK',   companyName: 'Axis Bank Ltd.',                           exchange: 'NSE', isin: 'INE238A01034', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY 50','NIFTY BANK','NIFTY FINANCIAL SERVICES'], marketCap: 290000, currentPrice: 1118.00,  prevClose: 1112.00 },
  { symbol: 'KOTAKBANK',  companyName: 'Kotak Mahindra Bank Ltd.',                 exchange: 'NSE', isin: 'INE237A01028', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY 50','NIFTY BANK','NIFTY FINANCIAL SERVICES'], marketCap: 380000, currentPrice: 2092.00,  prevClose: 2085.00 },
  { symbol: 'SBIN',       companyName: 'State Bank of India',                      exchange: 'NSE', isin: 'INE062A01020', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY 50','NIFTY BANK','SENSEX'],                 marketCap:  520000, currentPrice:  822.00,  prevClose:  815.00 },
  { symbol: 'BAJFINANCE', companyName: 'Bajaj Finance Ltd.',                       exchange: 'NSE', isin: 'INE296A01024', sector: 'Finance',          industry: 'NBFC',                  indices: ['NIFTY 50','NIFTY FINANCIAL SERVICES'],            marketCap:  450000, currentPrice: 8950.00,  prevClose: 8920.00 },
  { symbol: 'WIPRO',      companyName: 'Wipro Ltd.',                               exchange: 'NSE', isin: 'INE075A01022', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY 50','NIFTY IT'],                            marketCap:  220000, currentPrice:  273.00,  prevClose:  271.00 },
  { symbol: 'HCLTECH',    companyName: 'HCL Technologies Ltd.',                    exchange: 'NSE', isin: 'INE860A01027', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY 50','NIFTY IT'],                            marketCap:  310000, currentPrice: 1672.00,  prevClose: 1680.00 },
  { symbol: 'SUNPHARMA',  companyName: 'Sun Pharmaceutical Industries Ltd.',       exchange: 'NSE', isin: 'INE044A01045', sector: 'Healthcare',       industry: 'Pharmaceuticals',       indices: ['NIFTY 50','NIFTY PHARMA'],                        marketCap:  240000, currentPrice: 1780.00,  prevClose: 1770.00 },
  { symbol: 'MARUTI',     companyName: 'Maruti Suzuki India Ltd.',                 exchange: 'NSE', isin: 'INE585B01010', sector: 'Automobile',       industry: 'Passenger Cars',        indices: ['NIFTY 50'],                                       marketCap:  280000, currentPrice: 12450.00, prevClose: 12380.00 },
  { symbol: 'TATAMOTORS', companyName: 'Tata Motors Ltd.',                         exchange: 'NSE', isin: 'INE155A01022', sector: 'Automobile',       industry: 'Commercial Vehicles',   indices: ['NIFTY 50','SENSEX'],                              marketCap:  210000, currentPrice:  741.00,  prevClose:  745.00 },
  { symbol: 'MM',         companyName: 'Mahindra & Mahindra Ltd.',                 exchange: 'NSE', isin: 'INE101A01026', sector: 'Automobile',       industry: 'Utility Vehicles',      indices: ['NIFTY 50','SENSEX'],                              marketCap:  170000, currentPrice: 3120.00,  prevClose: 3100.00 },
  { symbol: 'NTPC',       companyName: 'NTPC Ltd.',                                exchange: 'NSE', isin: 'INE733E01010', sector: 'Energy',           industry: 'Power Generation',      indices: ['NIFTY 50','SENSEX'],                              marketCap:  180000, currentPrice:  360.00,  prevClose:  358.00 },
  { symbol: 'POWERGRID',  companyName: 'Power Grid Corporation of India Ltd.',     exchange: 'NSE', isin: 'INE752E01010', sector: 'Energy',           industry: 'Power Transmission',    indices: ['NIFTY 50'],                                       marketCap:  160000, currentPrice:  311.00,  prevClose:  308.00 },
  { symbol: 'COALINDIA',  companyName: 'Coal India Ltd.',                          exchange: 'NSE', isin: 'INE522F01014', sector: 'Energy',           industry: 'Coal Mining',           indices: ['NIFTY 50'],                                       marketCap:  140000, currentPrice:  395.00,  prevClose:  398.00 },
  { symbol: 'ONGC',       companyName: 'Oil and Natural Gas Corporation Ltd.',     exchange: 'NSE', isin: 'INE213A01029', sector: 'Energy',           industry: 'Oil & Gas',             indices: ['NIFTY 50','SENSEX'],                              marketCap:  300000, currentPrice:  261.00,  prevClose:  259.00 },
  { symbol: 'BPCL',       companyName: 'Bharat Petroleum Corporation Ltd.',        exchange: 'NSE', isin: 'INE029A01011', sector: 'Energy',           industry: 'Petroleum Products',    indices: ['NIFTY 50'],                                       marketCap:  140000, currentPrice:  308.00,  prevClose:  305.00 },
  { symbol: 'ADANIENT',   companyName: 'Adani Enterprises Ltd.',                   exchange: 'NSE', isin: 'INE423A01024', sector: 'Conglomerate',     industry: 'Diversified',           indices: ['NIFTY 50'],                                       marketCap:  280000, currentPrice: 2419.00,  prevClose: 2380.00 },
  { symbol: 'ADANIPORTS', companyName: 'Adani Ports and Special Economic Zone Ltd.', exchange: 'NSE', isin: 'INE742F01042', sector: 'Infrastructure', industry: 'Ports',              indices: ['NIFTY 50','SENSEX'],                              marketCap:  250000, currentPrice: 1298.00,  prevClose: 1285.00 },
  { symbol: 'GRASIM',     companyName: 'Grasim Industries Ltd.',                   exchange: 'NSE', isin: 'INE047A01021', sector: 'Materials',        industry: 'Cement & Chemicals',    indices: ['NIFTY 50','SENSEX'],                              marketCap:  190000, currentPrice: 2780.00,  prevClose: 2760.00 },
  { symbol: 'TATASTEEL',  companyName: 'Tata Steel Ltd.',                          exchange: 'NSE', isin: 'INE081A01020', sector: 'Materials',        industry: 'Steel',                 indices: ['NIFTY 50','SENSEX'],                              marketCap:  200000, currentPrice:  168.00,  prevClose:  165.00 },
  { symbol: 'JSWSTEEL',   companyName: 'JSW Steel Ltd.',                           exchange: 'NSE', isin: 'INE019A01038', sector: 'Materials',        industry: 'Steel',                 indices: ['NIFTY 50'],                                       marketCap:  180000, currentPrice:  998.00,  prevClose:  992.00 },
  { symbol: 'HINDALCO',   companyName: 'Hindalco Industries Ltd.',                 exchange: 'NSE', isin: 'INE038A01020', sector: 'Materials',        industry: 'Aluminium',             indices: ['NIFTY 50','SENSEX'],                              marketCap:  140000, currentPrice:  682.00,  prevClose:  675.00 },
  { symbol: 'ULTRACEMCO', companyName: 'UltraTech Cement Ltd.',                    exchange: 'NSE', isin: 'INE481G01011', sector: 'Materials',        industry: 'Cement',                indices: ['NIFTY 50','SENSEX'],                              marketCap:  300000, currentPrice: 11520.00, prevClose: 11480.00 },
  { symbol: 'ASIANPAINT', companyName: 'Asian Paints Ltd.',                        exchange: 'NSE', isin: 'INE021A01026', sector: 'Consumer Goods',   industry: 'Paints',                indices: ['NIFTY 50','SENSEX'],                              marketCap:  200000, currentPrice: 2290.00,  prevClose: 2310.00 },
  { symbol: 'TITAN',      companyName: 'Titan Company Ltd.',                       exchange: 'NSE', isin: 'INE280A01028', sector: 'Consumer Goods',   industry: 'Watches & Jewellery',   indices: ['NIFTY 50','SENSEX'],                              marketCap:  280000, currentPrice: 3418.00,  prevClose: 3395.00 },
  { symbol: 'EICHERMOT',  companyName: 'Eicher Motors Ltd.',                       exchange: 'NSE', isin: 'INE066A01021', sector: 'Automobile',       industry: 'Motorcycles',           indices: ['NIFTY 50'],                                       marketCap:  120000, currentPrice: 5512.00,  prevClose: 5480.00 },
  { symbol: 'HEROMOTOCO', companyName: 'Hero MotoCorp Ltd.',                       exchange: 'NSE', isin: 'INE158A01026', sector: 'Automobile',       industry: 'Motorcycles',           indices: ['NIFTY 50'],                                       marketCap:   80000, currentPrice: 4215.00,  prevClose: 4185.00 },
  { symbol: 'BAJAJ-AUTO', companyName: 'Bajaj Auto Ltd.',                          exchange: 'NSE', isin: 'INE917I01010', sector: 'Automobile',       industry: 'Two Wheelers',          indices: ['NIFTY 50'],                                       marketCap:  250000, currentPrice: 9180.00,  prevClose: 9120.00 },
  { symbol: 'DIVISLAB',   companyName: "Divi's Laboratories Ltd.",                 exchange: 'NSE', isin: 'INE361B01024', sector: 'Healthcare',       industry: 'Pharmaceuticals',       indices: ['NIFTY 50','NIFTY PHARMA'],                        marketCap:   90000, currentPrice: 5180.00,  prevClose: 5150.00 },
  { symbol: 'CIPLA',      companyName: 'Cipla Ltd.',                               exchange: 'NSE', isin: 'INE059A01026', sector: 'Healthcare',       industry: 'Pharmaceuticals',       indices: ['NIFTY 50','NIFTY PHARMA'],                        marketCap:   85000, currentPrice: 1508.00,  prevClose: 1492.00 },
  { symbol: 'DRREDDY',    companyName: "Dr. Reddy's Laboratories Ltd.",            exchange: 'NSE', isin: 'INE089A01023', sector: 'Healthcare',       industry: 'Pharmaceuticals',       indices: ['NIFTY 50','NIFTY PHARMA'],                        marketCap:   82000, currentPrice: 6235.00,  prevClose: 6210.00 },
  { symbol: 'APOLLOHOSP', companyName: 'Apollo Hospitals Enterprise Ltd.',         exchange: 'NSE', isin: 'INE437A01024', sector: 'Healthcare',       industry: 'Hospitals',             indices: ['NIFTY 50','NIFTY PHARMA'],                        marketCap:  100000, currentPrice: 7195.00,  prevClose: 7120.00 },
  { symbol: 'NESTLEIND',  companyName: 'Nestle India Ltd.',                        exchange: 'NSE', isin: 'INE239A01016', sector: 'Consumer Goods',   industry: 'Food Products',         indices: ['NIFTY 50'],                                       marketCap:  200000, currentPrice: 2215.00,  prevClose: 2195.00 },
  { symbol: 'BRITANNIA',  companyName: 'Britannia Industries Ltd.',                exchange: 'NSE', isin: 'INE216A01030', sector: 'Consumer Goods',   industry: 'Food Products',         indices: ['NIFTY 50'],                                       marketCap:  110000, currentPrice: 5380.00,  prevClose: 5350.00 },
  { symbol: 'TATACONSUM', companyName: 'Tata Consumer Products Ltd.',              exchange: 'NSE', isin: 'INE192A01025', sector: 'Consumer Goods',   industry: 'Beverages',             indices: ['NIFTY 50'],                                       marketCap:  100000, currentPrice: 1085.00,  prevClose: 1078.00 },
  { symbol: 'BAJAJFINSV', companyName: 'Bajaj Finserv Ltd.',                       exchange: 'NSE', isin: 'INE918I01026', sector: 'Finance',          industry: 'Financial Services',    indices: ['NIFTY 50','NIFTY FINANCIAL SERVICES'],            marketCap:  290000, currentPrice: 1915.00,  prevClose: 1898.00 },
  { symbol: 'HDFCLIFE',   companyName: 'HDFC Life Insurance Company Ltd.',         exchange: 'NSE', isin: 'INE795G01014', sector: 'Finance',          industry: 'Insurance',             indices: ['NIFTY 50','NIFTY FINANCIAL SERVICES'],            marketCap:  150000, currentPrice:  762.00,  prevClose:  756.00 },
  { symbol: 'SBILIFE',    companyName: 'SBI Life Insurance Company Ltd.',          exchange: 'NSE', isin: 'INE123W01016', sector: 'Finance',          industry: 'Insurance',             indices: ['NIFTY 50','NIFTY FINANCIAL SERVICES'],            marketCap:  170000, currentPrice: 1695.00,  prevClose: 1680.00 },
  { symbol: 'INDUSINDBK', companyName: 'IndusInd Bank Ltd.',                       exchange: 'NSE', isin: 'INE095A01012', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY 50','NIFTY BANK','NIFTY FINANCIAL SERVICES'], marketCap: 55000, currentPrice:  851.00,  prevClose:  840.00 },
  { symbol: 'TECHM',      companyName: 'Tech Mahindra Ltd.',                       exchange: 'NSE', isin: 'INE669C01036', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY 50','NIFTY IT'],                            marketCap:  130000, currentPrice: 1698.00,  prevClose: 1685.00 },
  { symbol: 'ZOMATO',     companyName: 'Zomato Ltd.',                              exchange: 'NSE', isin: 'INE758T01015', sector: 'Technology',       industry: 'Internet Retail',       indices: ['NIFTY 50'],                                       marketCap:  200000, currentPrice:  248.00,  prevClose:  243.00 },
  { symbol: 'TRENT',      companyName: 'Trent Ltd.',                               exchange: 'NSE', isin: 'INE849A01020', sector: 'Consumer Goods',   industry: 'Retail',                indices: ['NIFTY 50'],                                       marketCap:  220000, currentPrice: 6512.00,  prevClose: 6445.00 },

  // ============= NIFTY BANK (additional, not in Nifty 50) =============
  { symbol: 'BANKBARODA', companyName: 'Bank of Baroda',                           exchange: 'NSE', isin: 'INE028A01039', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY BANK','NIFTY NEXT 50'],                     marketCap:   80000, currentPrice:  228.00,  prevClose:  225.00 },
  { symbol: 'PNB',        companyName: 'Punjab National Bank',                     exchange: 'NSE', isin: 'INE160A01022', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY BANK','NIFTY NEXT 50'],                     marketCap:   75000, currentPrice:  105.00,  prevClose:  103.00 },
  { symbol: 'AUBANK',     companyName: 'AU Small Finance Bank Ltd.',               exchange: 'NSE', isin: 'INE949L01017', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY BANK','NIFTY FINANCIAL SERVICES'],          marketCap:   40000, currentPrice:  698.00,  prevClose:  692.00 },
  { symbol: 'BANDHANBNK', companyName: 'Bandhan Bank Ltd.',                        exchange: 'NSE', isin: 'INE545U01014', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY BANK'],                                     marketCap:   25000, currentPrice:  155.00,  prevClose:  152.00 },
  { symbol: 'FEDERALBNK', companyName: 'The Federal Bank Ltd.',                    exchange: 'NSE', isin: 'INE171A01029', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY BANK'],                                     marketCap:   32000, currentPrice:  195.00,  prevClose:  192.00 },
  { symbol: 'IDFCFIRSTB', companyName: 'IDFC First Bank Ltd.',                     exchange: 'NSE', isin: 'INE092T01019', sector: 'Finance',          industry: 'Banking',               indices: ['NIFTY BANK'],                                     marketCap:   35000, currentPrice:   65.00,  prevClose:   63.50 },

  // ============= NIFTY IT (additional) =============
  { symbol: 'MPHASIS',    companyName: 'Mphasis Ltd.',                             exchange: 'NSE', isin: 'INE356A01018', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY IT'],                                       marketCap:   35000, currentPrice: 2015.00,  prevClose: 2008.00 },
  { symbol: 'LTIM',       companyName: 'LTIMindtree Ltd.',                         exchange: 'NSE', isin: 'INE214T01019', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY IT','NIFTY NEXT 50'],                       marketCap:  120000, currentPrice: 4480.00,  prevClose: 4460.00 },
  { symbol: 'PERSISTENT', companyName: 'Persistent Systems Ltd.',                  exchange: 'NSE', isin: 'INE262H01021', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY IT','NIFTY NEXT 50'],                       marketCap:   80000, currentPrice: 5820.00,  prevClose: 5790.00 },
  { symbol: 'COFORGE',    companyName: 'Coforge Ltd.',                             exchange: 'NSE', isin: 'INE591G01017', sector: 'Technology',       industry: 'IT Services',           indices: ['NIFTY IT'],                                       marketCap:   40000, currentPrice: 6195.00,  prevClose: 6160.00 },

  // ============= NIFTY PHARMA (additional) =============
  { symbol: 'TORNTPHARM', companyName: 'Torrent Pharmaceuticals Ltd.',             exchange: 'NSE', isin: 'INE685A01028', sector: 'Healthcare',       industry: 'Pharmaceuticals',       indices: ['NIFTY PHARMA','NIFTY NEXT 50'],                   marketCap:   88000, currentPrice: 2635.00,  prevClose: 2620.00 },
  { symbol: 'LUPIN',      companyName: 'Lupin Ltd.',                               exchange: 'NSE', isin: 'INE326A01037', sector: 'Healthcare',       industry: 'Pharmaceuticals',       indices: ['NIFTY PHARMA'],                                   marketCap:   82000, currentPrice: 1825.00,  prevClose: 1810.00 },
  { symbol: 'AUROPHARMA', companyName: 'Aurobindo Pharma Ltd.',                    exchange: 'NSE', isin: 'INE406A01037', sector: 'Healthcare',       industry: 'Pharmaceuticals',       indices: ['NIFTY PHARMA'],                                   marketCap:   50000, currentPrice: 1295.00,  prevClose: 1282.00 },
  { symbol: 'ALKEM',      companyName: 'Alkem Laboratories Ltd.',                  exchange: 'NSE', isin: 'INE540L01014', sector: 'Healthcare',       industry: 'Pharmaceuticals',       indices: ['NIFTY PHARMA'],                                   marketCap:   45000, currentPrice: 3750.00,  prevClose: 3720.00 },

  // ============= NIFTY NEXT 50 / Broader Market =============
  { symbol: 'IRCTC',      companyName: 'Indian Railway Catering & Tourism Corp.', exchange: 'NSE', isin: 'INE335Y01020', sector: 'Services',          industry: 'Travel',                indices: ['NIFTY NEXT 50'],                                  marketCap:   65000, currentPrice:  822.00,  prevClose:  815.00 },
  { symbol: 'HAL',        companyName: 'Hindustan Aeronautics Ltd.',               exchange: 'NSE', isin: 'INE066F01020', sector: 'Defence',          industry: 'Aerospace & Defence',   indices: ['NIFTY NEXT 50'],                                  marketCap:  210000, currentPrice: 4428.00,  prevClose: 4390.00 },
  { symbol: 'SIEMENS',    companyName: 'Siemens Ltd.',                             exchange: 'NSE', isin: 'INE003A01024', sector: 'Capital Goods',    industry: 'Electrical Equipment',  indices: ['NIFTY NEXT 50'],                                  marketCap:  115000, currentPrice: 3245.00,  prevClose: 3220.00 },
  { symbol: 'DLF',        companyName: 'DLF Ltd.',                                 exchange: 'NSE', isin: 'INE271C01023', sector: 'Real Estate',      industry: 'Property Development',  indices: ['NIFTY NEXT 50'],                                  marketCap:  180000, currentPrice:  815.00,  prevClose:  808.00 },
  { symbol: 'VEDL',       companyName: 'Vedanta Ltd.',                             exchange: 'NSE', isin: 'INE205A01025', sector: 'Materials',        industry: 'Diversified Metals',    indices: ['NIFTY NEXT 50'],                                  marketCap:  140000, currentPrice:  455.00,  prevClose:  450.00 },

  // ============= BSE-specific =============
  { symbol: 'BSE',        companyName: 'BSE Ltd.',                                 exchange: 'BSE', isin: 'INE118H01025', sector: 'Finance',          industry: 'Financial Exchanges',   indices: ['BSE 100','BSE 200','BSE 500'],                     marketCap:    8000, currentPrice: 5180.00,  prevClose: 5120.00 },
  { symbol: 'CDSL',       companyName: 'Central Depository Services India Ltd.',   exchange: 'BSE', isin: 'INE736A01011', sector: 'Finance',          industry: 'Financial Depositories', indices: ['BSE 100','BSE 200','BSE 500'],                    marketCap:   12000, currentPrice: 1195.00,  prevClose: 1180.00 },
  { symbol: 'PAYTM',      companyName: 'One97 Communications Ltd. (Paytm)',        exchange: 'NSE', isin: 'INE982J01013', sector: 'Technology',       industry: 'Fintech',               indices: ['BSE 500'],                                        marketCap:   28000, currentPrice:  815.00,  prevClose:  808.00 },
  { symbol: 'NYKAA',      companyName: 'FSN E-Commerce Ventures Ltd. (Nykaa)',     exchange: 'NSE', isin: 'INE388Y01029', sector: 'Consumer Goods',   industry: 'E-commerce',            indices: ['BSE 500'],                                        marketCap:   32000, currentPrice:  152.00,  prevClose:  148.00 },
];

// ─── Explicit Nifty 50 symbol list for Dashboard modal ─────────────────────────
// Used by clients to filter exactly the right stocks per index.
const INDEX_CONSTITUENTS = {
  'NIFTY 50': ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','BHARTIARTL','LT','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','WIPRO','HCLTECH','SUNPHARMA','MARUTI','TATAMOTORS','MM','NTPC','POWERGRID','COALINDIA','ONGC','BPCL','ADANIENT','ADANIPORTS','GRASIM','TATASTEEL','JSWSTEEL','HINDALCO','ULTRACEMCO','ASIANPAINT','TITAN','EICHERMOT','HEROMOTOCO','BAJAJ-AUTO','DIVISLAB','CIPLA','DRREDDY','APOLLOHOSP','NESTLEIND','BRITANNIA','TATACONSUM','BAJAJFINSV','HDFCLIFE','SBILIFE','INDUSINDBK','TECHM','ZOMATO','TRENT'],
  'NIFTY NEXT 50': ['BANKBARODA','PNB','AUBANK','IRCTC','HAL','SIEMENS','DLF','VEDL','LTIM','PERSISTENT','TORNTPHARM','MPHASIS','COFORGE'],
  'NIFTY BANK': ['HDFCBANK','ICICIBANK','AXISBANK','KOTAKBANK','SBIN','INDUSINDBK','BANKBARODA','PNB','AUBANK','BANDHANBNK','FEDERALBNK','IDFCFIRSTB'],
  'NIFTY IT': ['TCS','INFY','WIPRO','HCLTECH','TECHM','MPHASIS','LTIM','PERSISTENT','COFORGE'],
  'NIFTY PHARMA': ['SUNPHARMA','DIVISLAB','CIPLA','DRREDDY','APOLLOHOSP','TORNTPHARM','LUPIN','AUROPHARMA','ALKEM'],
  'NIFTY FINANCIAL SERVICES': ['HDFCBANK','ICICIBANK','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','BAJAJFINSV','HDFCLIFE','SBILIFE','INDUSINDBK','AUBANK'],
  'SENSEX': ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','BHARTIARTL','LT','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','WIPRO','HCLTECH','SUNPHARMA','MARUTI','TATAMOTORS','MM','NTPC','ONGC','ADANIPORTS','GRASIM','TATASTEEL','HINDALCO','ULTRACEMCO','ASIANPAINT','TITAN','NESTLEIND','TITAN'],
  'BSE 100': ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','BHARTIARTL','LT','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','WIPRO','HCLTECH','SUNPHARMA','MARUTI','TATAMOTORS','NTPC','BSE','CDSL'],
  'BSE 200': ['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','ITC','BHARTIARTL','LT','AXISBANK','KOTAKBANK','SBIN','BAJFINANCE','WIPRO','HCLTECH','SUNPHARMA','MARUTI','TATAMOTORS','NTPC','BSE','CDSL','PAYTM','NYKAA','DLF'],
  'BSE 500': initialStocks.map(s => s.symbol), // all stocks
};

// ─── Market Session ────────────────────────────────────────────────────────────
const getMarketSessionStatus = () => {
  const mode = process.env.MARKET_SESSION_MODE || 'ALWAYS_OPEN';
  if (mode === 'ALWAYS_OPEN') return 'OPEN';

  const now = new Date();
  const opts = { timeZone: 'Asia/Kolkata', hour12: false };
  const istStr = now.toLocaleString('en-US', opts);
  const [h, m] = istStr.split(', ')[1].split(':').map(Number);
  const day = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
  if (day === 0 || day === 6) return 'CLOSED';
  const mins = h * 60 + m;
  if (mins >= 9 * 60 && mins < 9 * 60 + 15) return 'PRE_MARKET';
  if (mins >= 9 * 60 + 15 && mins < 15 * 60 + 30) return 'OPEN';
  return 'CLOSED';
};

// ─── Seeder ────────────────────────────────────────────────────────────────────
const seedStocks = async () => {
  try {
    const existing = new Set((await Stock.find({}, 'symbol').lean()).map(s => s.symbol));
    const toAdd = initialStocks
      .filter(s => !existing.has(s.symbol))
      .map(s => ({
        ...s,
        openPrice: s.currentPrice,
        highPrice: s.currentPrice,
        lowPrice: s.currentPrice * 0.995,
        volume: Math.floor(Math.random() * 800000) + 200000,
      }));

    if (toAdd.length === 0) {
      console.log(`Stock DB ready: ${existing.size} stocks already in database.`);
      return;
    }

    // ordered:false = skip duplicates (ISIN collision) and continue
    await Stock.insertMany(toAdd, { ordered: false }).catch(err => {
      if (err.code !== 11000) throw err; // only ignore duplicate key errors
    });
    console.log(`Seeded ${toAdd.length} new stocks. Total: ${existing.size + toAdd.length}`);
  } catch (err) {
    console.error('Error seeding stocks:', err.message);
  }
};

// ─── Real Price Sync from NSE ──────────────────────────────────────────────────
const INDICES_TO_SYNC = [
  'NIFTY 50',
  'NIFTY BANK',
  'NIFTY IT',
  'NIFTY PHARMA',
  'NIFTY NEXT 50',
  'NIFTY FINANCIAL SERVICES',
];

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const syncRealPrices = async () => {
  // Lazy-load NSE package once (ESM from CJS)
  let NseIndia;
  try {
    const mod = await import('stock-nse-india').catch(() => null);
    if (!mod) return;
    NseIndia = mod.NseIndia || mod.default?.NseIndia || mod.default;
    if (!NseIndia) return;
  } catch (e) {
    return;
  }

  // Create ONE shared client instance for this sync run
  const client = new NseIndia();

  const seenSymbols = new Set();
  const bulkOps = [];
  const freshIndexValues = {};
  let totalUpdated = 0;

  for (const indexName of INDICES_TO_SYNC) {
    try {
      await delay(600); // rate limit: 600ms between index calls

      const data = await client.getEquityStockIndices(indexName);
      if (!data) continue;

      // Store real index metadata
      const meta = data.metadata || data.advance || {};
      const last = meta.last || meta.indexValue || 0;
      if (last > 0) {
        freshIndexValues[indexName] = {
          name: indexName,
          value: Math.round(last),
          change: Number((meta.change || 0).toFixed(2)),
          pctChange: Number((meta.percChange || meta.percentChange || 0).toFixed(2))
        };
      }

      // Update each constituent stock's price and 52W H/L
      const rows = data.data || [];
      for (const item of rows) {
        const nseSym = item.symbol;
        if (!nseSym || seenSymbols.has(nseSym)) continue;
        seenSymbols.add(nseSym);

        const ltp = item.lastPrice || item.ltP || 0;
        if (!ltp || ltp <= 0) continue;

        const dbSym = NSE_TO_DB[nseSym] || nseSym;
        bulkOps.push({
          updateOne: {
            filter: { symbol: dbSym },
            update: {
              $set: {
                currentPrice: Number(ltp.toFixed(2)),
                prevClose: Number((item.previousClose || ltp).toFixed(2)),
                openPrice: Number((item.open || ltp).toFixed(2)),
                highPrice: Number((item.dayHigh || ltp).toFixed(2)),
                lowPrice: Number((item.dayLow || ltp).toFixed(2)),
                volume: Number(item.totalTradedVolume || 0),
                // 52-week high/low from NSE
                ...(item.yearHigh ? { week52High: Number(item.yearHigh) } : {}),
                ...(item.yearLow  ? { week52Low:  Number(item.yearLow)  } : {}),
              }
            }
          }
        });
        totalUpdated++;
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('403') || msg.includes('429') || msg.includes('401')) {
        console.warn(`[NSE Sync] Rate limited for "${indexName}" — using last known prices.`);
      } else {
        console.warn(`[NSE Sync] Error for "${indexName}": ${msg.substring(0, 80)}`);
      }
    }
  }



  // Bulk write all price updates
  if (bulkOps.length > 0) {
    try {
      await Stock.bulkWrite(bulkOps, { ordered: false });
      console.log(`[NSE Sync] ✓ Updated ${totalUpdated} stocks with real market prices`);
    } catch (err) {
      console.error('[NSE Sync] Bulk write error:', err.message);
    }
  }

  // Merge fresh index values into stored state
  if (Object.keys(freshIndexValues).length > 0) {
    Object.assign(realIndexValues, freshIndexValues);
    console.log(`[NSE Sync] ✓ Updated ${Object.keys(freshIndexValues).length} real index values`);
  }
};

// ─── Index Calculation ─────────────────────────────────────────────────────────
const calculateIndices = (stocks) => {
  const nseAll  = stocks.filter(s => s.exchange === 'NSE');
  const banking = stocks.filter(s => INDEX_CONSTITUENTS['NIFTY BANK'].includes(s.symbol));
  const it      = stocks.filter(s => INDEX_CONSTITUENTS['NIFTY IT'].includes(s.symbol));
  const pharma  = stocks.filter(s => INDEX_CONSTITUENTS['NIFTY PHARMA'].includes(s.symbol));
  const finSvc  = stocks.filter(s => INDEX_CONSTITUENTS['NIFTY FINANCIAL SERVICES'].includes(s.symbol));
  const nifty50 = stocks.filter(s => INDEX_CONSTITUENTS['NIFTY 50'].includes(s.symbol));
  const next50  = stocks.filter(s => INDEX_CONSTITUENTS['NIFTY NEXT 50'].includes(s.symbol));
  const sensexStocks = stocks.filter(s => INDEX_CONSTITUENTS['SENSEX'].includes(s.symbol));

  // Helper: weighted average price × factor  (fallback if NSE sync not yet run)
  const calc = (list, factor, field = 'currentPrice') => {
    if (!list.length) return 0;
    const sum = list.reduce((a, s) => a + (s[field] || 0), 0);
    return Math.round((sum / list.length) * factor);
  };

  // Use real NSE values when available, else calculate from our stock prices
  const getIdx = (name, list, factor) => {
    if (realIndexValues[name] && realIndexValues[name].value > 0) {
      return realIndexValues[name];
    }
    const val     = calc(list, factor, 'currentPrice');
    const prevVal = calc(list, factor, 'prevClose') || val * 0.99;
    const change  = val - prevVal;
    const pct     = prevVal > 0 ? (change / prevVal) * 100 : 0;
    return { name, value: val, change: Number(change.toFixed(2)), pctChange: Number(pct.toFixed(2)) };
  };

  // Calibrated fallback factors (avg_price × factor ≈ real index value)
  return [
    getIdx('NIFTY 50',                nifty50,     13.5),
    getIdx('NIFTY NEXT 50',           next50,      39.3),
    getIdx('NIFTY BANK',              banking,     43.3),
    getIdx('NIFTY IT',                it,          22.0),
    getIdx('NIFTY PHARMA',            pharma,       9.6),
    getIdx('NIFTY FINANCIAL SERVICES',finSvc,      12.4),
    getIdx('SENSEX',                  sensexStocks, 47.3),
    getIdx('BSE 100',                 nseAll.slice(0, 20), 15.0),
    getIdx('BSE 200',                 nseAll.slice(0, 30), 12.0),
    getIdx('BSE 500',                 stocks,       8.0),
  ];
};

// ─── Price Tick Simulator ──────────────────────────────────────────────────────
// Now uses ±0.05% micro-fluctuations (was ±0.4%) so prices stay near real market values.
const generatePriceTick = async () => {
  if (getMarketSessionStatus() === 'CLOSED') return;

  try {
    const stocks = await Stock.find().lean();
    if (!stocks.length) return;

    const bulkOps = [];
    const updatedStocks = [];

    for (const stock of stocks) {
      // Micro random-walk: ±0.05% per tick (very small, just for smooth UI updates)
      const changePercent = (Math.random() - 0.5) * 0.001;
      const priceDiff = stock.currentPrice * changePercent;
      let newPrice = Number((stock.currentPrice + priceDiff).toFixed(2));
      if (newPrice < 0.5) newPrice = 0.5;

      const newHigh = newPrice > stock.highPrice ? newPrice : stock.highPrice;
      const newLow  = newPrice < stock.lowPrice  ? newPrice : stock.lowPrice;
      const addVol  = Math.floor(Math.random() * 1500) + 100;

      bulkOps.push({
        updateOne: {
          filter: { _id: stock._id },
          update: {
            $set: { currentPrice: newPrice, highPrice: newHigh, lowPrice: newLow },
            $inc: { volume: addVol }
          }
        }
      });

      updatedStocks.push({ ...stock, currentPrice: newPrice, highPrice: newHigh, lowPrice: newLow, volume: (stock.volume || 0) + addVol });
      triggerOrderMatching(stock.symbol, newPrice);
    }

    if (bulkOps.length > 0) {
      await Stock.bulkWrite(bulkOps, { ordered: false });
    }

    if (ioInstance) {
      ioInstance.emit('stock-quotes', updatedStocks);
      const indices = calculateIndices(updatedStocks);
      ioInstance.emit('indices', indices);

      const sorted = [...updatedStocks].map(s => {
        const chg = s.currentPrice - s.prevClose;
        const pct = s.prevClose > 0 ? (chg / s.prevClose) * 100 : 0;
        return { symbol: s.symbol, companyName: s.companyName, price: s.currentPrice, change: Number(chg.toFixed(2)), pctChange: Number(pct.toFixed(2)) };
      });
      ioInstance.emit('market-movers', {
        gainers: [...sorted].sort((a, b) => b.pctChange - a.pctChange).slice(0, 5),
        losers:  [...sorted].sort((a, b) => a.pctChange - b.pctChange).slice(0, 5),
      });
    }
  } catch (err) {
    console.error('Error generating price ticks:', err.message);
  }
};

const triggerOrderMatching = async (symbol, currentPrice) => {
  const executionService = require('./executionService');
  executionService.matchOrdersForStock(symbol, currentPrice);
};

// ─── Initializer ───────────────────────────────────────────────────────────────
const initMarketDataSimulator = async (io) => {
  ioInstance = io;

  await seedStocks();

  if (simulatorIntervalId) clearInterval(simulatorIntervalId);

  // UI tick every 3 seconds (micro-fluctuations for smooth animations)
  simulatorIntervalId = setInterval(generatePriceTick, 3000);

  // Real NSE price sync every 60 seconds
  syncRealPrices(); // run immediately on start
  setInterval(syncRealPrices, 60 * 1000);

  // Market session broadcast every 10 seconds
  setInterval(() => {
    if (ioInstance) {
      ioInstance.emit('market-session', { status: getMarketSessionStatus(), timestamp: new Date() });
    }
  }, 10000);

  console.log('Market Data Simulator initialized (real NSE sync: every 60s, UI ticks: every 3s).');
};

// ─── Seeded PRNG for deterministic history generation ─────────────────────────
const seedRandom = (str) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

// ─── Historical Data (variable-day OHLCV) ─────────────────────────────────────
const getStockHistory = (symbol, stockData, days = 30) => {
  const { currentPrice, openPrice, highPrice, lowPrice, volume } = stockData;
  const history = [];
  const now = new Date();
  const rand = seedRandom(symbol);
  let lastClose = currentPrice;
  let dateCursor = new Date(now);

  // Estimate trading days: ~72% of calendar days (250 trading days / year)
  const tradingDays = Math.ceil(days * 0.72);

  for (let i = 0; i < tradingDays; i++) {
    while (dateCursor.getDay() === 0 || dateCursor.getDay() === 6) {
      dateCursor.setDate(dateCursor.getDate() - 1);
    }
    const dateStr = dateCursor.toISOString().split('T')[0];

    let dayClose, dayOpen, dayHigh, dayLow, dayVolume;

    if (i === 0) {
      dayClose  = currentPrice;
      dayOpen   = openPrice  || currentPrice * 0.995;
      dayHigh   = Math.max(currentPrice, openPrice, highPrice || currentPrice);
      dayLow    = Math.min(currentPrice, openPrice, lowPrice  || currentPrice);
      dayVolume = volume || 500000;
    } else {
      const pct   = (rand() - 0.5) * 0.04; // ±2% daily swing
      dayOpen     = Number((lastClose * (1 - pct * 0.3)).toFixed(2));
      dayClose    = Number((lastClose * (1 + pct)).toFixed(2));
      const lo    = Math.min(dayOpen, dayClose);
      const hi    = Math.max(dayOpen, dayClose);
      dayHigh     = Number((hi * (1 + rand() * 0.015)).toFixed(2));
      dayLow      = Number((lo * (1 - rand() * 0.015)).toFixed(2));
      dayVolume   = Math.floor(100000 + rand() * 2000000);
      lastClose   = dayClose;
    }

    history.unshift({ date: dateStr, open: dayOpen, high: dayHigh, low: dayLow, close: dayClose, volume: dayVolume });
    dateCursor.setDate(dateCursor.getDate() - 1);
  }
  return history;
};

// ─── Export ────────────────────────────────────────────────────────────────────
module.exports = {
  initMarketDataSimulator,
  getMarketSessionStatus,
  seedStocks,
  calculateIndices,
  getStockHistory,
  INDEX_CONSTITUENTS,
};
