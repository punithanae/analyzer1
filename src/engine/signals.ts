/**
 * Live AI Signal Generator
 * Fetches real prices from Yahoo Finance and computes trading signals
 * using RSI, MACD, EMA crossovers, volume analysis
 */

import type { TradingSignal, SignalAction, SignalType, SignalFactor } from '../types';

interface StockConfig {
  symbol: string;
  yahoo: string;
  name: string;
  market: 'IN' | 'US';
}

const SIGNAL_STOCKS: StockConfig[] = [
  { symbol: 'RELIANCE', yahoo: 'RELIANCE.NS', name: 'Reliance Industries', market: 'IN' },
  { symbol: 'TCS', yahoo: 'TCS.NS', name: 'Tata Consultancy', market: 'IN' },
  { symbol: 'HDFCBANK', yahoo: 'HDFCBANK.NS', name: 'HDFC Bank', market: 'IN' },
  { symbol: 'INFY', yahoo: 'INFY.NS', name: 'Infosys Ltd', market: 'IN' },
  { symbol: 'ICICIBANK', yahoo: 'ICICIBANK.NS', name: 'ICICI Bank', market: 'IN' },
  { symbol: 'SBIN', yahoo: 'SBIN.NS', name: 'State Bank of India', market: 'IN' },
  { symbol: 'AAPL', yahoo: 'AAPL', name: 'Apple Inc', market: 'US' },
  { symbol: 'TSLA', yahoo: 'TSLA', name: 'Tesla Inc', market: 'US' },
  { symbol: 'NVDA', yahoo: 'NVDA', name: 'NVIDIA Corp', market: 'US' },
  { symbol: 'MSFT', yahoo: 'MSFT', name: 'Microsoft Corp', market: 'US' },
  { symbol: 'GOOGL', yahoo: 'GOOGL', name: 'Alphabet Inc', market: 'US' },
  { symbol: 'META', yahoo: 'META', name: 'Meta Platforms', market: 'US' },
];

function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const ema: number[] = [prices[0]];
  const k = 2 / (period + 1);
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function computeRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const rs = (gains / period) / ((losses / period) || 0.001);
  return 100 - (100 / (1 + rs));
}

function computeMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1],
  };
}

async function fetchStockData(yahooSymbol: string): Promise<{
  price: number; prevClose: number; closes: number[]; volumes: number[];
  high: number; low: number; high52w: number; low52w: number;
} | null> {
  try {
    const url = `/api/yahoo/v8/finance/chart/${yahooSymbol}?range=3mo&interval=1d`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];
    const closes: number[] = (quote?.close || []).filter((v: number | null) => v !== null);
    const volumes: number[] = (quote?.volume || []).filter((v: number | null) => v !== null);

    return {
      price: meta.regularMarketPrice,
      prevClose: meta.previousClose || meta.chartPreviousClose,
      closes,
      volumes,
      high: meta.regularMarketDayHigh || 0,
      low: meta.regularMarketDayLow || 0,
      high52w: meta.fiftyTwoWeekHigh || 0,
      low52w: meta.fiftyTwoWeekLow || 0,
    };
  } catch {
    return null;
  }
}

function generateSignalForStock(
  config: StockConfig,
  data: {
    price: number; prevClose: number; closes: number[]; volumes: number[];
    high: number; low: number; high52w: number; low52w: number;
  }
): TradingSignal {
  const { price, prevClose, closes, volumes } = data;

  // Technical indicators
  const rsi = computeRSI(closes);
  const macd = computeMACD(closes);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const lastEma9 = ema9[ema9.length - 1] || price;
  const lastEma21 = ema21[ema21.length - 1] || price;
  const emaCrossUp = lastEma9 > lastEma21;

  // Volume analysis
  const avgVol20 = volumes.length >= 20
    ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    : volumes.reduce((a, b) => a + b, 0) / (volumes.length || 1);
  const lastVol = volumes[volumes.length - 1] || avgVol20;
  const volRatio = lastVol / avgVol20;

  // Momentum (5-day return)
  const momentum5 = closes.length >= 6
    ? ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
    : 0;

  // Score factors
  const factors: SignalFactor[] = [];
  let bullScore = 0;
  let bearScore = 0;

  // Technical (RSI + EMA)
  const techBull = (rsi < 40 ? 1 : rsi < 55 ? 0.5 : 0) + (emaCrossUp ? 1 : 0);
  const techBear = (rsi > 65 ? 1 : rsi > 55 ? 0.3 : 0) + (!emaCrossUp ? 1 : 0);
  const techStrength = Math.round(Math.max(techBull, techBear) / 2 * 100);
  factors.push({
    name: 'Technical',
    signal: techBull > techBear ? 'bullish' : techBull < techBear ? 'bearish' : 'neutral',
    strength: techStrength,
    description: `RSI(14): ${rsi.toFixed(1)} | EMA9 ${emaCrossUp ? '>' : '<'} EMA21 | ${rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Normal range'}`,
  });
  bullScore += techBull;
  bearScore += techBear;

  // Sentiment (momentum)
  const sentBull = momentum5 > 1 ? 1 : momentum5 > 0 ? 0.5 : 0;
  const sentBear = momentum5 < -1 ? 1 : momentum5 < 0 ? 0.5 : 0;
  factors.push({
    name: 'Sentiment',
    signal: sentBull > sentBear ? 'bullish' : sentBull < sentBear ? 'bearish' : 'neutral',
    strength: Math.round(Math.max(sentBull, sentBear) * 100),
    description: `5-day momentum: ${momentum5 > 0 ? '+' : ''}${momentum5.toFixed(2)}% | ${momentum5 > 0 ? 'Positive trend' : 'Negative trend'}`,
  });
  bullScore += sentBull;
  bearScore += sentBear;

  // Volume
  const volBull = volRatio > 1.3 && momentum5 > 0 ? 1 : volRatio > 1.1 ? 0.5 : 0;
  const volBear = volRatio > 1.3 && momentum5 < 0 ? 1 : volRatio < 0.7 ? 0.3 : 0;
  factors.push({
    name: 'Volume',
    signal: volBull > volBear ? 'bullish' : volBull < volBear ? 'bearish' : 'neutral',
    strength: Math.round(Math.abs(volRatio - 1) * 100),
    description: `Vol ratio: ${volRatio.toFixed(2)}x avg | ${volRatio > 1.2 ? 'Strong participation' : volRatio < 0.8 ? 'Low activity' : 'Normal'}`,
  });
  bullScore += volBull;
  bearScore += volBear;

  // MACD
  const macdBull = macd.histogram > 0 ? 1 : 0;
  const macdBear = macd.histogram < 0 ? 1 : 0;
  factors.push({
    name: 'Momentum',
    signal: macdBull > macdBear ? 'bullish' : 'bearish',
    strength: Math.round(Math.min(Math.abs(macd.histogram) / (price * 0.01) * 100, 100)),
    description: `MACD: ${macd.macd.toFixed(2)} | Signal: ${macd.signal.toFixed(2)} | Histogram: ${macd.histogram > 0 ? '+' : ''}${macd.histogram.toFixed(2)}`,
  });
  bullScore += macdBull;
  bearScore += macdBear;

  // Determine action
  const totalScore = bullScore - bearScore;
  let action: SignalAction;
  if (totalScore >= 2) action = 'BUY';
  else if (totalScore <= -2) action = 'SELL';
  else action = 'HOLD';

  // Confidence
  const confidence = Math.min(95, Math.max(40, Math.round(50 + Math.abs(totalScore) * 10)));

  // Determine signal type based on volatility and timeframe
  const atr = closes.length >= 14 ? (() => {
    let sum = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      sum += Math.abs(closes[i] - closes[i - 1]);
    }
    return sum / 14;
  })() : price * 0.02;

  const atrPct = (atr / price) * 100;
  let type: SignalType;
  if (atrPct > 2.5) type = 'intraday';
  else if (atrPct > 1.2) type = 'swing';
  else type = 'positional';

  // Target and stop loss based on real ATR
  const targetMultiplier = action === 'BUY' ? 1.5 : action === 'SELL' ? -1.5 : 0.5;
  const slMultiplier = action === 'BUY' ? -1 : action === 'SELL' ? 1 : -0.8;

  const targetPrice = Math.round((price + atr * targetMultiplier) * 100) / 100;
  const stopLoss = Math.round((price + atr * slMultiplier) * 100) / 100;

  // Generate reasoning
  const reasons: string[] = [];
  if (rsi < 35) reasons.push(`RSI oversold at ${rsi.toFixed(0)}`);
  else if (rsi > 65) reasons.push(`RSI overbought at ${rsi.toFixed(0)}`);
  if (emaCrossUp) reasons.push('EMA9 above EMA21 (uptrend)');
  else reasons.push('EMA9 below EMA21 (downtrend)');
  if (macd.histogram > 0) reasons.push('MACD histogram positive');
  else reasons.push('MACD histogram negative');
  if (volRatio > 1.2) reasons.push(`Volume ${((volRatio - 1) * 100).toFixed(0)}% above average`);

  return {
    id: `sig-${config.symbol}-${Date.now()}`,
    symbol: config.symbol,
    name: config.name,
    action,
    type,
    confidence,
    entryPrice: price,
    targetPrice,
    stopLoss,
    reasoning: reasons.join('. ') + '.',
    factors,
    generatedAt: new Date().toISOString(),
    market: config.market,
  };
}

/**
 * Generate live trading signals for all tracked stocks
 */
export async function generateLiveSignals(): Promise<TradingSignal[]> {
  const signals: TradingSignal[] = [];

  // Fetch all stocks in parallel (batches of 4)
  const batchSize = 4;
  for (let i = 0; i < SIGNAL_STOCKS.length; i += batchSize) {
    const batch = SIGNAL_STOCKS.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (config) => {
        const data = await fetchStockData(config.yahoo);
        if (!data || data.closes.length < 20) return null;
        return generateSignalForStock(config, data);
      })
    );
    signals.push(...results.filter((s): s is TradingSignal => s !== null));
  }

  // Sort by confidence descending
  signals.sort((a, b) => b.confidence - a.confidence);

  return signals;
}
