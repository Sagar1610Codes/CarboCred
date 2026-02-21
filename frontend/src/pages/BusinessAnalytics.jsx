import React from 'react';
import { useAccount } from 'wagmi';
import { CarbonImpactDashboard } from '../components/CarbonImpactDashboard';

export default function BusinessAnalytics() {
    const { isConnected } = useAccount();

    if (!isConnected) {
        return (
            <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center animate-in fade-in duration-500">
                <span className="text-6xl mb-4">📊</span>
                <h1 className="text-2xl font-bold mb-2">Connect Wallet for Analytics</h1>
                <p className="text-slate-400">Please connect your MetaMask wallet to view your Carbon Impact Dashboard.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            <CarbonImpactDashboard />
        </div>
    );
}
