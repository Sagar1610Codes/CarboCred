import React, { useState, useEffect } from 'react';
import { QRScanner } from '../components/QRScanner';
import { useTxVerification } from '../hooks/useTxVerification';

export default function VerifyTransaction({ initialHash = '', onReturnHome }) {
    const [mode, setMode] = useState('SCAN'); // 'SCAN' or 'MANUAL'
    const [inputHash, setInputHash] = useState(initialHash);
    const [activeHash, setActiveHash] = useState(initialHash); // The hash currently being verified

    // Core Verification Hook Pipeline
    const { loading, exists, confirmed, receipt, error, timestamp, verifyTransaction } = useTxVerification();

    useEffect(() => {
        // If loaded with a direct hash initially, verify it
        if (activeHash) {
            verifyTransaction(activeHash);
            // Switch mode to manual display automatically if an initial Hash was supplied
            setMode('MANUAL');
        }
    }, [activeHash, verifyTransaction]);

    const handleScanSuccess = (decodedHash) => {
        setInputHash(decodedHash);
        setActiveHash(decodedHash);
        setMode('MANUAL'); // Swap to results view
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

    // Helper Renderer for the Result Box
    const renderVerificationStatus = () => {
        if (!activeHash) {
            return (
                <div className="p-8 text-center text-slate-500 border border-slate-700/50 rounded-xl bg-slate-800/30 border-dashed">
                    Input a transaction hash to begin blockchain verification.
                </div>
            );
        }

        if (loading) {
            return (
                <div className="p-8 text-center border border-slate-700/50 rounded-xl bg-slate-800/80 animate-pulse">
                    <span className="text-3xl block mb-3">📡</span>
                    <h3 className="text-xl font-bold text-white mb-1">Querying RPC Nodes</h3>
                    <p className="text-slate-400 text-sm">Validating transaction signature on the blockchain...</p>
                </div>
            );
        }

        if (error || !exists) {
            return (
                <div className="p-8 border border-red-900/50 rounded-xl bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">❌</span>
                        <h3 className="text-2xl font-bold text-red-500">Unverified / Invalid</h3>
                    </div>
                    <p className="text-red-200/80 mb-2">The requested transaction could not be located on the blockchain.</p>

                    {error && (
                        <div className="mt-4 p-3 bg-red-900/40 border border-red-800 rounded-lg text-sm text-red-300 font-mono break-all">
                            {error}
                        </div>
                    )}
                </div>
            );
        }

        // If it got here, it's exists === true
        if (!confirmed) {
            return (
                <div className="p-8 border border-yellow-700/50 rounded-xl bg-yellow-900/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl animate-spin">⏳</span>
                        <h3 className="text-2xl font-bold text-yellow-500">Pending Confirmation</h3>
                    </div>
                    <p className="text-yellow-200/80">The transaction exists in the mempool but has not yet been minted into a block. Try again in a few seconds.</p>
                </div>
            );
        }

        // Fully Confirmed Success State
        return (
            <div className="p-8 border border-green-700/50 rounded-xl bg-green-900/20 shadow-[0_0_30px_rgba(34,197,94,0.15)] transition-all">
                <div className="flex items-center gap-3 mb-6 border-b border-green-800/50 pb-4">
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-2xl shadow-lg shadow-green-500/30">
                        ✅
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-green-400 tracking-tight">Verified Authentic</h3>
                        <p className="text-green-200/70 text-sm">Blockchain consensus confirmed.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                            <span className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Block Number</span>
                            <span className="text-lg text-slate-200 font-mono font-bold">
                                {receipt.blockNumber.toLocaleString()}
                            </span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                            <span className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Timestamp</span>
                            <span className="text-md text-slate-200">
                                {timestamp || 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 overflow-hidden">
                        <span className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Transaction Hash</span>
                        <div className="text-sm text-green-300 font-mono truncate select-all">
                            {activeHash}
                        </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-700/50 overflow-hidden">
                        <span className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Sent From Wallet</span>
                        <div className="text-sm text-slate-300 font-mono truncate break-all">
                            {receipt.from}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 w-full">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Public Verification Node</h1>
                    <p className="text-slate-400 max-w-xl">
                        Trustlessly verify Carbon Credit minting trails. Validate generated QR checks directly against the EVM RPC node. No centralized database is used.
                    </p>
                </div>
                {onReturnHome && (
                    <button onClick={onReturnHome} className="btn btn-outline text-sm">
                        Back to App
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Control Panel (Left column on large screens) */}
                <div className="lg:col-span-5 space-y-6">

                    {/* Mode Toggle Tabs */}
                    <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                        <button
                            className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${mode === 'SCAN' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
                            onClick={() => setMode('SCAN')}
                        >
                            📷 Scanner Mode
                        </button>
                        <button
                            className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-colors ${mode === 'MANUAL' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'}`}
                            onClick={() => setMode('MANUAL')}
                        >
                            ⌨️ Manual Hash
                        </button>
                    </div>

                    {/* Scanner Injector */}
                    {mode === 'SCAN' && (
                        <div className="animate-in fade-in duration-300">
                            <QRScanner onScanSuccess={handleScanSuccess} />
                        </div>
                    )}

                    {/* Manual Input Form */}
                    {mode === 'MANUAL' && (
                        <div className="p-6 bg-slate-800/80 border border-slate-700 rounded-2xl shadow-xl animate-in fade-in duration-300">
                            <form onSubmit={handleManualVerify} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Transaction Hash (0x)</label>
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                        value={inputHash}
                                        onChange={(e) => setInputHash(e.target.value)}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !inputHash}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                                >
                                    {loading ? 'Verifying...' : 'Verify Transaction'}
                                </button>

                                {activeHash && (
                                    <button
                                        type="button"
                                        onClick={resetScanner}
                                        className="w-full py-2 mt-2 text-slate-400 hover:text-white text-sm transition-colors"
                                    >
                                        Scan another code
                                    </button>
                                )}
                            </form>
                        </div>
                    )}

                </div>

                {/* Results Panel (Right column on large screens) */}
                <div className="lg:col-span-7">
                    <div className="sticky top-8">
                        {renderVerificationStatus()}
                    </div>
                </div>

            </div>
        </div>
    );
}
