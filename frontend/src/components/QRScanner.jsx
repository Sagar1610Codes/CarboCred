import React, { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';

export function QRScanner({ onScanSuccess }) {
    const [scanError, setScanError] = useState('');

    const handleDecode = (result) => {
        if (!result || !result.length) return;

        // Use the first valid result string from the array
        const rawData = result[0].rawValue;

        try {
            const payload = JSON.parse(rawData);

            // Strict Validation Rule: Must have CARBOCRED_TX signature.
            if (payload.type === 'CARBOCRED_TX' && payload.txHash) {
                setScanError('');
                onScanSuccess(payload.txHash);
            } else {
                setScanError('Invalid QR Code. Not a CarboCred Transaction.');
            }
        } catch (e) {
            setScanError('Malformed QR payload. Unable to parse JSON.');
        }
    };

    const handleError = (error) => {
        setScanError('Camera initialization failed or access denied.');
        console.error('QR Scanner Error:', error);
    };

    return (
        <div className="flex flex-col items-center bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">

            {/* Header */}
            <div className="w-full bg-slate-900 border-b border-slate-700 p-4 flex items-center gap-3">
                <span className="text-xl">📷</span>
                <h3 className="text-white font-semibold">Decentralized Scanner</h3>
            </div>

            {/* Viewport */}
            <div className="w-full relative aspect-square bg-black">
                <Scanner
                    onScan={handleDecode}
                    onError={handleError}
                    components={{
                        audio: false,       // Beep off
                        onOff: true,        // Flashlight toggle allowed if device supports
                        torch: false,
                        zoom: false,
                        finder: true        // Draw standard QR frame
                    }}
                    styles={{
                        container: { width: '100%', height: '100%', padding: '2rem' },
                        finderBorder: 2,
                        video: { objectFit: 'cover' }
                    }}
                />

                {/* Animated Scan Line Overlay */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 opacity-30 shadow-[0_0_50px_rgba(34,197,94,0.5)] bg-gradient-to-b from-transparent via-green-500 to-transparent animate-[scan_2s_ease-in-out_infinite]" />
            </div>

            {/* Footer Status */}
            <div className="w-full p-4 bg-slate-900 min-h-[5rem] flex items-center justify-center border-t border-slate-700">
                {scanError ? (
                    <div className="text-red-400 text-sm font-medium flex items-center gap-2">
                        <span>❌</span> {scanError}
                    </div>
                ) : (
                    <div className="text-slate-400 text-sm animate-pulse">
                        Align QR code within the frame...
                    </div>
                )}
            </div>

            {/* CSS Animation defined globally or injected here for tailwind */}
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
            `}</style>
        </div>
    );
}
