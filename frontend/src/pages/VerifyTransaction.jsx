import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRScanner } from '../components/QRScanner';
import { useTxVerification } from '../hooks/useTxVerification';
import { SpotlightCard } from '../components/SpotlightCard';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export default function VerifyTransaction({ initialHash = '', onReturnHome }) {
    const [mode, setMode] = useState('SCAN'); // 'SCAN' or 'MANUAL'
    const [inputHash, setInputHash] = useState(initialHash);
    const [activeHash, setActiveHash] = useState(initialHash);
    const [firmName, setFirmName] = useState(null);

    // Core Verification Hook Pipeline
    const { loading, exists, confirmed, receipt, error, timestamp, verifyTransaction } = useTxVerification();

    useEffect(() => {
        if (activeHash) {
            verifyTransaction(activeHash);
            setMode('MANUAL');
        }
    }, [activeHash, verifyTransaction]);

    // When receipt is confirmed, look up the firm name from the backend
    useEffect(() => {
        if (!receipt?.from) { setFirmName(null); return; }

        const hashAddress = async (address) => {
            const encoded = new TextEncoder().encode(address.toLowerCase());
            const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
            return Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        };

        hashAddress(receipt.from)
            .then(accountId => fetch(`${BACKEND}/entity/profile/${accountId}`))
            .then(r => r.ok ? r.json() : null)
            .then(data => setFirmName(data?.businessName || null))
            .catch(() => setFirmName(null));
    }, [receipt]);

    const handleScanSuccess = (decodedHash) => {
        setInputHash(decodedHash);
        setActiveHash(decodedHash);
        setMode('MANUAL');
    };

    const handleManualVerify = (e) => {
        e.preventDefault();
        if (inputHash) {
            setActiveHash(inputHash);
        }
    };

    const resetScanner = () => {
        setInputHash('');
        setActiveHash('');
        setMode('SCAN');
    };

    const renderVerificationStatus = () => {
        if (!activeHash) {
            return (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={s.statusPlaceholder}
                >
                    Input a transaction hash or scan a QR code to begin blockchain verification.
                </motion.div>
            );
        }

        if (loading) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={s.statusCard}
                >
                    <span style={s.statusIconLarge}>📡</span>
                    <h3 style={s.statusTitle}>Querying RPC Nodes</h3>
                    <p style={s.statusText}>Validating transaction signature on the blockchain...</p>
                    <div style={s.loaderBar}><div style={s.loaderProgress} /></div>
                </motion.div>
            );
        }

        if (error || !exists) {
            return (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={s.errorCard}
                >
                    <div style={s.cardHead}>
                        <span style={s.statusIcon}>❌</span>
                        <h3 style={s.errorTitle}>Verification Failed</h3>
                    </div>
                    <p style={s.errorText}>The requested transaction could not be located on the blockchain.</p>
                    {error && <div style={s.errorDetail}>{error}</div>}
                </motion.div>
            );
        }

        if (!confirmed) {
            return (
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={s.pendingCard}
                >
                    <div style={s.cardHead}>
                        <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            style={s.statusIcon}
                        >
                            ⏳
                        </motion.span>
                        <h3 style={s.pendingTitle}>Pending Confirmation</h3>
                    </div>
                    <p style={s.pendingText}>The transaction exists in the mempool but has not yet been minted into a block.</p>
                </motion.div>
            );
        }

        return (
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={s.successCard}
            >
                <div style={s.successHeader}>
                    <div style={s.checkIcon}>✅</div>
                    <div>
                        <h3 style={s.successTitle}>Verified Successful</h3>
                        <p style={s.successSub}>Blockchain consensus confirmed.</p>
                    </div>
                </div>

                <div style={s.resultGrid}>
                    <div style={s.resultBox}>
                        <span style={s.resLabel}>Block Number</span>
                        <span style={s.resValMono}>{receipt.blockNumber.toLocaleString()}</span>
                    </div>
                    <div style={s.resultBox}>
                        <span style={s.resLabel}>Timestamp</span>
                        <span style={s.resVal}>{timestamp || 'N/A'}</span>
                    </div>
                    <div style={{ ...s.resultBox, gridColumn: 'span 2' }}>
                        <span style={s.resLabel}>Transaction Hash</span>
                        <div style={s.resValSmallMono}>{activeHash}</div>
                    </div>
                    <div style={{ ...s.resultBox, gridColumn: 'span 2' }}>
                        <span style={s.resLabel}>Firm / Entity</span>
                        <div style={s.resVal}>
                            {firmName ? firmName : receipt.from}
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            style={s.page}
        >
            <div style={s.header}>
                <div>
                    <h1 style={s.title}>Public Verification Node</h1>
                    <p style={s.subtitle}>
                        Trustlessly verify Carbon Credit minting trails. Validate generated QR checks directly against the EVM RPC node.
                    </p>
                </div>
                {onReturnHome && (
                    <button onClick={onReturnHome} className="btn btn-outline">
                        Back to App
                    </button>
                )}
            </div>

            <div style={s.layout}>
                <div style={s.side}>
                    <div style={s.tabs}>
                        <button
                            style={mode === 'SCAN' ? s.tabActive : s.tab}
                            onClick={() => setMode('SCAN')}
                        >
                            📷 Scanner Mode
                        </button>
                        <button
                            style={mode === 'MANUAL' ? s.tabActive : s.tab}
                            onClick={() => setMode('MANUAL')}
                        >
                            ⌨️ Manual Hash
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        {mode === 'SCAN' ? (
                            <motion.div
                                key="scan"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                style={s.panel}
                            >
                                <QRScanner onScanSuccess={handleScanSuccess} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="manual"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                style={s.panel}
                            >
                                <SpotlightCard style={s.formCard}>
                                    <form onSubmit={handleManualVerify} style={s.form}>
                                        <div style={s.field}>
                                            <label style={s.label}>Transaction Hash (0x)</label>
                                            <input
                                                type="text"
                                                placeholder="0x..."
                                                style={s.input}
                                                value={inputHash}
                                                onChange={(e) => setInputHash(e.target.value)}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading || !inputHash}
                                            className="btn btn-primary btn-full"
                                        >
                                            {loading ? 'Verifying...' : 'Verify Transaction'}
                                        </button>

                                        {activeHash && (
                                            <button
                                                type="button"
                                                onClick={resetScanner}
                                                style={s.btnReset}
                                            >
                                                Scan another code
                                            </button>
                                        )}
                                    </form>
                                </SpotlightCard>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div style={s.main}>
                    <div style={s.sticky}>
                        {renderVerificationStatus()}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

const s = {
    page: { maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem', width: '100%' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', gap: '1rem', flexWrap: 'wrap' },
    title: { fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 0.4rem' },
    subtitle: { color: 'var(--obs-text-3)', fontSize: '0.95rem', maxWidth: '600px', lineHeight: 1.5 },
    layout: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' },
    side: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
    main: { minHeight: '300px' },
    sticky: { position: 'sticky', top: '2rem' },
    tabs: { display: 'flex', background: 'var(--obs-surface)', padding: '0.25rem', borderRadius: '0.85rem', border: '1px solid var(--obs-border)' },
    tab: { flex: 1, padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--obs-text-3)', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '0.65rem', transition: 'all 0.2s' },
    tabActive: { flex: 1, padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700, color: '#fff', background: 'var(--obs-surface-2)', border: 'none', cursor: 'default', borderRadius: '0.65rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
    panel: { width: '100%' },
    formCard: { background: 'var(--obs-surface)', border: '1px solid var(--obs-border)', borderRadius: '1rem', padding: '1.5rem' },
    form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    label: { fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--obs-text-3)' },
    input: { background: 'var(--obs-surface-2)', border: '1px solid var(--obs-border)', borderRadius: '0.65rem', padding: '0.75rem 1rem', color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem', outline: 'none' },
    btnReset: { background: 'none', border: 'none', color: 'var(--obs-text-3)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem' },

    // Status Cards
    statusPlaceholder: { padding: '3rem 2rem', textAlign: 'center', color: 'var(--obs-text-3)', border: '2px dashed var(--obs-border)', borderRadius: '1rem', fontSize: '0.95rem' },
    statusCard: { padding: '2.5rem', textAlign: 'center', background: 'var(--obs-surface)', border: '1px solid var(--obs-border)', borderRadius: '1.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
    statusIconLarge: { fontSize: '2.5rem' },
    statusTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#fff', margin: 0 },
    statusText: { color: 'var(--obs-text-2)', fontSize: '0.9rem' },
    loaderBar: { width: '100%', height: '4px', background: 'var(--obs-border)', borderRadius: '2px', overflow: 'hidden', marginTop: '1rem' },
    loaderProgress: { width: '40%', height: '100%', background: '#10b981', animation: 'load 1.5s infinite ease-in-out' },

    errorCard: { padding: '2rem', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '1rem' },
    cardHead: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
    statusIcon: { fontSize: '1.5rem' },
    errorTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#f87171', margin: 0 },
    errorText: { color: 'rgba(248,113,113,0.8)', fontSize: '0.95rem', marginBottom: '1rem' },
    errorDetail: { padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', color: '#fca5a5', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' },

    pendingCard: { padding: '2rem', background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '1rem' },
    pendingTitle: { fontSize: '1.25rem', fontWeight: 700, color: '#eab308', margin: 0 },
    pendingText: { color: 'rgba(234,179,8,0.8)', fontSize: '0.95rem' },

    successCard: { padding: '2rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '1.25rem', boxShadow: '0 0 40px -10px rgba(16,185,129,0.1)' },
    successHeader: { display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(16,185,129,0.1)', marginBottom: '1.5rem' },
    checkIcon: { width: '44px', height: '44px', background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' },
    successTitle: { fontSize: '1.4rem', fontWeight: 800, color: '#34d399', margin: 0 },
    successSub: { color: 'rgba(16,185,129,0.7)', fontSize: '0.85rem' },
    resultGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    resultBox: { padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', border: '1px solid var(--obs-border)' },
    resLabel: { fontSize: '0.65rem', fontWeight: 700, color: 'var(--obs-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' },
    resVal: { color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem' },
    resValMono: { color: '#f8fafc', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'monospace' },
    resValSmallMono: { color: '#34d399', fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', opacity: 0.8 }
};
