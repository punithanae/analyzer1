/**
 * Live News Service using Alpha Vantage News Sentiment API
 * Fetches real financial news with AI-powered sentiment scores
 */

import type { NewsArticle } from '../types';
import { getApiConfig } from './api';

interface AlphaVantageNewsItem {
  title: string;
  url: string;
  time_published: string;
  authors: string[];
  summary: string;
  source: string;
  category_within_source: string;
  source_domain: string;
  topics: { topic: string; relevance_score: string }[];
  overall_sentiment_score: number;
  overall_sentiment_label: string;
  ticker_sentiment?: {
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }[];
}

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

function formatPublishTime(timeStr: string): string {
  // Alpha Vantage format: "20230615T120000"
  const year = timeStr.slice(0, 4);
  const month = timeStr.slice(4, 6);
  const day = timeStr.slice(6, 8);
  const hour = timeStr.slice(9, 11);
  const min = timeStr.slice(11, 13);
  return `${year}-${month}-${day}T${hour}:${min}:00Z`;
}

/**
 * Fetch live financial news from Alpha Vantage
 */
export async function fetchLiveNews(tickers?: string): Promise<NewsArticle[]> {
  const config = getApiConfig();
  const apiKey = config.alphaVantageKey;
  
  if (!apiKey) {
    console.warn('Alpha Vantage API key not configured');
    return [];
  }

  try {
    let url = `/api/alphavantage/query?function=NEWS_SENTIMENT&apikey=${apiKey}&sort=LATEST&limit=50`;
    
    if (tickers) {
      url += `&tickers=${tickers}`;
    } else {
      // Default: Indian and US market tickers
      url += `&topics=financial_markets,economy_monetary,technology`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.Note || data['Information']) {
      // Rate limited or error
      console.warn('Alpha Vantage API rate limit or error:', data.Note || data['Information']);
      return [];
    }

    const feed: AlphaVantageNewsItem[] = data.feed || [];

    return feed.map((item, index): NewsArticle => {
      const sentiment = mapSentiment(item.overall_sentiment_label, item.overall_sentiment_score);
      const tickers = (item.ticker_sentiment || []).map(ts => ts.ticker).slice(0, 5);
      const category = item.topics?.[0]?.topic?.replace(/_/g, ' ') || 'General';

      return {
        id: `av-${index}-${item.time_published}`,
        title: item.title,
        summary: item.summary,
        source: item.source,
        url: item.url,
        publishedAt: formatPublishTime(item.time_published),
        sentiment,
        sentimentScore: item.overall_sentiment_score,
        tickers,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        impactLevel: mapImpact(item.overall_sentiment_score),
      };
    });
  } catch (error) {
    console.error('Failed to fetch Alpha Vantage news:', error);
    return [];
  }
}
