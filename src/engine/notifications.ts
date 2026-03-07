// Browser Notification Manager for Trading Alerts

let notificationPermission: NotificationPermission = 'default';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications');
    return false;
  }

  const permission = await Notification.requestPermission();
  notificationPermission = permission;
  return permission === 'granted';
}

export function isNotificationEnabled(): boolean {
  return notificationPermission === 'granted';
}

interface NotifyOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  type?: 'news' | 'signal' | 'alert' | 'price';
}

export function sendNotification({ title, body, tag, type = 'alert' }: NotifyOptions): void {
  if (notificationPermission !== 'granted') return;

  const iconMap: Record<string, string> = {
    news: '📰',
    signal: '📊',
    alert: '🔔',
    price: '💰',
  };

  try {
    const notification = new Notification(`${iconMap[type]} ${title}`, {
      body,
      tag: tag || `trading-${Date.now()}`,
      icon: '/vite.svg',
      badge: '/vite.svg',
      silent: false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// ==================== Auto-polling for alerts ====================

type AlertCallback = () => void;
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function startAlertPolling(callback: AlertCallback, intervalMs: number = 60000): void {
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(callback, intervalMs);
}

export function stopAlertPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export function sendTestNotification(): void {
  sendNotification({
    title: 'Trading Alert Active!',
    body: 'You will receive real-time notifications for breaking news, trading signals, and price alerts.',
    type: 'alert',
  });
}
