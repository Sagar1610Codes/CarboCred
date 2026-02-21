/**
 * pages/PublicDashboard.jsx
 *
 * Fully public, read-only emissions dashboard.
 * NO wallet connection required. All data from blockchain.
 * Accessible at: http://localhost:3000/public-dashboard.html (dev)
 */

import { motion } from 'framer-motion'
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
        <motion.div
            className="pd-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <motion.header
                className="pd-header"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            >
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
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="pd-btn pd-btn--outline"
                        onClick={refresh}
                        disabled={loading}
                    >
                        {loading ? 'Loading…' : '⟳ Refresh'}
                    </motion.button>
                    <a href="/" className="pd-btn pd-btn--ghost">← Back to App</a>
                </div>
            </motion.header>

            <main className="pd-main">
                {/* ── Error banner ─────────────────────────────────────────────── */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pd-error-banner"
                    >
                        <strong>⚠️ RPC Error</strong> — {error}
                        <button className="pd-btn pd-btn--sm pd-btn--outline" onClick={refresh}>Retry</button>
                    </motion.div>
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
        </motion.div>
    )
}
