import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { placeOrder } from '../services/orderEngine';
import type { TradeOrder } from '../services/orderEngine';

interface OrderModalProps {
  symbol: string;
  name: string;
  currentPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  defaultAction?: 'BUY' | 'SELL';
  market?: 'IN' | 'US';
  onClose: () => void;
  onOrderSuccess?: (order: TradeOrder) => void;
}

export default function OrderModal({
  symbol,
  name,
  currentPrice,
  targetPrice: initialTarget,
  stopLoss: initialSl,
  defaultAction = 'BUY',
  market = 'IN',
  onClose,
  onOrderSuccess,
}: OrderModalProps) {
  const curr = market === 'IN' ? '₹' : '$';
  
  const [action, setAction] = useState<'BUY' | 'SELL'>(defaultAction);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState(currentPrice);
  const [quantity, setQuantity] = useState(10);
  const [target, setTarget] = useState(initialTarget || Math.round((action === 'BUY' ? currentPrice * 1.05 : currentPrice * 0.95) * 100) / 100);
  const [stopLoss, setStopLoss] = useState(initialSl || Math.round((action === 'BUY' ? currentPrice * 0.97 : currentPrice * 1.03) * 100) / 100);
  const [submittedOrder, setSubmittedOrder] = useState<TradeOrder | null>(null);

  const entryPrice = orderType === 'MARKET' ? currentPrice : limitPrice;
  const totalValue = entryPrice * quantity;

  // Calculate Risk-Reward Ratio
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(target - entryPrice);
  const rrRatio = risk > 0 ? (reward / risk).toFixed(2) : '1.00';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const order = placeOrder({
      symbol,
      name,
      type: action,
      orderType,
      quantity,
      entryPrice,
      targetPrice: target,
      stopLoss,
      market,
    });

    setSubmittedOrder(order);
    if (onOrderSuccess) onOrderSuccess(order);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-md)',
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
        className="slide-up"
      >
        {/* Header */}
        <div style={{
          padding: 'var(--space-md) var(--space-lg)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-tertiary)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{symbol}</span>
              <span className={`badge badge-${action.toLowerCase()}`}>{action} ORDER</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{name}</div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        {submittedOrder ? (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <CheckCircle size={48} color="var(--green)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--green)', marginBottom: 8 }}>
              {action === 'BUY' ? 'BUY ORDER EXECUTED!' : 'SELL ORDER EXECUTED!'}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
              Successfully placed paper order for <strong>{submittedOrder.quantity} shares</strong> of {symbol} at {curr}{submittedOrder.entryPrice.toLocaleString()}.
            </p>
            <div style={{ background: 'var(--bg-tertiary)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{submittedOrder.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Target Price:</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{curr}{submittedOrder.targetPrice}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Stop Loss:</span>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>{curr}{submittedOrder.stopLoss}</span>
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
              Done & View Active Orders
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 'var(--space-lg)' }}>
            {/* Action Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xs)', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)' }}>
              <button
                type="button"
                className={`btn ${action === 'BUY' ? 'btn-success' : 'btn-ghost'}`}
                style={{ borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                onClick={() => setAction('BUY')}
              >
                BUY (LONG)
              </button>
              <button
                type="button"
                className={`btn ${action === 'SELL' ? 'btn-danger' : 'btn-ghost'}`}
                style={{ borderRadius: 'var(--radius-sm)', fontWeight: 700 }}
                onClick={() => setAction('SELL')}
              >
                SELL (SHORT)
              </button>
            </div>

            {/* Order Type */}
            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === 'MARKET'}
                  onChange={() => setOrderType('MARKET')}
                />
                Market Order ({curr}{currentPrice.toLocaleString()})
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="orderType"
                  checked={orderType === 'LIMIT'}
                  onChange={() => setOrderType('LIMIT')}
                />
                Limit Order
              </label>
            </div>

            {/* Price (if limit) */}
            {orderType === 'LIMIT' && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>LIMIT ENTRY PRICE ({curr})</label>
                <input
                  type="number"
                  step="0.05"
                  className="search-input"
                  style={{ width: '100%' }}
                  value={limitPrice}
                  onChange={e => setLimitPrice(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            )}

            {/* Quantity Selector */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QUANTITY (SHARES)</label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Total: <strong style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>{curr}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
                </span>
              </div>
              <input
                type="number"
                min="1"
                className="search-input"
                style={{ width: '100%', marginBottom: 8 }}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
              <div style={{ display: 'flex', gap: 6 }}>
                {[5, 10, 50, 100, 250].map(qty => (
                  <button
                    key={qty}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, padding: '2px 0', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}
                    onClick={() => setQuantity(qty)}
                  >
                    +{qty}
                  </button>
                ))}
              </div>
            </div>

            {/* Target & Stop Loss */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--green)', marginBottom: 4, display: 'block', fontWeight: 600 }}>🎯 TARGET PRICE ({curr})</label>
                <input
                  type="number"
                  step="0.05"
                  className="search-input"
                  style={{ width: '100%', borderColor: 'rgba(16,185,129,0.3)' }}
                  value={target}
                  onChange={e => setTarget(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--red)', marginBottom: 4, display: 'block', fontWeight: 600 }}>⛔ STOP LOSS ({curr})</label>
                <input
                  type="number"
                  step="0.05"
                  className="search-input"
                  style={{ width: '100%', borderColor: 'rgba(239,68,68,0.3)' }}
                  value={stopLoss}
                  onChange={e => setStopLoss(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>

            {/* Risk-Reward & Info */}
            <div style={{
              background: 'var(--bg-tertiary)',
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
            }}>
              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={16} color="var(--yellow)" /> Risk : Reward Ratio
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: parseFloat(rrRatio) >= 1.5 ? 'var(--green)' : 'var(--yellow)' }}>
                1 : {rrRatio}
              </span>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className={`btn ${action === 'BUY' ? 'btn-success' : 'btn-danger'}`}
              style={{ width: '100%', padding: 'var(--space-md)', fontSize: '1rem', fontWeight: 800, gap: 8 }}
            >
              <Zap size={18} /> CONFIRM & PLACE {action} ORDER ({curr}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })})
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
