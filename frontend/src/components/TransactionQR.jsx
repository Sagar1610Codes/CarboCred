import React, { useState, useEffect } from 'react';
import { generateTransactionQR } from '../utils/qrGenerator';

export function TransactionQR({ txHash }) {
    const [qrDataUrl, setQrDataUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!txHash) return;

        generateTransactionQR(txHash)
            .then(url => {
                setQrDataUrl(url);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [txHash]);

    const handleCopy = () => {
        navigator.clipboard.writeText(txHash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!txHash) return null;

    return (
        <div className="flex flex-col items-center p-6 bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-900/50 text-green-400 flex items-center justify-center border border-green-700">
                    ✓
                </div>
                <h3 className="text-xl font-bold text-white">Purchase Successful</h3>
            </div>

            <div className="p-3 bg-white rounded-xl shadow-inner mb-6 relative group transition-transform hover:scale-105">
                {loading || !qrDataUrl ? (
                    <div className="w-[250px] h-[250px] bg-slate-200 animate-pulse rounded-lg flex items-center justify-center">
                        <span className="text-slate-400 font-medium">Generating QR...</span>
                    </div>
                ) : (
                    <img
                        src={qrDataUrl}
                        alt="Transaction Verification QR"
                        className="w-[250px] h-[250px] object-contain rounded-lg"
                    />
                )}
            </div>

            <p className="text-sm text-slate-400 text-center mb-6">
                Scan this QR code using the CarboCred verification portal to trustlessly validate this transaction on-chain.
            </p>

            <div className="w-full flex flex-col gap-3">
                <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-800 text-slate-400 text-xs font-mono border-r border-slate-700">
                        TX
                    </div>
                    <div className="px-3 py-2 text-sm font-mono text-slate-300 truncate flex-1">
                        {txHash}
                    </div>
                    <button
                        onClick={handleCopy}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
                        title="Copy Hash"
                    >
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>

                {qrDataUrl && (
                    <a
                        href={qrDataUrl}
                        download={`carbocred-tx-${txHash.slice(0, 8)}.png`}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
                    >
                        <span>⬇️</span> Download QR Code Image
                    </a>
                )}
            </div>
        </div>
    );
}
