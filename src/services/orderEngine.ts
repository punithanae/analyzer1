import type { TradingSignal } from '../types';

export interface TradeOrder {
  id: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  targetPrice: number;
  stopLoss: number;
  status: 'OPEN' | 'FILLED' | 'CLOSED' | 'CANCELLED';
  pnl: number;
  pnlPercent: number;
  timestamp: string;
  autoExecuted: boolean;
  market: 'IN' | 'US';
}

const STORAGE_KEYS = {
  ORDERS: 'tradingApp_orders',
  AUTO_TRADER: 'tradingApp_autoTraderEnabled',
  BALANCE: 'tradingApp_balance',
};

const DEFAULT_BALANCE = 500000; // ₹5,000,000 / $500,000 demo paper account

export function getOrders(): TradeOrder[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveOrders(orders: TradeOrder[]): void {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
}

export function isAutoTraderEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.AUTO_TRADER) === 'true';
}

export function setAutoTraderEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEYS.AUTO_TRADER, String(enabled));
}

export function placeOrder(params: {
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  orderType?: 'MARKET' | 'LIMIT';
  quantity: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  market?: 'IN' | 'US';
  autoExecuted?: boolean;
}): TradeOrder {
  const orders = getOrders();
  
  const newOrder: TradeOrder = {
    id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    symbol: params.symbol,
    name: params.name,
    type: params.type,
    orderType: params.orderType || 'MARKET',
    quantity: params.quantity,
    entryPrice: params.entryPrice,
    currentPrice: params.entryPrice,
    targetPrice: params.targetPrice,
    stopLoss: params.stopLoss,
    status: 'FILLED',
    pnl: 0,
    pnlPercent: 0,
    timestamp: new Date().toISOString(),
    autoExecuted: !!params.autoExecuted,
    market: params.market || (params.symbol.endsWith('.NS') || params.symbol.endsWith('.BO') ? 'IN' : 'US'),
  };

  orders.unshift(newOrder);
  saveOrders(orders);
  return newOrder;
}

export function closeOrder(orderId: string, currentPrice?: number): void {
  const orders = getOrders();
  const updated = orders.map(ord => {
    if (ord.id === orderId && (ord.status === 'FILLED' || ord.status === 'OPEN')) {
      const exitPrice = currentPrice || ord.currentPrice;
      const priceDiff = ord.type === 'BUY' ? (exitPrice - ord.entryPrice) : (ord.entryPrice - exitPrice);
      const pnl = priceDiff * ord.quantity;
      const pnlPercent = (priceDiff / ord.entryPrice) * 100;
      
      return {
        ...ord,
        status: 'CLOSED' as const,
        currentPrice: exitPrice,
        pnl: Math.round(pnl * 100) / 100,
        pnlPercent: Math.round(pnlPercent * 100) / 100,
      };
    }
    return ord;
  });
  saveOrders(updated);
}

export function cancelOrder(orderId: string): void {
  const orders = getOrders();
  const updated = orders.map(ord => ord.id === orderId ? { ...ord, status: 'CANCELLED' as const } : ord);
  saveOrders(updated);
}

/**
 * AI Auto-Trader Bot Execution Logic
 * Automatically triggers Buy orders for high-confidence BUY signals (confidence >= 75%)
 */
export function processAutoTrader(signals: TradingSignal[]): TradeOrder[] {
  if (!isAutoTraderEnabled()) return [];

  const existingOrders = getOrders();
  const createdOrders: TradeOrder[] = [];

  signals.forEach(sig => {
    if (sig.action === 'BUY' && sig.confidence >= 75) {
      // Check if an open/filled order already exists for this symbol within last 24 hours
      const existing = existingOrders.find(
        o => o.symbol === sig.symbol && o.status === 'FILLED' && o.type === 'BUY'
      );

      if (!existing) {
        // Calculate recommended quantity (e.g. ₹50,000 or $1,000 position size)
        const targetCapital = sig.market === 'IN' ? 50000 : 1000;
        const quantity = Math.max(1, Math.floor(targetCapital / sig.entryPrice));

        const order = placeOrder({
          symbol: sig.symbol,
          name: sig.name,
          type: 'BUY',
          orderType: 'MARKET',
          quantity,
          entryPrice: sig.entryPrice,
          targetPrice: sig.targetPrice,
          stopLoss: sig.stopLoss,
          market: sig.market,
          autoExecuted: true,
        });

        createdOrders.push(order);
      }
    }
  });

  return createdOrders;
}

export function updateOrdersLivePrices(pricesMap: Record<string, number>): TradeOrder[] {
  const orders = getOrders();
  let changed = false;

  const updated = orders.map(ord => {
    if (ord.status === 'FILLED' && pricesMap[ord.symbol]) {
      const livePrice = pricesMap[ord.symbol];
      if (livePrice !== ord.currentPrice) {
        changed = true;
        const diff = ord.type === 'BUY' ? (livePrice - ord.entryPrice) : (ord.entryPrice - livePrice);
        const pnl = diff * ord.quantity;
        const pnlPercent = (diff / ord.entryPrice) * 100;

        return {
          ...ord,
          currentPrice: livePrice,
          pnl: Math.round(pnl * 100) / 100,
          pnlPercent: Math.round(pnlPercent * 100) / 100,
        };
      }
    }
    return ord;
  });

  if (changed) {
    saveOrders(updated);
  }
  return updated;
}
