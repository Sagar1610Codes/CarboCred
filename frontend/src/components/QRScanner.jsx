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
        <div style={s.container}>
            {/* Header */}
            <div style={s.header}>
                <span style={s.headerIcon}>🖼️</span>
                <h3 style={s.headerTitle}>Upload QR Image</h3>
            </div>

            {/* Drop Zone / Preview */}
            <div style={s.body}>
                {!preview ? (
                    <div
                        onClick={() => inputRef.current?.click()}
                        style={s.dropZone}
                        className="group"
                    >
                        <div style={s.uploadIcon} className="group-hover:scale-110 transition-transform">📁</div>
                        <p style={s.uploadTitle}>Click to upload QR image</p>
                        <p style={s.uploadSub}>PNG, JPG, WEBP supported</p>
                    </div>
                ) : (
                    <div style={s.previewArea}>
                        <img
                            src={preview}
                            alt="Uploaded QR"
                            style={s.previewImg}
                        />
                        {status === 'decoding' && (
                            <div style={s.statusDecoding}>🔍 Scanning for QR code...</div>
                        )}
                        {status === 'success' && (
                            <div style={s.statusSuccess}>
                                <span>✅</span> QR decoded! Verifying on-chain...
                            </div>
                        )}
                        {status === 'error' && (
                            <div style={s.statusError}>
                                <span>❌</span> {errorMsg}
                            </div>
                        )}
                        <button
                            onClick={reset}
                            style={s.btnReset}
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
                <div style={s.footer}>
                    <p style={s.footerText}>
                        Upload the QR code image downloaded from the Purchase Success page.
                    </p>
                </div>
            )}
        </div>
    );
}

const s = {
    container: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'var(--obs-surface)', border: '1px solid var(--obs-border)',
        borderRadius: '1.25rem', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        width: '100%', maxWidth: '440px', margin: '0 auto', overflow: 'hidden',
    },
    header: {
        width: '100%', background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid var(--obs-border)', padding: '1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
    },
    headerIcon: { fontSize: '1.5rem' },
    headerTitle: { color: '#f8fafc', fontWeight: 700, margin: 0, fontSize: '1rem' },
    body: { width: '100%', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    dropZone: {
        width: '100%', border: '2px dashed var(--obs-border)', borderRadius: '1rem',
        padding: '3rem 1.5rem', display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: '0.75rem', cursor: 'pointer',
        transition: 'all 0.2s ease', background: 'rgba(255,255,255,0.01)',
    },
    uploadIcon: { fontSize: '3rem' },
    uploadTitle: { color: 'var(--obs-text-2)', fontWeight: 600, margin: 0 },
    uploadSub: { color: 'var(--obs-text-3)', fontSize: '0.8rem', margin: 0 },
    previewArea: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
    previewImg: {
        width: '240px', height: '240px', objectFit: 'contain',
        borderRadius: '0.75rem', border: '1px solid var(--obs-border)',
        background: '#fff', padding: '0.75rem', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
    },
    statusDecoding: { color: 'var(--obs-blue)', fontSize: '0.85rem', fontWeight: 500 },
    statusSuccess: { color: '#34d399', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' },
    statusError: { color: '#f87171', fontSize: '0.85rem', fontWeight: 500, textAlign: 'center', padding: '0 0.5rem' },
    btnReset: { background: 'none', border: 'none', color: 'var(--obs-text-3)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' },
    footer: { width: '100%', padding: '0 1.5rem 1.5rem', textAlign: 'center' },
    footerText: { color: 'var(--obs-text-3)', fontSize: '0.75rem', margin: 0, lineHeight: 1.4 },
};
