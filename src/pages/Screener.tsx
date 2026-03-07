import { useState, useMemo, useEffect } from 'react';
import { Search, ArrowUpDown, Plus, Filter, Wifi, WifiOff } from 'lucide-react';
import { mockStocks } from '../data/mockData';
import { fetchLiveStocks } from '../services/liveData';
import type { StockQuote } from '../types';

type SortKey = 'symbol' | 'price' | 'changePercent' | 'volume' | 'marketCap' | 'pe';

export default function Screener() {
  const [market, setMarket] = useState<'ALL' | 'IN' | 'US'>('ALL');
  const [sector, setSector] = useState('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('changePercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [stocks, setStocks] = useState<StockQuote[]>(mockStocks);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const liveStocks = await fetchLiveStocks();
      if (liveStocks.length > 0) {
        setStocks(liveStocks);
        setIsLive(true);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const sectors = useMemo(() => {
    const s = new Set(stocks.map(st => st.sector));
    return ['all', ...Array.from(s)];
  }, [stocks]);

  const filtered = useMemo(() => {
    let filtered = [...stocks];
    if (market !== 'ALL') filtered = filtered.filter(s => s.market === market);
    if (sector !== 'all') filtered = filtered.filter(s => s.sector === sector);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    filtered.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return filtered;
  }, [market, sector, search, sortKey, sortDir, stocks]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <th onClick={() => handleSort(field)} style={{ cursor: 'pointer' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortKey === field && <ArrowUpDown size={12} color="var(--accent-blue)" />}
      </span>
    </th>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">
              <Filter size={24} style={{ marginRight: 10, verticalAlign: 'middle' }} />
              Stock Screener
            </h1>
            <p className="page-subtitle">Filter and analyze Indian & US stocks</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: isLive ? 'var(--green-bg)' : 'var(--red-bg)', border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            {isLive ? <Wifi size={12} color="var(--green)" /> : <WifiOff size={12} color="var(--red)" />}
            <span style={{ color: isLive ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
              {isLive ? 'LIVE' : 'DEMO'}
            </span>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="filter-bar">
          <div className="filter-group">
            {(['ALL', 'IN', 'US'] as const).map(m => (
              <button key={m} className={`filter-btn ${market === m ? 'active' : ''}`} onClick={() => setMarket(m)}>
                {m === 'ALL' ? 'All Markets' : m === 'IN' ? '🇮🇳 NSE/BSE' : '🇺🇸 NYSE/NASDAQ'}
              </button>
            ))}
          </div>

          <div className="filter-group">
            {sectors.map(s => (
              <button key={s} className={`filter-btn ${sector === s ? 'active' : ''}`} onClick={() => setSector(s)}>
                {s === 'all' ? 'All Sectors' : s}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="search-input"
              style={{ paddingLeft: 34 }}
              placeholder="Search symbol or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
            {filtered.length} stocks
          </span>
        </div>

        {/* Table */}
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <SortHeader label="Symbol" field="symbol" />
                <th>Market</th>
                <SortHeader label="Price" field="price" />
                <SortHeader label="Change %" field="changePercent" />
                <SortHeader label="Volume" field="volume" />
                <SortHeader label="Market Cap" field="marketCap" />
                <SortHeader label="P/E" field="pe" />
                <th>Sector</th>
                <th>52W Range</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(stock => {
                const pct52 = stock.high52w && stock.low52w
                  ? ((stock.price - stock.low52w) / (stock.high52w - stock.low52w)) * 100
                  : 50;
                return (
                  <tr key={stock.symbol}>
                    <td>
                      <div className="stock-symbol">{stock.symbol}</div>
                      <div className="stock-name">{stock.name}</div>
                    </td>
                    <td>
                      <span className={`badge ${stock.market === 'IN' ? 'badge-intraday' : 'badge-swing'}`}>
                        {stock.market === 'IN' ? '🇮🇳 NSE' : '🇺🇸 US'}
                      </span>
                    </td>
                    <td className="price-value">
                      {stock.market === 'IN' ? '₹' : '$'}{stock.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`metric-change ${stock.changePercent >= 0 ? 'positive' : 'negative'}`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {(stock.volume / 1000000).toFixed(1)}M
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{stock.marketCap}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{stock.pe ? stock.pe.toFixed(1) : 'N/A'}</td>
                    <td>
                      <span className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        {stock.sector}
                      </span>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{stock.low52w ? `${stock.market === 'IN' ? '₹' : '$'}${stock.low52w}` : '--'}</span>
                        <div style={{ flex: 1, height: 4, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', position: 'relative' }}>
                          <div style={{
                            position: 'absolute', left: 0, top: 0, height: '100%',
                            width: `${Math.min(Math.max(pct52, 0), 100)}%`,
                            background: pct52 > 70 ? 'var(--green)' : pct52 < 30 ? 'var(--red)' : 'var(--accent-blue)',
                            borderRadius: 'var(--radius-full)',
                          }} />
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>{stock.high52w ? `${stock.market === 'IN' ? '₹' : '$'}${stock.high52w}` : '--'}</span>
                      </div>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" title="Add to watchlist">
                        <Plus size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
