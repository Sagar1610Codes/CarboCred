/**
 * src/pages/UserTransactions.jsx
 *
 * Main page for the user transaction history feature.
 * Displays summary statistics and the transaction table.
 * Fully trustless, reads state directly from the blockchain log events.
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { useUserTransactions } from '../hooks/useUserTransactions';
import { UserTransactionTable } from '../components/UserTransactionTable';
import '../styles/transactions.css';

export default function UserTransactions() {
    const { isConnected } = useAccount();
    const { transactions, summary, loading, error, refresh } = useUserTransactions();

    if (!isConnected) {
        return (
            <div className="tx-empty" style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="tx-empty-icon">🔗</span>
                <h1 className="tx-title">Connect Wallet</h1>
                <p className="tx-subtitle">Please connect your MetaMask wallet to view your transaction history.</p>
            </div>
        );
    }

    const { totalReceived, totalSent, totalMinted, totalRetired } = summary;

    return (
        <div className="tx-page">
            <header className="tx-header">
                <div>
                    <h1 className="tx-title">Transaction History</h1>
                    <p className="tx-subtitle">Trustless, verifiable history reconstructed directly from on-chain events.</p>
                </div>

                <div className="tx-controls">
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="tx-refresh-btn"
                        title="Refresh Data"
                    >
                        {loading ? <span style={{ fontSize: '1.2rem' }}>⏳</span> : <span>⟳</span>}
                        {loading ? 'Syncing...' : 'Refresh'}
                    </button>
                    {loading && <span className="tx-sync-msg">Auto-syncing every 30s</span>}
                </div>
            </header>

            {error && (
                <div className="tx-error">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {/* Summary Cards */}
            <div className="tx-summary-grid">
                <SummaryCard
                    title="Total Minted"
                    value={totalMinted.toString()}
                    icon="🌿"
                    color="#4ade80"
                    bg="rgba(20, 83, 45, 0.2)"
                    loading={loading}
                />
                <SummaryCard
                    title="Total Retired"
                    value={totalRetired.toString()}
                    icon="🔥"
                    color="#c084fc"
                    bg="rgba(88, 28, 135, 0.2)"
                    loading={loading}
                />
                <SummaryCard
                    title="Total Received / Bought"
                    value={totalReceived.toString()}
                    icon="⬇️"
                    color="#60a5fa"
                    bg="rgba(30, 58, 138, 0.2)"
                    loading={loading}
                />
                <SummaryCard
                    title="Total Sent / Sold"
                    value={totalSent.toString()}
                    icon="⬆️"
                    color="#fb923c"
                    bg="rgba(124, 45, 18, 0.2)"
                    loading={loading}
                />
            </div>

            {/* Transaction Table */}
            <section>
                <div className="tx-section-header">
                    <h2 className="tx-section-title">Recent Activity</h2>
                    <span className="tx-count-badge">
                        {transactions.length} Records
                    </span>
                </div>

                <UserTransactionTable transactions={transactions} loading={loading} />
            </section>
        </div>
    );
}

function SummaryCard({ title, value, icon, color, bg, loading }) {
    return (
        <div className="tx-summary-card" style={{ backgroundColor: bg }}>
            <div className="tx-summary-card-header">
                <span style={{ fontSize: '1.125rem' }}>{icon}</span>
                {title}
            </div>
            {loading && value === "0" ? (
                <div className="tx-skeleton"></div>
            ) : (
                <div className="tx-summary-card-value" style={{ color }}>
                    {value}
                </div>
            )}
        </div>
    );
}
