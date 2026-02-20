/**
 * backend/signer.js
 *
 * This module manages the BACKEND_ROLE wallet.
 * It provides functions to award credits, record debt, and clear debt.
 */

const { ethers } = require("ethers");
require("dotenv").config();

// Contract ABI (just the functions we need for signing)
const CARBON_CREDIT_TOKEN_ABI = [
    "function awardCredits(address entity, uint256 amount, string calldata reason)",
    "function recordDebt(address entity, uint256 amount, string calldata reason)",
    "function clearDebt(address entity, uint256 amount)",
];

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL.replace("ws://", "http://").replace("wss://", "https://"));
const wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);

const creditToken = new ethers.Contract(
    process.env.CARBON_CREDIT_TOKEN_ADDRESS,
    CARBON_CREDIT_TOKEN_ABI,
    wallet
);

async function awardCredits(entity, amount, reason) {
    console.log(`[Signer] Awarding ${amount} credits to ${entity}...`);
    const tx = await creditToken.awardCredits(entity, amount, reason);
    return await tx.wait();
}

async function recordDebt(entity, amount, reason) {
    console.log(`[Signer] Recording ${amount} debt for ${entity}...`);
    const tx = await creditToken.recordDebt(entity, amount, reason);
    return await tx.wait();
}

async function clearDebt(entity, amount) {
    console.log(`[Signer] Clearing ${amount} debt for ${entity}...`);
    const tx = await creditToken.clearDebt(entity, amount);
    return await tx.wait();
}

module.exports = {
    awardCredits,
    recordDebt,
    clearDebt,
    provider,
};
