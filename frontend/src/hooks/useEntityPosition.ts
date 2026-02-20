"use client";

/**
 * hooks/useEntityPosition.ts
 *
 * Reads the connected wallet's CarbonCreditToken position directly
 * from the ERC-1155 contract — no backend involved.
 *
 * Returns:
 *   credits    — CREDIT_TOKEN (ID 0) balance — green energy / offsets
 *   debt       — DEBT_TOKEN   (ID 1) balance — emission liabilities
 *   netCredits — computed int256 net position (can be negative)
 *   isLoading, refetch
 */

import { useAccount, useReadContracts } from "wagmi";
import { CONTRACT_ADDRESSES, CARBON_CREDIT_TOKEN_ABI, CREDIT_TOKEN_ID, DEBT_TOKEN_ID } from "@/lib/contracts";

export function useEntityPosition() {
    const { address } = useAccount();

    const { data, isLoading, refetch } = useReadContracts({
        contracts: [
            {
                address: CONTRACT_ADDRESSES.carbonCreditToken,
                abi: CARBON_CREDIT_TOKEN_ABI,
                functionName: "balanceOf",
                args: [address!, CREDIT_TOKEN_ID],
            },
            {
                address: CONTRACT_ADDRESSES.carbonCreditToken,
                abi: CARBON_CREDIT_TOKEN_ABI,
                functionName: "balanceOf",
                args: [address!, DEBT_TOKEN_ID],
            },
        ],
        query: { enabled: !!address },
    });

    const credits = (data?.[0].result as bigint | undefined) ?? 0n;
    const debt = (data?.[1].result as bigint | undefined) ?? 0n;
    const netCredits = BigInt(credits) - BigInt(debt);

    return { credits, debt, netCredits, isLoading, refetch };
}
