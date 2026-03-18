import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import {
  LayoutDashboard, Newspaper, Zap, Search, BarChart3, Brain,
  Bell, Bitcoin, Menu, X
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import { useEffect, useState } from 'react';
import { requestNotificationPermission } from './engine/notifications';

// Lazy load non-critical pages for faster initial load
const News = lazy(() => import('./pages/News'));
const Signals = lazy(() => import('./pages/Signals'));
const Screener = lazy(() => import('./pages/Screener'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Predictions = lazy(() => import('./pages/Predictions'));
const Crypto = lazy(() => import('./pages/Crypto'));
import SearchBar from './components/SearchBar';
// Lazy load pages

function PageLoader() {
  return (
    <div className="loading-center" style={{ minHeight: 400 }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );
}

export default function App() {
  const [newsCount] = useState(3);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const isMarketOpen = () => {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay();
    return day >= 1 && day <= 5 && hours >= 9 && hours < 16;
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <Router>
      <div className="app-layout">
        <div className={`sidebar-overlay ${isMobileMenuOpen ? 'show' : ''}`} onClick={closeMenu} />
        {/* Sidebar */}
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo">TA</div>
            <div style={{ flex: 1 }}>
              <div className="sidebar-title">TradeAssist AI</div>
              <div className="sidebar-subtitle">Smart Trading</div>
            </div>
            <button className="mobile-close-btn" onClick={closeMenu}>
              <X size={20} />
            </button>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-section-label">Overview</div>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end onClick={closeMenu}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/crypto" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
              <Bitcoin size={20} />
              <span>Crypto Trading</span>
            </NavLink>

            <div className="nav-section-label">Analysis</div>
            <NavLink to="/news" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
              <Newspaper size={20} />
              <span>News Feed</span>
              {newsCount > 0 && <span className="nav-badge">{newsCount}</span>}
            </NavLink>
            <NavLink to="/signals" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
              <Zap size={20} />
              <span>AI Signals</span>
            </NavLink>
            <NavLink to="/screener" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
              <Search size={20} />
              <span>Screener</span>
            </NavLink>
            <NavLink to="/analysis" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
              <BarChart3 size={20} />
              <span>Charts</span>
            </NavLink>

            <div className="nav-section-label">AI Engine</div>
            <NavLink to="/predictions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
              <Brain size={20} />
              <span>Predictions</span>
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

        <main className="main-content">
          <header className="mobile-header">
            <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
               <SearchBar />
            </div>
          </header>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/crypto" element={<Crypto />} />
              <Route path="/news" element={<News />} />
              <Route path="/signals" element={<Signals />} />
              <Route path="/screener" element={<Screener />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/predictions" element={<Predictions />} />

            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}
