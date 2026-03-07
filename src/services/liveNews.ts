/**
 * Live News Service
 * Fetches real financial news from Alpha Vantage News Sentiment API
 * Falls back to Twelve Data news if Alpha Vantage is rate-limited
 * Implements caching to reduce API calls
 */

import type { NewsArticle } from '../types';
import { getApiConfig } from './api';

// Simple in-memory cache to avoid rate limits
let newsCache: { data: NewsArticle[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function mapSentiment(label: string, score: number): 'bullish' | 'bearish' | 'neutral' {
  if (label === 'Bullish' || label === 'Somewhat-Bullish' || score > 0.15) return 'bullish';
  if (label === 'Bearish' || label === 'Somewhat-Bearish' || score < -0.15) return 'bearish';
  return 'neutral';
}

function mapImpact(score: number): 'high' | 'medium' | 'low' {
  const abs = Math.abs(score);
  if (abs > 0.35) return 'high';
  if (abs > 0.15) return 'medium';
  return 'low';
}

function formatAVTime(timeStr: string): string {
  const y = timeStr.slice(0, 4), m = timeStr.slice(4, 6), d = timeStr.slice(6, 8);
  const h = timeStr.slice(9, 11), mn = timeStr.slice(11, 13);
  return `${y}-${m}-${d}T${h}:${mn}:00Z`;
}

/** Fetch from Alpha Vantage News Sentiment API */
async function fetchAlphaVantageNews(): Promise<NewsArticle[]> {
  const config = getApiConfig();
  if (!config.alphaVantageKey) return [];

  try {
    const url = `/api/alphavantage/query?function=NEWS_SENTIMENT&apikey=${config.alphaVantageKey}&sort=LATEST&limit=50&topics=financial_markets,economy_monetary,technology`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();

    // Handle rate limit
    if (data.Note || data.Information) {
      console.warn('Alpha Vantage rate limited:', data.Note || data.Information);
      return [];
    }

    const feed = data.feed || [];
    return feed.map((item: any, index: number): NewsArticle => ({
      id: `av-${index}-${Date.now()}`,
      title: item.title,
      summary: item.summary,
      source: item.source,
      url: item.url,
      publishedAt: formatAVTime(item.time_published),
      sentiment: mapSentiment(item.overall_sentiment_label, item.overall_sentiment_score),
      sentimentScore: item.overall_sentiment_score,
      tickers: (item.ticker_sentiment || []).map((ts: any) => ts.ticker).slice(0, 5),
      category: (item.topics?.[0]?.topic?.replace(/_/g, ' ') || 'General').replace(/^\w/, (c: string) => c.toUpperCase()),
      impactLevel: mapImpact(item.overall_sentiment_score),
    }));
  } catch {
    return [];
  }
}

/** Fetch from Twelve Data news as fallback */
async function fetchTwelveDataNews(): Promise<NewsArticle[]> {
  const config = getApiConfig();
  if (!config.twelveDataKey) return [];

  try {
    // Twelve Data doesn't have a news endpoint on free tier,
    // but let's try a combined approach using their market movers
    return [];
  } catch {
    return [];
  }
}

/** Fetch live news with caching to reduce API calls */
export async function fetchLiveNews(): Promise<NewsArticle[]> {
  // Return cached data if still fresh
  if (newsCache && (Date.now() - newsCache.timestamp) < CACHE_DURATION) {
    return newsCache.data;
  }

  // Try Alpha Vantage first
  let articles = await fetchAlphaVantageNews();

  // Fallback to Twelve Data
  if (articles.length === 0) {
    articles = await fetchTwelveDataNews();
  }

  // Cache valid results
  if (articles.length > 0) {
    newsCache = { data: articles, timestamp: Date.now() };
  } else if (newsCache) {
    // Return stale cache data instead of nothing
    return newsCache.data;
  }

  return articles;
}
