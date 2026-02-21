/**
 * src/hooks/useTxVerification.js
 * 
 * Trustless blockchain verification hook.
 * Queries the RPC directly using wagmi to fetch robust receipt data for a given transaction hash.
 */

import { useState, useCallback, useEffect } from 'react';
import { usePublicClient } from 'wagmi';

export function useTxVerification(txHash = null) {
    const publicClient = usePublicClient();

    const [state, setState] = useState({
        loading: false,
        exists: false,
        confirmed: false,
        receipt: null,
        error: null,
        timestamp: null
    });

    const verifyTransaction = useCallback(async (hashToVerify) => {
        const targetHash = hashToVerify || txHash;

        if (!targetHash || typeof targetHash !== 'string' || !targetHash.startsWith('0x')) {
            setState(prev => ({ ...prev, loading: false, exists: false, error: 'Invalid transaction hash format' }));
            return;
        }

        if (!publicClient) {
            setState(prev => ({ ...prev, loading: false, error: 'Blockchain provider not connected' }));
            return;
        }

        setState({ loading: true, exists: false, confirmed: false, receipt: null, error: null, timestamp: null });

        try {
            // First attempt to get the full receipt. This tells us if it's confirmed.
            const receipt = await publicClient.getTransactionReceipt({ hash: targetHash });

            if (receipt) {
                // Determine if successful (status 1 = success, 0 = reverted)
                const isSuccess = receipt.status === 'success';

                // Try to get block timestamp for UI context
                let timestamp = null;
                try {
                    const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber });
                    timestamp = block ? new Date(Number(block.timestamp) * 1000).toLocaleString() : null;
                } catch (e) {
                    console.warn("Could not fetch block timestamp", e);
                }

                setState({
                    loading: false,
                    exists: true,
                    confirmed: true,
                    receipt: {
                        blockNumber: Number(receipt.blockNumber),
                        from: receipt.from,
                        to: receipt.to,
                        gasUsed: Number(receipt.gasUsed),
                        status: isSuccess ? 'success' : 'reverted'
                    },
                    timestamp,
                    error: isSuccess ? null : 'Transaction was reverted on-chain'
                });
                return;
            }

            // If no receipt, check if it's pending in the mempool
            const tx = await publicClient.getTransaction({ hash: targetHash });

            if (tx) {
                setState({
                    loading: false,
                    exists: true,
                    confirmed: false, // In mempool but not minted
                    receipt: null,
                    error: null,
                    timestamp: null
                });
            } else {
                // Not found anywhere
                setState({
                    loading: false,
                    exists: false,
                    confirmed: false,
                    receipt: null,
                    error: 'Transaction not found on the network',
                    timestamp: null
                });
            }

        } catch (err) {
            console.error('Verification Error:', err);

            // Wagmi/viem throws specific errors if tx is simply not found
            if (err.name === 'TransactionNotFoundError' || err.name === 'TransactionReceiptNotFoundError') {
                setState({
                    loading: false,
                    exists: false,
                    confirmed: false,
                    receipt: null,
                    error: 'Transaction hash does not exist on-chain',
                    timestamp: null
                });
            } else {
                setState({
                    loading: false,
                    exists: false,
                    confirmed: false,
                    receipt: null,
                    error: err.message || 'Failed to verify transaction with RPC node',
                    timestamp: null
                });
            }
        }
    }, [publicClient, txHash]);

    // Auto-verify if hook is instantiated with a hash
    useEffect(() => {
        if (txHash) {
            verifyTransaction(txHash);
        }
    }, [txHash, verifyTransaction]);

    return {
        ...state,
        verifyTransaction // Expose function for manual lookups
    };
}
