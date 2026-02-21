/**
 * backend/src/utils/hashAccountId.js
 *
 * Deterministic SHA-256 hashing for anonymous wallet mapping.
 * Ensures we never store raw wallet addresses in MongoDB.
 */

const crypto = require('crypto');

/**
 * Normalizes a wallet address and returns its deterministic SHA-256 hash.
 * @param {string} address - Raw Ethereum wallet address.
 * @returns {string} - Hex string of the resulting hash.
 */
function hashAccountId(address) {
    if (!address || typeof address !== 'string') {
        throw new Error('Valid wallet address required for hashing');
    }

    // Normalize to lowercase as Ethereum addresses are case-insensitive
    const normalized = address.toLowerCase();

    // Generate SHA-256 hash
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

module.exports = { hashAccountId };
