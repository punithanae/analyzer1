import { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Eye, Activity, Brain, Globe } from 'lucide-react';
import { fetchLiveCryptos, CryptoQuote, fetchCryptoDetails, CryptoDetails, fetchCryptoHistoricalData } from '../services/binanceData';
import { computeCryptoPrediction } from '../engine/cryptoPrediction';
import { fetchAssetNews } from '../services/liveNews';
import type { PredictionResult, NewsArticle } from '../types';
import { useLocation } from 'react-router-dom';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { CandlestickData, HistogramData, Time } from 'lightweight-charts';
import { mockNews } from '../data/mockData';

export default function Crypto() {
  const [cryptos, setCryptos] = useState<CryptoQuote[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [details, setDetails] = useState<CryptoDetails | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialCoin = searchParams.get('coin') ? `${searchParams.get('coin')}USDT` : 'BTCUSDT';
  const [selectedCrypto, setSelectedCrypto] = useState(initialCoin);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  // Fetch live crypto prices
  useEffect(() => {
    const fetchData = async () => {
      try {
        const liveCryptos = await fetchLiveCryptos();
        if (liveCryptos.length > 0) setCryptos(liveCryptos);
      } catch (e) {
        console.error(e);
      }
      setIsLoading(false);
    };

    fetchData(); // initial fetch
    const interval = setInterval(fetchData, 3000); // refresh every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch prediction and details on crypto select
  useEffect(() => {
    const loadChartData = async () => {
      setPrediction(null);
      setDetails(null);
      setIsAnalyzing(true);
      
      const symbolBase = selectedCrypto.replace('USDT', '');
      
      try {
          const [pred, det, hist] = await Promise.all([
             computeCryptoPrediction(selectedCrypto),
             fetchCryptoDetails(symbolBase),
             fetchCryptoHistoricalData(selectedCrypto, '1d', 365)
          ]);
          
          setPrediction(pred);
          setDetails(det);

          if (hist && chartContainerRef.current) {
            if (chartRef.current) {
                chartRef.current.remove();
            }

            const chart = createChart(chartContainerRef.current, {
                layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: 'rgba(139, 148, 168, 0.8)', fontFamily: "'SF Mono', 'Fira Code', monospace" },
                grid: { vertLines: { color: 'rgba(42, 46, 57, 0.3)' }, horzLines: { color: 'rgba(42, 46, 57, 0.3)' } },
                width: chartContainerRef.current.clientWidth,
                height: 420,
                crosshair: { mode: 0, vertLine: { color: 'rgba(99, 102, 241, 0.4)', style: 3 }, horzLine: { color: 'rgba(99, 102, 241, 0.4)', style: 3 } },
                rightPriceScale: { borderColor: 'rgba(42, 46, 57, 0.5)' },
                timeScale: { borderColor: 'rgba(42, 46, 57, 0.5)', timeVisible: true },
            });
            chartRef.current = chart;

            const candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#10b981', downColor: '#ef4444', borderUpColor: '#10b981', borderDownColor: '#ef4444', wickUpColor: '#10b981', wickDownColor: '#ef4444' });
            const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
            chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

            const candles: CandlestickData[] = [];
            const vols: HistogramData[] = [];
            for (let i = 0; i < hist.timestamps.length; i++) {
                const time = (hist.timestamps[i] / 1000) as Time;
                candles.push({ time, open: hist.opens[i], high: hist.highs[i], low: hist.lows[i], close: hist.closes[i] });
                const isUp = hist.closes[i] >= hist.opens[i];
                vols.push({ time, value: hist.volumes[i], color: isUp ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' });
            }

            candleSeries.setData(candles);
            volumeSeries.setData(vols);
            chart.timeScale().fitContent();
          }

      } catch (e) {
          console.error(e);
      }
      setIsAnalyzing(false);
    };

    const loadNews = async () => {
      try {
         const assetNews = await fetchAssetNews(selectedCrypto.replace('USDT', '') + ' crypto');
         setNews(assetNews);
      } catch (err) {
         console.warn('News fetch failed', err);
      }
    };

    loadChartData();
    loadNews();

    const newsInterval = setInterval(loadNews, 120000); // 2 minutes

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
        clearInterval(newsInterval);
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }
    };
  }, [selectedCrypto]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pro Crypto Trading</h1>
          <p className="page-subtitle">Real-time cryptocurrency insights powered by Binance API</p>
        </div>
      </div>

      <div className="page-body">
        {/* Top Cryptos Ticker / Small Cards */}
        <div className="metric-grid stagger section-gap">
          {cryptos.slice(0, 4).map((coin) => (
            <div 
              key={coin.symbol} 
              className={`metric-card slide-up ${selectedCrypto === coin.symbol + 'USDT' ? 'active-card' : ''}`}
              onClick={() => setSelectedCrypto(coin.symbol + 'USDT')}
              style={{ cursor: 'pointer', border: selectedCrypto === coin.symbol + 'USDT' ? '1px solid var(--accent-blue)' : undefined }}
            >
              <div className="metric-label">
                {coin.changePercent >= 0 ? <TrendingUp size={14} color="var(--green)" /> : <TrendingDown size={14} color="var(--red)" />}
                {coin.name}
              </div>
              <div className="metric-value">
                ${coin.price.toLocaleString(undefined, { maximumFractionDigits: (coin.price < 1 ? 4 : 2) })}
              </div>
              <div className={`metric-change ${coin.changePercent >= 0 ? 'positive' : 'negative'}`}>
                {coin.changePercent >= 0 ? '+' : ''}{coin.changePercent.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>

        <div className="grid-2 section-gap">
          {/* Crypto Watchlist */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Eye size={16} style={{ marginRight: 8, color: 'var(--accent-cyan)' }} />
                Crypto Watchlist
              </h3>
              <span className="badge badge-intraday">LIVE</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>24h Change</th>
                    <th>24h High</th>
                    <th>24h Low</th>
                  </tr>
                </thead>
                <tbody>
                  {cryptos.map(coin => (
                    <tr 
                      key={coin.symbol} 
                      onClick={() => setSelectedCrypto(coin.symbol + 'USDT')} 
                      style={{ cursor: 'pointer', backgroundColor: selectedCrypto === coin.symbol + 'USDT' ? 'rgba(56, 189, 248, 0.1)' : 'transparent' }}
                    >
                      <td>
                        <div className="stock-symbol">{coin.symbol}</div>
                        <div className="stock-name">{coin.name}</div>
                      </td>
                      <td className="price-value">${coin.price.toLocaleString(undefined, { maximumFractionDigits: (coin.price < 1 ? 4 : 2) })}</td>
                      <td>
                        <span className={`metric-change ${coin.changePercent >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.8rem' }}>
                          {coin.changePercent >= 0 ? '+' : ''}{coin.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${coin.high24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${coin.low24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {isLoading && cryptos.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Loading Live Data...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Prediction for Selected Coin */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">
                <Brain size={16} style={{ marginRight: 8, color: 'var(--accent-purple)' }} />
                AI Analysis: {selectedCrypto.replace('USDT', '')}
              </h3>
            </div>
            
            {isAnalyzing ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <span>Analyzing 1 year of historical klines...</span>
              </div>
            ) : !prediction ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <Brain size={32} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <span>AI Prediction is currently unavailable for {selectedCrypto.replace('USDT', '')} as it lacks sufficient Binance USDT trading history.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                <div style={{ 
                  padding: 'var(--space-md)', 
                  borderRadius: 'var(--radius-lg)', 
                  background: prediction.score > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `1px solid ${prediction.score > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: prediction.score > 0 ? 'var(--green)' : 'var(--red)' }}>
                      {prediction.prediction}
                    </div>
                    <div className="confidence-meter" style={{ width: '120px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="confidence-track" style={{ flex: 1, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3 }}>
                        <div className="confidence-fill" style={{ width: `${prediction.confidence}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: '0.8rem' }}>{prediction.confidence}%</span>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    Predicted Range (Next 24hr): <strong>${prediction.predictedRange.low}</strong> - <strong>${prediction.predictedRange.high}</strong>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>Technical Factors</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                     {prediction.factors.map(f => (
                       <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                         <div>
                            <span style={{ fontWeight: 'bold' }}>{f.name}</span>
                            <div style={{ color: 'var(--text-muted)' }}>{f.description}</div>
                         </div>
                         <div style={{ color: f.signal > 0 ? 'var(--green)' : f.signal < 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                           {f.signal > 0 ? 'Bullish' : f.signal < 0 ? 'Bearish' : 'Neutral'}
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* === NEW CHART AND DEEP DETAILS SECTION === */}
        {/* Chart (Full Width) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: 'var(--space-xl)', alignItems: 'stretch' }}>
          <div className="card" style={{ position: 'relative', padding: 'var(--space-sm)' }}>
            {isAnalyzing && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,23,0.7)', zIndex: 10, borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto' }} />
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 12 }}>Loading {selectedCrypto.replace('USDT', '')} chart data...</div>
                  </div>
                </div>
            )}
            <div ref={chartContainerRef} style={{ width: '100%', minHeight: 480 }} />
          </div>
        </div>

        {/* Deep Crypto Details & News */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'stretch', marginTop: 'var(--space-xl)' }} className="slide-up">
          
          {details ? (
            <div className="card" style={{ flex: '1 1 65%', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '12px' }}>
                <h3 className="card-title">
                  <Activity size={16} style={{ marginRight: 8, color: 'var(--accent-blue)' }} />
                  Deep Analytics: {details.name} ({details.symbol.toUpperCase()})
                </h3>
              </div>
              
              <div className="grid-2" style={{ gap: '2rem', flex: 1 }}>
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>About {details.name}</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: details.description }} />
                  
                  {details.categories && details.categories.length > 0 && (
                   <div style={{ marginTop: '1.5rem' }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Categories</div>
                     <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {details.categories.map(c => <span key={c} className="badge badge-swing">{c}</span>)}
                     </div>
                   </div>
                  )}
                </div>
                
                <div>
                  <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Network & Adoption</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Genesis Date</div>
                      <div style={{ fontWeight: 600 }}>{details.genesisDate}</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hashing Algo</div>
                      <div style={{ fontWeight: 600 }}>{details.hashingAlgorithm}</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Market Cap Rank</div>
                      <div style={{ fontWeight: 600 }}>#{details.marketCapRank}</div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Community</div>
                      <div style={{ fontWeight: 600 }}>{details.twitterFollowers.toLocaleString()} <span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>Twit</span> | {details.githubStars} <span style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>★ Git</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ flex: '1 1 65%', minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px' }}>
               <Activity size={32} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
               <div style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 8 }}>Deep Analytics Unavailable</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>CoinGecko API rate limits have temporarily restricted deep profiling for {selectedCrypto.replace('USDT', '')}. Please try again later.</div>
            </div>
          )}

          {/* Related News Widget */}
          <div className="card" style={{ flex: '1 1 30%', minWidth: '300px' }}>
            <div className="card-header">
              <h3 className="card-title">
                <Globe size={16} style={{ marginRight: 8, color: 'var(--orange)' }} />
                Crypto News
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {news.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  Loading latest crypto news...
                </div>
              ) : news.map(n => (
                <div key={n.id} className="news-card" style={{ padding: 'var(--space-md)' }}>
                  <div className="news-card-header">
                    <span className="news-card-title" style={{ fontSize: '0.85rem' }}>
                       <a href={n.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{n.title}</a>
                    </span>
                    <span className={`badge badge-${n.sentiment}`}>{n.sentiment}</span>
                  </div>
                  <div className="news-card-meta">
                    <span>{n.source}</span>
                    <span>•</span>
                    <span>{new Date(n.publishedAt).toLocaleDateString()}</span>
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
