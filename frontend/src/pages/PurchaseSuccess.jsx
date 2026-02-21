import React from 'react';
import { TransactionQR } from '../components/TransactionQR';

/**
 * Dedicated success page shown immediately after a marketplace purchase.
 * Renders the deterministic QR code for public verification.
 */
export default function PurchaseSuccess({ txHash, onBackToMarket }) {
    if (!txHash) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-white mb-2">No Transaction Found</h2>
                <p className="text-slate-400 max-w-md mx-auto mb-6">
                    We couldn't locate a recent transaction hash in your session.
                </p>
                <button
                    onClick={onBackToMarket}
                    className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
                >
                    Return to Marketplace
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-4">
                    Transaction Completed
                </h1>
                <p className="text-lg text-slate-300">
                    Your Carbon Credits have been successfully minted to your wallet.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">

                {/* Left Column: Summary */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-3">Receipt Summary</h3>

                    <ul className="space-y-4 text-slate-300">
                        <li className="flex justify-between">
                            <span className="text-slate-400">Status</span>
                            <span className="text-green-400 font-semibold px-2 py-0.5 bg-green-900/30 rounded border border-green-800">Confirmed on-chain</span>
                        </li>
                        <li className="flex justify-between">
                            <span className="text-slate-400">Asset</span>
                            <span className="font-mono text-white">Carbon Credit (CT)</span>
                        </li>
                        <li className="flex justify-between">
                            <span className="text-slate-400">Network</span>
                            <span className="font-mono text-white">CarboCred Protocol</span>
                        </li>
                        <li className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                            <span className="text-slate-400">Verification</span>
                            <span className="text-sm">100% Trustless ✅</span>
                        </li>
                    </ul>

                    <div className="mt-8">
                        <button
                            onClick={onBackToMarket}
                            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors shadow-sm"
                        >
                            Return to Marketplace
                        </button>
                    </div>
                </div>

                {/* Right Column: QR Generator */}
                <div className="flex justify-center">
                    <TransactionQR txHash={txHash} />
                </div>

            </div>
        </div>
    );
}
