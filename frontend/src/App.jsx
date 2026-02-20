import React, { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import {
  Leaf, BarChart3, TrendingUp, Wallet,
  LogIn, LogOut, User, Sun, Moon,
} from 'lucide-react';

import Home from './pages/Home';
import BusinessDashboard from './pages/BusinessDashboard';
import SellerDashboard from './pages/SellerDashboard';
import Auth from './pages/Auth';
import ProtectedRoute from './components/ProtectedRoute';

/* ─────────────────────────────────────────────────────────────
   NavLink — route-aware styled link
───────────────────────────────────────────────────────────── */
function NavLink({ to, icon: Icon, label }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '8px 16px', borderRadius: '10px',
        fontSize: '0.875rem', fontWeight: 500,
        color: active ? 'var(--green-primary)' : 'var(--text-secondary)',
        background: active ? 'rgba(16,185,129,0.1)' : 'transparent',
        border: active ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.background = 'var(--glass)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <Icon size={16} />
      {label}
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   Navbar
───────────────────────────────────────────────────────────── */
function Navbar({ isAuthenticated, user, onLogout, theme, onToggleTheme }) {
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'var(--nav-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--glass-border)',
      boxShadow: 'var(--shadow-card)',
      transition: 'background 0.35s ease',
    }}>
      <div className="page-wrapper" style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: '66px',
      }}>

        {/* ── Logo ─────────────────────────────────── */}
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg,#10b981,#059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 18px rgba(16,185,129,0.4)',
          }}>
            <Leaf size={20} color="#fff" />
          </div>
          <div>
            <span style={{
              fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700,
              fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em',
            }}>
              Carbo<span style={{ color: 'var(--green-primary)' }}>Cred</span>
            </span>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em', lineHeight: 1 }}>
              CARBON MARKETPLACE
            </div>
          </div>
        </Link>

        {/* ── Centre nav ───────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <NavLink to="/" icon={BarChart3} label="Public Ledger" />
          {isAuthenticated && (
            <>
              <NavLink to="/business" icon={TrendingUp} label="Business" />
              <NavLink to="/seller" icon={Wallet} label="Project" />
            </>
          )}
        </div>

        {/* ── Right controls ───────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>
            <span className="live-dot" />
            <span>Mainnet Live</span>
          </div>

          {/* Theme toggle */}
          <button
            className="btn-theme"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark
              ? <Sun size={17} />
              : <Moon size={17} />
            }
          </button>

          {isAuthenticated ? (
            <>
              {/* User chip */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px', borderRadius: '10px',
                background: 'rgba(16,185,129,0.08)',
                border: '1px solid rgba(16,185,129,0.2)',
              }}>
                <User size={14} color="var(--green-primary)" />
                <span style={{
                  fontSize: '0.78rem', color: 'var(--text-secondary)',
                  maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {user?.method === 'metamask'
                    ? `${user.wallet.slice(0, 6)}…${user.wallet.slice(-4)}`
                    : user?.email}
                </span>
                <span className="badge badge-green" style={{ padding: '2px 8px', fontSize: '0.65rem' }}>
                  {user?.role?.split(' ')[0]}
                </span>
              </div>
              <button className="btn-secondary" onClick={onLogout} style={{ padding: '8px 16px', gap: '6px' }}>
                <LogOut size={14} /> Log Out
              </button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => navigate('/auth')}>
              <LogIn size={15} /> Sign In
            </button>
          )}
        </div>

      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────
   Root App
───────────────────────────────────────────────────────────── */
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light'); // 'dark' | 'light'

  const handleLogin = (userData) => { setUser(userData); setIsAuthenticated(true); };
  const handleLogout = () => { setUser(null); setIsAuthenticated(false); };

  const toggleTheme = () =>
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <Router>
      {/* data-theme drives all CSS variable overrides */}
      <div data-theme={theme} style={{ minHeight: '100vh', background: 'var(--bg-primary)', transition: 'background 0.35s ease' }}>
        <Navbar
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <main style={{ paddingTop: '36px', paddingBottom: '60px' }}>
          <div className="page-wrapper">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth onLogin={handleLogin} />} />
              <Route
                path="/business"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <BusinessDashboard user={user} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller"
                element={
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <SellerDashboard user={user} />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </main>

        <footer style={{
          borderTop: '1px solid var(--border)',
          padding: '24px', textAlign: 'center',
          color: 'var(--text-muted)', fontSize: '0.78rem',
          letterSpacing: '0.02em',
          transition: 'border-color 0.35s ease, color 0.35s ease',
        }}>
          CarboCred &mdash; Decentralised Carbon Credit Marketplace &bull; Powered by Ethereum &bull; {new Date().getFullYear()}
        </footer>
      </div>
    </Router>
  );
}
