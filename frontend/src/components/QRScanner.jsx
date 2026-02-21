import React, { useState, useRef } from 'react';
import jsQR from 'jsqr';

/**
 * QRScanner — Image Upload Mode
 * Accepts a QR code image from a file picker and decodes it using jsQR.
 * Validates the CARBOCRED_TX payload format before passing the hash up.
 */
export function QRScanner({ onScanSuccess }) {
    const [preview, setPreview] = useState(null);
    const [status, setStatus] = useState('idle'); // 'idle' | 'decoding' | 'success' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const inputRef = useRef(null);
    const canvasRef = useRef(null);

    const reset = () => {
        setPreview(null);
        setStatus('idle');
        setErrorMsg('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Only accept images
        if (!file.type.startsWith('image/')) {
            setErrorMsg('Please select a valid image file.');
            setStatus('error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            setPreview(dataUrl);
            setStatus('decoding');
            setErrorMsg('');
            decodeQRFromDataUrl(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const decodeQRFromDataUrl = (dataUrl) => {
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, img.width, img.height);

            const result = jsQR(imageData.data, imageData.width, imageData.height);

            if (!result) {
                setStatus('error');
                setErrorMsg('No QR code detected in this image. Try a clearer photo.');
                return;
            }

            // Validate CARBOCRED_TX payload
            try {
                const payload = JSON.parse(result.data);
                if (payload.type === 'CARBOCRED_TX' && payload.txHash) {
                    setStatus('success');
                    setErrorMsg('');
                    onScanSuccess(payload.txHash);
                } else {
                    setStatus('error');
                    setErrorMsg('Invalid QR — not a CarboCred transaction receipt.');
                }
            } catch {
                setStatus('error');
                setErrorMsg('Malformed QR payload. This QR cannot be parsed.');
            }
        };
        img.onerror = () => {
            setStatus('error');
            setErrorMsg('Failed to load image. Please try another file.');
        };
        img.src = dataUrl;
    };

    return (
        <div className="flex flex-col items-center bg-slate-800/80 border border-slate-700/80 rounded-2xl shadow-xl w-full max-w-md mx-auto overflow-hidden">

            {/* Header */}
            <div className="w-full bg-slate-900 border-b border-slate-700 p-4 flex items-center gap-3">
                <span className="text-xl">🖼️</span>
                <h3 className="text-white font-semibold">Upload QR Image</h3>
            </div>

            {/* Drop Zone / Preview */}
            <div className="w-full p-6 flex flex-col items-center gap-4">
                {!preview ? (
                    <div
                        onClick={() => inputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors group"
                    >
                        <div className="text-5xl group-hover:scale-110 transition-transform">📁</div>
                        <p className="text-slate-300 font-medium">Click to upload QR image</p>
                        <p className="text-slate-500 text-sm">PNG, JPG, WEBP supported</p>
                    </div>
                ) : (
                    <div className="relative w-full flex flex-col items-center gap-3">
                        <img
                            src={preview}
                            alt="Uploaded QR"
                            className="w-56 h-56 object-contain rounded-xl border border-slate-600 bg-white p-2 shadow"
                        />
                        {status === 'decoding' && (
                            <div className="text-blue-400 text-sm animate-pulse">🔍 Scanning for QR code...</div>
                        )}
                        {status === 'success' && (
                            <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                                <span>✅</span> QR decoded! Verifying on-chain...
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="flex items-center gap-2 text-red-400 text-sm font-medium text-center px-2">
                                <span>❌</span> {errorMsg}
                            </div>
                        )}
                        <button
                            onClick={reset}
                            className="mt-1 text-sm text-slate-400 hover:text-white underline transition-colors"
                        >
                            Upload a different image
                        </button>
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {/* Hidden canvas for decoding */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Footer hint */}
            {!preview && (
                <div className="w-full px-6 pb-5 text-center">
                    <p className="text-slate-500 text-xs">
                        Upload the QR code image downloaded from the Purchase Success page.
                    </p>
                </div>
            )}
        </div>
    );
}
