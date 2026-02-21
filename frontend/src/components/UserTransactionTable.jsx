/**
 * src/components/UserTransactionTable.jsx
 *
 * Displays a sortable list of user transactions with Tailwind CSS styling.
 * Handles loading states and empty states natively.
 */

import React, { useState, useMemo } from 'react';

const TYPE_COLORS = {
    RECEIVED: 'tx-badge-RECEIVED',
    SENT: 'tx-badge-SENT',
    MINT: 'tx-badge-MINT',
    RETIRE: 'tx-badge-RETIRE',
    TRADE: 'tx-badge-TRADE',
};

function shortenAddr(addr) {
    if (!addr) return '—';
    if (addr.startsWith('0x')) return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    return addr; // in case of "Emissions" or "Offset" string
}

function SortIcon({ dir }) {
    return <span className="ml-1 text-xs opacity-70">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export function UserTransactionTable({ transactions, loading }) {
    const [sortKey, setSortKey] = useState('blockNumber');
    const [sortDir, setSortDir] = useState('desc');

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    const sorted = useMemo(() => {
        return [...transactions].sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            if (sortKey === 'amount' || sortKey === 'blockNumber') {
                valA = Number(valA || 0);
                valB = Number(valB || 0);
            } else if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = (valB || '').toLowerCase();
            }

            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, sortKey, sortDir]);

    if (loading) {
        return (
            <div className="tx-table-container" style={{ padding: '1.5rem', animation: 'pulse 2s infinite' }}>
                <div className="tx-skeleton" style={{ width: '12rem', height: '1.5rem', marginBottom: '1.5rem' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="tx-skeleton" style={{ width: '100%', height: '3rem' }}></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!transactions || transactions.length === 0) {
        return (
            <div className="tx-table-container tx-empty">
                <span className="tx-empty-icon">📭</span>
                <p>No transactions found for this wallet.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.75 }}>Mint or trade credits to build your history.</p>
            </div>
        );
    }

    return (
        <div className="tx-table-container">
            <div className="tx-table-scroll">
                <table className="tx-table">
                    <thead>
                        <tr>
                            <th
                                className="tx-th sortable"
                                onClick={() => toggleSort('type')}
                            >
                                Type {sortKey === 'type' && <SortIcon dir={sortDir} />}
                            </th>
                            <th
                                className="tx-th sortable"
                                onClick={() => toggleSort('amount')}
                            >
                                Amount {sortKey === 'amount' && <SortIcon dir={sortDir} />}
                            </th>
                            <th
                                className="tx-th sortable"
                                onClick={() => toggleSort('counterparty')}
                            >
                                Counterparty {sortKey === 'counterparty' && <SortIcon dir={sortDir} />}
                            </th>
                            <th className="tx-th">Tx Hash</th>
                            <th
                                className="tx-th sortable"
                                onClick={() => toggleSort('blockNumber')}
                            >
                                Time {sortKey === 'blockNumber' && <SortIcon dir={sortDir} />}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(tx => (
                            <tr key={tx.id} className="tx-tr">
                                <td className="tx-td">
                                    <span className={`tx-badge ${TYPE_COLORS[tx.type] || 'tx-badge-DEFAULT'}`}>
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="tx-td tx-mono-sm" style={{ fontWeight: 500 }}>
                                    {tx.amount.toString()}
                                </td>
                                <td className="tx-td tx-mono-sm">
                                    {shortenAddr(tx.counterparty)}
                                </td>
                                <td className="tx-td tx-mono-sm" style={{ color: '#94a3b8' }}>
                                    <div className="tx-hash-wrap">
                                        <a
                                            href={`https://sepolia.etherscan.io/tx/${tx.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tx-link"
                                            title="View on Explorer"
                                        >
                                            {shortenAddr(tx.txHash)} ↗
                                        </a>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(tx.txHash)}
                                            className="tx-copy-btn"
                                            title="Copy Hash"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </td>
                                <td className="tx-td" style={{ color: '#94a3b8' }}>
                                    {tx.timestamp ? (
                                        <span title={new Date(tx.timestamp).toLocaleString()}>
                                            {formatTimeAgo(tx.timestamp)}
                                        </span>
                                    ) : (
                                        <span className="tx-mono-sm">Blk {tx.blockNumber.toString()}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="tx-table-footer">
                Displaying {sorted.length} records • Reconstructed from on-chain events
            </div>
        </div>
    );
}

// Simple time-ago formatter
function formatTimeAgo(timestamp) {
    const min = 60 * 1000;
    const hour = 60 * min;
    const day = 24 * hour;

    const diff = Date.now() - timestamp;

    if (diff < min) return 'Just now';
    if (diff < hour) return `${Math.floor(diff / min)}m ago`;
    if (diff < day) return `${Math.floor(diff / hour)}h ago`;
    if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;

    return new Date(timestamp).toLocaleDateString();
}
