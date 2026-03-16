import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, TrendingUp, Bitcoin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SearchResult {
  symbol: string;
  name: string;
  type: 'stock' | 'crypto';
  exchange?: string;
  market?: string;
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchTickers = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    setIsOpen(true);

    try {
      // 1. Search Yahoo Finance for Stocks
      const yahooUrl = `/api/yahoo/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=4&newsCount=0`;
      const yahooRes = await fetch(yahooUrl);
      let stockResults: SearchResult[] = [];
      if (yahooRes.ok) {
        const yahooData = await yahooRes.json();
        if (yahooData.quotes) {
          stockResults = yahooData.quotes
            .filter((q: any) => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
            .map((q: any) => ({
              symbol: q.symbol,
              name: q.shortname || q.longname,
              type: 'stock' as const,
              exchange: q.exchDisp,
              market: q.exchange === 'NSI' || q.exchange === 'BSE' ? 'IN' : 'US'
            }));
        }
      }

      // 2. Search CoinGecko for Crypto
      const cgUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchQuery)}`;
      const cgRes = await fetch(cgUrl);
      let cryptoResults: SearchResult[] = [];
      if (cgRes.ok) {
        const cgData = await cgRes.json();
        if (cgData.coins) {
          cryptoResults = cgData.coins.slice(0, 3).map((c: any) => ({
            symbol: c.symbol.toUpperCase(), // e.g. BTC
            name: c.name,
            type: 'crypto' as const,
          }));
        }
      }

      setResults([...stockResults, ...cryptoResults]);
    } catch (error) {
      console.error('Search failed', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchTickers(query);
    }, 400); // 400ms debounce
    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    if (result.type === 'stock') {
      navigate(`/analysis?stock=${result.symbol}`);
    } else {
      navigate(`/crypto?coin=${result.symbol}&name=${encodeURIComponent(result.name)}`);
    }
  };

  return (
    <div ref={wrapperRef} className="search-bar-container" style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
      <div className="search-input-wrapper" style={{ position: 'relative' }}>
        <input 
          type="text" 
          placeholder="Search stocks, crypto, ETFs..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          className="search-input"
          style={{
            width: '100%',
            padding: '10px 16px 10px 42px',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            outline: 'none',
            transition: 'all 0.2s',
          }}
        />
        <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          {isSearching ? <Loader2 size={18} className="spinner" /> : <Search size={18} />}
        </div>
      </div>

      {isOpen && results.length > 0 && (
        <div className="search-dropdown" style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '8px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          {results.map((r, i) => (
            <div 
              key={`${r.symbol}-${i}`} 
              onClick={() => handleSelect(r)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: i < results.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}
              className="search-result-item"
            >
              <div style={{ marginRight: '12px', color: r.type === 'stock' ? 'var(--accent-blue)' : 'var(--orange)' }}>
                {r.type === 'stock' ? <TrendingUp size={18} /> : <Bitcoin size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.symbol}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.name} • {r.type === 'stock' ? r.exchange : 'Crypto'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
