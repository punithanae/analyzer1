import type { PredictionResult, PredictionFactor } from '../types';
import { fetchCryptoHistoricalData } from '../services/binanceData';

// Technical Indicators

function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const ema: number[] = [prices[0]];
  const k = 2 / (period + 1);
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;
  
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period || 0.001;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  
  const lastMACD = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  
  return {
    macd: lastMACD,
    signal: lastSignal,
    histogram: lastMACD - lastSignal,
  };
}

// Factors Calculation

function calcTrendFactor(closes: number[]): { signal: number; description: string } {
  if (closes.length < 21) return { signal: 0, description: 'Insufficient data' };
  
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const last9 = ema9[ema9.length - 1];
  const last21 = ema21[ema21.length - 1];
  const prev9 = ema9[ema9.length - 2];
  const prev21 = ema21[ema21.length - 2];
  
  const currentDiff = (last9 - last21) / last21 * 100;
  const prevDiff = (prev9 - prev21) / prev21 * 100;
  const crossingUp = prevDiff <= 0 && currentDiff > 0;
  const crossingDown = prevDiff >= 0 && currentDiff < 0;
  
  let signal: number;
  let desc: string;
  
  if (crossingUp) {
    signal = 0.8;
    desc = `Bullish EMA crossover! 9-EMA crossed above 21-EMA`;
  } else if (crossingDown) {
    signal = -0.8;
    desc = `Bearish EMA crossover! 9-EMA crossed below 21-EMA`;
  } else if (last9 > last21) {
    signal = 0.3 + Math.min(currentDiff * 0.5, 0.4);
    desc = `9-EMA (${last9.toFixed(2)}) above 21-EMA (${last21.toFixed(2)}), uptrend intact`;
  } else {
    signal = -0.3 - Math.min(Math.abs(currentDiff) * 0.5, 0.4);
    desc = `9-EMA (${last9.toFixed(2)}) below 21-EMA (${last21.toFixed(2)}), downtrend`;
  }
  
  return { signal: Math.max(-1, Math.min(1, signal)), description: desc };
}

function calcMomentumFactor(closes: number[]): { signal: number; description: string } {
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  
  let rsiSignal: number;
  if (rsi > 70) rsiSignal = -0.5 - (rsi - 70) / 60;
  else if (rsi < 30) rsiSignal = 0.5 + (30 - rsi) / 60;
  else rsiSignal = (rsi - 50) / 40;
  
  let macdSignal = macd.histogram > 0 ? 0.3 : -0.3;
  if (Math.abs(macd.histogram) > 50) macdSignal *= 1.5;
  
  const signal = (rsiSignal * 0.5 + macdSignal * 0.5);
  
  return {
    signal: Math.max(-1, Math.min(1, signal)),
    description: `RSI at ${rsi.toFixed(1)} (${rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral'}), MACD histogram ${macd.histogram > 0 ? 'positive' : 'negative'}`,
  };
}

function calcVolatilityFactor(closes: number[], highs: number[], lows: number[]): { signal: number; description: string } {
  if (closes.length < 20) return { signal: 0, description: 'Insufficient data' };
  
  const atrPeriod = 14;
  let atrSum = 0;
  for (let i = closes.length - atrPeriod; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    atrSum += tr;
  }
  const atr = atrSum / atrPeriod;
  const atrPercent = (atr / closes[closes.length - 1]) * 100;
  
  let signal: number;
  let desc: string;
  
  if (atrPercent < 2.0) {
    signal = 0.3;
    desc = `Low volatility (ATR ${atrPercent.toFixed(2)}%) — consolidation phase`;
  } else if (atrPercent > 5.0) {
    signal = -0.5;
    desc = `High volatility (ATR ${atrPercent.toFixed(2)}%) — uncertain, risk elevated`;
  } else {
    signal = 0;
    desc = `Moderate volatility (ATR ${atrPercent.toFixed(2)}%) — normal trading range`;
  }
  
  return { signal: Math.max(-1, Math.min(1, signal)), description: desc };
}


// Main Crypto Prediction Computation
export async function computeCryptoPrediction(symbol: string = 'BTCUSDT'): Promise<PredictionResult | null> {
  try {
    const historicalData = await fetchCryptoHistoricalData(symbol, '1d', 365);
    if (!historicalData || historicalData.closes.length < 50) return null;

    const { closes, highs, lows, volumes } = historicalData;

    const trend = calcTrendFactor(closes);
    const momentum = calcMomentumFactor(closes);
    const volatility = calcVolatilityFactor(closes, highs, lows);

    const factors: PredictionFactor[] = [
      { name: 'Trend (EMA)', weight: 35, signal: trend.signal, description: trend.description, icon: 'TrendingUp' },
      { name: 'Momentum (RSI+MACD)', weight: 35, signal: momentum.signal, description: momentum.description, icon: 'Zap' },
      { name: 'Volatility (ATR)', weight: 30, signal: volatility.signal, description: volatility.description, icon: 'Activity' },
    ];

    const totalScore = factors.reduce((sum, f) => sum + (f.weight / 100) * f.signal, 0);

    let prediction: PredictionResult['prediction'];
    if (totalScore > 0.4) prediction = 'Strong Bullish';
    else if (totalScore > 0.15) prediction = 'Bullish';
    else if (totalScore > -0.15) prediction = 'Neutral';
    else if (totalScore > -0.4) prediction = 'Bearish';
    else prediction = 'Strong Bearish';

    const confidence = Math.min(95, Math.max(30, Math.round(50 + Math.abs(totalScore) * 50)));
    const currentPrice = closes[closes.length - 1];

    // Simple ATR for predicted range
    let sum = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      sum += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1]));
    }
    const atr14 = sum / 14;

    const predictedRangeLow = currentPrice - (atr14 * 1.5);
    const predictedRangeHigh = currentPrice + (atr14 * 1.5);

    return {
      date: new Date().toISOString().split('T')[0],
      prediction,
      score: Math.round(totalScore * 100) / 100,
      confidence,
      factors,
      predictedRange: { low: Math.round(predictedRangeLow * 100) / 100, high: Math.round(predictedRangeHigh * 100) / 100 },
      previousClose: currentPrice,
    };

  } catch (error) {
    console.error('Failed to compute crypto prediction:', error);
    return null;
  }
}
