import { useState, useEffect, useMemo } from 'react';
import { Newspaper, RefreshCw, Bell, ExternalLink, AlertTriangle, TrendingUp, TrendingDown, Minus, Wifi } from 'lucide-react';
import { fetchLiveNews } from '../services/liveNews';
import { mockNews } from '../data/mockData';
import { sendNotification, requestNotificationPermission, sendTestNotification } from '../engine/notifications';
import type { NewsArticle } from '../types';

export default function News() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const liveNews = await fetchLiveNews();
      if (liveNews.length > 0) {
        setNews(liveNews);
        setIsLive(true);
      } else {
        // Fallback to mock data
        setNews(mockNews);
        setIsLive(false);
      }
      setLastRefresh(new Date());
    } catch {
      setNews(mockNews);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchNews, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredNews = useMemo(() => {
    return news.filter(n => {
      if (filter !== 'all' && n.sentiment !== filter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.tickers.some(t => t.toLowerCase().includes(q));
      }
      return true;
    });
  }, [news, filter, searchQuery]);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
    if (granted) sendTestNotification();
  };

  const handleSimulateAlert = (article: NewsArticle) => {
    sendNotification({
      title: `${article.sentiment === 'bullish' ? '🟢' : article.sentiment === 'bearish' ? '🔴' : '🟡'} ${article.tickers[0] || 'Market'}`,
      body: article.title,
      type: 'news',
    });
  };

  const sentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp size={14} />;
      case 'bearish': return <TrendingDown size={14} />;
      default: return <Minus size={14} />;
    }
  };

  const sentimentCounts = useMemo(() => ({
    bullish: news.filter(n => n.sentiment === 'bullish').length,
    bearish: news.filter(n => n.sentiment === 'bearish').length,
    neutral: news.filter(n => n.sentiment === 'neutral').length,
  }), [news]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">
              <Newspaper size={24} style={{ marginRight: 10, verticalAlign: 'middle' }} />
              News Feed
            </h1>
            <p className="page-subtitle">
              {isLive ? 'Real-time financial news from Alpha Vantage with AI sentiment' : '24/7 financial news with AI-powered sentiment analysis'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <Wifi size={12} color="var(--green)" />
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>LIVE</span>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleEnableNotifications}>
              <Bell size={14} />
              {notifEnabled ? 'Notifications ON' : 'Enable Alerts'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={fetchNews} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spinner' : ''} />
              {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-group">
            {(['all', 'bullish', 'bearish', 'neutral'] as const).map(f => (
              <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <input
            className="search-input"
            placeholder="🔍 Search news, tickers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
            {filteredNews.length} articles
          </span>
        </div>

        {/* Sentiment Summary */}
        <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {[
            { label: 'Bullish', count: sentimentCounts.bullish, color: 'var(--green)', bg: 'var(--green-bg)' },
            { label: 'Bearish', count: sentimentCounts.bearish, color: 'var(--red)', bg: 'var(--red-bg)' },
            { label: 'Neutral', count: sentimentCounts.neutral, color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', textAlign: 'center', border: `1px solid ${s.color}22` }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: s.color }}>{s.count}</div>
              <div style={{ fontSize: '0.75rem', color: s.color, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Loading state */}
        {loading && news.length === 0 && (
          <div className="loading-center" style={{ flexDirection: 'column', minHeight: 300 }}>
            <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            <div style={{ marginTop: 'var(--space-md)', fontSize: '0.9rem' }}>Fetching live news from Alpha Vantage...</div>
          </div>
        )}

        {/* News List */}
        <div className="news-list stagger">
          {filteredNews.map(article => (
            <div
              key={article.id}
              className="news-card slide-up"
              onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
            >
              <div className="news-card-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 4, flexWrap: 'wrap' }}>
                    {article.impactLevel === 'high' && <AlertTriangle size={14} color="var(--orange)" />}
                    <span className={`badge badge-${article.sentiment}`}>
                      {sentimentIcon(article.sentiment)}
                      {article.sentiment}
                    </span>
                    <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
                      {article.category}
                    </span>
                    {article.impactLevel === 'high' && (
                      <span className="badge" style={{ background: 'rgba(249, 115, 22, 0.1)', color: 'var(--orange)', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                        HIGH IMPACT
                      </span>
                    )}
                  </div>
                  <h3 className="news-card-title">{article.title}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, minWidth: 80 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: getSentimentColor(article.sentimentScore) }}>
                    {article.sentimentScore > 0 ? '+' : ''}{article.sentimentScore.toFixed(2)}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px' }}
                    onClick={(e) => { e.stopPropagation(); handleSimulateAlert(article); }}
                    title="Send notification"
                  >
                    <Bell size={12} />
                  </button>
                </div>
              </div>

              {expandedId === article.id && (
                <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <p className="news-card-summary">{article.summary}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-md)' }}>
                    <div className="news-tickers">
                      {article.tickers.map(t => (
                        <span key={t} className="news-ticker-tag">{t}</span>
                      ))}
                    </div>
                    <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" onClick={e => e.stopPropagation()}>
                      <ExternalLink size={12} /> Read Full
                    </a>
                  </div>
                </div>
              )}

              <div className="news-card-meta">
                <span>{article.source}</span>
                <span>•</span>
                <span>{getTimeAgo(article.publishedAt)}</span>
                {article.tickers.length > 0 && (
                  <>
                    <span>•</span>
                    <div className="news-tickers" style={{ display: 'inline-flex' }}>
                      {article.tickers.slice(0, 3).map(t => (
                        <span key={t} className="news-ticker-tag">{t}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredNews.length === 0 && !loading && (
          <div className="empty-state">
            <h3>No articles match your search</h3>
            <p>Try different keywords or filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function getSentimentColor(score: number): string {
  if (score > 0.15) return 'var(--green)';
  if (score < -0.15) return 'var(--red)';
  return 'var(--yellow)';
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
