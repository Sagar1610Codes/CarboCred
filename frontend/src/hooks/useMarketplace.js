/**
 * hooks/useMarketplace.js
 * Hooks for reading listings and writing list/buy/cancel transactions.
 */
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import { CONTRACT_ADDRESSES, CARBON_MARKETPLACE_ABI, ListingStatus } from '../lib/contracts'

// ── Read: all active listings ─────────────────────────────────────────────

export function useActiveListings() {
    const { data: nextId } = useReadContract({
        address: CONTRACT_ADDRESSES.marketplace,
        abi: CARBON_MARKETPLACE_ABI,
        functionName: 'nextListingId',
    })

    const total = Number(nextId ?? 0n)

    const { data: listings, isLoading, refetch } = useReadContract({
        address: CONTRACT_ADDRESSES.marketplace,
        abi: CARBON_MARKETPLACE_ABI,
        functionName: 'getListings',
        args: [0n, BigInt(total)],
        query: { enabled: total > 0 },
    })

    const all = listings ?? []
    const open = all.filter(l => Number(l.status) === ListingStatus.Open)

    return { listings: open, allListings: all, isLoading, refetch }
}

// ── Write: list credits ───────────────────────────────────────────────────

export function useListCredits() {
    const { writeContract, data: hash, isPending, error } = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

    function listCredits(amount, pricePerCreditEth) {
        writeContract({
            address: CONTRACT_ADDRESSES.marketplace,
            abi: CARBON_MARKETPLACE_ABI,
            functionName: 'listCredits',
            args: [amount, parseEther(pricePerCreditEth)],
        })
    }

    return { listCredits, hash, isPending, isConfirming, isSuccess, error }
}

// ── Write: purchase listing ───────────────────────────────────────────────

export function usePurchaseListing() {
    const { writeContract, data: hash, isPending, error } = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

    function purchase(listingId, totalWei) {
        writeContract({
            address: CONTRACT_ADDRESSES.marketplace,
            abi: CARBON_MARKETPLACE_ABI,
            functionName: 'purchaseListing',
            args: [listingId],
            value: totalWei,
        })
    }

    return { purchase, hash, isPending, isConfirming, isSuccess, error }
}

// ── Write: cancel listing ─────────────────────────────────────────────────

export function useCancelListing() {
    const { writeContract, data: hash, isPending, error } = useWriteContract()
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

    function cancel(listingId) {
        writeContract({
            address: CONTRACT_ADDRESSES.marketplace,
            abi: CARBON_MARKETPLACE_ABI,
            functionName: 'cancelListing',
            args: [listingId],
        })
    }

    return { cancel, hash, isPending, isConfirming, isSuccess, error }
}
