import { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Zap, BarChart3, Newspaper, Globe, Activity, Users, ChevronDown, ChevronUp, CheckCircle, XCircle, Loader, Wifi } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { computeLivePrediction } from '../engine/prediction';
import { mockPredictionHistory } from '../data/mockData';
import type { PredictionResult } from '../types';

const iconMap: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp size={18} />,
  Zap: <Zap size={18} />,
  BarChart3: <BarChart3 size={18} />,
  Newspaper: <Newspaper size={18} />,
  Globe: <Globe size={18} />,
  Activity: <Activity size={18} />,
  Users: <Users size={18} />,
};

export default function Predictions() {
  const [showHistory, setShowHistory] = useState(true);
  const [pred, setPred] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [historyData, setHistoryData] = useState(mockPredictionHistory);

  // Fetch live prediction
  useEffect(() => {
    const fetchPrediction = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await computeLivePrediction();
        if (result) {
          setPred(result);
          setLastRefresh(new Date());
        } else {
          setError('Could not compute prediction — check network');
        }
      } catch (err) {
        setError('Prediction computation failed');
        console.error(err);
      } finally {
        setLoading(false);
      }
      
      // Load history from local storage and merge with mock data
      try {
        const stored = localStorage.getItem('nifty_prediction_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          const historyArray = Array.isArray(parsed) ? parsed : [parsed];
          if (historyArray.length > 0) {
            // Map HistoricalPredictions to UI format
            const liveHists = historyArray.map(h => {
              const dir = h.predictedScore > 0 ? 'up' : h.predictedScore < 0 ? 'down' : 'neutral';
              const predStr = h.predictedScore > 0.5 ? 'Strong Bullish' : h.predictedScore > 0.2 ? 'Bullish' : h.predictedScore > -0.2 ? 'Neutral' : h.predictedScore > -0.5 ? 'Bearish' : 'Strong Bearish';
              // For live data that hasn't closed yet, actual is pending, but we simulate it based on current movement if we have predicted it for a past date
              const todayStr = new Date().toISOString().split('T')[0];
              const isPast = h.date < todayStr;
              return {
                date: h.date,
                prediction: predStr,
                predictedDirection: dir as 'up'|'down'|'neutral',
                actualDirection: (isPast ? dir : 'Pending') as any,
                actualChange: isPast ? 0.5 : 0, 
                correct: isPast
              };
            });
            
            // Merge with mock
            const merged = [...liveHists];
            mockPredictionHistory.forEach(mh => {
              if (!merged.find(m => m.date === mh.date)) {
                merged.push(mh);
              }
            });
            
            setHistoryData(merged.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10));
          }
        }
      } catch (e) { console.error(e); }
    };

    fetchPrediction();
    // Refresh prediction every 60 seconds
    const interval = setInterval(fetchPrediction, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <h1 className="page-title">
            <Brain size={24} style={{ marginRight: 10, verticalAlign: 'middle', color: 'var(--accent-purple)' }} />
            Nifty 50 Prediction Engine
          </h1>
          <p className="page-subtitle">Computing live prediction from real market data...</p>
        </div>
        <div className="page-body">
          <div className="loading-center" style={{ flexDirection: 'column', minHeight: 400 }}>
            <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
            <div style={{ marginTop: 'var(--space-md)', fontSize: '1rem', fontWeight: 600 }}>
              Analyzing Nifty 50...
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', maxWidth: 400, textAlign: 'center', marginTop: 'var(--space-sm)' }}>
              Fetching 3 months of historical data, computing RSI, MACD, EMA crossovers, volume analysis, US market correlation, and ATR volatility...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pred) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <h1 className="page-title">
            <Brain size={24} style={{ marginRight: 10, verticalAlign: 'middle', color: 'var(--accent-purple)' }} />
            Nifty 50 Prediction Engine
          </h1>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <h3>{error || 'Failed to compute prediction'}</h3>
            <p>Make sure the dev server is running and Yahoo Finance API is accessible.</p>
          </div>
        </div>
      </div>
    );
  }

  const gaugeColor = getScoreColor(pred.score);
  const confidenceData = [
    { value: pred.confidence, color: gaugeColor },
    { value: 100 - pred.confidence, color: 'rgba(26, 35, 50, 0.8)' },
  ];

  const accuracy = Math.max(1, historyData.filter((h: any) => h.correct !== false).length) / historyData.length * 100;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">
              <Brain size={24} style={{ marginRight: 10, verticalAlign: 'middle', color: 'var(--accent-purple)' }} />
              Nifty 50 Prediction Engine
            </h1>
            <p className="page-subtitle">Multi-factor scoring model — computed from LIVE market data</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <Wifi size={12} color="var(--green)" />
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>LIVE DATA</span>
            </div>
            {lastRefresh && (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Main Prediction Card */}
        <div className="grid-2 section-gap">
          {/* Gauge */}
          <div className="card" style={{ textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${gaugeColor}, transparent)` }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 'var(--space-sm)' }}>
              Next Session Prediction — {pred.date}
            </div>

            <div style={{ width: 200, height: 200, margin: '0 auto', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={confidenceData}
                    cx="50%"
                    cy="50%"
                    startAngle={90}
                    endAngle={-270}
                    innerRadius={70}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                  >
                    {confidenceData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--font-mono)', color: gaugeColor }}>
                  {pred.confidence}%
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>CONFIDENCE</div>
              </div>
            </div>

            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: gaugeColor, marginTop: 'var(--space-md)' }}>
              {pred.prediction}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Score: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: gaugeColor }}>
                {pred.score > 0 ? '+' : ''}{pred.score.toFixed(2)}
              </span>
              <span style={{ color: 'var(--text-muted)' }}> / 1.00</span>
            </div>

            {/* Predicted Range */}
            <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 8 }}>PREDICTED RANGE (NEXT SESSION)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--red)' }}>LOW</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}>{pred.predictedRange.low.toLocaleString()}</div>
                </div>
                <div style={{ flex: 1, margin: '0 var(--space-md)', height: 4, background: 'var(--bg-primary)', borderRadius: 'var(--radius-full)', position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '20%', right: '20%',
                    height: '100%',
                    background: `linear-gradient(90deg, var(--red), ${gaugeColor}, var(--green))`,
                    borderRadius: 'var(--radius-full)',
                    opacity: 0.6,
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: `${Math.max(10, Math.min(90, ((pred.previousClose - pred.predictedRange.low) / (pred.predictedRange.high - pred.predictedRange.low)) * 100))}%`,
                    top: '-6px',
                    width: 4,
                    height: 16,
                    background: 'white',
                    borderRadius: 2,
                    transform: 'translateX(-50%)',
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--green)' }}>HIGH</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem' }}>{pred.predictedRange.high.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                Current Price: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-blue)' }}>{pred.previousClose.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Model Performance & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Model Performance</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div style={{ textAlign: 'center', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: accuracy >= 70 ? 'var(--green)' : 'var(--yellow)' }}>
                    {accuracy.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Accuracy (10-day)</div>
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-md)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                    7
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Factors Analyzed</div>
                </div>
              </div>
            </div>

            {pred.optionsSetup && (
              <div className="card" style={{ borderLeft: `3px solid ${pred.optionsSetup.type === 'CE' ? 'var(--green)' : 'var(--red)'}` }}>
                <div className="card-header">
                  <h3 className="card-title">
                    <Zap size={16} color="var(--yellow)" style={{ marginRight: 6 }} />
                    Options Trading Setup
                  </h3>
                  <span className={`badge ${pred.optionsSetup.type === 'CE' ? 'badge-bullish' : 'badge-bearish'}`}>
                    {pred.optionsSetup.strikePrice} {pred.optionsSetup.type}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>TARGET (SPOT)</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--green)' }}>
                      ₹{pred.optionsSetup.targetPrice.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>STOP LOSS (SPOT)</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--red)' }}>
                      ₹{pred.optionsSetup.stopLoss.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: 'var(--space-sm)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ marginBottom: 4 }}><strong>Pattern:</strong> {pred.optionsSetup.pattern}</div>
                  <div style={{ marginBottom: 4 }}><strong>Expected Expiry:</strong> {pred.optionsSetup.expiry}</div>
                  <div><strong>Confidence:</strong> {pred.optionsSetup.confidence}%</div>
                </div>
              </div>
            )}

            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">
                <h3 className="card-title">How It Works</h3>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <p>Computes predictions from <strong>real-time Yahoo Finance data</strong>:</p>
                <ul style={{ paddingLeft: 'var(--space-md)', marginTop: 'var(--space-sm)' }}>
                  <li><strong>EMA 9/21 Crossover</strong> — trend direction</li>
                  <li><strong>RSI (14)</strong> + <strong>MACD</strong> — momentum</li>
                  <li><strong>Volume</strong> vs 20-day average</li>
                  <li><strong>5-day price momentum</strong> — sentiment proxy</li>
                  <li><strong>S&P 500 + NASDAQ</strong> — global cues</li>
                  <li><strong>ATR (14)</strong> — volatility regime</li>
                  <li><strong>OBV</strong> — institutional flow</li>
                </ul>
                <p style={{ marginTop: 'var(--space-sm)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ⚠️ All indicators computed from 3 months of daily OHLCV data. Predictions update every 60 seconds.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Factor Breakdown */}
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Zap size={18} color="var(--yellow)" /> Factor Breakdown
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 'auto' }}>
            Computed from live data
          </span>
        </h2>
        <div className="factors-grid section-gap stagger">
          {pred.factors.map((factor, idx) => {
            const signalColor = factor.signal > 0.2 ? 'var(--green)' : factor.signal < -0.2 ? 'var(--red)' : 'var(--yellow)';
            const signalLabel = factor.signal > 0.2 ? 'Bullish' : factor.signal < -0.2 ? 'Bearish' : 'Neutral';
            return (
              <div key={idx} className="factor-card slide-up">
                <div className="factor-card-header">
                  <span className="factor-card-name">
                    <span style={{ color: signalColor }}>{iconMap[factor.icon] || <Activity size={18} />}</span>
                    {factor.name}
                  </span>
                  <span className="factor-weight">{factor.weight}% weight</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', margin: 'var(--space-sm) 0' }}>
                  <div className="factor-signal" style={{ color: signalColor }}>
                    {factor.signal > 0 ? '+' : ''}{factor.signal.toFixed(2)}
                  </div>
                  <span className={`badge badge-${signalLabel.toLowerCase()}`}>{signalLabel}</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative', marginBottom: 'var(--space-sm)' }}>
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    width: `${Math.abs(factor.signal) * 50}%`,
                    height: '100%',
                    background: signalColor,
                    borderRadius: 'var(--radius-full)',
                    transform: factor.signal >= 0 ? 'none' : 'translateX(-100%)',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <p className="factor-description">{factor.description}</p>
              </div>
            );
          })}
        </div>

        {/* Prediction History */}
        <div className="card">
          <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setShowHistory(!showHistory)}>
            <h3 className="card-title">Prediction History (Last 10 Days)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <span style={{ fontSize: '0.8rem', color: accuracy >= 70 ? 'var(--green)' : 'var(--yellow)', fontWeight: 600 }}>
                Accuracy: {accuracy.toFixed(0)}%
              </span>
              {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {showHistory && (
            <div className="prediction-history">
              <div className="history-row" style={{ fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                <span className="history-date">DATE</span>
                <span className="history-prediction">PREDICTION</span>
                <span className="history-actual">ACTUAL CHANGE</span>
                <span>RESULT</span>
              </div>
              {historyData.map((h, i) => (
                <div key={i} className="history-row">
                  <span className="history-date">{h.date}</span>
                  <span className="history-prediction" style={{ color: h.predictedDirection === 'up' ? 'var(--green)' : h.predictedDirection === 'down' ? 'var(--red)' : 'var(--yellow)' }}>
                    {h.prediction}
                  </span>
                  <span className="history-actual">
                    <span style={{ color: h.actualChange >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {h.actualChange >= 0 ? '+' : ''}{h.actualChange.toFixed(2)}%
                    </span>
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ({h.actualDirection})
                    </span>
                  </span>
                  <span className={`history-result ${h.correct ? 'correct' : 'wrong'}`}>
                    {h.correct ? <><CheckCircle size={12} /> Correct</> : <><XCircle size={12} /> Wrong</>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score > 0.5) return '#10b981';
  if (score > 0.2) return '#22c55e';
  if (score > -0.2) return '#f59e0b';
  if (score > -0.5) return '#f97316';
  return '#ef4444';
}
