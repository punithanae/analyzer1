// ==================== Market Data ====================
export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: string;
  market: 'IN' | 'US';
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: string;
  pe: number;
  sector: string;
  market: 'IN' | 'US';
  high52w: number;
  low52w: number;
}

// ==================== News ====================
export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  tickers: string[];
  category: string;
  impactLevel: 'high' | 'medium' | 'low';
}

// ==================== Trading Signals ====================
export type SignalAction = 'BUY' | 'SELL' | 'HOLD';
export type SignalType = 'intraday' | 'swing' | 'positional';

export interface TradingSignal {
  id: string;
  symbol: string;
  name: string;
  action: SignalAction;
  type: SignalType;
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  reasoning: string;
  factors: SignalFactor[];
  generatedAt: string;
  market: 'IN' | 'US';
}

export interface SignalFactor {
  name: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  description: string;
}

// ==================== Prediction ====================
export interface PredictionResult {
  date: string;
  prediction: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
  score: number; // -1 to +1
  confidence: number; // 0-100
  factors: PredictionFactor[];
  predictedRange: { low: number; high: number };
  previousClose: number;
  optionsSetup?: OptionsSetup;
}

export interface OptionsSetup {
  type: 'CE' | 'PE';
  strikePrice: number;
  entryPremium: string;
  targetPrice: number;
  stopLoss: number;
  pattern: string;
  confidence: number;
  expiry: string;
}

export interface PredictionFactor {
  name: string;
  weight: number;
  signal: number; // -1 to +1
  description: string;
  icon: string;
}

export interface PredictionHistory {
  date: string;
  prediction: string;
  predictedDirection: 'up' | 'down' | 'neutral';
  actualDirection: 'up' | 'down';
  actualChange: number;
  correct: boolean;
}

// ==================== Technical Analysis ====================
export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicator {
  name: string;
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  description: string;
}

// ==================== API Config ====================
export interface ApiConfig {
  alphaVantageKey: string;
  finnhubKey: string;
  finnhubSecret: string;
  twelveDataKey: string;
  marketauxKey: string;
  demoMode: boolean;
}
