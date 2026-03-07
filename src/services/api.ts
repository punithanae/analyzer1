import type { ApiConfig } from '../types';

const DEFAULT_CONFIG: ApiConfig = {
  alphaVantageKey: '1CLZMZV8OB76FQMQ',
  finnhubKey: '',
  finnhubSecret: 'd6lsuh1r01quej91c4v0',
  twelveDataKey: '0e5246e48c604c2d8787060ab9043234',
  marketauxKey: '',
  demoMode: false,
};

export function getApiConfig(): ApiConfig {
  const saved = localStorage.getItem('tradingApp_apiConfig');
  if (saved) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export function saveApiConfig(config: Partial<ApiConfig>): void {
  const current = getApiConfig();
  const updated = { ...current, ...config };
  // Auto-disable demo mode if any key is provided
  if (updated.alphaVantageKey || updated.finnhubKey || updated.twelveDataKey || updated.marketauxKey) {
    updated.demoMode = false;
  }
  localStorage.setItem('tradingApp_apiConfig', JSON.stringify(updated));
}

export function isDemoMode(): boolean {
  return getApiConfig().demoMode;
}

// Generic fetch wrapper with error handling
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    throw error;
  }
}
