/**
 * hooks/usePublicCarbonData.js
 *
 * Fetches all firms + balances + recent events directly from the chain.
 * NO wallet connection required — uses a plain public HTTP RPC.
 * Auto-refreshes every 30 seconds.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPublicClient, http } from 'viem'
import { hardhat } from 'viem/chains'
import {
    getAllParticipatingAddresses,
    getFirmBalance,
    getRecentTransfers,
    computeGlobalStats,
} from '../utils/blockchainReader'
import { hashAccountId } from '../utils/hashAccountId'

const RPC_URL = import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545'
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'
const TOKEN_ADDR = /** @type {`0x${string}`} */ (
    import.meta.env.VITE_CARBON_CREDIT_TOKEN_ADDRESS ?? '0x0'
)
const REFRESH_MS = 30_000

/** Singleton public client — read-only, no signer */
const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(RPC_URL),
})

/**
 * @returns {{
 *   firms: Array<{ address: string, credits: bigint, debt: bigint, net: bigint, lastBlock: bigint|null }>,
 *   globalStats: object | null,
 *   recentEvents: Array,
 *   loading: boolean,
 *   error: string | null,
 *   lastRefresh: Date | null,
 *   refresh: () => void,
 * }}
 */
export function usePublicCarbonData() {
    const [firms, setFirms] = useState([])
    const [globalStats, setGlobalStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastRefresh, setLastRefresh] = useState(null)
    const [tick, setTick] = useState(0)   // bumped to trigger re-fetch

    // ── Fetch everything ──────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        if (TOKEN_ADDR === '0x0') {
            setError('Contract address not configured (VITE_CARBON_CREDIT_TOKEN_ADDRESS missing).')
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            // 1. Discover all participating addresses from events
            const addresses = await getAllParticipatingAddresses(publicClient, TOKEN_ADDR)

            // 2. Fetch balances in parallel
            const balances = await Promise.all(
                addresses.map(addr => getFirmBalance(publicClient, TOKEN_ADDR, addr)
                    .catch(() => ({ address: addr, credits: 0n, debt: 0n, net: 0n }))
                )
            )

            // 3. Fetch recent events (for activity feed + stats)
            const events = await getRecentTransfers(publicClient, TOKEN_ADDR, 50)

            // 4. Enrich firms with last-seen block from events
            const lastBlockMap = new Map()
            for (const ev of events) {
                const a = ev.entity?.toLowerCase()
                if (!a) continue
                if (!lastBlockMap.has(a) || ev.blockNumber > lastBlockMap.get(a))
                    lastBlockMap.set(a, ev.blockNumber)
            }

            // 4.5 Fetch business names via hashed IDs
            const profileMap = new Map()
            await Promise.all(
                addresses.map(async (addr) => {
                    try {
                        const hash = await hashAccountId(addr)
                        const res = await fetch(`${BACKEND_URL}/entity/profile/${hash}`)
                        if (res.ok) {
                            const data = await res.json()
                            if (data.exists) profileMap.set(addr.toLowerCase(), data.businessName)
                        }
                    } catch (e) {
                        // ignore errors to avoid breaking the dashboard if backend is down
                    }
                })
            )

            const enriched = balances.map(b => ({
                ...b,
                lastBlock: lastBlockMap.get(b.address.toLowerCase()) ?? null,
                businessName: profileMap.get(b.address.toLowerCase()) ?? null,
            }))

            // 5. Global stats
            const stats = computeGlobalStats(addresses, balances, events)

            setFirms(enriched)
            setGlobalStats(stats)
            setLastRefresh(new Date())
        } catch (err) {
            console.error('[usePublicCarbonData]', err)
            setError(err?.message ?? 'Failed to load blockchain data.')
        } finally {
            setLoading(false)
        }
    }, [])   // TOKEN_ADDR is module-level constant

    // Initial load + auto-refresh
    useEffect(() => {
        fetchAll()
        const interval = setInterval(() => setTick(t => t + 1), REFRESH_MS)
        return () => clearInterval(interval)
    }, [fetchAll])

    // Re-fetch whenever tick advances (auto-refresh or manual call)
    useEffect(() => {
        if (tick > 0) fetchAll()
    }, [tick, fetchAll])

    const refresh = useCallback(() => setTick(t => t + 1), [])

    return { firms, globalStats, loading, error, lastRefresh, refresh }
}
