import { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, XCircle, Bot, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { getOrders, closeOrder, isAutoTraderEnabled, setAutoTraderEnabled, updateOrdersLivePrices } from '../services/orderEngine';
import type { TradeOrder } from '../services/orderEngine';

interface OrdersListProps {
  livePrices?: Record<string, number>;
  onRefreshNeeded?: () => void;
}

export default function OrdersList({ livePrices = {}, onRefreshNeeded }: OrdersListProps) {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [autoTrader, setAutoTrader] = useState(isAutoTraderEnabled());
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ACTIVE');

  const loadOrders = () => {
    if (Object.keys(livePrices).length > 0) {
      const updated = updateOrdersLivePrices(livePrices);
      setOrders(updated);
    } else {
      setOrders(getOrders());
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    return () => clearInterval(interval);
  }, [livePrices]);

  const handleToggleAutoTrader = () => {
    const nextState = !autoTrader;
    setAutoTraderEnabled(nextState);
    setAutoTrader(nextState);
  };

  const handleCloseOrder = (orderId: string) => {
    closeOrder(orderId);
    loadOrders();
    if (onRefreshNeeded) onRefreshNeeded();
  };

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'ACTIVE') return o.status === 'FILLED' || o.status === 'OPEN';
    if (activeFilter === 'CLOSED') return o.status === 'CLOSED' || o.status === 'CANCELLED';
    return true;
  });

  const totalRealizedPnl = orders.filter(o => o.status === 'CLOSED').reduce((acc, o) => acc + o.pnl, 0);
  const totalUnrealizedPnl = orders.filter(o => o.status === 'FILLED').reduce((acc, o) => acc + o.pnl, 0);

  return (
    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
      {/* Header Bar */}
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShoppingCart size={20} color="var(--accent-blue)" />
          <div>
            <h3 className="card-title">Live Executed Orders & Positions</h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Real-time portfolio tracker & AI Auto-Execution Engine
            </div>
          </div>
        </div>

        {/* AI Auto-Trader Bot Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginLeft: 'auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            background: autoTrader ? 'rgba(16,185,129,0.15)' : 'var(--bg-tertiary)',
            border: `1px solid ${autoTrader ? 'rgba(16,185,129,0.4)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-full)',
          }}>
            <Bot size={18} color={autoTrader ? 'var(--green)' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: autoTrader ? 'var(--green)' : 'var(--text-secondary)' }}>
              AI Auto-Trader: {autoTrader ? 'ON' : 'OFF'}
            </span>
            <button
              onClick={handleToggleAutoTrader}
              className={`btn btn-sm ${autoTrader ? 'btn-success' : 'btn-ghost'}`}
              style={{ fontSize: '0.7rem', padding: '2px 10px', borderRadius: 'var(--radius-full)' }}
            >
              {autoTrader ? 'Disable' : 'Enable Bot'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-md)', margin: 'var(--space-md) 0' }}>
        <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unrealized P&L</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.2rem', color: totalUnrealizedPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}{totalUnrealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Realized P&L</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.2rem', color: totalRealizedPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {totalRealizedPnl >= 0 ? '+' : ''}{totalRealizedPnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Positions</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent-blue)' }}>
            {orders.filter(o => o.status === 'FILLED').length}
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        {(['ACTIVE', 'CLOSED', 'ALL'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f === 'ACTIVE' ? 'Active Orders' : f === 'CLOSED' ? 'Closed Trades' : 'All History'}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
          <ShoppingCart size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
          <div>No {activeFilter.toLowerCase()} orders found.</div>
          <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
            Click <strong>"⚡ Place Buy Order"</strong> on any signal or enable the AI Auto-Trader Bot to generate orders automatically.
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>TIME</th>
                <th>SYMBOL</th>
                <th>TYPE</th>
                <th>QTY</th>
                <th>ENTRY</th>
                <th>CURRENT</th>
                <th>TARGET</th>
                <th>STOP LOSS</th>
                <th>P&L</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => {
                const curr = o.market === 'IN' ? '₹' : '$';
                const isPos = o.pnl >= 0;
                return (
                  <tr key={o.id}>
                    <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(o.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{o.symbol}</div>
                      {o.autoExecuted && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Bot size={10} /> AI Auto
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${o.type.toLowerCase()}`}>
                        {o.type === 'BUY' ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {o.type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{o.quantity}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{curr}{o.entryPrice.toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{curr}{o.currentPrice.toLocaleString()}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{curr}{o.targetPrice}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{curr}{o.stopLoss}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isPos ? 'var(--green)' : 'var(--red)' }}>
                      {isPos ? '+' : ''}{curr}{o.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({isPos ? '+' : ''}{o.pnlPercent.toFixed(2)}%)
                    </td>
                    <td>
                      <span className={`badge badge-${o.status === 'FILLED' ? 'bullish' : 'neutral'}`} style={{ fontSize: '0.7rem' }}>
                        {o.status}
                      </span>
                    </td>
                    <td>
                      {o.status === 'FILLED' ? (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                          onClick={() => handleCloseOrder(o.id)}
                        >
                          Close Trade
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
