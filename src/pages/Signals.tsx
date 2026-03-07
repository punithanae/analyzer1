import { useState, useEffect } from 'react';
import { Zap, Wifi, Loader, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { generateLiveSignals } from '../engine/signals';
import type { TradingSignal, SignalAction, SignalType } from '../types';

export default function Signals() {
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [filterAction, setFilterAction] = useState<'ALL' | SignalAction>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | SignalType>('ALL');
  const [filterMarket, setFilterMarket] = useState<'ALL' | 'IN' | 'US'>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const result = await generateLiveSignals();
      setSignals(result);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to generate signals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
    // Refresh signals every 5 minutes
    const interval = setInterval(fetchSignals, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filtered = signals.filter(s => {
    if (filterAction !== 'ALL' && s.action !== filterAction) return false;
    if (filterType !== 'ALL' && s.type !== filterType) return false;
    if (filterMarket !== 'ALL' && s.market !== filterMarket) return false;
    return true;
  });

  const actionIcon = (action: SignalAction) => {
    if (action === 'BUY') return <TrendingUp size={14} />;
    if (action === 'SELL') return <TrendingDown size={14} />;
    return <Minus size={14} />;
  };

  if (loading && signals.length === 0) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <h1 className="page-title">
            <Zap size={24} style={{ marginRight: 10, verticalAlign: 'middle', color: 'var(--yellow)' }} />
            AI Trading Signals
          </h1>
          <p className="page-subtitle">Computing signals from real market data...</p>
        </div>
        <div className="page-body">
          <div className="loading-center" style={{ flexDirection: 'column', minHeight: 400 }}>
            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
            <div style={{ marginTop: 'var(--space-md)', fontSize: '1rem', fontWeight: 600 }}>
              Analyzing 12 stocks...
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', maxWidth: 400, textAlign: 'center', marginTop: 'var(--space-sm)' }}>
              Fetching 3 months of data for each stock, computing RSI, MACD, EMA crossovers, and volume analysis to generate real-time trading signals...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">
              <Zap size={24} style={{ marginRight: 10, verticalAlign: 'middle', color: 'var(--yellow)' }} />
              AI Trading Signals
            </h1>
            <p className="page-subtitle">Real-time Buy / Sell / Hold signals powered by live technical analysis</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Wifi size={12} color="var(--green)" />
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>LIVE</span>
            </div>
            {lastUpdate && (
              <button className="btn btn-ghost btn-sm" onClick={fetchSignals} disabled={loading} style={{ fontSize: '0.7rem', gap: 4 }}>
                <RefreshCw size={12} className={loading ? 'spinner' : ''} />
                {lastUpdate.toLocaleTimeString()}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-group">
            {(['ALL', 'BUY', 'SELL', 'HOLD'] as const).map(a => (
              <button key={a} className={`filter-btn ${filterAction === a ? 'active' : ''}`} onClick={() => setFilterAction(a)}>
                {a === 'ALL' ? 'All Signals' : a}
              </button>
            ))}
          </div>
          <div className="filter-group">
            {(['ALL', 'intraday', 'swing', 'positional'] as const).map(t => (
              <button key={t} className={`filter-btn ${filterType === t ? 'active' : ''}`} onClick={() => setFilterType(t)}>
                {t === 'ALL' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="filter-group">
            {(['ALL', 'IN', 'US'] as const).map(m => (
              <button key={m} className={`filter-btn ${filterMarket === m ? 'active' : ''}`} onClick={() => setFilterMarket(m)}>
                {m === 'ALL' ? 'All' : m === 'IN' ? '🇮🇳' : '🇺🇸'}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
            {filtered.length} signals
          </span>
        </div>

        {/* Signal Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-md)' }} className="stagger">
          {filtered.map(sig => {
            const curr = sig.market === 'IN' ? '₹' : '$';
            const isExpanded = expandedId === sig.id;
            return (
              <div
                key={sig.id}
                className={`signal-card ${sig.action.toLowerCase()} slide-up`}
                onClick={() => setExpandedId(isExpanded ? null : sig.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Header */}
                <div className="signal-header">
                  <div>
                    <span className="signal-stock">{sig.symbol}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 8 }}>
                      {sig.market === 'IN' ? '🇮🇳' : '🇺🇸'} {sig.name}
                    </span>
                  </div>
                  <span className={`badge badge-${sig.action.toLowerCase()}`} style={{ fontSize: '0.8rem', padding: '4px 14px' }}>
                    {actionIcon(sig.action)} {sig.action}
                  </span>
                </div>

                {/* Type + Confidence */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                  <span className={`badge badge-${sig.type}`}>{sig.type.toUpperCase()}</span>
                  <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.1rem' }}>
                    Confidence: <span style={{ color: sig.confidence >= 70 ? 'var(--green)' : sig.confidence >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                      {sig.confidence}%
                    </span>
                  </span>
                </div>

                {/* Price Targets */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Entry</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem' }}>
                      {curr}{sig.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--green)', textTransform: 'uppercase' }}>🎯 Target</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--green)' }}>
                      {curr}{sig.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.6rem', color: 'var(--red)', textTransform: 'uppercase' }}>⛔ Stop Loss</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--red)' }}>
                      {curr}{sig.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Reasoning */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-sm)' }}>
                  {sig.reasoning}
                </div>

                {/* Factor breakdown (expanded) */}
                {isExpanded && (
                  <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
                    {sig.factors.map((f, i) => {
                      const fColor = f.signal === 'bullish' ? 'var(--green)' : f.signal === 'bearish' ? 'var(--red)' : 'var(--yellow)';
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 8 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: 80 }}>{f.name}</span>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(10, f.strength)}%`, height: '100%', background: fColor, borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: fColor, fontWeight: 600, minWidth: 30, textAlign: 'right' }}>
                            {f.strength}%
                          </span>
                        </div>
                      );
                    })}
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                      {sig.factors.map(f => f.description).join(' | ')}
                    </div>
                  </div>
                )}

                {/* Generated time */}
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                  Generated: {new Date(sig.generatedAt).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="empty-state">
            <h3>No signals match your filters</h3>
            <p>Try changing the filters above to see more signals.</p>
          </div>
        )}
      </div>
    </div>
  );
}
