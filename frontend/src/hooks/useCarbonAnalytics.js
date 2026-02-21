/**
 * src/hooks/useCarbonAnalytics.js
 *
 * Fetches the user's credits balance from the blockchain and feeds
 * user-provided infrastructure inputs through the carbon analytics engine.
 */

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { computeCarbonAnalytics } from '../utils/carbonAnalyticsEngine';

// Default mock inputs since we aren't storing telemetry in a DB.
// In a real scenario, this would come from a backend or IoT integration.
const DEFAULT_INPUTS = {
    electricityKWh: 12500,  // Monthly usage
    waterKL: 450,           // Monthly usage
    directCO2Tons: 15,      // Direct scope 1
    treesPlanted: 100       // Associated afforestation project
};

const TOKEN_ADDR = /** @type {`0x${string}`} */ (
    import.meta.env.VITE_CARBON_CREDIT_TOKEN_ADDRESS ?? '0x0'
);

const TOKEN_ABI = [
    { type: 'function', name: 'getPosition', stateMutability: 'view', inputs: [{ name: 'entity', type: 'address' }], outputs: [{ name: 'credits', type: 'uint256' }, { name: 'debt', type: 'uint256' }] },
];

export function useCarbonAnalytics(customInputs = null) {
    const { address, isConnected } = useAccount();

    // Manage dynamic user inputs for 'what-if' modeling
    const [inputs, setInputs] = useState(customInputs || DEFAULT_INPUTS);

    // Core metrics state
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch credits directly from the blockchain
    const {
        data: positionData,
        isError: isContractError,
        isLoading: isContractLoading,
        refetch: refetchPosition
    } = useReadContract({
        address: TOKEN_ADDR,
        abi: TOKEN_ABI,
        functionName: 'getPosition',
        args: [address],
        query: { enabled: !!address && isConnected }
    });

    // Recompute whenever inputs or blockchain data changes
    const computeEngine = useCallback(() => {
        if (!isConnected || !address) {
            setMetrics(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // positionData is [credits, debt] from the contract
            const creditsOwned = positionData ? positionData[0] : 0n;
            const emissionsDebt = positionData ? positionData[1] : 0n;

            // Re-run the deterministic engine safely
            const computed = computeCarbonAnalytics({
                ...inputs,
                creditsOwned,
                emissionsDebt
            });

            setMetrics(computed);

            if (isContractError) {
                // Non-fatal, metrics will just use 0 credits/debt
                console.warn('[useCarbonAnalytics] Contract read error, defaulting on-chain tokens to 0.');
            }
        } catch (err) {
            console.error('[useCarbonAnalytics] Engine Error:', err);
            setError(err.message || 'Failed to compute carbon metrics');
        } finally {
            setLoading(false);
        }
    }, [inputs, positionData, isContractError, isConnected, address]);

    // Attach to effect
    useEffect(() => {
        computeEngine();
    }, [computeEngine]);

    const refresh = useCallback(async () => {
        setLoading(true);
        await refetchPosition();
        computeEngine();
    }, [refetchPosition, computeEngine]);

    const updateInputs = useCallback((newInputs) => {
        setInputs(prev => ({ ...prev, ...newInputs }));
    }, []);

    return {
        metrics,
        inputs,
        updateInputs,
        loading: isContractLoading || loading,
        error: error || (isContractError ? 'Failed to read on-chain balance' : null),
        refresh
    };
}
