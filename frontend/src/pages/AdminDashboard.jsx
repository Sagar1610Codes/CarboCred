/**
 * pages/AdminDashboard.jsx
 *
 * Two-section admin command center:
 *  1. Verified Network Entities  — on-chain data via usePublicCarbonData()
 *  2. Pending Validation Queue   — MongoDB data via GET /api/requests/pending
 *
 * Role enforcement is done server-side (requireAdmin middleware).
 * Only rendered in App.jsx when user.role === 'ADMIN'.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { usePublicCarbonData } from '../hooks/usePublicCarbonData'
import { SpotlightCard } from '../components/SpotlightCard'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'
const PAGE_SIZE = 8

// ── Helpers ────────────────────────────────────────────────────────────────
function truncate(addr) {
    if (!addr) return ''
    return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function fmt(bigint) {
    try { return Number(bigint).toLocaleString() } catch { return '0' }
}

function timeAgo(dateStr) {
    const s = Math.floor((Date.now() - new Date(dateStr)) / 1000)
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
}

// ── Section 1: Business Registry ──────────────────────────────────────────
function BusinessRegistry() {
    const { firms, globalStats, loading, error, lastRefresh, refresh } = usePublicCarbonData()
    const [page, setPage] = useState(0)
    const [search, setSearch] = useState('')

    const filtered = firms.filter(f =>
        (f.businessName ?? f.address).toLowerCase().includes(search.toLowerCase())
    )
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const page_firms = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={s.section}
        >
            {/* Section header */}
            <div style={s.secHeader}>
                <div>
                    <h2 style={s.secTitle}>🌐 Verified Network Entities</h2>
                    <p style={s.secSub}>
                        All wallet addresses that have interacted with the CarboCred token contract on-chain.
                        Balances auto-refresh every 30 seconds.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {lastRefresh && (
                        <span style={s.refreshNote}>
                            Updated {timeAgo(lastRefresh)}
                        </span>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={s.iconBtn}
                        onClick={refresh}
                        disabled={loading}
                        title="Refresh"
                    >
                        {loading ? '⟳' : '↻'} Refresh
                    </motion.button>
                </div>
            </div>

            {/* Global stats strip */}
            {globalStats && (
                <div style={s.statsRow}>
                    {[
                        { label: 'Total Entities', value: globalStats.totalFirms ?? firms.length, icon: '🏢' },
                        { label: 'Total Credits', value: fmt(globalStats.totalCredits ?? 0n), icon: '🟢' },
                        { label: 'Total Debt', value: fmt(globalStats.totalDebt ?? 0n), icon: '🔴' },
                        { label: 'Net Position', value: fmt(globalStats.netPosition ?? 0n), icon: '⚖️' },
                    ].map(({ label, value, icon }, idx) => (
                        <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            style={{ flex: '1 1 160px' }}
                        >
                            <SpotlightCard style={s.statCard}>
                                <span style={s.statIcon}>{icon}</span>
                                <p style={s.statLabel}>{label}</p>
                                <p style={s.statValue}>{value}</p>
                            </SpotlightCard>
                        </motion.div>
                    ))}
                </div>
            )}

            {error && <div style={s.errorBanner}>⚠ {error}</div>}

            {/* Search + table */}
            <SpotlightCard style={s.tableCard}>
                <div style={s.tableToolbar}>
                    <input
                        style={s.search}
                        placeholder="Search by name or address…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0) }}
                    />
                    <span style={s.pill}>{filtered.length} entities</span>
                </div>

                {loading && firms.length === 0 ? (
                    <p style={s.muted}>Loading blockchain data…</p>
                ) : firms.length === 0 ? (
                    <div style={s.empty}>
                        <span style={{ fontSize: '2rem' }}>🔍</span>
                        <p>No entities found on-chain yet.</p>
                    </div>
                ) : (
                    <>
                        <div style={s.tableWrap}>
                            <table style={s.table}>
                                <thead>
                                    <tr>
                                        {['Business', 'Wallet', 'Credits', 'Debt', 'Net Position', 'Status'].map(h => (
                                            <th key={h} style={s.th}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence mode='popLayout'>
                                        {page_firms.map((firm, idx) => {
                                            const net = firm.net ?? (firm.credits - firm.debt)
                                            const isNetNeg = net <= 0n
                                            return (
                                                <motion.tr
                                                    key={firm.address}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    style={s.tr}
                                                >
                                                    <td style={s.td}>
                                                        {firm.businessName
                                                            ? <span style={{ fontWeight: 600, color: 'var(--obs-text-1)' }}>{firm.businessName}</span>
                                                            : <span style={{ color: 'var(--obs-text-3)', fontStyle: 'italic' }}>— unregistered —</span>
                                                        }
                                                    </td>
                                                    <td style={s.td}>
                                                        <code style={s.code}>{truncate(firm.address)}</code>
                                                    </td>
                                                    <td style={{ ...s.td, color: 'var(--obs-green)', fontWeight: 700, fontFamily: 'monospace' }}>
                                                        {fmt(firm.credits)}
                                                    </td>
                                                    <td style={{ ...s.td, color: 'var(--obs-red)', fontWeight: 700, fontFamily: 'monospace' }}>
                                                        {fmt(firm.debt)}
                                                    </td>
                                                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 700, color: isNetNeg ? 'var(--obs-green)' : 'var(--obs-red)' }}>
                                                        {net >= 0n ? '+' : ''}{fmt(net)}
                                                    </td>
                                                    <td style={s.td}>
                                                        <span style={isNetNeg ? s.badgeGreen : s.badgeRed}>
                                                            {isNetNeg ? '🟢 Net-Negative' : '🔴 Net-Emitter'}
                                                        </span>
                                                    </td>
                                                </motion.tr>
                                            )
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div style={s.pagination}>
                                <button style={s.pageBtn} onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                                    ‹ Prev
                                </button>
                                <span style={s.pageInfo}>Page {page + 1} of {totalPages}</span>
                                <button style={s.pageBtn} onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                                    Next ›
                                </button>
                            </div>
                        )}
                    </>
                )}
            </SpotlightCard>
        </motion.section>
    )
}

// ── Section 2: Validation Queue ────────────────────────────────────────────
function ValidationQueue({ token }) {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)
    const [error, setError] = useState(null)
    const [actions, setActions] = useState({})

    const authHeader = token ? { Authorization: `Bearer ${token}` } : {}

    const fetchPending = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${BACKEND_URL}/api/requests/pending`, { headers: authHeader })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            setRequests(json.requests)
            setFetched(true)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [token])  // eslint-disable-line react-hooks/exhaustive-deps

    // Lazy-load on first render
    if (!fetched && !loading) fetchPending()

    async function handleApprove(id) {
        setActions(prev => ({ ...prev, [id]: { state: 'approving' } }))
        try {
            const res = await fetch(`${BACKEND_URL}/api/requests/${id}/approve`, {
                method: 'POST', headers: authHeader,
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            setActions(prev => ({ ...prev, [id]: { state: 'approved', txHash: json.txHash } }))
            setTimeout(() => setRequests(prev => prev.filter(r => r._id !== id)), 3500)
        } catch (err) {
            setActions(prev => ({ ...prev, [id]: { state: 'error', message: err.message } }))
        }
    }

    async function handleReject(id) {
        setActions(prev => ({ ...prev, [id]: { state: 'rejecting' } }))
        try {
            const res = await fetch(`${BACKEND_URL}/api/requests/${id}/reject`, {
                method: 'POST', headers: authHeader,
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.error)
            setRequests(prev => prev.filter(r => r._id !== id))
        } catch (err) {
            setActions(prev => ({ ...prev, [id]: { state: 'error', message: err.message } }))
        }
    }

    const pendingCount = requests.filter(r => !actions[r._id]?.state || actions[r._id]?.state === 'error').length

    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={s.section}
        >
            <div style={s.secHeader}>
                <div>
                    <h2 style={s.secTitle}>⏳ Pending Validation Queue</h2>
                    <p style={s.secSub}>
                        Review submitted carbon credit and debt claims. Approved requests trigger on-chain minting via the backend signer.
                        Rejected requests are permanently dismissed.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {pendingCount > 0 && (
                        <motion.span
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            style={{ ...s.pill, background: 'var(--obs-red-dim)', color: 'var(--obs-red)', border: '1px solid rgba(248,113,113,0.25)' }}
                        >
                            {pendingCount} awaiting review
                        </motion.span>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        style={s.iconBtn}
                        onClick={fetchPending}
                        disabled={loading}
                    >
                        {loading ? '⟳ Loading…' : '↻ Refresh'}
                    </motion.button>
                </div>
            </div>

            {error && <div style={s.errorBanner}>⚠ {error}</div>}

            {loading && requests.length === 0 ? (
                <p style={s.muted}>Loading pending requests…</p>
            ) : requests.length === 0 ? (
                <SpotlightCard style={{ ...s.tableCard, textAlign: 'center', padding: '3rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>✅</span>
                    <p style={{ marginTop: '0.75rem', color: 'var(--obs-text-2)', fontSize: '1rem' }}>
                        All caught up — no pending requests.
                    </p>
                </SpotlightCard>
            ) : (
                <div style={s.cardGrid}>
                    <AnimatePresence>
                        {requests.map((req, idx) => {
                            const action = actions[req._id]
                            const isWorking = action?.state === 'approving' || action?.state === 'rejecting'
                            const isCredit = req.type === 'CREDIT'

                            return (
                                <motion.div
                                    key={req._id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: idx * 0.08 }}
                                >
                                    <SpotlightCard style={s.reqCard}>
                                        {/* Type banner */}
                                        <div style={{ ...s.typeBanner, background: isCredit ? 'var(--obs-green-dim)' : 'var(--obs-red-dim)', borderColor: isCredit ? 'rgba(16,185,129,0.2)' : 'rgba(248,113,113,0.2)' }}>
                                            <span style={{ fontWeight: 700, color: isCredit ? 'var(--obs-green)' : 'var(--obs-red)', fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                                                {isCredit ? '🌱 CARBON REDUCTION' : '🏭 CARBON EMISSION'}
                                            </span>
                                            <span style={s.reqTime}>{timeAgo(req.createdAt)}</span>
                                        </div>

                                        {/* Body */}
                                        <div style={s.reqBody}>
                                            <div style={s.reqRow}>
                                                <span style={s.reqLabel}>Entity</span>
                                                <code style={s.code}>{truncate(req.entityAddress)}</code>
                                            </div>
                                            <div style={s.reqRow}>
                                                <span style={s.reqLabel}>Amount</span>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', color: 'var(--obs-text-1)' }}>
                                                    {req.amount?.toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--obs-text-3)' }}>credits</span>
                                                </span>
                                            </div>
                                            <div style={s.reqRow}>
                                                <span style={s.reqLabel}>Reason</span>
                                                <span style={{ color: 'var(--obs-text-2)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                                    {req.reason}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={s.reqActions}>
                                            {action?.state === 'approved' ? (
                                                <div style={{ textAlign: 'center' }}>
                                                    <span style={{ color: 'var(--obs-green)', fontWeight: 700, fontSize: '0.85rem' }}>✅ Approved & Minted</span>
                                                    {action.txHash && (
                                                        <p style={{ marginTop: '0.25rem' }}>
                                                            <code style={{ fontSize: '0.65rem', color: 'var(--obs-text-3)' }}>{action.txHash.slice(0, 22)}…</code>
                                                        </p>
                                                    )}
                                                </div>
                                            ) : action?.state === 'error' ? (
                                                <p style={{ color: 'var(--obs-red)', fontSize: '0.78rem', textAlign: 'center' }}>
                                                    ⚠ {action.message?.slice(0, 80)}
                                                </p>
                                            ) : (
                                                <>
                                                    <motion.button
                                                        whileHover={!isWorking ? { scale: 1.05 } : {}}
                                                        whileTap={!isWorking ? { scale: 0.95 } : {}}
                                                        style={isWorking ? s.btnDisabled : s.btnApprove}
                                                        onClick={() => handleApprove(req._id)}
                                                        disabled={isWorking}
                                                    >
                                                        {action?.state === 'approving' ? '⟳ Minting…' : '✓ Approve & Mint'}
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={!isWorking ? { scale: 1.05 } : {}}
                                                        whileTap={!isWorking ? { scale: 0.95 } : {}}
                                                        style={isWorking ? s.btnDisabled : s.btnReject}
                                                        onClick={() => handleReject(req._id)}
                                                        disabled={isWorking}
                                                    >
                                                        {action?.state === 'rejecting' ? '⟳…' : '✕ Reject'}
                                                    </motion.button>
                                                </>
                                            )}
                                        </div>
                                    </SpotlightCard>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}
        </motion.section>
    )
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard({ token }) {
    const { address } = useAccount()

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            style={s.page}
        >
            {/* Page Header */}
            <div style={s.pageHeader}>
                <div>
                    <h1 style={s.pageTitle}>🏛 Government Admin Panel</h1>
                    <p style={s.pageSub}>
                        Command center for reviewing on-chain entity balances and approving pending credit/debt requests before minting.
                        {address && <span style={{ marginLeft: '0.5rem', color: 'var(--obs-text-3)', fontSize: '0.8rem', fontFamily: 'monospace' }}>({truncate(address)})</span>}
                    </p>
                </div>
            </div>

            <BusinessRegistry />
            <ValidationQueue token={token} />
        </motion.div>
    )
}

// ── Styles (CSS-variable aware) ────────────────────────────────────────────
const s = {
    page: {
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        animation: 'caFadeIn 0.5s cubic-bezier(0.16,1,0.3,1)',
    },
    pageHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    pageTitle: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '2rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        margin: '0 0 0.4rem',
        background: 'linear-gradient(135deg, var(--obs-text-1) 30%, var(--obs-green) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
    },
    pageSub: {
        color: 'var(--obs-text-2)',
        fontSize: '0.95rem',
        margin: 0,
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    secHeader: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    secTitle: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.35rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        color: 'var(--obs-text-1)',
        margin: '0 0 0.25rem',
    },
    secSub: {
        color: 'var(--obs-text-3)',
        fontSize: '0.875rem',
        margin: 0,
        maxWidth: '620px',
        lineHeight: 1.6,
    },
    statsRow: {
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
    },
    statCard: {
        background: 'var(--obs-surface)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.85rem',
        padding: '1rem 1.25rem',
        minWidth: '160px',
        flex: '1 1 160px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        transition: 'background 0.25s',
    },
    statIcon: { fontSize: '1.25rem' },
    statLabel: {
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--obs-text-3)',
        margin: 0,
    },
    statValue: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--obs-text-1)',
        margin: 0,
    },
    tableCard: {
        background: 'var(--obs-surface)',
        border: '1px solid var(--obs-border)',
        borderRadius: '1rem',
        padding: '1.25rem',
        overflow: 'hidden',
        transition: 'background 0.25s',
    },
    tableToolbar: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
    },
    search: {
        background: 'var(--obs-surface-2)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.5rem',
        padding: '0.45rem 0.85rem',
        color: 'var(--obs-text-1)',
        fontSize: '0.875rem',
        fontFamily: 'inherit',
        outline: 'none',
        width: '260px',
        transition: 'border-color 0.2s, background 0.25s',
    },
    pill: {
        fontSize: '0.7rem',
        background: 'var(--obs-surface-2)',
        border: '1px solid var(--obs-border)',
        color: 'var(--obs-text-2)',
        padding: '0.2rem 0.65rem',
        borderRadius: '9999px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
    },
    tableWrap: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
    th: {
        padding: '0.6rem 0.85rem',
        textAlign: 'left',
        fontSize: '0.68rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--obs-text-3)',
        borderBottom: '1px solid var(--obs-border)',
        whiteSpace: 'nowrap',
    },
    tr: { borderBottom: '1px solid var(--obs-border)', transition: 'background 0.12s' },
    td: { padding: '0.75rem 0.85rem', color: 'var(--obs-text-1)', verticalAlign: 'middle' },
    code: {
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        color: 'var(--obs-text-2)',
        background: 'var(--obs-surface-2)',
        padding: '0.1rem 0.4rem',
        borderRadius: '0.3rem',
    },
    badgeGreen: {
        display: 'inline-block', fontSize: '0.7rem', fontWeight: 700,
        padding: '0.18rem 0.6rem', borderRadius: '9999px',
        background: 'var(--obs-green-dim)', color: 'var(--obs-green)',
        border: '1px solid rgba(16,185,129,0.25)',
    },
    badgeRed: {
        display: 'inline-block', fontSize: '0.7rem', fontWeight: 700,
        padding: '0.18rem 0.6rem', borderRadius: '9999px',
        background: 'var(--obs-red-dim)', color: 'var(--obs-red)',
        border: '1px solid rgba(248,113,113,0.25)',
    },
    pagination: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '1rem', marginTop: '1rem', paddingTop: '1rem',
        borderTop: '1px solid var(--obs-border)',
    },
    pageBtn: {
        background: 'var(--obs-surface-2)', border: '1px solid var(--obs-border)',
        color: 'var(--obs-text-2)', borderRadius: '0.45rem',
        padding: '0.35rem 0.85rem', fontSize: '0.8rem', fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
    },
    pageInfo: { color: 'var(--obs-text-3)', fontSize: '0.8rem' },
    // Validation queue
    cardGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.25rem',
    },
    reqCard: {
        background: 'var(--obs-surface)',
        border: '1px solid var(--obs-border)',
        borderRadius: '1rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 0.25s, border-color 0.2s',
    },
    typeBanner: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.6rem 1rem',
        borderBottom: '1px solid',
    },
    reqTime: { color: 'var(--obs-text-3)', fontSize: '0.72rem' },
    reqBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem',
        flex: 1,
    },
    reqRow: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
    },
    reqLabel: {
        fontSize: '0.68rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--obs-text-3)',
    },
    reqActions: {
        display: 'flex',
        gap: '0.6rem',
        padding: '0.75rem 1rem 1rem',
        borderTop: '1px solid var(--obs-border)',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    btnApprove: {
        background: 'linear-gradient(135deg, var(--obs-green) 0%, #059669 100%)',
        color: '#fff', border: 'none', borderRadius: '0.45rem',
        padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
        flex: 1, whiteSpace: 'nowrap',
    },
    btnReject: {
        background: 'var(--obs-red-dim)', color: 'var(--obs-red)',
        border: '1px solid rgba(248,113,113,0.3)', borderRadius: '0.45rem',
        padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
        flex: 1, whiteSpace: 'nowrap',
    },
    btnDisabled: {
        background: 'var(--obs-surface-2)', color: 'var(--obs-text-3)',
        border: '1px solid var(--obs-border)', borderRadius: '0.45rem',
        padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700,
        cursor: 'not-allowed', fontFamily: 'inherit', flex: 1, whiteSpace: 'nowrap',
    },
    iconBtn: {
        background: 'var(--obs-surface-2)', border: '1px solid var(--obs-border)',
        color: 'var(--obs-text-2)', borderRadius: '0.5rem',
        padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
    },
    refreshNote: { color: 'var(--obs-text-3)', fontSize: '0.75rem' },
    errorBanner: {
        background: 'var(--obs-red-dim)', border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: '0.75rem', padding: '0.75rem 1rem',
        color: 'var(--obs-red)', fontSize: '0.85rem',
    },
    muted: { color: 'var(--obs-text-3)', fontSize: '0.875rem', padding: '1rem 0' },
    empty: { textAlign: 'center', color: 'var(--obs-text-3)', padding: '3rem 1rem' },
}
