import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Wifi, WifiOff, Loader, Search } from 'lucide-react';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import type { CandlestickData, HistogramData, Time } from 'lightweight-charts';

interface StockOption {
  symbol: string;
  yahoo: string;
  name: string;
  market: 'IN' | 'US';
}

const STOCK_LIST: StockOption[] = [
  { symbol: 'NIFTY50', yahoo: '%5ENSEI', name: 'Nifty 50 Index', market: 'IN' },
  { symbol: 'SENSEX', yahoo: '%5EBSESN', name: 'BSE Sensex', market: 'IN' },
  { symbol: 'BANKNIFTY', yahoo: '%5ENSEBANK', name: 'Bank Nifty', market: 'IN' },
  { symbol: 'RELIANCE', yahoo: 'RELIANCE.NS', name: 'Reliance Industries', market: 'IN' },
  { symbol: 'TCS', yahoo: 'TCS.NS', name: 'Tata Consultancy', market: 'IN' },
  { symbol: 'HDFCBANK', yahoo: 'HDFCBANK.NS', name: 'HDFC Bank', market: 'IN' },
  { symbol: 'INFY', yahoo: 'INFY.NS', name: 'Infosys Ltd', market: 'IN' },
  { symbol: 'ICICIBANK', yahoo: 'ICICIBANK.NS', name: 'ICICI Bank', market: 'IN' },
  { symbol: 'TATAMOTORS', yahoo: 'TATAMOTORS.NS', name: 'Tata Motors', market: 'IN' },
  { symbol: 'SBIN', yahoo: 'SBIN.NS', name: 'State Bank of India', market: 'IN' },
  { symbol: 'AAPL', yahoo: 'AAPL', name: 'Apple Inc', market: 'US' },
  { symbol: 'MSFT', yahoo: 'MSFT', name: 'Microsoft Corp', market: 'US' },
  { symbol: 'GOOGL', yahoo: 'GOOGL', name: 'Alphabet Inc', market: 'US' },
  { symbol: 'AMZN', yahoo: 'AMZN', name: 'Amazon.com Inc', market: 'US' },
  { symbol: 'NVDA', yahoo: 'NVDA', name: 'NVIDIA Corp', market: 'US' },
  { symbol: 'TSLA', yahoo: 'TSLA', name: 'Tesla Inc', market: 'US' },
  { symbol: 'META', yahoo: 'META', name: 'Meta Platforms', market: 'US' },
];

const TIMEFRAMES = [
  { label: '1D', range: '1d', interval: '5m' },
  { label: '5D', range: '5d', interval: '15m' },
  { label: '1M', range: '1mo', interval: '1h' },
  { label: '3M', range: '3mo', interval: '1d' },
  { label: '6M', range: '6mo', interval: '1d' },
  { label: '1Y', range: '1y', interval: '1d' },
  { label: '2Y', range: '2y', interval: '1wk' },
  { label: '5Y', range: '5y', interval: '1wk' },
];

interface Indicators {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  ema9: number;
  ema21: number;
  sma50: number;
  sma200: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  currentPrice: number;
  prevClose: number;
  volume: number;
  avgVolume: number;
  dayHigh: number;
  dayLow: number;
}

function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length === 0) return [];
  const ema: number[] = [prices[0]];
  const k = 2 / (period + 1);
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function computeIndicators(closes: number[], volumes: number[], meta: any): Indicators {
  // RSI
  let rsi = 50;
  if (closes.length >= 15) {
    let gains = 0, losses = 0;
    for (let i = closes.length - 14; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const rs = (gains / 14) / ((losses / 14) || 0.001);
    rsi = 100 - (100 / (1 + rs));
  }

  // MACD
  let macd = { macd: 0, signal: 0, histogram: 0 };
  if (closes.length >= 26) {
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calculateEMA(macdLine, 9);
    macd = {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram: macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1],
    };
  }

  // EMAs
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);

  // SMAs
  const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : closes[closes.length - 1];
  const sma200 = closes.length >= 200 ? closes.slice(-200).reduce((a, b) => a + b, 0) / 200 : sma50;

  // Bollinger Bands
  const bbPeriod = 20;
  const bbSlice = closes.slice(-bbPeriod);
  const bbMiddle = bbSlice.reduce((a, b) => a + b, 0) / bbSlice.length;
  const stdDev = Math.sqrt(bbSlice.reduce((sum, v) => sum + Math.pow(v - bbMiddle, 2), 0) / bbSlice.length);
  const bbUpper = bbMiddle + 2 * stdDev;
  const bbLower = bbMiddle - 2 * stdDev;

  const avgVol = volumes.length >= 20
    ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    : volumes.reduce((a, b) => a + b, 0) / (volumes.length || 1);

  return {
    rsi,
    macd,
    ema9: ema9[ema9.length - 1] || 0,
    ema21: ema21[ema21.length - 1] || 0,
    sma50,
    sma200,
    bbUpper,
    bbMiddle,
    bbLower,
    currentPrice: meta.regularMarketPrice || closes[closes.length - 1],
    prevClose: meta.previousClose || meta.chartPreviousClose || 0,
    volume: meta.regularMarketVolume || (volumes[volumes.length - 1] || 0),
    avgVolume: avgVol,
    dayHigh: meta.regularMarketDayHigh || 0,
    dayLow: meta.regularMarketDayLow || 0,
  };
}

export default function Analysis() {
  const [searchParams] = useSearchParams();
  const stockParam = searchParams.get('stock');
  const initialStock = (stockParam ? STOCK_LIST.find(s => s.symbol === stockParam) : null) || STOCK_LIST[0];

  const [selectedStock, setSelectedStock] = useState<StockOption>(initialStock);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[3]); // default 3M
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  const filteredStocks = STOCK_LIST.filter(s =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadChartData = useCallback(async () => {
    if (!chartContainerRef.current) return;
    setLoading(true);

    try {
      const url = `/api/yahoo/v8/finance/chart/${selectedStock.yahoo}?range=${timeframe.range}&interval=${timeframe.interval}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API returned ${response.status}`);

      const json = await response.json();
      const result = json?.chart?.result?.[0];
      if (!result) throw new Error('No chart data');

      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const opens: (number | null)[] = quote.open || [];
      const highList: (number | null)[] = quote.high || [];
      const lowList: (number | null)[] = quote.low || [];
      const closeList: (number | null)[] = quote.close || [];
      const volList: (number | null)[] = quote.volume || [];

      // Build candle data
      const candles: CandlestickData[] = [];
      const volumeData: HistogramData[] = [];
      const validCloses: number[] = [];
      const validVolumes: number[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        if (opens[i] == null || highList[i] == null || lowList[i] == null || closeList[i] == null) continue;

        const time = timestamps[i] as Time;
        candles.push({
          time,
          open: opens[i] as number,
          high: highList[i] as number,
          low: lowList[i] as number,
          close: closeList[i] as number,
        });

        const vol = volList[i] || 0;
        const isUp = (closeList[i] as number) >= (opens[i] as number);
        volumeData.push({
          time,
          value: vol as number,
          color: isUp ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)',
        });

        validCloses.push(closeList[i] as number);
        validVolumes.push(vol as number);
      }

      if (candles.length === 0) throw new Error('No valid candle data');

      // Compute indicators
      const indics = computeIndicators(validCloses, validVolumes, result.meta);
      setIndicators(indics);
      setIsLive(true);

      // Destroy previous chart
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }

      // Create chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: 'rgba(139, 148, 168, 0.8)',
          fontFamily: "'SF Mono', 'Fira Code', monospace",
        },
        grid: {
          vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
          horzLines: { color: 'rgba(42, 46, 57, 0.3)' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 420,
        crosshair: {
          mode: 0,
          vertLine: { color: 'rgba(99, 102, 241, 0.4)', style: 3 },
          horzLine: { color: 'rgba(99, 102, 241, 0.4)', style: 3 },
        },
        rightPriceScale: { borderColor: 'rgba(42, 46, 57, 0.5)' },
        timeScale: { borderColor: 'rgba(42, 46, 57, 0.5)', timeVisible: true, secondsVisible: false },
      });

      chartRef.current = chart;

      // Candlestick series (v5 API)
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
      candleSeries.setData(candles);

      // Volume series (v5 API)
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(volumeData);

      // Fit content
      chart.timeScale().fitContent();

      // Handle resize
      const handleResize = () => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);

    } catch (err) {
      console.error('Failed to load chart data:', err);
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  }, [selectedStock, timeframe]);

  useEffect(() => {
    loadChartData();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [loadChartData]);

  const getVerdict = () => {
    if (!indicators) return { label: 'Loading...', color: 'var(--text-muted)', signals: 0, total: 0 };
    let bullish = 0, bearish = 0;

    if (indicators.rsi < 30) bullish++; else if (indicators.rsi > 70) bearish++; else bullish += 0.5;
    if (indicators.macd.histogram > 0) bullish++; else bearish++;
    if (indicators.ema9 > indicators.ema21) bullish++; else bearish++;
    if (indicators.currentPrice > indicators.sma50) bullish++; else bearish++;
    if (indicators.currentPrice > indicators.sma200) bullish++; else bearish++;
    if (indicators.currentPrice < indicators.bbLower) bullish++; else if (indicators.currentPrice > indicators.bbUpper) bearish++;
    if (indicators.volume > indicators.avgVolume * 1.1) bullish += 0.5; else if (indicators.volume < indicators.avgVolume * 0.8) bearish += 0.5;

    const total = 7;
    const b = Math.round(bullish);
    if (b >= 5) return { label: 'Strong Buy', color: 'var(--green)', signals: b, total };
    if (b >= 4) return { label: 'Buy', color: '#22c55e', signals: b, total };
    if (b >= 3) return { label: 'Neutral', color: 'var(--yellow)', signals: b, total };
    if (b >= 2) return { label: 'Sell', color: '#f97316', signals: b, total };
    return { label: 'Strong Sell', color: 'var(--red)', signals: b, total };
  };

  const verdict = getVerdict();
  const currSymbol = selectedStock.market === 'IN' ? '₹' : '$';

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h1 className="page-title">
              <BarChart3 size={24} style={{ marginRight: 10, verticalAlign: 'middle' }} />
              Technical Analysis
            </h1>
            <p className="page-subtitle">Real-time charts & indicators from Yahoo Finance</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.3)' }}>
                <Wifi size={12} color="var(--green)" />
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>LIVE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Stock Selector + Timeframe */}
        <div className="filter-bar" style={{ flexWrap: 'wrap' }}>
          {/* Stock search */}
          <div style={{ position: 'relative', minWidth: 250 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 2 }} />
            <input
              className="search-input"
              style={{ paddingLeft: 34, width: '100%' }}
              placeholder="Search stock..."
              value={searchQuery || `${selectedStock.symbol} — ${selectedStock.name}`}
              onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => { setSearchQuery(''); setShowDropdown(true); }}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            />
            {showDropdown && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)', maxHeight: 300, overflowY: 'auto', zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                {filteredStocks.map(s => (
                  <div
                    key={s.symbol}
                    style={{
                      padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: s.symbol === selectedStock.symbol ? 'var(--bg-tertiary)' : 'transparent',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                    onMouseDown={() => {
                      setSelectedStock(s);
                      setSearchQuery('');
                      setShowDropdown(false);
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.symbol}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.name}</div>
                    </div>
                    <span className={`badge ${s.market === 'IN' ? 'badge-intraday' : 'badge-swing'}`} style={{ fontSize: '0.6rem' }}>
                      {s.market === 'IN' ? '🇮🇳' : '🇺🇸'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeframe buttons */}
          <div className="filter-group">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.label}
                className={`filter-btn ${timeframe.label === tf.label ? 'active' : ''}`}
                onClick={() => setTimeframe(tf)}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Current price display */}
          {indicators && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}>
                {currSymbol}{indicators.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className={`metric-change ${(indicators.currentPrice - indicators.prevClose) >= 0 ? 'positive' : 'negative'}`}>
                {(indicators.currentPrice - indicators.prevClose) >= 0 ? '+' : ''}
                {(indicators.currentPrice - indicators.prevClose).toFixed(2)}
                {' '}({(((indicators.currentPrice - indicators.prevClose) / indicators.prevClose) * 100).toFixed(2)}%)
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="card" style={{ position: 'relative', padding: 'var(--space-sm)' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,14,23,0.7)', zIndex: 10, borderRadius: 'var(--radius-lg)' }}>
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto' }} />
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 12 }}>Loading {selectedStock.symbol} chart...</div>
              </div>
            </div>
          )}
          <div ref={chartContainerRef} style={{ width: '100%', minHeight: 420 }} />
        </div>

        {/* Technical Indicators Grid */}
        {indicators && (
          <div className="section-gap">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--space-md)' }}>Technical Indicators</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-md)' }}>
              {/* RSI */}
              <IndicatorCard
                name="RSI (14)"
                value={indicators.rsi.toFixed(1)}
                signal={indicators.rsi < 30 ? 'bullish' : indicators.rsi > 70 ? 'bearish' : 'neutral'}
                description={indicators.rsi > 70 ? 'Overbought — potential pullback' : indicators.rsi < 30 ? 'Oversold — potential bounce' : 'Neutral momentum'}
                barPct={indicators.rsi}
                barColor={indicators.rsi > 70 ? 'var(--red)' : indicators.rsi < 30 ? 'var(--green)' : 'var(--accent-blue)'}
              />

              {/* MACD */}
              <IndicatorCard
                name="MACD"
                value={`${indicators.macd.macd.toFixed(2)} / ${indicators.macd.signal.toFixed(2)}`}
                signal={indicators.macd.histogram > 0 ? 'bullish' : 'bearish'}
                description={`Histogram: ${indicators.macd.histogram > 0 ? '+' : ''}${indicators.macd.histogram.toFixed(2)} — ${indicators.macd.histogram > 0 ? 'Bullish momentum' : 'Bearish momentum'}`}
                barPct={50 + indicators.macd.histogram * 0.5}
                barColor={indicators.macd.histogram > 0 ? 'var(--green)' : 'var(--red)'}
              />

              {/* Moving Averages */}
              <IndicatorCard
                name="Moving Averages"
                value={`EMA9: ${indicators.ema9.toFixed(1)}`}
                signal={indicators.ema9 > indicators.ema21 ? 'bullish' : 'bearish'}
                description={`EMA21: ${indicators.ema21.toFixed(1)} | SMA50: ${indicators.sma50.toFixed(1)} | ${indicators.ema9 > indicators.ema21 ? '9 > 21 → Uptrend' : '9 < 21 → Downtrend'}`}
                barPct={indicators.ema9 > indicators.ema21 ? 70 : 30}
                barColor={indicators.ema9 > indicators.ema21 ? 'var(--green)' : 'var(--red)'}
              />

              {/* Bollinger Bands */}
              <IndicatorCard
                name="Bollinger Bands (20,2)"
                value={`${currSymbol}${indicators.bbLower.toFixed(1)} — ${currSymbol}${indicators.bbUpper.toFixed(1)}`}
                signal={indicators.currentPrice < indicators.bbLower ? 'bullish' : indicators.currentPrice > indicators.bbUpper ? 'bearish' : 'neutral'}
                description={`Mid: ${currSymbol}${indicators.bbMiddle.toFixed(1)} | Price ${indicators.currentPrice < indicators.bbLower ? 'below lower band → oversold' : indicators.currentPrice > indicators.bbUpper ? 'above upper band → overbought' : 'within bands'}`}
                barPct={Math.min(100, Math.max(0, ((indicators.currentPrice - indicators.bbLower) / (indicators.bbUpper - indicators.bbLower)) * 100))}
                barColor="var(--accent-blue)"
              />

              {/* Volume */}
              <IndicatorCard
                name="Volume Analysis"
                value={formatLargeNum(indicators.volume)}
                signal={indicators.volume > indicators.avgVolume * 1.2 ? 'bullish' : indicators.volume < indicators.avgVolume * 0.7 ? 'bearish' : 'neutral'}
                description={`Avg 20d: ${formatLargeNum(indicators.avgVolume)} | ${((indicators.volume / indicators.avgVolume - 1) * 100).toFixed(0)}% ${indicators.volume > indicators.avgVolume ? 'above' : 'below'} average`}
                barPct={Math.min(100, (indicators.volume / (indicators.avgVolume * 2)) * 100)}
                barColor={indicators.volume > indicators.avgVolume ? 'var(--green)' : 'var(--yellow)'}
              />

              {/* Day Range */}
              <IndicatorCard
                name="Day Range"
                value={`${currSymbol}${indicators.dayLow.toLocaleString()} — ${currSymbol}${indicators.dayHigh.toLocaleString()}`}
                signal="neutral"
                description={`Current: ${currSymbol}${indicators.currentPrice.toLocaleString()} | Prev Close: ${currSymbol}${indicators.prevClose.toLocaleString()}`}
                barPct={indicators.dayHigh > indicators.dayLow ? ((indicators.currentPrice - indicators.dayLow) / (indicators.dayHigh - indicators.dayLow)) * 100 : 50}
                barColor="var(--accent-blue)"
              />
            </div>

            {/* Technical Verdict */}
            <div className="card" style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
                Combined Technical Verdict for {selectedStock.symbol}
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: verdict.color, marginTop: 8 }}>
                {verdict.label}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                {verdict.signals}/{verdict.total} indicators bullish
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IndicatorCard({ name, value, signal, description, barPct, barColor }: {
  name: string; value: string; signal: string; description: string; barPct: number; barColor: string;
}) {
  const signalColor = signal === 'bullish' ? 'var(--green)' : signal === 'bearish' ? 'var(--red)' : 'var(--yellow)';
  return (
    <div className="card" style={{ padding: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{name}</span>
        <span className={`badge badge-${signal}`}>{signal.charAt(0).toUpperCase() + signal.slice(1)}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, marginBottom: 6 }}>{value}</div>
      <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${Math.max(2, Math.min(100, barPct))}%`, height: '100%', background: barColor, borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>{description}</div>
    </div>
  );
}

function formatLargeNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n || 0);
}
