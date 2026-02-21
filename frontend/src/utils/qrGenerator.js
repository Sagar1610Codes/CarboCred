/**
 * src/utils/qrGenerator.js
 * 
 * Utility for generating standardized QR codes for transaction verification.
 * Encodes a strict JSON payload to ensure the scanner app parses intended data.
 */

import QRCode from 'qrcode';

/**
 * Generates a base64 Data URI containing a QR code 
 * that encodes a CARBOCRED_TX verification payload.
 * 
 * @param {string} txHash - The Ethereum transaction hash.
 * @param {number} size - Width/Height of the generated QR in pixels.
 * @returns {Promise<string>} The base64 Data URI string of the image.
 */
export async function generateTransactionQR(txHash, size = 300) {
    if (!txHash) throw new Error('Transaction hash is required for QR generation.');

    const payload = {
        type: "CARBOCRED_TX",
        txHash: txHash
    };

    const payloadString = JSON.stringify(payload);

    try {
        const dataUrl = await QRCode.toDataURL(payloadString, {
            width: size,
            margin: 2,
            color: {
                dark: '#0f172a', // slate-900
                light: '#ffffff' // white
            }
        });
        return dataUrl;
    } catch (err) {
        console.error('Failed to generate transaction QR code:', err);
        throw new Error('QR Generation failed');
    }
}
