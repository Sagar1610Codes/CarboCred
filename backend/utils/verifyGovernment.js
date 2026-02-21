/**
 * backend/utils/verifyGovernment.js
 *
 * Security Layer 2 — Backend Government Authority Verification.
 *
 * The Government wallet must sign a canonical authorization message
 * before any credit award operation is processed. This ensures:
 *   1. The caller is who they claim to be (signature cannot be forged).
 *   2. Backend cannot be spoofed by sending raw JSON via Postman.
 *   3. Consistent with the smart contract's GOVERNMENT_ROLE enforcement.
 */

const { ethers } = require("ethers");

/**
 * The canonical message the Government wallet must sign.
 * Both the backend (verification) and frontend (signing) must use this exact string.
 */
const AUTH_MESSAGE = "Authorize carbon credit award";

/**
 * The authorised Government Authority wallet address.
 * Loaded from environment — never hardcoded in production.
 */
const GOVERNMENT_WALLET = (process.env.GOVERNMENT_WALLET || "").toLowerCase();

/**
 * Verifies that a signature was produced by the Government wallet
 * over the canonical authorization message.
 *
 * @param {string} signature  - The 0x-prefixed signature from the request body.
 * @returns {{ ok: boolean, error?: string }}
 */
function verifyGovernmentSignature(signature) {
    if (!GOVERNMENT_WALLET) {
        // GOVERNMENT_WALLET not configured → fail closed (safe default)
        return { ok: false, error: "GOVERNMENT_WALLET not configured on server" };
    }

    try {
        const recovered = ethers.verifyMessage(AUTH_MESSAGE, signature).toLowerCase();
        if (recovered !== GOVERNMENT_WALLET) {
            return {
                ok: false,
                error: `Unauthorized: signer ${recovered} is not the Government Authority`,
            };
        }
        return { ok: true };
    } catch (err) {
        return { ok: false, error: `Invalid signature: ${err.message}` };
    }
}

/**
 * Returns true if the backend signer wallet itself IS the Government wallet.
 * Used as fallback when no signature is supplied (programmatic calls from
 * the backend service itself).
 *
 * @param {string} backendSignerAddress  - e.g. from `wallet.address`
 * @returns {boolean}
 */
function isBackendTheGovernment(backendSignerAddress) {
    return (
        !!GOVERNMENT_WALLET &&
        backendSignerAddress.toLowerCase() === GOVERNMENT_WALLET
    );
}

module.exports = { AUTH_MESSAGE, GOVERNMENT_WALLET, verifyGovernmentSignature, isBackendTheGovernment };
