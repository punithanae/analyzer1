import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Bell, Monitor, Save, TestTube } from 'lucide-react';
import { getApiConfig, saveApiConfig } from '../services/api';
import { requestNotificationPermission, sendTestNotification, isNotificationEnabled } from '../engine/notifications';
import type { ApiConfig } from '../types';

export default function Settings() {
  const [config, setConfig] = useState<ApiConfig>(getApiConfig());
  const [saved, setSaved] = useState(false);
  const [notifStatus, setNotifStatus] = useState(isNotificationEnabled());

  useEffect(() => {
    setConfig(getApiConfig());
  }, []);

  const handleSave = () => {
    saveApiConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleEnableNotif = async () => {
    const granted = await requestNotificationPermission();
    setNotifStatus(granted);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">
          <SettingsIcon size={24} style={{ marginRight: 10, verticalAlign: 'middle' }} />
          Settings
        </h1>
        <p className="page-subtitle">Configure API keys, notifications, and preferences</p>
      </div>

      <div className="page-body" style={{ maxWidth: 700 }}>
        {/* Demo Mode */}
        <div className="demo-banner">
          <Monitor size={16} />
          <span>
            <strong>Demo Mode {config.demoMode ? 'ON' : 'OFF'}</strong> — 
            {config.demoMode
              ? ' Using mock data. Add API keys below to switch to live data.'
              : ' Using live API data.'}
          </span>
          <button
            className="btn btn-sm btn-ghost"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              const updated = { ...config, demoMode: !config.demoMode };
              setConfig(updated);
              saveApiConfig(updated);
            }}
          >
            {config.demoMode ? 'Switch to Live' : 'Switch to Demo'}
          </button>
        </div>

        {/* API Keys */}
        <div className="settings-group">
          <h3 className="settings-group-title">
            <Key size={18} color="var(--accent-blue)" /> API Keys
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-md)' }}>
            All services have free tiers. Sign up at the links below to get your keys.
          </p>

          <div className="settings-field">
            <label className="settings-label">
              Alpha Vantage Key — <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>Get free key</a>
            </label>
            <input
              className="settings-input"
              placeholder="Enter your Alpha Vantage API key..."
              value={config.alphaVantageKey}
              onChange={e => setConfig({ ...config, alphaVantageKey: e.target.value })}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">
              Finnhub Key — <a href="https://finnhub.io/register" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>Get free key</a>
            </label>
            <input
              className="settings-input"
              placeholder="Enter your Finnhub API key..."
              value={config.finnhubKey}
              onChange={e => setConfig({ ...config, finnhubKey: e.target.value })}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">Finnhub Webhook Secret</label>
            <input
              className="settings-input"
              value={config.finnhubSecret}
              onChange={e => setConfig({ ...config, finnhubSecret: e.target.value })}
              readOnly
              style={{ opacity: 0.7 }}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">
              Twelve Data Key — <a href="https://twelvedata.com/register" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>Get free key</a>
            </label>
            <input
              className="settings-input"
              placeholder="Enter your Twelve Data API key..."
              value={config.twelveDataKey}
              onChange={e => setConfig({ ...config, twelveDataKey: e.target.value })}
            />
          </div>

          <div className="settings-field">
            <label className="settings-label">
              Marketaux Key — <a href="https://www.marketaux.com/register" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)' }}>Get free key</a>
            </label>
            <input
              className="settings-input"
              placeholder="Enter your Marketaux API key..."
              value={config.marketauxKey}
              onChange={e => setConfig({ ...config, marketauxKey: e.target.value })}
            />
          </div>

          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={14} />
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
        </div>

        {/* Notifications */}
        <div className="settings-group">
          <h3 className="settings-group-title">
            <Bell size={18} color="var(--yellow)" /> Notifications
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={handleEnableNotif}>
              <Bell size={14} />
              {notifStatus ? '✓ Notifications Enabled' : 'Enable Browser Notifications'}
            </button>
            {notifStatus && (
              <button className="btn btn-ghost btn-sm" onClick={sendTestNotification}>
                <TestTube size={14} />
                Send Test
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 'var(--space-sm)' }}>
            Receive instant alerts for breaking news, AI trading signals, and price movements.
          </p>
        </div>
      </div>
    </div>
  );
}
