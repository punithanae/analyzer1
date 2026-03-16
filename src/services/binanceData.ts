/**
 * Real-Time Binance Data Service
 * Utilizes the free public Binance API to get pro-level data without requiring authentication.
 */

export interface CryptoQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h: number;
  low24h: number;
}

export interface CryptoHistoricalData {
  timestamps: number[];
  opens: number[];
  closes: number[];
  highs: number[];
  lows: number[];
  volumes: number[];
}

export interface CryptoDetails {
  id: string;
  symbol: string;
  name: string;
  description: string;
  genesisDate: string;
  hashingAlgorithm: string;
  categories: string[];
  homepage: string;
  githubStars: number;
  twitterFollowers: number;
  marketCapRank: number;
}

const CRYPTO_MAP: Record<string, string> = {
  'BTCUSDT': 'Bitcoin',
  'ETHUSDT': 'Ethereum',
  'SOLUSDT': 'Solana',
  'BNBUSDT': 'BNB',
  'XRPUSDT': 'XRP',
  'ADAUSDT': 'Cardano',
  'AVAXUSDT': 'Avalanche',
  'DOGEUSDT': 'Dogecoin',
  'LINKUSDT': 'Chainlink',
  'MATICUSDT': 'Polygon',
  'DOTUSDT': 'Polkadot',
};

const CACHE_DURATION = 2000; // 2 seconds
const priceCache = new Map<string, { data: any; expiry: number }>();

/**
 * Fetch 24hr ticker data for multiple symbols
 */
export async function fetchLiveCryptos(): Promise<CryptoQuote[]> {
  try {
    const symbolsParam = JSON.stringify(Object.keys(CRYPTO_MAP));
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;
    
    // Simple caching mechanism
    const cached = priceCache.get('all_cryptos');
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    
    const quotes: CryptoQuote[] = data.map((item: any) => {
      const price = parseFloat(item.lastPrice);
      const prevClose = parseFloat(item.prevClosePrice) || price; // Binance 24hr might not have prevClose, can use openPrice
      const open = parseFloat(item.openPrice);
      const change = price - open;
      
      return {
        symbol: item.symbol.replace('USDT', ''), // 'BTCUSDT' -> 'BTC'
        name: CRYPTO_MAP[item.symbol] || item.symbol,
        price,
        change,
        changePercent: parseFloat(item.priceChangePercent),
        volume: parseFloat(item.quoteVolume), // Using USDT volume
        high24h: parseFloat(item.highPrice),
        low24h: parseFloat(item.lowPrice),
      };
    });

    priceCache.set('all_cryptos', { data: quotes, expiry: Date.now() + CACHE_DURATION });
    return quotes;
  } catch (err) {
    console.error('Failed to fetch crypto data from Binance', err);
    return [];
  }
}

/**
 * Fetch historical data (klines/candlesticks)
 * @param symbol Full symbol like 'BTCUSDT'
 * @param interval e.g., '1d', '1h', '15m'
 * @param limit Number of candles to return
 */
export async function fetchCryptoHistoricalData(symbol: string = 'BTCUSDT', interval: string = '1d', limit: number = 365): Promise<CryptoHistoricalData | null> {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    
    // Binance klines format:
    // [
    //   [
    //     1499040000000,      // Kline open time
    //     "0.01634790",       // Open price
    //     "0.80000000",       // High price
    //     "0.01575800",       // Low price
    //     "0.01577100",       // Close price
    //     "148976.11427815",  // Volume
    //     1499644799999,      // Kline Close time
    //     "2434.19055334",    // Quote asset volume
    //     308,                // Number of trades
    //     "1756.87402397",    // Taker buy base asset volume
    //     "28.46694368",      // Taker buy quote asset volume
    //     "0"                 // Unused field, ignore.
    //   ]
    // ]

    const timestamps: number[] = [];
    const opens: number[] = [];
    const closes: number[] = [];
    const highs: number[] = [];
    const lows: number[] = [];
    const volumes: number[] = [];

    data.forEach((candle: any[]) => {
      timestamps.push(candle[0]);
      opens.push(parseFloat(candle[1]));
      highs.push(parseFloat(candle[2]));
      lows.push(parseFloat(candle[3]));
      closes.push(parseFloat(candle[4]));
      volumes.push(parseFloat(candle[5])); // Base asset volume
    });

    return { timestamps, opens, closes, highs, lows, volumes };
  } catch (error) {
    console.error('Failed to fetch crypto historical data from Binance', error);
    return null;
  }
}

/**
 * Fetch extremely detailed coin information from CoinGecko
 * @param symbol e.g., 'BTC'
 */
export async function fetchCryptoDetails(symbol: string): Promise<CryptoDetails | null> {
  try {
    // 1. First get the CoinGecko ID from the search endpoint
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();
    
    // Exact match symbol
    const coin = searchData.coins?.find((c: any) => c.symbol.toUpperCase() === symbol.toUpperCase());
    if (!coin) return null;

    // 2. Fetch full details using the ID
    const detailsUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true&sparkline=false`;
    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) return null;
    const data = await detailsRes.json();

    return {
      id: data.id,
      symbol: data.symbol,
      name: data.name,
      description: data.description?.en || 'No description available.',
      genesisDate: data.genesis_date || 'Unknown',
      hashingAlgorithm: data.hashing_algorithm || 'N/A',
      categories: data.categories || [],
      homepage: data.links?.homepage?.[0] || '',
      githubStars: data.developer_data?.stars || 0,
      twitterFollowers: data.community_data?.twitter_followers || 0,
      marketCapRank: data.market_cap_rank || 0,
    };
  } catch (error) {
    console.error('Failed to fetch detailed crypto info from CoinGecko', error);
    return null;
  }
}
