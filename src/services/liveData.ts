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

const FALLBACK_PROFILES: Record<string, Partial<DetailedStockProfile>> = {
  'RELIANCE': { sector: 'Energy', industry: 'Oil & Gas Refining & Marketing', city: 'Mumbai', country: 'India', fullTimeEmployees: 389414 },
  'TCS': { sector: 'Technology', industry: 'IT Services', city: 'Mumbai', country: 'India', fullTimeEmployees: 614795 },
  'HDFCBANK': { sector: 'Financial Services', industry: 'Banks - Regional', city: 'Mumbai', country: 'India', fullTimeEmployees: 177000 },
  'INFY': { sector: 'Technology', industry: 'IT Services', city: 'Bengaluru', country: 'India', fullTimeEmployees: 317240 },
  'ICICIBANK': { sector: 'Financial Services', industry: 'Banks - Regional', city: 'Mumbai', country: 'India', fullTimeEmployees: 130000 },
  'SBIN': { sector: 'Financial Services', industry: 'Banks - Regional', city: 'Mumbai', country: 'India', fullTimeEmployees: 235858 },
  'HINDUNILVR': { sector: 'Consumer Defensive', industry: 'Household Products', city: 'Mumbai', country: 'India', fullTimeEmployees: 16000 },
  'BAJFINANCE': { sector: 'Financial Services', industry: 'Credit Services', city: 'Pune', country: 'India', fullTimeEmployees: 35000 },
  'WIPRO': { sector: 'Technology', industry: 'IT Services', city: 'Bengaluru', country: 'India', fullTimeEmployees: 240000 },
  'TATAMOTORS': { sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', city: 'Mumbai', country: 'India', fullTimeEmployees: 82797 },
  'IOC': { sector: 'Energy', industry: 'Oil & Gas Refining & Marketing', city: 'New Delhi', country: 'India', fullTimeEmployees: 31000 },
  'BPCL': { sector: 'Energy', industry: 'Oil & Gas Refining & Marketing', city: 'Mumbai', country: 'India', fullTimeEmployees: 9000 },
  'HPCL': { sector: 'Energy', industry: 'Oil & Gas Refining & Marketing', city: 'Mumbai', country: 'India', fullTimeEmployees: 9200 },
  'ONGC': { sector: 'Energy', industry: 'Oil & Gas Exploration & Production', city: 'Dehradun', country: 'India', fullTimeEmployees: 26000 },
  'TATASTEEL': { sector: 'Basic Materials', industry: 'Steel', city: 'Mumbai', country: 'India', fullTimeEmployees: 77000 },
  'NTPC': { sector: 'Utilities', industry: 'Utilities - Independent Power Producers', city: 'New Delhi', country: 'India', fullTimeEmployees: 18000 },
  'POWERGRID': { sector: 'Utilities', industry: 'Utilities - Regulated Electric', city: 'Gurugram', country: 'India', fullTimeEmployees: 9000 },
  'COALINDIA': { sector: 'Energy', industry: 'Thermal Coal', city: 'Kolkata', country: 'India', fullTimeEmployees: 239000 },
  'AXISBANK': { sector: 'Financial Services', industry: 'Banks - Regional', city: 'Mumbai', country: 'India', fullTimeEmployees: 89000 },
  'KOTAKBANK': { sector: 'Financial Services', industry: 'Banks - Regional', city: 'Mumbai', country: 'India', fullTimeEmployees: 73000 },
  'MARUTI': { sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', city: 'New Delhi', country: 'India', fullTimeEmployees: 17000 },
  'SUNPHARMA': { sector: 'Healthcare', industry: 'Drug Manufacturers', city: 'Mumbai', country: 'India', fullTimeEmployees: 38000 },
  'TITAN': { sector: 'Consumer Cyclical', industry: 'Luxury Goods', city: 'Bengaluru', country: 'India', fullTimeEmployees: 8000 },
  'M&M': { sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', city: 'Mumbai', country: 'India', fullTimeEmployees: 42000 },
  'AAPL': { sector: 'Technology', industry: 'Consumer Electronics', city: 'Cupertino', country: 'USA', fullTimeEmployees: 161000 },
  'MSFT': { sector: 'Technology', industry: 'Software', city: 'Redmond', country: 'USA', fullTimeEmployees: 221000 },
  'GOOGL': { sector: 'Communication Services', industry: 'Internet Content', city: 'Mountain View', country: 'USA', fullTimeEmployees: 182502 },
  'AMZN': { sector: 'Consumer Cyclical', industry: 'Internet Retail', city: 'Seattle', country: 'USA', fullTimeEmployees: 1525000 },
  'NVDA': { sector: 'Technology', industry: 'Semiconductors', city: 'Santa Clara', country: 'USA', fullTimeEmployees: 29600 },
  'TSLA': { sector: 'Consumer Cyclical', industry: 'Auto Manufacturers', city: 'Austin', country: 'USA', fullTimeEmployees: 140473 },
  'META': { sector: 'Communication Services', industry: 'Internet Content', city: 'Menlo Park', country: 'USA', fullTimeEmployees: 67317 },
};

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

export interface DetailedStockProfile {
  symbol: string;
  name: string;
  longBusinessSummary: string;
  sector: string;
  industry: string;
  website: string;
  fullTimeEmployees: number;
  city: string;
  country: string;
  officers: { name: string; title: string }[];
  trailingPE: number;
  forwardPE: number;
  marketCap: number;
  dividendYield: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
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

/** Fetch detailed stock company profiles from Yahoo Finance quoteSummary */
export async function fetchDetailedStockProfile(symbol: string): Promise<DetailedStockProfile | null> {
  try {
    // We add .NS for Indian stocks if they don't have a suffix and belong to India (for dynamic searching)
    // Yahoo expects suffixes. 
    
    const url = `/api/yahoo/v10/finance/quoteSummary/${symbol}?modules=assetProfile,summaryProfile,summaryDetail,price`;
    const response = await fetch(url);
    
    let profile: any = {};
    let summary: any = {};
    let priceInfo: any = {};
    let nameToUse = symbol.replace('.NS', '').replace('.BO', '');
    let isFallback = false;

    if (response.ok) {
        const data = await response.json();
        const result = data?.quoteSummary?.result?.[0];
        if (result) {
            profile = result.assetProfile || result.summaryProfile || {};
            summary = result.summaryDetail || {};
            priceInfo = result.price || {};
            nameToUse = priceInfo.shortName || priceInfo.longName || nameToUse;
        } else {
            isFallback = true;
        }
    } else {
        isFallback = true;
    }

    let description = profile.longBusinessSummary;

    // Fallback to Alpha Vantage OVERVIEW first, then Wikipedia if Yahoo blocked us (401 Unauthorized / Invalid Crumb)
    if (isFallback || !description) {
        // Try AlphaVantage OVERVIEW
        try {
            // Adjust symbols for Alpha Vantage (e.g. .NS -> .BSE)
            const avSymbol = symbol.endsWith('.NS') ? symbol.replace('.NS', '.BSE') : symbol;
            const config = getApiConfig();
            if (config.alphaVantageKey) {
                const avRes = await fetch(`/api/alphavantage/query?function=OVERVIEW&symbol=${avSymbol}&apikey=${config.alphaVantageKey}`);
                if (avRes.ok) {
                    const avData = await avRes.json();
                    if (avData && avData.Symbol && avData.Sector && avData.Sector !== 'None') {
                        profile.sector = avData.Sector !== 'None' ? avData.Sector : profile.sector;
                        profile.industry = avData.Industry !== 'None' ? avData.Industry : profile.industry;
                        profile.fullTimeEmployees = parseInt(avData.FullTimeEmployees) || 0;
                        profile.country = avData.Country !== 'None' ? avData.Country : profile.country;
                        profile.city = avData.Address?.split(',')[1]?.trim() || '';
                        summary.marketCap = { raw: parseInt(avData.MarketCapitalization) || summary.marketCap?.raw };
                        summary.trailingPE = { raw: parseFloat(avData.PERatio) || summary.trailingPE?.raw };
                        summary.dividendYield = { raw: parseFloat(avData.DividendYield) || summary.dividendYield?.raw };
                        summary.fiftyTwoWeekHigh = { raw: parseFloat(avData['52WeekHigh']) || summary.fiftyTwoWeekHigh?.raw };
                        summary.fiftyTwoWeekLow = { raw: parseFloat(avData['52WeekLow']) || summary.fiftyTwoWeekLow?.raw };
                        
                        if (avData.Description && avData.Description !== 'None') {
                            description = avData.Description;
                        }
                        if (avData.Name && avData.Name !== 'None') {
                            nameToUse = avData.Name;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('AlphaVantage fallback failed', e);
        }

        // If we STILL don't have a description, fallback to Wikipedia for the text summary
        if (!description || description === 'None') {
            try {
                // Remove suffixes for better search
                const cleanQuery = symbol.replace('.NS', '').replace('.BO', '').replace('-USD', '');
                const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery + " company")}&utf8=&format=json&origin=*`);
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    const title = searchData?.query?.search?.[0]?.title;
                    if (title) {
                        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?origin=*`);
                        if (wikiRes.ok) {
                            const wikiData = await wikiRes.json();
                            description = wikiData.extract || 'No detailed background available from Wikipedia.';
                            if (!nameToUse || nameToUse === symbol) {
                                nameToUse = wikiData.title || nameToUse;
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Wikipedia fallback failed', e);
            }
        }
    }

    // Merge explicitly known static fallback data if the API didn't give us anything good
    const baseSym = symbol.replace('.NS', '').replace('.BO', '');
    const staticFallback = FALLBACK_PROFILES[baseSym] || {};
    
    // Check if we still have missing values, and push static fallback values over them
    if (!profile.sector || profile.sector === 'Unknown (API Restricted)') profile.sector = staticFallback.sector;
    if (!profile.industry || profile.industry === 'Unknown (API Restricted)') profile.industry = staticFallback.industry;
    if (!profile.city || profile.city === 'Unknown') profile.city = staticFallback.city;
    if (!profile.country) profile.country = staticFallback.country;
    if (!profile.fullTimeEmployees) profile.fullTimeEmployees = staticFallback.fullTimeEmployees;

    const finalDescription = description || 'Company data is currently limited due to API restrictions (Yahoo Finance 401/Alpha Vantage Rate Limits).';
    const finalSector = profile.sector && profile.sector !== 'Unknown (API Restricted)' ? profile.sector : 'Unknown';
    const finalIndustry = profile.industry && profile.industry !== 'Unknown (API Restricted)' ? profile.industry : 'Unknown';

    return {
      symbol: symbol,
      name: nameToUse,
      longBusinessSummary: finalDescription,
      sector: finalSector,
      industry: finalIndustry,
      website: profile.website || '',
      fullTimeEmployees: profile.fullTimeEmployees || 0,
      city: profile.city || 'Unknown',
      country: profile.country || '',
      officers: (profile.companyOfficers || []).map((o: any) => ({ name: o.name, title: o.title })),
      trailingPE: summary.trailingPE?.raw || 0,
      forwardPE: summary.forwardPE?.raw || 0,
      marketCap: summary.marketCap?.raw || 0,
      dividendYield: summary.dividendYield?.raw || 0,
      fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh?.raw || 0,
      fiftyTwoWeekLow: summary.fiftyTwoWeekLow?.raw || 0,
    };

  } catch (error) {
    console.error('Failed to fetch detailed stock profile:', error);
    // Return a graceful fallback instead of null so the UI doesn't disappear completely
    const baseSym = symbol.replace('.NS', '').replace('.BO', '');
    const staticFallback = FALLBACK_PROFILES[baseSym] || {};
    return {
      symbol: symbol,
      name: symbol.replace('.NS', ''),
      longBusinessSummary: 'Live company profiling is currently unavailable due to data provider rate limits.',
      sector: staticFallback.sector || 'Unavailable', 
      industry: staticFallback.industry || 'Unavailable', 
      website: '', 
      fullTimeEmployees: staticFallback.fullTimeEmployees || 0,
      city: staticFallback.city || '', 
      country: staticFallback.country || '', 
      officers: [], trailingPE: 0, forwardPE: 0, marketCap: 0,
      dividendYield: 0, fiftyTwoWeekHigh: 0, fiftyTwoWeekLow: 0
    };
  }
}
