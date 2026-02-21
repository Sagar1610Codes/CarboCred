import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function Navbar() {
    const { pathname } = useLocation()
    const { theme, toggle } = useTheme()

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                <span className="logo-icon">🌿</span>
                <span className="brand-name">CarboCred</span>
                <span className="beta">ERC-1155</span>
            </Link>

            <div className="navbar-links">
                <Link to="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>Home</Link>
                <Link to="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
                <a
                    href="https://github.com/Sagar1610Codes/CarboCred"
                    target="_blank"
                    rel="noreferrer"
                    className="nav-link"
                >
                    GitHub ↗
                </a>

                {/* Theme toggle */}
                <button
                    className="theme-toggle"
                    onClick={toggle}
                    title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? '🌙' : '☀️'}
                </button>

                <Link to="/dashboard" className="btn btn-primary btn-sm">Launch App →</Link>
            </div>
        </nav>
    )
}
