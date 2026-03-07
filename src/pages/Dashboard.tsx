import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Eye, BarChart3, Zap, Bell, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { mockIndices, mockStocks, mockSignals, mockNews, tickerData as mockTickerData } from '../data/mockData';
import { fetchLiveIndices, fetchLiveStocks, fetchTickerData } from '../services/liveData';
import type { MarketIndex, StockQuote } from '../types';

const REFRESH_INTERVAL = 5000; // 5 seconds

export default function Dashboard() {
  const navigate = useNavigate();
  const [watchlistMarket, setWatchlistMarket] = useState<'ALL' | 'IN' | 'US'>('ALL');
  const [indices, setIndices] = useState<MarketIndex[]>(mockIndices);
  const [stocks, setStocks] = useState<StockQuote[]>(mockStocks);
  const [tickerItems, setTickerItems] = useState(mockTickerData);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch live data
  const fetchAllData = async () => {
    try {
      const [liveIndices, liveStocks, liveTicker] = await Promise.all([
        fetchLiveIndices(),
        fetchLiveStocks(),
        fetchTickerData(),
      ]);

      if (liveIndices.length > 0) {
        setIndices(liveIndices);
        setIsLive(true);
      }
      if (liveStocks.length > 0) {
        setStocks(liveStocks);
      }
      if (liveTicker.length > 0) {
        setTickerItems(liveTicker);
      }
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch live data:', err);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately
    fetchAllData();

    // Auto-refresh every 5 seconds
    intervalRef.current = setInterval(fetchAllData, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const watchlistStocks = useMemo(() => {
    if (watchlistMarket === 'ALL') return stocks.slice(0, 10);
    return stocks.filter(s => s.market === watchlistMarket).slice(0, 10);
  }, [watchlistMarket, stocks]);

  const topGainers = useMemo(() =>
    [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5),
  [stocks]);

  const topLosers = useMemo(() =>
    [...stocks].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
  [stocks]);

  const latestSignals = mockSignals.slice(0, 3);
  const latestNews = mockNews.slice(0, 4);

  return (
    <div className="fade-in">
      {/* Ticker Strip */}
      <div className="ticker-strip">
        <div className="ticker-content">
          {[...tickerItems, ...tickerItems].map((t, i) => (
            <div key={i} className="ticker-item">
              <span className="ticker-symbol">{t.symbol}</span>
              <span className="ticker-price">{t.price}</span>
              <span className={`metric-change ${t.positive ? 'positive' : 'negative'}`}>
                {t.change}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Market overview — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: isLive ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              {isLive ? <Wifi size={12} color="var(--green)" /> : <WifiOff size={12} color="var(--red)" />}
              <span style={{ color: isLive ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {isLive ? 'LIVE' : 'DEMO'}
              </span>
            </div>
            {lastUpdate && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <RefreshCw size={10} className={isLoading ? 'spinner' : ''} />
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Market Indices */}
        <div className="section-gap">
          <div className="metric-grid stagger">
            {indices.map((idx) => (
              <div key={idx.symbol} className="metric-card slide-up" onClick={() => navigate(`/analysis?stock=${idx.symbol}`)} style={{ cursor: 'pointer' }}>
                <div className="metric-label">
                  {idx.change >= 0 ? <TrendingUp size={14} color="var(--green)" /> : <TrendingDown size={14} color="var(--red)" />}
                  {idx.name}
                  <span className={`badge ${idx.market === 'IN' ? 'badge-intraday' : 'badge-swing'}`} style={{ marginLeft: 'auto', fontSize: '0.6rem' }}>
                    {idx.market === 'IN' ? '🇮🇳 NSE' : '🇺🇸 US'}
                  </span>
                </div>
                <div className="metric-value" style={{ color: idx.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {idx.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
                <div className={`metric-change ${idx.change >= 0 ? 'positive' : 'negative'}`}>
                  {idx.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {idx.change >= 0 ? '+' : ''}{idx.change.toFixed(2)} ({idx.changePercent >= 0 ? '+' : ''}{idx.changePercent.toFixed(2)}%)
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  H: {idx.high.toLocaleString()} | L: {idx.low.toLocaleString()} | Vol: {idx.volume}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two Column: Top Movers + Quick Signals */}
        <div className="grid-2 section-gap">
          {/* Top Movers */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <BarChart3 size={16} style={{ marginRight: 8, color: 'var(--accent-blue)' }} />
                Top Movers
                {isLive && <span style={{ fontSize: '0.6rem', color: 'var(--green)', marginLeft: 8 }}>● LIVE</span>}
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              {/* Gainers */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>
                  🔥 Top Gainers
                </div>
                {topGainers.map(s => (
                  <div key={s.symbol} onClick={() => navigate(`/analysis?stock=${s.symbol}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                    <div>
                      <div className="stock-symbol">{s.symbol}</div>
                      <div className="stock-name">{s.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="metric-change positive" style={{ fontSize: '0.75rem' }}>
                        +{s.changePercent.toFixed(2)}%
                      </span>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {s.market === 'IN' ? '₹' : '$'}{s.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Losers */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>
                  📉 Top Losers
                </div>
                {topLosers.map(s => (
                  <div key={s.symbol} onClick={() => navigate(`/analysis?stock=${s.symbol}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
                    <div>
                      <div className="stock-symbol">{s.symbol}</div>
                      <div className="stock-name">{s.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="metric-change negative" style={{ fontSize: '0.75rem' }}>
                        {s.changePercent.toFixed(2)}%
                      </span>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {s.market === 'IN' ? '₹' : '$'}{s.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Signals */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Zap size={16} style={{ marginRight: 8, color: 'var(--yellow)' }} />
                Latest AI Signals
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {latestSignals.map(sig => (
                <div key={sig.id} className={`signal-card ${sig.action.toLowerCase()}`} style={{ padding: 'var(--space-md)' }}>
                  <div className="signal-header">
                    <div>
                      <span className="signal-stock">{sig.symbol}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 8 }}>{sig.market === 'IN' ? '🇮🇳' : '🇺🇸'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge badge-${sig.action.toLowerCase()}`}>{sig.action}</span>
                      <span className={`badge badge-${sig.type}`}>{sig.type}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    <span>Confidence: <strong style={{ color: sig.confidence > 75 ? 'var(--green)' : 'var(--yellow)' }}>{sig.confidence}%</strong></span>
                    <span>Target: {sig.market === 'IN' ? '₹' : '$'}{sig.targetPrice.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Two Column: Watchlist + News */}
        <div className="grid-2 section-gap">
          {/* Watchlist */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Eye size={16} style={{ marginRight: 8, color: 'var(--accent-cyan)' }} />
                Watchlist
                {isLive && <span style={{ fontSize: '0.6rem', color: 'var(--green)', marginLeft: 8 }}>● LIVE</span>}
              </h3>
              <div className="filter-group">
                {(['ALL', 'IN', 'US'] as const).map(m => (
                  <button key={m} className={`filter-btn ${watchlistMarket === m ? 'active' : ''}`} onClick={() => setWatchlistMarket(m)}>
                    {m === 'ALL' ? 'All' : m === 'IN' ? '🇮🇳 India' : '🇺🇸 US'}
                  </button>
                ))}
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>Change</th>
                  <th>Vol</th>
                </tr>
              </thead>
              <tbody>
                {watchlistStocks.map(s => (
                  <tr key={s.symbol} onClick={() => navigate(`/analysis?stock=${s.symbol}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className="stock-symbol">{s.symbol}</div>
                      <div className="stock-name">{s.name}</div>
                    </td>
                    <td className="price-value">{s.market === 'IN' ? '₹' : '$'}{s.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`metric-change ${s.change >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.8rem' }}>
                        {s.change >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                      {(s.volume / 1000000).toFixed(1)}M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Breaking News Sidebar */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Bell size={16} style={{ marginRight: 8, color: 'var(--orange)' }} />
                Breaking News
              </h3>
              <span className="nav-badge">LIVE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {latestNews.map(n => (
                <div key={n.id} className="news-card" style={{ padding: 'var(--space-md)' }}>
                  <div className="news-card-header">
                    <span className="news-card-title" style={{ fontSize: '0.85rem' }}>{n.title}</span>
                    <span className={`badge badge-${n.sentiment}`}>{n.sentiment}</span>
                  </div>
                  <div className="news-card-meta">
                    <span>{n.source}</span>
                    <span>•</span>
                    <span>{getTimeAgo(n.publishedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
