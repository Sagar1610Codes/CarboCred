/**
 * hooks/useUserTransactions.js
 *
 * Fetches the complete transaction history for a specific user directly from the blockchain.
 * Uses viem public client, parsing raw logs with transactionParser.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { hardhat } from 'viem/chains';
import { normalizeTransactions } from '../utils/transactionParser';

const RPC_URL = import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545';
const TOKEN_ADDR = /** @type {`0x${string}`} */ (
    import.meta.env.VITE_CARBON_CREDIT_TOKEN_ADDRESS ?? '0x0'
);
const REFRESH_INTERVAL_MS = 30_000;
const BLOCK_CHUNK = 2000n;

// Initialize a generic read-only client
const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
});

// Event Signatures
const CREDITS_AWARDED_ABI = parseAbiItem('event CreditsAwarded(address indexed entity, uint256 amount, string reason)');
const DEBT_RECORDED_ABI = parseAbiItem('event DebtRecorded(address indexed entity, uint256 amount, string reason)');
const DEBT_CLEARED_ABI = parseAbiItem('event DebtCleared(address indexed entity, uint256 amount)');
const BALANCE_UPDATED_ABI = parseAbiItem('event BalanceUpdated(address indexed seller, address indexed buyer, uint256 amount, uint256 sellerCreditBalance, uint256 buyerCreditBalance)');
const TRANSFER_SINGLE_ABI = parseAbiItem('event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)');

async function withRetry(fn, times = 3) {
    let lastErr;
    for (let i = 0; i < times; i++) {
        try { return await fn(); }
        catch (err) {
            lastErr = err;
            await new Promise(r => setTimeout(r, 300 * (i + 1)));
        }
    }
    throw lastErr;
}

/**
 * Fetch logs in chunks to avoid RPC limits
 */
async function getLogsInChunks(client, params) {
    const latest = await client.getBlockNumber();
    const allLogs = [];
    // Assuming a reasonably recent deployment block to save time, defaulting to 0 for local hardhat
    const fromBlock = params.fromBlock || 0n;

    for (let from = fromBlock; from <= latest; from += BLOCK_CHUNK) {
        const to = from + BLOCK_CHUNK - 1n < latest ? from + BLOCK_CHUNK - 1n : latest;
        const chunk = await withRetry(() =>
            client.getLogs({ ...params, fromBlock: from, toBlock: to })
        );
        allLogs.push(...chunk);
    }
    return allLogs;
}

export function useUserTransactions() {
    const { address, isConnected } = useAccount();

    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalReceived: 0n, totalSent: 0n, totalMinted: 0n, totalRetired: 0n });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [tick, setTick] = useState(0);

    const fetchTransactions = useCallback(async () => {
        if (!isConnected || !address || TOKEN_ADDR === '0x0') {
            setTransactions([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1. Fetch relevant logs in parallel using Promise.all
            // Note: We use indexed arguments to filter efficiently at the RPC level.
            const [
                awards, debts, clears, sales, purchases, transfersFrom, transfersTo
            ] = await Promise.all([
                getLogsInChunks(publicClient, { address: TOKEN_ADDR, event: CREDITS_AWARDED_ABI, args: { entity: address } }),
                getLogsInChunks(publicClient, { address: TOKEN_ADDR, event: DEBT_RECORDED_ABI, args: { entity: address } }),
                getLogsInChunks(publicClient, { address: TOKEN_ADDR, event: DEBT_CLEARED_ABI, args: { entity: address } }),
                getLogsInChunks(publicClient, { address: TOKEN_ADDR, event: BALANCE_UPDATED_ABI, args: { seller: address } }),
                getLogsInChunks(publicClient, { address: TOKEN_ADDR, event: BALANCE_UPDATED_ABI, args: { buyer: address } }),
                getLogsInChunks(publicClient, { address: TOKEN_ADDR, event: TRANSFER_SINGLE_ABI, args: { from: address } }),
                getLogsInChunks(publicClient, { address: TOKEN_ADDR, event: TRANSFER_SINGLE_ABI, args: { to: address } }),
            ]);

            // 2. Combine all raw logs
            const allLogs = [
                ...awards, ...debts, ...clears, ...sales, ...purchases, ...transfersFrom, ...transfersTo
            ];

            // 3. Deduplicate by unique id (txHash-logIndex)
            const uniqueMap = new Map();
            for (const log of allLogs) {
                const id = `${log.transactionHash}-${log.logIndex}`;
                if (!uniqueMap.has(id)) {
                    uniqueMap.set(id, log);
                }
            }

            const uniqueLogs = Array.from(uniqueMap.values());

            // 4. Normalize and sort
            const txs = normalizeTransactions(uniqueLogs, address);

            // Sort newest first
            txs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

            // 5. Fetch timestamps for the blocks (optional but improves UX)
            // To keep it performant, we only fetch timestamps for the unique block numbers in the visible/recent set,
            // or we can just fetch them all if there aren't too many.
            // For a hackathon, let's fetch timestamps for all unique blocks present.
            const blockNumbers = [...new Set(txs.map(tx => tx.blockNumber))];
            const blockCache = new Map();

            // Batch fetch timestamps
            await Promise.all(
                blockNumbers.map(async (bn) => {
                    try {
                        const block = await publicClient.getBlock({ blockNumber: bn });
                        blockCache.set(bn, Number(block.timestamp) * 1000); // ms
                    } catch (e) {
                        blockCache.set(bn, Date.now()); // fallback
                    }
                })
            );

            // Hydrate timestamps
            txs.forEach(tx => {
                tx.timestamp = blockCache.get(tx.blockNumber) || null;
            });

            // 6. Compute Summary
            const sum = { totalReceived: 0n, totalSent: 0n, totalMinted: 0n, totalRetired: 0n };
            txs.forEach(tx => {
                if (tx.type === 'MINT') sum.totalMinted += tx.amount;
                if (tx.type === 'RETIRE' || tx.eventName === 'DebtCleared') sum.totalRetired += tx.amount;
                if (tx.type === 'RECEIVED') sum.totalReceived += tx.amount;
                if (tx.type === 'SENT') sum.totalSent += tx.amount;
                if (tx.type === 'TRADE') {
                    // Note: our normalization sets counterparty based on role.
                    // If we are seller (buyer is counterparty), we SENT credits
                    // If we are buyer (seller is counterparty), we RECEIVED credits
                    // We'll infer from context or keep it simple.
                    // For a true sum, Trades add to sent/received.
                }
            });

            setTransactions(txs);
            setSummary(sum);
        } catch (err) {
            console.error('[useUserTransactions]', err);
            setError(err.message || 'Failed to fetch transaction history');
        } finally {
            setLoading(false);
        }
    }, [address, isConnected]);

    // Auto-refresh interval
    useEffect(() => {
        fetchTransactions();
        const interval = setInterval(() => setTick(t => t + 1), REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchTransactions]);

    useEffect(() => {
        if (tick > 0) fetchTransactions();
    }, [tick, fetchTransactions]);

    const refresh = useCallback(() => setTick(t => t + 1), []);

    return { transactions, summary, loading, error, refresh };
}
