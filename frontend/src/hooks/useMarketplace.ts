"use client";

/**
 * hooks/useMarketplace.ts
 *
 * Hooks for all CarbonMarketplace write operations and listing reads.
 *
 * useActiveListings()  — reads all Open listings from contract
 * useListCredits()     — creates a new listing (write tx)
 * usePurchaseListing() — buys a listing with ETH (write tx)
 * useCancelListing()   — cancels own listing (write tx)
 */

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import {
    CONTRACT_ADDRESSES,
    CARBON_MARKETPLACE_ABI,
    ListingStatus,
} from "@/lib/contracts";

// ── Type ──────────────────────────────────────────────────────────────────

export type Listing = {
    id: bigint;
    seller: `0x${string}`;
    amount: bigint;
    pricePerCredit: bigint;
    status: ListingStatus;
};

// ── Read: all active listings ─────────────────────────────────────────────

export function useActiveListings() {
    // First read total listing count
    const { data: nextId } = useReadContract({
        address: CONTRACT_ADDRESSES.marketplace,
        abi: CARBON_MARKETPLACE_ABI,
        functionName: "nextListingId",
    });

    const total = Number(nextId ?? 0n);

    // Then fetch all listings in the range [0, total)
    const { data: listings, isLoading, refetch } = useReadContract({
        address: CONTRACT_ADDRESSES.marketplace,
        abi: CARBON_MARKETPLACE_ABI,
        functionName: "getListings",
        args: [0n, BigInt(total)],
        query: { enabled: total > 0 },
    });

    const all = (listings as Listing[] | undefined) ?? [];
    const open = all.filter((l) => l.status === ListingStatus.Open);

    return { listings: open, allListings: all, isLoading, refetch };
}

// ── Write: list credits ───────────────────────────────────────────────────

export function useListCredits() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    async function listCredits(amount: bigint, pricePerCreditEth: string) {
        if (!amount || !pricePerCreditEth) throw new Error("Amount and price required");

        writeContract({
            address: CONTRACT_ADDRESSES.marketplace,
            abi: CARBON_MARKETPLACE_ABI,
            functionName: "listCredits",
            args: [amount, parseEther(pricePerCreditEth)],
        });
    }

    return { listCredits, hash, isPending, isConfirming, isSuccess, error };
}

// ── Write: purchase listing ───────────────────────────────────────────────

export function usePurchaseListing() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    /**
     * Purchase a listing. The caller must send the exact ETH value.
     * @param listingId  The on-chain listing ID.
     * @param totalWei   Exact payment value in wei (amount × pricePerCredit).
     */
    async function purchase(listingId: bigint, totalWei: bigint) {
        writeContract({
            address: CONTRACT_ADDRESSES.marketplace,
            abi: CARBON_MARKETPLACE_ABI,
            functionName: "purchaseListing",
            args: [listingId],
            value: totalWei,
        });
    }

    return { purchase, hash, isPending, isConfirming, isSuccess, error };
}

// ── Write: cancel listing ─────────────────────────────────────────────────

export function useCancelListing() {
    const { writeContract, data: hash, isPending, error } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    function cancel(listingId: bigint) {
        writeContract({
            address: CONTRACT_ADDRESSES.marketplace,
            abi: CARBON_MARKETPLACE_ABI,
            functionName: "cancelListing",
            args: [listingId],
        });
    }

    return { cancel, hash, isPending, isConfirming, isSuccess, error };
}
