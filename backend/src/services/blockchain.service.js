/**
 * services/blockchain.service.js — Core blockchain interaction service.
 * RULES: Singleton provider, retry logic, gas estimation, tx confirmation wait.
 * Always wait for confirmation. Always store txHash. Never compute balances from DB.
 */

import { ethers } from 'ethers';

import { getContract, getProvider } from '../config/blockchain.js';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/**
 * Retry wrapper for blockchain calls.
 * @param {Function} fn - Async function to retry
 * @param {string} label - Label for logging
 */
const withRetry = async (fn, label) => {
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            logger.warn(`[Blockchain] ${label} attempt ${attempt} failed: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                await sleep(RETRY_DELAY_MS * attempt);
            }
        }
    }
    throw ApiError.internal(`Blockchain operation failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
};

/**
 * Estimate gas with a safety buffer.
 * @param {object} txRequest - Ethers transaction request object
 */
const estimateGasWithBuffer = async (txRequest) => {
    try {
        const provider = getProvider();
        const estimated = await provider.estimateGas(txRequest);
        // Add 20% buffer for safety
        return (estimated * 120n) / 100n;
    } catch (error) {
        logger.warn(`Gas estimation failed, using fallback: ${error.message}`);
        return 300000n; // Fallback gas limit
    }
};

/**
 * Issue carbon credits on-chain.
 * RULES: Wait for tx confirmation. Store txHash.
 */
export const issueCreditsOnChain = async (toAddress, projectId, amount, txRef) => {
    try {
        const contract = getContract();
        logger.info(`[Blockchain] Issuing ${amount} credits for project ${projectId} to ${toAddress}`);

        const tx = await withRetry(
            () => contract.issueCredits(toAddress, projectId, amount, ethers.encodeBytes32String(txRef)),
            'issueCredits',
        );

        logger.info(`[Blockchain] Issue tx submitted: ${tx.hash}`);
        const receipt = await tx.wait(env.BLOCK_CONFIRMATIONS);
        logger.info(`[Blockchain] Issue tx confirmed at block ${receipt.blockNumber}: ${tx.hash}`);

        return {
            txHash: receipt.hash,
            blockNumber: receipt.blockNumber,
        };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to issue credits on-chain: ${error.message}`);
    }
};

/**
 * Transfer carbon credits on-chain.
 */
export const transferCreditsOnChain = async (toAddress, projectId, amount) => {
    try {
        const contract = getContract();
        logger.info(`[Blockchain] Transferring ${amount} credits for project ${projectId} to ${toAddress}`);

        const tx = await withRetry(
            () => contract.transferCredits(toAddress, projectId, amount),
            'transferCredits',
        );

        const receipt = await tx.wait(env.BLOCK_CONFIRMATIONS);
        logger.info(`[Blockchain] Transfer confirmed: ${tx.hash}`);
        return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to transfer credits on-chain: ${error.message}`);
    }
};

/**
 * Retire carbon credits on-chain (permanent offset).
 */
export const retireCreditsOnChain = async (projectId, amount, reason) => {
    try {
        const contract = getContract();
        logger.info(`[Blockchain] Retiring ${amount} credits for project ${projectId}`);

        const tx = await withRetry(
            () => contract.retireCredits(projectId, amount, reason),
            'retireCredits',
        );

        const receipt = await tx.wait(env.BLOCK_CONFIRMATIONS);
        logger.info(`[Blockchain] Retirement confirmed: ${tx.hash}`);
        return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to retire credits on-chain: ${error.message}`);
    }
};

/**
 * Fetch live balance from chain.
 * RULES: NEVER compute balance from DB. Always fetch from chain.
 */
export const getLiveBalance = async (walletAddress, projectId) => {
    try {
        const contract = getContract();
        const balance = await withRetry(
            () => contract.balanceOf(walletAddress, projectId),
            'balanceOf',
        );
        return Number(balance);
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to fetch balance from chain: ${error.message}`);
    }
};

/**
 * Fetch total supply of a project's credits from chain.
 */
export const getTotalSupply = async (projectId) => {
    try {
        const contract = getContract();
        const supply = await withRetry(
            () => contract.totalSupply(projectId),
            'totalSupply',
        );
        return Number(supply);
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to fetch total supply from chain: ${error.message}`);
    }
};

export { estimateGasWithBuffer, withRetry };
