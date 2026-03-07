import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Newspaper, Zap, Search, BarChart3, Brain,
  Settings, Bell
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import News from './pages/News';
import Signals from './pages/Signals';
import Screener from './pages/Screener';
import Analysis from './pages/Analysis';
import Predictions from './pages/Predictions';
import SettingsPage from './pages/Settings';
import { useEffect, useState } from 'react';
import { requestNotificationPermission } from './engine/notifications';

export default function App() {
  const [newsCount] = useState(3); // simulated unread count

  useEffect(() => {
    // Request notification permission on first load
    requestNotificationPermission();
  }, []);

  const isMarketOpen = () => {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();
    // Indian market hours: Mon-Fri, 9:15 AM - 3:30 PM IST
    return day >= 1 && day <= 5 && hours >= 9 && hours < 16;
  };

  return (
    <Router>
      <div className="app-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">TA</div>
            <div>
              <div className="sidebar-title">TradeAssist AI</div>
              <div className="sidebar-subtitle">Smart Trading</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Overview</div>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>

            <div className="nav-section-label">Analysis</div>
            <NavLink to="/news" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Newspaper size={20} />
              <span>News Feed</span>
              {newsCount > 0 && <span className="nav-badge">{newsCount}</span>}
            </NavLink>
            <NavLink to="/signals" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Zap size={20} />
              <span>AI Signals</span>
            </NavLink>
            <NavLink to="/screener" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Search size={20} />
              <span>Screener</span>
            </NavLink>
            <NavLink to="/analysis" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <BarChart3 size={20} />
              <span>Charts</span>
            </NavLink>

            <div className="nav-section-label">AI Engine</div>
            <NavLink to="/predictions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Brain size={20} />
              <span>Predictions</span>
            </NavLink>

            <div className="nav-section-label">System</div>
            <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <div className="market-status">
              <div className={`status-dot ${isMarketOpen() ? '' : 'closed'}`} />
              <span>
                {isMarketOpen() ? 'Market Open' : 'Market Closed'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <Bell size={12} />
              <span>Alerts Active 24/7</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/news" element={<News />} />
            <Route path="/signals" element={<Signals />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
