/**
 * Live Prediction Engine for Nifty 50
 * Fetches real-time technical data and computes multi-factor predictions
 */

import type { PredictionResult, PredictionFactor } from '../types';
import { generateOptionsSetup } from './options';
import { fetchLiveNews } from '../services/liveNews';

interface ChartMeta {
  regularMarketPrice: number;
  previousClose: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

interface HistoricalData {
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
  timestamps: number[];
}

// ==================== Data Fetching ====================

async function fetchChartData(symbol: string, range: string = '3mo', interval: string = '1d'): Promise<{ meta: ChartMeta; data: HistoricalData } | null> {
  try {
    const url = `/api/yahoo/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const json = await response.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta: ChartMeta = {
      regularMarketPrice: result.meta.regularMarketPrice,
      previousClose: result.meta.previousClose || result.meta.chartPreviousClose,
      regularMarketDayHigh: result.meta.regularMarketDayHigh || 0,
      regularMarketDayLow: result.meta.regularMarketDayLow || 0,
      regularMarketVolume: result.meta.regularMarketVolume || 0,
      fiftyTwoWeekHigh: result.meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: result.meta.fiftyTwoWeekLow || 0,
    };

    const quote = result.indicators?.quote?.[0];
    const closes: number[] = (quote?.close || []).filter((v: number | null) => v !== null);
    const highs: number[] = (quote?.high || []).filter((v: number | null) => v !== null);
    const lows: number[] = (quote?.low || []).filter((v: number | null) => v !== null);
    const volumes: number[] = (quote?.volume || []).filter((v: number | null) => v !== null);
    const timestamps: number[] = result.timestamp || [];

    return { meta, data: { closes, highs, lows, volumes, timestamps } };
  } catch (err) {
    console.error(`Failed to fetch chart data for ${symbol}:`, err);
    return null;
  }
}

// ==================== Technical Indicators ====================

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

// ==================== Factor Calculations ====================

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
    desc = `9-EMA (${last9.toFixed(0)}) above 21-EMA (${last21.toFixed(0)}), uptrend intact`;
  } else {
    signal = -0.3 - Math.min(Math.abs(currentDiff) * 0.5, 0.4);
    desc = `9-EMA (${last9.toFixed(0)}) below 21-EMA (${last21.toFixed(0)}), downtrend`;
  }
  
  return { signal: Math.max(-1, Math.min(1, signal)), description: desc };
}

function calcMomentumFactor(closes: number[]): { signal: number; description: string } {
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  
  // RSI contribution (-1 to +1)
  let rsiSignal: number;
  if (rsi > 70) rsiSignal = -0.5 - (rsi - 70) / 60;
  else if (rsi < 30) rsiSignal = 0.5 + (30 - rsi) / 60;
  else rsiSignal = (rsi - 50) / 40;
  
  // MACD contribution
  let macdSignal = macd.histogram > 0 ? 0.3 : -0.3;
  if (Math.abs(macd.histogram) > 50) macdSignal *= 1.5;
  
  const signal = (rsiSignal * 0.5 + macdSignal * 0.5);
  
  return {
    signal: Math.max(-1, Math.min(1, signal)),
    description: `RSI at ${rsi.toFixed(1)} (${rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral'}), MACD histogram ${macd.histogram > 0 ? 'positive' : 'negative'} (${macd.histogram.toFixed(1)})`,
  };
}

function calcVolumeFactor(volumes: number[]): { signal: number; description: string } {
  if (volumes.length < 20) return { signal: 0, description: 'Insufficient volume data' };
  
  const recent = volumes.slice(-1)[0];
  const avg20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const ratio = recent / avg20;
  
  let signal: number;
  let desc: string;
  
  if (ratio > 1.5) {
    signal = 0.6;
    desc = `Volume ${((ratio - 1) * 100).toFixed(0)}% above 20-day avg — strong participation`;
  } else if (ratio > 1.1) {
    signal = 0.3;
    desc = `Volume ${((ratio - 1) * 100).toFixed(0)}% above 20-day avg — above average`;
  } else if (ratio < 0.7) {
    signal = -0.4;
    desc = `Volume ${((1 - ratio) * 100).toFixed(0)}% below 20-day avg — weak participation`;
  } else {
    signal = 0;
    desc = `Volume near 20-day average — normal activity`;
  }
  
  return { signal: Math.max(-1, Math.min(1, signal)), description: desc };
}

async function calcNewsSentimentFactor(): Promise<{ signal: number; description: string }> {
  try {
    const news = await fetchLiveNews();
    if (!news || news.length === 0) return { signal: 0, description: 'No news data available' };
    
    // Filter to last 24 hours of Nifty/Market impacting news
    const now = Date.now();
    const recentNews = news.filter(n => (now - new Date(n.publishedAt).getTime()) < 24 * 60 * 60 * 1000);
    
    if (recentNews.length === 0) return { signal: 0, description: 'No recent impactful news' };
    
    // Calculate aggregate sentiment
    let totalScore = 0;
    let highImpactCount = 0;
    
    recentNews.forEach(n => {
      const weight = n.impactLevel === 'high' ? 1.5 : (n.impactLevel === 'medium' ? 1.0 : 0.5);
      totalScore += (n.sentimentScore * weight);
      if (n.impactLevel === 'high') highImpactCount++;
    });
    
    const avgScore = totalScore / recentNews.length;
    // Normalize to roughly -1 to 1
    const signal = Math.max(-1, Math.min(1, avgScore * 2));
    
    return {
      signal,
      description: `Analyzed ${recentNews.length} recent articles (${highImpactCount} high impact). Sentiment is ${signal > 0.2 ? 'bullish' : signal < -0.2 ? 'bearish' : 'neutral'}.`,
    };
  } catch (error) {
    return { signal: 0, description: 'Failed to fetch news sentiment' };
  }
}

async function calcGlobalCuesFactor(): Promise<{ signal: number; description: string }> {
  try {
    const sp500 = await fetchChartData('%5EGSPC', '5d', '1d');
    const nasdaq = await fetchChartData('%5EIXIC', '5d', '1d');
    
    if (!sp500 || !nasdaq) return { signal: 0, description: 'Could not fetch US market data' };
    
    const sp500Change = ((sp500.meta.regularMarketPrice - sp500.meta.previousClose) / sp500.meta.previousClose) * 100;
    const nasdaqChange = ((nasdaq.meta.regularMarketPrice - nasdaq.meta.previousClose) / nasdaq.meta.previousClose) * 100;
    
    const avgChange = (sp500Change + nasdaqChange) / 2;
    const signal = Math.max(-1, Math.min(1, avgChange * 0.5));
    
    return {
      signal,
      description: `S&P 500 ${sp500Change >= 0 ? '+' : ''}${sp500Change.toFixed(2)}%, NASDAQ ${nasdaqChange >= 0 ? '+' : ''}${nasdaqChange.toFixed(2)}%`,
    };
  } catch {
    return { signal: 0, description: 'US market data unavailable' };
  }
}

function calcVolatilityFactor(closes: number[], highs: number[], lows: number[]): { signal: number; description: string } {
  if (closes.length < 20) return { signal: 0, description: 'Insufficient data' };
  
  // Calculate Average True Range as volatility proxy
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
  
  if (atrPercent < 0.8) {
    signal = 0.3;
    desc = `Low volatility (ATR ${atrPercent.toFixed(2)}%) — calm market, slightly bullish`;
  } else if (atrPercent > 2.0) {
    signal = -0.5;
    desc = `High volatility (ATR ${atrPercent.toFixed(2)}%) — uncertain, risk elevated`;
  } else {
    signal = 0;
    desc = `Moderate volatility (ATR ${atrPercent.toFixed(2)}%) — normal range`;
  }
  
  return { signal: Math.max(-1, Math.min(1, signal)), description: desc };
}

function calcInstitutionalFactor(closes: number[], volumes: number[]): { signal: number; description: string } {
  if (closes.length < 10 || volumes.length < 10) return { signal: 0, description: 'Insufficient data' };
  
  // Use OBV (On Balance Volume) as proxy for institutional flow
  let obv = 0;
  const obvValues: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    obvValues.push(obv);
  }
  
  // Check OBV trend last 5 vs 10 days
  const obv5 = obvValues.slice(-5);
  const obv10 = obvValues.slice(-10, -5);
  const avg5 = obv5.reduce((a, b) => a + b, 0) / obv5.length;
  const avg10 = obv10.reduce((a, b) => a + b, 0) / obv10.length;
  
  const obvTrend = avg5 > avg10 ? 'accumulation' : 'distribution';
  const signal = avg5 > avg10 ? 0.4 : -0.4;
  
  return {
    signal: Math.max(-1, Math.min(1, signal)),
    description: `OBV indicates ${obvTrend} — institutional ${obvTrend === 'accumulation' ? 'buying' : 'selling'} pattern`,
  };
}

// ==================== Adaptive Machine Learning Model ====================

interface HistoricalPrediction {
  date: string; // YYYY-MM-DD
  factors: { name: string; signal: number; weight: number }[];
  predictedScore: number;
}

function getAdaptiveWeights(): Record<string, number> {
  const defaultWeights: Record<string, number> = {
    'Trend (EMA Crossover)': 20,
    'Momentum (RSI + MACD)': 20,
    'Volume Profile': 10,
    'Market Sentiment': 15,
    'Global Cues (US Markets)': 15,
    'Volatility (ATR)': 10,
    'Institutional Flow (OBV)': 10,
  };

  try {
    const saved = localStorage.getItem('nifty_adaptive_weights');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Could not read adaptive weights', e);
  }
  return defaultWeights;
}

function evaluateAndLearn(todayPrice: number, prevClose: number) {
  try {
    const historyStr = localStorage.getItem('nifty_prediction_history');
    if (!historyStr) return;
    
    const historyArray: HistoricalPrediction[] = JSON.parse(historyStr);
    const history = Array.isArray(historyArray) ? historyArray.find(h => h.date === new Date().toISOString().split('T')[0]) : historyArray;
    
    // Only learn if we have a prediction for today and market has moved today
    if (history && history.date && todayPrice !== prevClose) {
      const actualDirection = todayPrice > prevClose ? 1 : -1;
      let weights = getAdaptiveWeights();
      let totalWeight = 0;
      
      history.factors.forEach(f => {
        const factorDirection = f.signal > 0.1 ? 1 : f.signal < -0.1 ? -1 : 0;
        if (factorDirection === actualDirection) {
          weights[f.name] += 0.5; // Reward accurate signals
        } else if (factorDirection !== 0) {
          weights[f.name] -= 0.5; // Penalize wrong signals
        }
        weights[f.name] = Math.max(2, Math.min(35, weights[f.name])); // constrain weights
        totalWeight += weights[f.name];
      });
      
      Object.keys(weights).forEach(k => {
        weights[k] = (weights[k] / totalWeight) * 100;
      });
      
      localStorage.setItem('nifty_adaptive_weights', JSON.stringify(weights));
    }
  } catch (e) {
    console.warn('Learning process failed', e);
  }
}

function savePredictionForLearning(score: number, factors: PredictionFactor[], targetDate: string) {
  try {
    const toSave: HistoricalPrediction = {
      date: targetDate,
      predictedScore: score,
      factors: factors.map(f => ({ name: f.name, signal: f.signal, weight: f.weight }))
    };
    
    let historyArray: HistoricalPrediction[] = [];
    const existingStr = localStorage.getItem('nifty_prediction_history');
    if (existingStr) {
      const parsed = JSON.parse(existingStr);
      historyArray = Array.isArray(parsed) ? parsed : [parsed];
    }
    
    // Remove if already exists for target date
    historyArray = historyArray.filter(h => h.date !== targetDate);
    // Add new and keep last 10
    historyArray.unshift(toSave);
    historyArray = historyArray.slice(0, 10);
    
    localStorage.setItem('nifty_prediction_history', JSON.stringify(historyArray));
  } catch (e) {}
}

// ==================== Main Prediction Function ====================

export async function computeLivePrediction(): Promise<PredictionResult | null> {
  try {
    // Fetch Nifty 50 historical data (3 months daily)
    const niftyData = await fetchChartData('%5ENSEI', '3mo', '1d');
    if (!niftyData || niftyData.data.closes.length < 30) {
      console.error('Insufficient Nifty 50 data for prediction');
      return null;
    }
    
    const { meta, data } = niftyData;
    const { closes, highs, lows, volumes } = data;
    
    // Calculate all factors
    const trend = calcTrendFactor(closes);
    const momentum = calcMomentumFactor(closes);
    const volume = calcVolumeFactor(volumes);
    const sentiment = await calcNewsSentimentFactor();
    const globalCues = await calcGlobalCuesFactor();
    const volatility = calcVolatilityFactor(closes, highs, lows);
    const institutional = calcInstitutionalFactor(closes, volumes);
    
    // Adaptive Machine Learning: Adjust weights based on past performance
    evaluateAndLearn(meta.regularMarketPrice, meta.previousClose);
    const weights = getAdaptiveWeights();
    
    // Weighted score dynamically populated
    const factors: PredictionFactor[] = [
      { name: 'Trend (EMA Crossover)', weight: weights['Trend (EMA Crossover)'], signal: trend.signal, description: trend.description, icon: 'TrendingUp' },
      { name: 'Momentum (RSI + MACD)', weight: weights['Momentum (RSI + MACD)'], signal: momentum.signal, description: momentum.description, icon: 'Zap' },
      { name: 'Volume Profile', weight: weights['Volume Profile'], signal: volume.signal, description: volume.description, icon: 'BarChart3' },
      { name: 'Market Sentiment', weight: weights['Market Sentiment'], signal: sentiment.signal, description: sentiment.description, icon: 'Newspaper' },
      { name: 'Global Cues (US Markets)', weight: weights['Global Cues (US Markets)'], signal: globalCues.signal, description: globalCues.description, icon: 'Globe' },
      { name: 'Volatility (ATR)', weight: weights['Volatility (ATR)'], signal: volatility.signal, description: volatility.description, icon: 'Activity' },
      { name: 'Institutional Flow (OBV)', weight: weights['Institutional Flow (OBV)'], signal: institutional.signal, description: institutional.description, icon: 'Users' },
    ];
    
    const totalScore = factors.reduce((sum, f) => sum + (f.weight / 100) * f.signal, 0);
    
    // Determine prediction
    let prediction: PredictionResult['prediction'];
    if (totalScore > 0.5) prediction = 'Strong Bullish';
    else if (totalScore > 0.2) prediction = 'Bullish';
    else if (totalScore > -0.2) prediction = 'Neutral';
    else if (totalScore > -0.5) prediction = 'Bearish';
    else prediction = 'Strong Bearish';
    
    // Confidence calculation
    const confidence = Math.min(95, Math.max(30, Math.round(50 + Math.abs(totalScore) * 50)));
    
    // Predicted range based on ATR
    const atr14 = (() => {
      let sum = 0;
      for (let i = closes.length - 14; i < closes.length; i++) {
        sum += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1]));
      }
      return sum / 14;
    })();
    
    const currentPrice = meta.regularMarketPrice;
    const predictedRangeLow = Math.round(currentPrice - atr14 * 0.8);
    const predictedRangeHigh = Math.round(currentPrice + atr14 * 0.8);
    
    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2);
    
    const targetDate = tomorrow.toISOString().split('T')[0];
    savePredictionForLearning(totalScore, factors, targetDate);
    
    // Generate Options setup based on predicted score and ATR
    const optionsSetup = generateOptionsSetup(currentPrice, totalScore, atr14, totalScore > 0);
    
    return {
      date: targetDate,
      prediction,
      score: Math.round(totalScore * 100) / 100,
      confidence,
      factors,
      predictedRange: { low: predictedRangeLow, high: predictedRangeHigh },
      previousClose: currentPrice,
      optionsSetup,
    };
  } catch (error) {
    console.error('Prediction computation failed:', error);
    return null;
  }
}
