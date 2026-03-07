import { MarketIndex, StockQuote, NewsArticle, TradingSignal, PredictionResult, PredictionHistory, CandleData } from '../types';

// ==================== MARKET INDICES ====================
export const mockIndices: MarketIndex[] = [
  { symbol: 'NIFTY50', name: 'Nifty 50', price: 22456.80, change: 187.45, changePercent: 0.84, high: 22510.20, low: 22290.15, volume: '18.2B', market: 'IN' },
  { symbol: 'SENSEX', name: 'BSE Sensex', price: 73890.25, change: 612.30, changePercent: 0.84, high: 74020.50, low: 73350.00, volume: '4.8B', market: 'IN' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', price: 47235.60, change: -189.30, changePercent: -0.40, high: 47580.00, low: 47120.45, volume: '12.5B', market: 'IN' },
  { symbol: 'SPX', name: 'S&P 500', price: 5892.34, change: 42.18, changePercent: 0.72, high: 5905.12, low: 5862.30, volume: '3.2B', market: 'US' },
  { symbol: 'IXIC', name: 'NASDAQ', price: 18945.67, change: 178.23, changePercent: 0.95, high: 18990.00, low: 18800.45, volume: '5.1B', market: 'US' },
  { symbol: 'DJI', name: 'Dow Jones', price: 43567.89, change: -45.67, changePercent: -0.10, high: 43650.00, low: 43480.12, volume: '2.8B', market: 'US' },
];

// ==================== STOCK QUOTES ====================
export const mockStocks: StockQuote[] = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2845.30, change: 32.15, changePercent: 1.14, volume: 12500000, marketCap: '19.2L Cr', pe: 27.8, sector: 'Energy', market: 'IN', high52w: 3024, low52w: 2220 },
  { symbol: 'TCS', name: 'Tata Consultancy', price: 3912.45, change: -28.60, changePercent: -0.73, volume: 3200000, marketCap: '14.3L Cr', pe: 31.2, sector: 'IT', market: 'IN', high52w: 4245, low52w: 3350 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', price: 1678.90, change: 15.45, changePercent: 0.93, volume: 8900000, marketCap: '12.8L Cr', pe: 19.5, sector: 'Banking', market: 'IN', high52w: 1794, low52w: 1363 },
  { symbol: 'INFY', name: 'Infosys Ltd', price: 1823.55, change: -12.30, changePercent: -0.67, volume: 6100000, marketCap: '7.5L Cr', pe: 28.4, sector: 'IT', market: 'IN', high52w: 1989, low52w: 1358 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', price: 1245.70, change: 18.90, changePercent: 1.54, volume: 7800000, marketCap: '8.7L Cr', pe: 18.2, sector: 'Banking', market: 'IN', high52w: 1362, low52w: 956 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: 2567.80, change: -8.45, changePercent: -0.33, volume: 2100000, marketCap: '6.0L Cr', pe: 58.3, sector: 'FMCG', market: 'IN', high52w: 2859, low52w: 2172 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', price: 945.60, change: 22.35, changePercent: 2.42, volume: 15600000, marketCap: '3.5L Cr', pe: 12.1, sector: 'Auto', market: 'IN', high52w: 1080, low52w: 620 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', price: 478.25, change: 5.80, changePercent: 1.23, volume: 4500000, marketCap: '2.6L Cr', pe: 22.7, sector: 'IT', market: 'IN', high52w: 542, low52w: 380 },
  { symbol: 'AAPL', name: 'Apple Inc', price: 228.45, change: 3.67, changePercent: 1.63, volume: 52000000, marketCap: '$3.5T', pe: 30.2, sector: 'Technology', market: 'US', high52w: 248.20, low52w: 164.08 },
  { symbol: 'MSFT', name: 'Microsoft Corp', price: 445.82, change: 5.23, changePercent: 1.19, volume: 21000000, marketCap: '$3.3T', pe: 37.8, sector: 'Technology', market: 'US', high52w: 468.35, low52w: 366.50 },
  { symbol: 'GOOGL', name: 'Alphabet Inc', price: 178.34, change: -1.56, changePercent: -0.87, volume: 18500000, marketCap: '$2.2T', pe: 25.6, sector: 'Technology', market: 'US', high52w: 191.75, low52w: 130.67 },
  { symbol: 'AMZN', name: 'Amazon.com Inc', price: 213.56, change: 4.12, changePercent: 1.97, volume: 35000000, marketCap: '$2.2T', pe: 62.3, sector: 'Consumer', market: 'US', high52w: 230.00, low52w: 151.61 },
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 878.90, change: 25.67, changePercent: 3.01, volume: 45000000, marketCap: '$2.1T', pe: 65.4, sector: 'Technology', market: 'US', high52w: 974.00, low52w: 473.20 },
  { symbol: 'TSLA', name: 'Tesla Inc', price: 245.67, change: -8.34, changePercent: -3.28, volume: 82000000, marketCap: '$780B', pe: 48.9, sector: 'Auto', market: 'US', high52w: 299.29, low52w: 138.80 },
  { symbol: 'META', name: 'Meta Platforms', price: 567.89, change: 12.45, changePercent: 2.24, volume: 15000000, marketCap: '$1.4T', pe: 33.1, sector: 'Technology', market: 'US', high52w: 598.00, low52w: 390.42 },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance', price: 7234.50, change: 89.30, changePercent: 1.25, volume: 1800000, marketCap: '4.5L Cr', pe: 35.6, sector: 'Finance', market: 'IN', high52w: 8192, low52w: 6188 },
];

// ==================== NEWS ====================
export const mockNews: NewsArticle[] = [
  {
    id: '1', title: 'RBI Keeps Repo Rate Unchanged at 6.5%, Signals Neutral Stance',
    summary: 'The Reserve Bank of India maintained the key lending rate at 6.5% for the eighth consecutive time, citing persistent inflation concerns while keeping growth outlook positive at 7.2% for FY26.',
    source: 'Economic Times', url: '#', publishedAt: '2026-03-07T10:30:00Z',
    sentiment: 'neutral', sentimentScore: 0.1, tickers: ['NIFTY50', 'HDFCBANK', 'ICICIBANK'],
    category: 'Macro', impactLevel: 'high'
  },
  {
    id: '2', title: 'NVIDIA Smashes Earnings Expectations, AI Revenue Up 265%',
    summary: 'NVIDIA reported quarterly revenue of $35.1 billion, driven by massive AI chip demand. Data center revenue alone hit $30.8 billion, a record. Stock surged 8% in after-hours trading.',
    source: 'Bloomberg', url: '#', publishedAt: '2026-03-07T09:15:00Z',
    sentiment: 'bullish', sentimentScore: 0.92, tickers: ['NVDA', 'AAPL', 'MSFT'],
    category: 'Earnings', impactLevel: 'high'
  },
  {
    id: '3', title: 'FII Outflows Hit ₹8,500 Cr This Week, Indian Markets Under Pressure',
    summary: 'Foreign institutional investors continued to pull out money from Indian equities, selling ₹8,500 crore worth of stocks this week due to rising US bond yields and dollar strength.',
    source: 'Moneycontrol', url: '#', publishedAt: '2026-03-07T08:45:00Z',
    sentiment: 'bearish', sentimentScore: -0.65, tickers: ['NIFTY50', 'SENSEX'],
    category: 'FII/DII', impactLevel: 'high'
  },
  {
    id: '4', title: 'Reliance Jio Launches 5.5G Network in 50 Cities',
    summary: 'Reliance Jio announced the rollout of its advanced 5.5G network across 50 major Indian cities, promising speeds up to 10Gbps. The move is expected to boost ARPU by 15-20%.',
    source: 'LiveMint', url: '#', publishedAt: '2026-03-07T07:30:00Z',
    sentiment: 'bullish', sentimentScore: 0.78, tickers: ['RELIANCE'],
    category: 'Corporate', impactLevel: 'medium'
  },
  {
    id: '5', title: 'Tesla Recalls 200K Vehicles Over Autopilot Software Bug',
    summary: 'Tesla is recalling approximately 200,000 Model 3 and Model Y vehicles due to a software glitch in the Autopilot system that could cause unexpected braking in certain conditions.',
    source: 'Reuters', url: '#', publishedAt: '2026-03-07T06:20:00Z',
    sentiment: 'bearish', sentimentScore: -0.71, tickers: ['TSLA'],
    category: 'Corporate', impactLevel: 'medium'
  },
  {
    id: '6', title: 'India GDP Growth Estimated at 7.3% for FY26, Beats Expectations',
    summary: 'India\'s GDP growth for FY2025-26 is projected at 7.3%, surpassing consensus estimates of 6.8%, driven by strong domestic consumption, government capex, and services sector expansion.',
    source: 'CNBC-TV18', url: '#', publishedAt: '2026-03-07T05:00:00Z',
    sentiment: 'bullish', sentimentScore: 0.85, tickers: ['NIFTY50', 'SENSEX'],
    category: 'Macro', impactLevel: 'high'
  },
  {
    id: '7', title: 'TCS Wins $2.5 Billion Cloud Migration Deal with Major US Bank',
    summary: 'Tata Consultancy Services secured its largest-ever deal worth $2.5 billion for cloud migration and digital transformation of a top-5 US bank over 7 years.',
    source: 'Business Standard', url: '#', publishedAt: '2026-03-06T22:30:00Z',
    sentiment: 'bullish', sentimentScore: 0.82, tickers: ['TCS', 'INFY', 'WIPRO'],
    category: 'Corporate', impactLevel: 'medium'
  },
  {
    id: '8', title: 'US Fed Minutes Signal Possible Rate Cut Delay to H2 2026',
    summary: 'Federal Reserve officials indicated they may delay rate cuts until the second half of 2026, citing sticky core inflation and a resilient labor market.',
    source: 'CNBC', url: '#', publishedAt: '2026-03-06T20:15:00Z',
    sentiment: 'bearish', sentimentScore: -0.55, tickers: ['SPX', 'IXIC', 'DJI'],
    category: 'Macro', impactLevel: 'high'
  },
  {
    id: '9', title: 'Tata Motors EV Sales Surge 85% YoY in February',
    summary: 'Tata Motors reported an 85% year-over-year increase in electric vehicle sales for February 2026, powered by the new Curvv EV and Nexon EV Max. Market share in Indian EV space grew to 68%.',
    source: 'Auto Car India', url: '#', publishedAt: '2026-03-06T18:00:00Z',
    sentiment: 'bullish', sentimentScore: 0.75, tickers: ['TATAMOTORS'],
    category: 'Sector', impactLevel: 'medium'
  },
  {
    id: '10', title: 'Crude Oil Drops Below $70 on OPEC+ Supply Increase Rumors',
    summary: 'Brent crude fell below $70/barrel for the first time in 3 months amid reports that OPEC+ may increase production quotas at the next meeting. Positive for import-dependent economies like India.',
    source: 'Financial Times', url: '#', publishedAt: '2026-03-06T16:45:00Z',
    sentiment: 'bullish', sentimentScore: 0.45, tickers: ['RELIANCE', 'NIFTY50'],
    category: 'Commodities', impactLevel: 'medium'
  },
];

// ==================== TRADING SIGNALS ====================
export const mockSignals: TradingSignal[] = [
  {
    id: 's1', symbol: 'RELIANCE', name: 'Reliance Industries', action: 'BUY', type: 'swing',
    confidence: 82, entryPrice: 2845, targetPrice: 3020, stopLoss: 2780,
    reasoning: 'Strong bullish momentum with Jio 5.5G catalyst. RSI recovering from oversold, MACD bullish crossover confirmed.',
    factors: [
      { name: 'Technical', signal: 'bullish', strength: 85, description: 'MACD bullish crossover, RSI at 58' },
      { name: 'Sentiment', signal: 'bullish', strength: 78, description: 'Positive news flow on Jio 5.5G' },
      { name: 'Volume', signal: 'bullish', strength: 72, description: 'Volume 30% above 20-day avg' },
      { name: 'Momentum', signal: 'bullish', strength: 80, description: 'Price above all key EMAs' },
    ],
    generatedAt: '2026-03-07T10:00:00Z', market: 'IN'
  },
  {
    id: 's2', symbol: 'TSLA', name: 'Tesla Inc', action: 'SELL', type: 'intraday',
    confidence: 75, entryPrice: 245.67, targetPrice: 232.00, stopLoss: 252.00,
    reasoning: 'Bearish on recall news. Break below key support at $248. Volume spike on selling.',
    factors: [
      { name: 'Technical', signal: 'bearish', strength: 78, description: 'Break below 50-day EMA, RSI at 38' },
      { name: 'Sentiment', signal: 'bearish', strength: 80, description: 'Negative sentiment from recall news' },
      { name: 'Volume', signal: 'bearish', strength: 85, description: 'Selling volume 2x average' },
      { name: 'Momentum', signal: 'bearish', strength: 65, description: 'MACD below signal line' },
    ],
    generatedAt: '2026-03-07T09:30:00Z', market: 'US'
  },
  {
    id: 's3', symbol: 'NVDA', name: 'NVIDIA Corp', action: 'BUY', type: 'swing',
    confidence: 88, entryPrice: 878.90, targetPrice: 950.00, stopLoss: 845.00,
    reasoning: 'Blowout earnings with 265% AI revenue growth. Strong institutional buying. Raised guidance.',
    factors: [
      { name: 'Technical', signal: 'bullish', strength: 90, description: 'All-time high breakout, RSI 72' },
      { name: 'Sentiment', signal: 'bullish', strength: 95, description: 'Massive positive earnings surprise' },
      { name: 'Volume', signal: 'bullish', strength: 92, description: 'Record volume on breakout' },
      { name: 'Momentum', signal: 'bullish', strength: 88, description: 'Strong uptrend, all MAs aligned' },
    ],
    generatedAt: '2026-03-07T09:15:00Z', market: 'US'
  },
  {
    id: 's4', symbol: 'HDFCBANK', name: 'HDFC Bank', action: 'BUY', type: 'positional',
    confidence: 71, entryPrice: 1678.90, targetPrice: 1780.00, stopLoss: 1640.00,
    reasoning: 'Banking sector strength post RBI policy. Strong Q3 deposit growth. FII buying in banking.',
    factors: [
      { name: 'Technical', signal: 'bullish', strength: 68, description: 'Breakout above consolidation range' },
      { name: 'Sentiment', signal: 'bullish', strength: 65, description: 'Positive banking sector outlook' },
      { name: 'Volume', signal: 'neutral', strength: 55, description: 'Average volume, awaiting confirmation' },
      { name: 'Momentum', signal: 'bullish', strength: 70, description: 'Gradual uptrend forming' },
    ],
    generatedAt: '2026-03-07T10:30:00Z', market: 'IN'
  },
  {
    id: 's5', symbol: 'TCS', name: 'Tata Consultancy', action: 'HOLD', type: 'swing',
    confidence: 60, entryPrice: 3912.45, targetPrice: 4050.00, stopLoss: 3850.00,
    reasoning: 'Large deal win positive but sector under pressure from US visa concerns. Wait for clarity.',
    factors: [
      { name: 'Technical', signal: 'neutral', strength: 50, description: 'Trading in range, no clear direction' },
      { name: 'Sentiment', signal: 'bullish', strength: 72, description: '$2.5B deal win catalyst' },
      { name: 'Volume', signal: 'neutral', strength: 45, description: 'Below average volume' },
      { name: 'Momentum', signal: 'bearish', strength: 40, description: 'Slight downward bias in sector' },
    ],
    generatedAt: '2026-03-07T08:00:00Z', market: 'IN'
  },
  {
    id: 's6', symbol: 'TATAMOTORS', name: 'Tata Motors', action: 'BUY', type: 'intraday',
    confidence: 77, entryPrice: 945.60, targetPrice: 975.00, stopLoss: 930.00,
    reasoning: 'EV sales momentum strong. Sector rotation into auto. Technical breakout above ₹940 resistance.',
    factors: [
      { name: 'Technical', signal: 'bullish', strength: 80, description: 'Resistance breakout at ₹940' },
      { name: 'Sentiment', signal: 'bullish', strength: 76, description: '85% EV sales growth catalyst' },
      { name: 'Volume', signal: 'bullish', strength: 78, description: 'High volume breakout' },
      { name: 'Momentum', signal: 'bullish', strength: 74, description: 'RSI 62, room to run' },
    ],
    generatedAt: '2026-03-07T10:15:00Z', market: 'IN'
  },
];

// ==================== NIFTY 50 PREDICTION ====================
export const mockPrediction: PredictionResult = {
  date: '2026-03-08',
  prediction: 'Bullish',
  score: 0.38,
  confidence: 72,
  factors: [
    { name: 'Trend (EMA Crossover)', weight: 20, signal: 0.6, description: '9-EMA above 21-EMA, uptrend intact', icon: 'TrendingUp' },
    { name: 'Momentum (RSI + MACD)', weight: 20, signal: 0.4, description: 'RSI at 58 (neutral-bullish), MACD histogram positive', icon: 'Zap' },
    { name: 'Volume Profile', weight: 10, signal: 0.3, description: 'Volume slightly above 20-day average (+12%)', icon: 'BarChart3' },
    { name: 'News Sentiment', weight: 15, signal: 0.45, description: 'Mixed sentiment: GDP positive vs FII outflows negative', icon: 'Newspaper' },
    { name: 'Global Cues (US Markets)', weight: 15, signal: 0.5, description: 'S&P 500 +0.72%, NASDAQ +0.95% overnight', icon: 'Globe' },
    { name: 'Volatility (India VIX)', weight: 10, signal: 0.2, description: 'India VIX at 14.2, moderate range — slightly positive', icon: 'Activity' },
    { name: 'FII/DII Activity', weight: 10, signal: -0.3, description: 'FII selling ₹8,500 Cr but DII buying ₹6,200 Cr', icon: 'Users' },
  ],
  predictedRange: { low: 22380, high: 22620 },
  previousClose: 22456.80,
};

export const mockPredictionHistory: PredictionHistory[] = [
  { date: '2026-03-07', prediction: 'Bullish', predictedDirection: 'up', actualDirection: 'up', actualChange: 0.84, correct: true },
  { date: '2026-03-06', prediction: 'Bearish', predictedDirection: 'down', actualDirection: 'down', actualChange: -0.45, correct: true },
  { date: '2026-03-05', prediction: 'Bullish', predictedDirection: 'up', actualDirection: 'up', actualChange: 1.12, correct: true },
  { date: '2026-03-04', prediction: 'Neutral', predictedDirection: 'neutral', actualDirection: 'up', actualChange: 0.23, correct: false },
  { date: '2026-03-03', prediction: 'Bullish', predictedDirection: 'up', actualDirection: 'up', actualChange: 0.67, correct: true },
  { date: '2026-02-28', prediction: 'Bearish', predictedDirection: 'down', actualDirection: 'up', actualChange: 0.15, correct: false },
  { date: '2026-02-27', prediction: 'Strong Bullish', predictedDirection: 'up', actualDirection: 'up', actualChange: 1.89, correct: true },
  { date: '2026-02-26', prediction: 'Bearish', predictedDirection: 'down', actualDirection: 'down', actualChange: -0.92, correct: true },
  { date: '2026-02-25', prediction: 'Bullish', predictedDirection: 'up', actualDirection: 'up', actualChange: 0.56, correct: true },
  { date: '2026-02-24', prediction: 'Neutral', predictedDirection: 'neutral', actualDirection: 'down', actualChange: -0.34, correct: false },
];

// ==================== CANDLE DATA (for charts) ====================
export function generateCandleData(days: number = 60): CandleData[] {
  const data: CandleData[] = [];
  let basePrice = 22000;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    
    const volatility = 0.015;
    const drift = 0.001;
    const change = (Math.random() - 0.48) * volatility * basePrice + drift * basePrice;
    
    const open = basePrice;
    const close = basePrice + change;
    const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5;
    const volume = Math.floor(150000000 + Math.random() * 100000000);
    
    data.push({
      time: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
    
    basePrice = close;
  }
  
  return data;
}

// ==================== TICKER DATA ====================
export const tickerData = [
  { symbol: 'NIFTY', price: '22,456.80', change: '+187.45', positive: true },
  { symbol: 'SENSEX', price: '73,890.25', change: '+612.30', positive: true },
  { symbol: 'BANKNIFTY', price: '47,235.60', change: '-189.30', positive: false },
  { symbol: 'S&P 500', price: '5,892.34', change: '+42.18', positive: true },
  { symbol: 'NASDAQ', price: '18,945.67', change: '+178.23', positive: true },
  { symbol: 'DOW', price: '43,567.89', change: '-45.67', positive: false },
  { symbol: 'GOLD', price: '$2,178.50', change: '+12.30', positive: true },
  { symbol: 'CRUDE', price: '$69.82', change: '-1.45', positive: false },
  { symbol: 'USD/INR', price: '83.24', change: '-0.12', positive: true },
  { symbol: 'BTC', price: '$67,890', change: '+1,234', positive: true },
];
