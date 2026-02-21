/**
 * pages/PublicDashboard.jsx
 *
 * Fully public, read-only emissions dashboard.
 * NO wallet connection required. All data from blockchain.
 * Accessible at: http://localhost:3000/public-dashboard.html (dev)
 */

import { usePublicCarbonData } from '../hooks/usePublicCarbonData'
import { GlobalStats } from '../components/GlobalStats'
import { FirmTable } from '../components/FirmTable'
import '../App.css'
import '../styles/dashboard.css'

const REFRESH_INTERVAL_S = 30

export default function PublicDashboard() {
    const { firms, globalStats, loading, error, lastRefresh, refresh } =
        usePublicCarbonData()

    const nextRefreshIn = lastRefresh
        ? Math.max(0, REFRESH_INTERVAL_S - Math.floor((Date.now() - lastRefresh.getTime()) / 1000))
        : null

    return (
        <div className="pd-root">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(3, 7, 18, 0.8)', backdropFilter: 'blur(8px)' }}>
                <div className="header-left">
                    <span className="logo">🌿</span>
                    <div className="brand">
                        <h1 style={{ margin: 0, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>CarboCred</h1>
                    </div>
                    <span className="badge">Public Emissions Dashboard</span>

                    <div className="header-tabs">
                        <a href="/" className="nav-link">← Back to App</a>
                        <span className="nav-link active">Public Dashboard</span>
                    </div>
                </div>

                <div className="header-right">
                    {/* Auto-refresh indicator */}
                    <div className="pd-refresh-info">
                        {loading && <span className="pd-spinner" />}
                        {lastRefresh && !loading && (
                            <span className="pd-refresh-time">
                                Updated {lastRefresh.toLocaleTimeString()}
                                {nextRefreshIn !== null && ` · next in ${nextRefreshIn}s`}
                            </span>
                        )}
                    </div>
                    <button
                        className="btn btn-outline"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        onClick={refresh}
                        disabled={loading}
                    >
                        {loading ? 'Loading…' : '⟳ Refresh'}
                    </button>
                </div>
            </header>

            <main className="pd-main">
                {/* ── Error banner ─────────────────────────────────────────────── */}
                {error && (
                    <div className="pd-error-banner">
                        <strong>⚠️ RPC Error</strong> — {error}
                        <button className="pd-btn pd-btn--sm pd-btn--outline" onClick={refresh}>Retry</button>
                    </div>
                )}

                {/* ── Global Stats ──────────────────────────────────────────────── */}
                <section className="pd-section">
                    <h2 className="pd-section-title">Global Summary</h2>
                    <GlobalStats stats={globalStats} loading={loading} />
                </section>

                {/* ── Firm Table ────────────────────────────────────────────────── */}
                <section className="pd-section">
                    <div className="pd-section-header">
                        <h2 className="pd-section-title">Participating Firms</h2>
                        <span className="pd-pill">
                            {loading ? '…' : firms.length} addresses indexed
                        </span>
                    </div>
                    <FirmTable firms={firms} loading={loading} />
                </section>
            </main>

            <footer className="pd-footer">
                <span>CarboCred · Fully on-chain · No database · Open source</span>
            </footer>
        </div>
    )
}
