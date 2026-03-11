/**
 * Real-Time News Scraper Engine
 * Scrapes Yahoo Finance and Google News via RSS
 * Uses dictionary-based sentiment analysis and keyword matching to find affected stocks
 * Works 100% in the browser (Serverless/Static friendly)
 */

import type { NewsArticle } from '../types';

// Simple in-memory cache to prevent spamming
let newsCache: { data: NewsArticle[]; timestamp: number } | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// ==================== Sentiment Dictionary ====================
const POSITIVE_WORDS = new Set(['surge', 'jump', 'gain', 'profit', 'growth', 'dividend', 'high', 'record', 'buy', 'bull', 'bullish', 'up', 'soar', 'strong', 'positive', 'beat', 'rally', 'upgrade', 'success', 'expand', 'boost', 'promising']);
const NEGATIVE_WORDS = new Set(['plunge', 'fall', 'drop', 'loss', 'decline', 'crash', 'low', 'sell', 'bear', 'bearish', 'down', 'weak', 'negative', 'miss', 'downgrade', 'fail', 'shrink', 'cut', 'slump', 'crisis', 'debt', 'risk']);

function analyzeSentiment(text: string): { label: 'bullish' | 'bearish' | 'neutral', score: number } {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  let score = 0;
  
  words.forEach(word => {
    if (POSITIVE_WORDS.has(word)) score += 0.2;
    if (NEGATIVE_WORDS.has(word)) score -= 0.2;
  });

  // Cap score between -1 and 1
  score = Math.max(-1, Math.min(1, score));
  
  if (score > 0.15) return { label: 'bullish', score };
  if (score < -0.15) return { label: 'bearish', score };
  return { label: 'neutral', score };
}

// ==================== Stock Impact Matching ====================
const KNOWN_TICKERS: Record<string, string[]> = {
  // Indian
  'RELIANCE': ['reliance', 'ambani', 'jio'],
  'TCS': ['tcs', 'tata consultancy'],
  'HDFCBANK': ['hdfc'],
  'INFY': ['infosys', 'infy'],
  'ICICIBANK': ['icici'],
  'SBIN': ['sbi', 'state bank of india'],
  'TATAMOTORS': ['tata motors', 'jlr', 'jaguar'],
  'BAJFINANCE': ['bajaj finance'],
  'HINDUNILVR': ['hul', 'unilever'],
  'WIPRO': ['wipro'],
  // US
  'AAPL': ['apple', 'iphone', 'mac'],
  'MSFT': ['microsoft', 'windows', 'azure'],
  'GOOGL': ['google', 'alphabet', 'youtube'],
  'AMZN': ['amazon', 'aws', 'bezos'],
  'NVDA': ['nvidia', 'gpu', 'jensen'],
  'TSLA': ['tesla', 'elon musk', 'ev'],
  'META': ['meta', 'facebook', 'instagram']
};

function findAffectedStocks(text: string): string[] {
  const affected: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [ticker, keywords] of Object.entries(KNOWN_TICKERS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      affected.push(ticker);
    }
  }
  return affected.slice(0, 3); // Max 3 tags
}

// ==================== RSS Parsing ====================

async function fetchRssFeed(url: string, sourceName: string): Promise<NewsArticle[]> {
  try {
    // Use allorigins to bypass CORS for client-side RSS fetching
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];
    
    const json = await response.json();
    const xmlText = json.contents;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    const items = Array.from(doc.querySelectorAll('item'));
    
    return items.map((item, index) => {
      const title = item.querySelector('title')?.textContent || '';
      const link = item.querySelector('link')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
      const description = item.querySelector('description')?.textContent || '';
      
      const fullText = (title + ' ' + description);
      const { label, score } = analyzeSentiment(fullText);
      const affectedTickers = findAffectedStocks(fullText);
      const fullTextLower = fullText.toLowerCase();
      
      let category = 'Market';
      if (fullTextLower.includes('earnings') || fullTextLower.includes('profit')) category = 'Earnings';
      if (fullTextLower.includes('ai') || fullTextLower.includes('tech')) category = 'Technology';
      
      // Calculate Nifty 50 impact level
      let impactScore = Math.abs(score);
      const NIFTY_KEYWORDS = ['nifty', 'nse', 'bse', 'sensex', 'rbi', 'finance minister', 'sebi', 'inflation'];
      const mentionsNifty = NIFTY_KEYWORDS.some(kw => fullTextLower.includes(kw));
      
      if (mentionsNifty) impactScore += 0.4;
      if (affectedTickers.length > 1) impactScore += 0.2;
      if (sourceName === 'Google News India') impactScore += 0.1;
      
      const isHighImpact = impactScore > 0.45;
      if (isHighImpact && !affectedTickers.includes('NIFTY50')) {
          affectedTickers.unshift('NIFTY50');
      }

      return {
        id: `${sourceName}-${index}-${Date.now()}`,
        title,
        summary: description.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...', // Strip HTML tags
        source: sourceName,
        url: link,
        publishedAt: new Date(pubDate).toISOString(),
        sentiment: label,
        sentimentScore: score,
        tickers: affectedTickers,
        category,
        impactLevel: isHighImpact ? 'high' : (impactScore > 0.25 ? 'medium' : 'low')
      };
    });
  } catch (err) {
    console.error(`Failed to fetch ${sourceName}:`, err);
    return [];
  }
}

/** Fetch live news from multiple sources */
export async function fetchLiveNews(): Promise<NewsArticle[]> {
  // Use cache if fresh
  if (newsCache && (Date.now() - newsCache.timestamp) < CACHE_DURATION) {
    return newsCache.data;
  }

  // Fetch US and Indian news in parallel
  const [yahooNews, googleNews] = await Promise.all([
    fetchRssFeed('https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,QQQ,AAPL,MSFT,TSLA,NVDA,GOOGL,AMZN,META&region=US&lang=en-US', 'Yahoo Finance'),
    fetchRssFeed('https://news.google.com/rss/search?q=stock+market+india+OR+NSE+OR+BSE+OR+Nifty+OR+Sensex&hl=en-IN&gl=IN&ceid=IN:en', 'Google News India')
  ]);

  // Combine and sort by date descending
  const allNews = [...yahooNews, ...googleNews].sort((a, b) => 
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Take top 50
  const topNews = allNews.slice(0, 50);

  // Save to cache
  if (topNews.length > 0) {
    newsCache = { data: topNews, timestamp: Date.now() };
  }

  return topNews;
}
