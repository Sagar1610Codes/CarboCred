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
            <header className="pd-header">
                <div className="pd-header-left">
                    <span className="pd-logo">🌿</span>
                    <div>
                        <h1 className="pd-title">CarboCred — Public Emissions Dashboard</h1>
                        <p className="pd-subtitle">
                            Trustless · Read-only · All data sourced directly from the blockchain
                        </p>
                    </div>
                </div>

                <div className="pd-header-right">
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
                        className="pd-btn pd-btn--outline"
                        onClick={refresh}
                        disabled={loading}
                    >
                        {loading ? 'Loading…' : '⟳ Refresh'}
                    </button>
                    <a href="/" className="pd-btn pd-btn--ghost">← Back to App</a>
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
