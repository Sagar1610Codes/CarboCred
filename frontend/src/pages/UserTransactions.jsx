/**
 * src/pages/UserTransactions.jsx
 *
 * Main page for the user transaction history feature.
 * Displays summary statistics and the transaction table.
 * Fully trustless, reads state directly from the blockchain log events.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { useUserTransactions } from '../hooks/useUserTransactions';
import { UserTransactionTable } from '../components/UserTransactionTable';
import '../styles/transactions.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            stiffness: 100,
            damping: 20
        }
    }
};

export default function UserTransactions() {
    const { isConnected } = useAccount();
    const { transactions, summary, loading, error, refresh } = useUserTransactions();

    if (!isConnected) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="tx-empty"
                style={{ minHeight: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
            >
                <span className="tx-empty-icon" style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔗</span>
                <h1 className="tx-title">Connect Wallet</h1>
                <p className="tx-subtitle">Please connect your MetaMask wallet to view your transaction history.</p>
            </motion.div>
        );
    }

    const { totalReceived, totalSent, totalMinted, totalRetired } = summary;

    return (
        <motion.div
            className="tx-page"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.header className="tx-header" variants={itemVariants}>
                <div>
                    <h1 className="tx-title">Transaction History</h1>
                    <p className="tx-subtitle">Trustless, verifiable history reconstructed directly from on-chain events.</p>
                </div>

                <div className="tx-controls">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={refresh}
                        disabled={loading}
                        className="tx-refresh-btn"
                        title="Refresh Data"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {loading ? <span style={{ fontSize: '1.2rem', animation: 'spin 2s linear infinite' }}>⏳</span> : <span>⟳</span>}
                        {loading ? 'Syncing...' : 'Refresh'}
                    </motion.button>
                    {loading && <span className="tx-sync-msg">Auto-syncing every 30s</span>}
                </div>
            </motion.header>

            {error && (
                <motion.div className="tx-error" variants={itemVariants}>
                    <strong>Error:</strong> {error}
                </motion.div>
            )}

            {/* Summary Cards */}
            <motion.div className="tx-summary-grid" variants={containerVariants}>
                <SummaryCard
                    title="Total Minted"
                    value={totalMinted.toString()}
                    icon="🌿"
                    color="#4ade80"
                    bg="rgba(16, 185, 129, 0.1)"
                    loading={loading}
                    index={0}
                />
                <SummaryCard
                    title="Total Retired"
                    value={totalRetired.toString()}
                    icon="🔥"
                    color="#c084fc"
                    bg="rgba(139, 92, 246, 0.1)"
                    loading={loading}
                    index={1}
                />
                <SummaryCard
                    title="Total Received / Bought"
                    value={totalReceived.toString()}
                    icon="⬇️"
                    color="#60a5fa"
                    bg="rgba(59, 130, 246, 0.1)"
                    loading={loading}
                    index={2}
                />
                <SummaryCard
                    title="Total Sent / Sold"
                    value={totalSent.toString()}
                    icon="⬆️"
                    color="#fb923c"
                    bg="rgba(249, 115, 22, 0.1)"
                    loading={loading}
                    index={3}
                />
            </motion.div>

            {/* Transaction Table */}
            <motion.section variants={itemVariants}>
                <div className="tx-section-header">
                    <h2 className="tx-section-title">Recent Activity</h2>
                    <span className="tx-count-badge">
                        {transactions.length} Records
                    </span>
                </div>

                <UserTransactionTable transactions={transactions} loading={loading} />
            </motion.section>
        </motion.div>
    );
}

function SummaryCard({ title, value, icon, color, bg, loading, index }) {
    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)', borderColor: color }}
            className="tx-summary-card"
            style={{
                backgroundColor: bg,
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                transition: 'border-color 0.3s ease'
            }}
        >
            <div className="tx-summary-card-header" style={{ opacity: 0.8 }}>
                <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>{icon}</span>
                {title}
            </div>
            {loading && value === "0" ? (
                <div className="tx-skeleton" style={{ height: '2rem', width: '60%', marginTop: '0.5rem' }}></div>
            ) : (
                <div className="tx-summary-card-value" style={{ color, fontSize: '1.75rem', fontWeight: 800 }}>
                    {value}
                </div>
            )}
        </motion.div>
    );
}
