import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COLS = [
    { key: 'address', label: 'Firm Identity' },
    { key: 'credits', label: 'Credits' },
    { key: 'debt', label: 'Debt' },
    { key: 'net', label: 'Net Position' },
    { key: 'lastBlock', label: 'Last Activity' },
]

function short(addr) {
    if (!addr) return '—'
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function statusBadge(net) {
    if (net > 0n) return <span className="ft-badge ft-badge--green">Net Positive</span>
    if (net === 0n) return <span className="ft-badge ft-badge--gray">Neutral</span>
    return <span className="ft-badge ft-badge--red">Net Negative</span>
}

function SortIcon({ dir }) {
    return <span className="ft-sort-icon">{dir === 'asc' ? '↑' : '↓'}</span>
}

export function FirmTable({ firms, loading }) {
    const [sortKey, setSortKey] = useState('net')
    const [sortDir, setSortDir] = useState('desc')
    const [filter, setFilter] = useState('')

    function toggleSort(key) {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('desc') }
    }

    const sorted = useMemo(() => {
        const q = filter.toLowerCase()
        const filtered = filter
            ? firms.filter(f => f.address.toLowerCase().includes(q))
            : firms

        return [...filtered].sort((a, b) => {
            let aVal = a[sortKey]
            let bVal = b[sortKey]
            if (sortKey === 'address') {
                aVal = aVal.toLowerCase()
                bVal = bVal.toLowerCase()
                return sortDir === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal)
            }
            // bigint / null comparisons
            aVal = aVal ?? -1n
            bVal = bVal ?? -1n
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
            return 0
        })
    }, [firms, sortKey, sortDir, filter])

    // ── Loading skeleton ──────────────────────────────────────────────────────
    if (loading && firms.length === 0) {
        return (
            <div className="ft-wrap">
                <div className="ft-skeleton-rows">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="ft-skeleton-row" style={{ opacity: 1 - i * 0.15 }} />
                    ))}
                </div>
            </div>
        )
    }

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!loading && firms.length === 0) {
        return (
            <div className="ft-wrap ft-empty">
                <span className="ft-empty-icon">📭</span>
                <p>No firms found on-chain yet.</p>
                <p className="ft-empty-sub">Award some credits via the main app first.</p>
            </div>
        )
    }

    return (
        <motion.div
            className="ft-wrap"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Filter */}
            <div className="ft-toolbar">
                <input
                    className="ft-filter"
                    placeholder="Filter by address…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                <span className="ft-count">{sorted.length} firm{sorted.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Table */}
            <div className="ft-scroll">
                <table className="ft-table">
                    <thead>
                        <tr>
                            {COLS.map(col => (
                                <th
                                    key={col.key}
                                    className={`ft-th ${sortKey === col.key ? 'ft-th--active' : ''}`}
                                    onClick={() => toggleSort(col.key)}
                                >
                                    {col.label}
                                    {sortKey === col.key && <SortIcon dir={sortDir} />}
                                </th>
                            ))}
                            <th className="ft-th">Status</th>
                        </tr>
                    </thead>
                    <motion.tbody
                        initial="hidden"
                        animate="visible"
                        variants={{
                            visible: { transition: { staggerChildren: 0.03 } }
                        }}
                    >
                        {sorted.map(firm => (
                            <motion.tr
                                key={firm.address}
                                className="ft-row"
                                variants={{
                                    hidden: { opacity: 0, x: -5 },
                                    visible: { opacity: 1, x: 0 }
                                }}
                            >
                                <td className="ft-td" title={firm.address}>
                                    {firm.businessName ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ fontWeight: 600, color: '#4ade80', fontSize: '0.9rem' }}>{firm.businessName}</span>
                                            <span className="ft-mono" style={{ opacity: 0.5, fontSize: '0.75rem' }}>{short(firm.address)}</span>
                                        </div>
                                    ) : (
                                        <span className="ft-mono">{short(firm.address)}</span>
                                    )}
                                </td>
                                <td className="ft-td ft-green">{firm.credits.toString()}</td>
                                <td className="ft-td ft-red">{firm.debt.toString()}</td>
                                <td className={`ft-td ft-net ${firm.net >= 0n ? 'ft-green' : 'ft-red'}`}>
                                    {firm.net >= 0n ? '+' : ''}{firm.net.toString()}
                                </td>
                                <td className="ft-td ft-muted">
                                    {firm.lastBlock != null ? `Block #${firm.lastBlock.toString()}` : '—'}
                                </td>
                                <td className="ft-td">{statusBadge(firm.net)}</td>
                            </motion.tr>
                        ))}
                    </motion.tbody>
                </table>
            </div>
        </motion.div>
    )
}
