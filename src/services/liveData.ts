/**
 * Multi-Source Price Verification Engine
 * Cross-verifies prices from Yahoo Finance, Alpha Vantage, and Twelve Data
 * Uses median price when multiple sources available for maximum accuracy
 */

import type { MarketIndex, StockQuote } from '../types';
import { getApiConfig } from './api';

// ==================== Symbol Mappings ====================

interface StockMapping {
  yahoo: string;
  alphaVantage: string;
  twelveData: string;
  name: string;
  sector: string;
  market: 'IN' | 'US';
}

const INDEX_SYMBOLS: Record<string, { yahoo: string; name: string; market: 'IN' | 'US' }> = {
  'NIFTY50':   { yahoo: '%5ENSEI',    name: 'Nifty 50',   market: 'IN' },
  'SENSEX':    { yahoo: '%5EBSESN',   name: 'BSE Sensex',  market: 'IN' },
  'BANKNIFTY': { yahoo: '%5ENSEBANK', name: 'Bank Nifty',  market: 'IN' },
  'SPX':       { yahoo: '%5EGSPC',    name: 'S&P 500',     market: 'US' },
  'IXIC':      { yahoo: '%5EIXIC',    name: 'NASDAQ',      market: 'US' },
  'DJI':       { yahoo: '%5EDJI',     name: 'Dow Jones',   market: 'US' },
};

const STOCK_MAP: Record<string, StockMapping> = {
  'RELIANCE':   { yahoo: 'RELIANCE.NS',   alphaVantage: 'RELIANCE.BSE', twelveData: '',      name: 'Reliance Industries', sector: 'Energy',    market: 'IN' },
  'TCS':        { yahoo: 'TCS.NS',        alphaVantage: 'TCS.BSE',      twelveData: '',      name: 'Tata Consultancy',    sector: 'IT',         market: 'IN' },
  'HDFCBANK':   { yahoo: 'HDFCBANK.NS',   alphaVantage: 'HDFCBANK.BSE', twelveData: '',      name: 'HDFC Bank',           sector: 'Banking',    market: 'IN' },
  'INFY':       { yahoo: 'INFY.NS',       alphaVantage: 'INFY.BSE',     twelveData: '',      name: 'Infosys Ltd',         sector: 'IT',         market: 'IN' },
  'ICICIBANK':  { yahoo: 'ICICIBANK.NS',  alphaVantage: 'ICICIBANK.BSE', twelveData: '',     name: 'ICICI Bank',          sector: 'Banking',    market: 'IN' },
  'SBIN':       { yahoo: 'SBIN.NS',       alphaVantage: 'SBIN.BSE',     twelveData: '',      name: 'State Bank of India', sector: 'Banking',    market: 'IN' },
  'HINDUNILVR': { yahoo: 'HINDUNILVR.NS', alphaVantage: 'HINDUNILVR.BSE', twelveData: '',    name: 'Hindustan Unilever',  sector: 'FMCG',       market: 'IN' },
  'BAJFINANCE': { yahoo: 'BAJFINANCE.NS', alphaVantage: 'BAJFINANCE.BSE', twelveData: '',    name: 'Bajaj Finance',       sector: 'Finance',    market: 'IN' },
  'WIPRO':      { yahoo: 'WIPRO.NS',      alphaVantage: 'WIPRO.BSE',    twelveData: '',      name: 'Wipro Ltd',           sector: 'IT',         market: 'IN' },
  'TATAMOTORS': { yahoo: 'TATAMOTORS.NS', alphaVantage: 'TATAMOTORS.BSE', twelveData: '',    name: 'Tata Motors',         sector: 'Auto',       market: 'IN' },
  'AAPL':       { yahoo: 'AAPL',          alphaVantage: 'AAPL',          twelveData: 'AAPL',  name: 'Apple Inc',           sector: 'Technology', market: 'US' },
  'MSFT':       { yahoo: 'MSFT',          alphaVantage: 'MSFT',          twelveData: 'MSFT',  name: 'Microsoft Corp',      sector: 'Technology', market: 'US' },
  'GOOGL':      { yahoo: 'GOOGL',         alphaVantage: 'GOOGL',         twelveData: 'GOOGL', name: 'Alphabet Inc',        sector: 'Technology', market: 'US' },
  'AMZN':       { yahoo: 'AMZN',          alphaVantage: 'AMZN',          twelveData: 'AMZN',  name: 'Amazon.com Inc',      sector: 'Consumer',   market: 'US' },
  'NVDA':       { yahoo: 'NVDA',          alphaVantage: 'NVDA',          twelveData: 'NVDA',  name: 'NVIDIA Corp',         sector: 'Technology', market: 'US' },
  'TSLA':       { yahoo: 'TSLA',          alphaVantage: 'TSLA',          twelveData: 'TSLA',  name: 'Tesla Inc',           sector: 'Auto',       market: 'US' },
  'META':       { yahoo: 'META',          alphaVantage: 'META',          twelveData: 'META',  name: 'Meta Platforms',      sector: 'Technology', market: 'US' },
};

const TICKER_SYMBOLS = [
  { yahoo: '%5ENSEI',    label: 'NIFTY' },
  { yahoo: '%5EBSESN',   label: 'SENSEX' },
  { yahoo: '%5ENSEBANK', label: 'BANKNIFTY' },
  { yahoo: '%5EGSPC',    label: 'S&P 500' },
  { yahoo: '%5EIXIC',    label: 'NASDAQ' },
  { yahoo: '%5EDJI',     label: 'DOW' },
  { yahoo: 'GC%3DF',     label: 'GOLD' },
  { yahoo: 'CL%3DF',     label: 'CRUDE' },
  { yahoo: 'USDINR%3DX', label: 'USD/INR' },
  { yahoo: 'BTC-USD',    label: 'BTC' },
];
// ==================== API Types ====================

interface PriceResult {
  price: number;
  prevClose: number;
  high: number;
  low: number;
  volume: number;
  high52w: number;
  low52w: number;
  marketCap?: number;
  source: 'yahoo' | 'alphavantage' | 'twelvedata';
}

// ==================== Price Cache ====================
// Prevents excess API calls during fast refresh intervals
const priceCache = new Map<string, { data: PriceResult; expiry: number }>();

function getCachedPrice(key: string): PriceResult | null {
  const entry = priceCache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  return null;
}

function setCachedPrice(key: string, data: PriceResult, ttlMs: number): void {
  priceCache.set(key, { data, expiry: Date.now() + ttlMs });
}

/** Fetch from Yahoo Finance v8 Chart API (10s cache) */
async function fetchYahooPrice(symbol: string): Promise<PriceResult | null> {
  const cacheKey = `yahoo:${symbol}`;
  const cached = getCachedPrice(cacheKey);
  if (cached) return cached;
  try {
    const r = await fetch(`/api/yahoo/v8/finance/chart/${symbol}?range=1d&interval=1m`);
    if (!r.ok) return null;
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const result: PriceResult = {
      price: meta.regularMarketPrice,
      prevClose: meta.previousClose || meta.chartPreviousClose || 0,
      high: meta.regularMarketDayHigh || 0,
      low: meta.regularMarketDayLow || 0,
      volume: meta.regularMarketVolume || 0,
      high52w: meta.fiftyTwoWeekHigh || 0,
      low52w: meta.fiftyTwoWeekLow || 0,
      marketCap: meta.marketCap,
      source: 'yahoo',
    };
    setCachedPrice(cacheKey, result, 2_000); // 2s cache
    return result;
  } catch { return null; }
}

/** Fetch from Alpha Vantage GLOBAL_QUOTE */
async function fetchAlphaVantagePrice(symbol: string): Promise<PriceResult | null> {
  const config = getApiConfig();
  if (!config.alphaVantageKey || !symbol) return null;
  try {
    const r = await fetch(`/api/alphavantage/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${config.alphaVantageKey}`);
    if (!r.ok) return null;
    const j = await r.json();
    const gq = j?.['Global Quote'];
    if (!gq || !gq['05. price']) return null;
    return {
      price: parseFloat(gq['05. price']),
      prevClose: parseFloat(gq['08. previous close'] || '0'),
      high: parseFloat(gq['03. high'] || '0'),
      low: parseFloat(gq['04. low'] || '0'),
      volume: parseInt(gq['06. volume'] || '0'),
      high52w: 0,
      low52w: 0,
      source: 'alphavantage',
    };
  } catch { return null; }
}

/** Fetch from Twelve Data /price + /quote */
async function fetchTwelveDataPrice(symbol: string): Promise<PriceResult | null> {
  const config = getApiConfig();
  if (!config.twelveDataKey || !symbol) return null;
  try {
    const r = await fetch(`/api/twelvedata/quote?symbol=${symbol}&apikey=${config.twelveDataKey}`);
    if (!r.ok) return null;
    const j = await r.json();
    if (j.code || j.status === 'error' || !j.close) return null;
    return {
      price: parseFloat(j.close),
      prevClose: parseFloat(j.previous_close || '0'),
      high: parseFloat(j.high || '0'),
      low: parseFloat(j.low || '0'),
      volume: parseInt(j.volume || '0'),
      high52w: parseFloat(j.fifty_two_week?.high || '0'),
      low52w: parseFloat(j.fifty_two_week?.low || '0'),
      source: 'twelvedata',
    };
  } catch { return null; }
}

// ==================== Multi-Source Verification ====================

interface VerifiedPrice extends PriceResult {
  sources: { source: string; price: number }[];
  verified: boolean; // true if 2+ sources agree
}

async function getVerifiedPrice(mapping: StockMapping): Promise<VerifiedPrice | null> {
  // Fetch from all available sources in parallel
  const promises: Promise<PriceResult | null>[] = [
    fetchYahooPrice(mapping.yahoo),
  ];
  
  if (mapping.alphaVantage) {
    promises.push(fetchAlphaVantagePrice(mapping.alphaVantage));
  }
  if (mapping.twelveData) {
    promises.push(fetchTwelveDataPrice(mapping.twelveData));
  }

  const results = (await Promise.all(promises)).filter((r): r is PriceResult => r !== null);
  if (results.length === 0) return null;

  // Collect all source prices
  const sources = results.map(r => ({ source: r.source, price: r.price }));

  // Use median price if multiple sources
  const prices = results.map(r => r.price).sort((a, b) => a - b);
  const medianPrice = prices.length % 2 === 1
    ? prices[Math.floor(prices.length / 2)]
    : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;

  // Check if sources agree (within 1%)
  const agree = prices.length >= 2 && (prices[prices.length - 1] - prices[0]) / prices[0] < 0.01;

  // Use the result object with the best data (Yahoo usually has the most fields)
  const bestResult = results.find(r => r.source === 'yahoo') || results[0];

  return {
    ...bestResult,
    price: medianPrice,
    sources,
    verified: agree,
  };
}

// ==================== Format Helpers ====================

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return String(vol || 0);
}

function formatMarketCap(cap: number | undefined, market: 'IN' | 'US'): string {
  if (!cap) return 'N/A';
  if (market === 'IN') {
    const cr = cap / 1e7;
    if (cr >= 1e5) return `${(cr / 1e5).toFixed(1)}L Cr`;
    return `${cr.toFixed(0)} Cr`;
  }
  if (cap >= 1e12) return `$${(cap / 1e12).toFixed(1)}T`;
  if (cap >= 1e9) return `$${(cap / 1e9).toFixed(0)}B`;
  return `$${(cap / 1e6).toFixed(0)}M`;
}

// ==================== Public API ====================

/** Fetch live market indices (Yahoo Finance — only source with index data) */
export async function fetchLiveIndices(): Promise<MarketIndex[]> {
  const results = await Promise.all(
    Object.entries(INDEX_SYMBOLS).map(async ([key, config]) => {
      const quote = await fetchYahooPrice(config.yahoo);
      if (!quote) return null;
      const change = quote.price - quote.prevClose;
      return {
        symbol: key,
        name: config.name,
        price: quote.price,
        change,
        changePercent: (change / quote.prevClose) * 100,
        high: quote.high,
        low: quote.low,
        volume: formatVolume(quote.volume),
        market: config.market,
      } as MarketIndex;
    })
  );
  return results.filter((r): r is MarketIndex => r !== null);
}

/** Fetch live stocks with multi-source verification */
export async function fetchLiveStocks(): Promise<StockQuote[]> {
  const entries = Object.entries(STOCK_MAP);

  // Batch fetch: 4 at a time to avoid rate limits
  const stocks: StockQuote[] = [];
  const batchSize = 4;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async ([key, mapping]) => {
        const verified = await getVerifiedPrice(mapping);
        if (!verified) return null;

        const change = verified.price - verified.prevClose;
        return {
          symbol: key,
          name: mapping.name,
          price: verified.price,
          change,
          changePercent: verified.prevClose ? (change / verified.prevClose) * 100 : 0,
          volume: verified.volume,
          marketCap: formatMarketCap(verified.marketCap, mapping.market),
          pe: 0,
          sector: mapping.sector,
          market: mapping.market,
          high52w: verified.high52w,
          low52w: verified.low52w,
          // Extra: verification info
          _sources: verified.sources,
          _verified: verified.verified,
        } as StockQuote & { _sources?: { source: string; price: number }[]; _verified?: boolean };
      })
    );
    stocks.push(...results.filter((s): s is StockQuote => s !== null));
  }

  return stocks;
}

/** Fetch ticker strip data */
export async function fetchTickerData(): Promise<{ symbol: string; price: string; change: string; positive: boolean }[]> {
  const results = await Promise.all(
    TICKER_SYMBOLS.map(async (t) => {
      const quote = await fetchYahooPrice(t.yahoo);
      if (!quote) return { symbol: t.label, price: '--', change: '--', positive: true };
      const change = quote.price - quote.prevClose;
      const prefix = ['GOLD', 'CRUDE', 'BTC'].includes(t.label) ? '$' : '';
      return {
        symbol: t.label,
        price: `${prefix}${quote.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        change: `${change >= 0 ? '+' : ''}${change.toFixed(2)}`,
        positive: change >= 0,
      };
    })
  );
  return results;
}
