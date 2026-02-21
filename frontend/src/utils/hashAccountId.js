/**
 * src/utils/hashAccountId.js
 *
 * Browser-safe SHA-256 hashing for anonymous wallet mapping.
 * Matches backend logic exactly.
 */

/**
 * Normalizes a wallet address and returns its deterministic SHA-256 hash.
 * Uses the Web Crypto API (crypto.subtle).
 *
 * @param {string} address - Raw Ethereum wallet address.
 * @returns {Promise<string>} - Hex string of the resulting hash.
 */
export async function hashAccountId(address) {
    if (!address || typeof address !== 'string') {
        throw new Error('Valid wallet address required for hashing');
    }

    // Normalize to lowercase
    const normalized = address.toLowerCase();

    // Convert string to UTF-8 encoder
    const msgUint8 = new TextEncoder().encode(normalized);

    // Hash the message using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);

    // Convert buffer to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
}
