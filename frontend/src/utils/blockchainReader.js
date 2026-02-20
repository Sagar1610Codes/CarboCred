/**
 * utils/blockchainReader.js
 *
 * Read-only, trustless blockchain data layer.
 * Uses viem (already in project) — NO signer, NO writes, NO database.
 *
 * Exports:
 *   getAllParticipatingAddresses(client, tokenContract)
 *   getFirmBalance(client, tokenContract, address)
 *   getRecentTransfers(client, tokenContract, limit)
 *   getGlobalStats(client, tokenContract)
 */

import { parseAbiItem, formatUnits } from 'viem'

// ── Event signatures ────────────────────────────────────────────────────────
const CREDITS_AWARDED_ABI = parseAbiItem('event CreditsAwarded(address indexed entity, uint256 amount, string reason)')
const DEBT_RECORDED_ABI = parseAbiItem('event DebtRecorded(address indexed entity, uint256 amount, string reason)')
const DEBT_CLEARED_ABI = parseAbiItem('event DebtCleared(address indexed entity, uint256 amount)')
const BALANCE_UPDATED_ABI = parseAbiItem('event BalanceUpdated(address indexed seller, address indexed buyer, uint256 amount, uint256 sellerCreditBalance, uint256 buyerCreditBalance)')

// Compact read-only ERC-1155 ABI surface
const TOKEN_ABI = [
    { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'netCredits', stateMutability: 'view', inputs: [{ name: 'entity', type: 'address' }], outputs: [{ name: '', type: 'int256' }] },
    { type: 'function', name: 'getPosition', stateMutability: 'view', inputs: [{ name: 'entity', type: 'address' }], outputs: [{ name: 'credits', type: 'uint256' }, { name: 'debt', type: 'uint256' }] },
]

const CREDIT_TOKEN_ID = 0n
const DEBT_TOKEN_ID = 1n

// Maximum block range per getLogs call (avoids RPC limits)
const BLOCK_CHUNK = 2000n

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Retry a promise-returning fn up to `times` times with exponential backoff */
async function withRetry(fn, times = 3) {
    let lastErr
    for (let i = 0; i < times; i++) {
        try { return await fn() }
        catch (err) {
            lastErr = err
            await new Promise(r => setTimeout(r, 300 * (i + 1)))
        }
    }
    throw lastErr
}

/**
 * Fetch logs in chunks across the full block range to avoid RPC limits.
 * @param {import('viem').PublicClient} client
 * @param {{ address: `0x${string}`, event: any, fromBlock?: bigint }} params
 */
async function getLogs(client, { address, event, fromBlock = 0n }) {
    const latest = await client.getBlockNumber()
    const allLogs = []

    for (let from = fromBlock; from <= latest; from += BLOCK_CHUNK) {
        const to = from + BLOCK_CHUNK - 1n < latest ? from + BLOCK_CHUNK - 1n : latest
        const chunk = await withRetry(() =>
            client.getLogs({ address, event, fromBlock: from, toBlock: to })
        )
        allLogs.push(...chunk)
    }
    return allLogs
}

// ── Exported readers ─────────────────────────────────────────────────────────

/**
 * Returns a deduplicated Set of all wallet addresses that have ever received
 * credits or had debt recorded — i.e., all "participating firms".
 *
 * @param {import('viem').PublicClient} client
 * @param {`0x${string}`} tokenAddress
 * @returns {Promise<string[]>}
 */
export async function getAllParticipatingAddresses(client, tokenAddress) {
    const [awardLogs, debtLogs, buyerLogs] = await Promise.all([
        getLogs(client, { address: tokenAddress, event: CREDITS_AWARDED_ABI }),
        getLogs(client, { address: tokenAddress, event: DEBT_RECORDED_ABI }),
        getLogs(client, { address: tokenAddress, event: BALANCE_UPDATED_ABI }),
    ])

    const seen = new Set()

    for (const log of awardLogs) seen.add(log.args.entity.toLowerCase())
    for (const log of debtLogs) seen.add(log.args.entity.toLowerCase())
    // Buyers who received credits via marketplace also participate
    for (const log of buyerLogs) {
        seen.add(log.args.seller.toLowerCase())
        seen.add(log.args.buyer.toLowerCase())
    }

    return [...seen]
}

/**
 * Returns full on-chain position for one address.
 *
 * @param {import('viem').PublicClient} client
 * @param {`0x${string}`} tokenAddress
 * @param {string} address
 * @returns {Promise<{ address: string, credits: bigint, debt: bigint, net: bigint }>}
 */
export async function getFirmBalance(client, tokenAddress, address) {
    const addr = address
    const [credits, debt] = await withRetry(() =>
        client.readContract({
            address: tokenAddress,
            abi: TOKEN_ABI,
            functionName: 'getPosition',
            args: [addr],
        })
    )
    return { address: addr, credits, debt, net: BigInt(credits) - BigInt(debt) }
}

/**
 * Returns the N most-recent emission/credit events sorted newest-first.
 *
 * @param {import('viem').PublicClient} client
 * @param {`0x${string}`} tokenAddress
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getRecentTransfers(client, tokenAddress, limit = 20) {
    const [awards, debts, clears, trades] = await Promise.all([
        getLogs(client, { address: tokenAddress, event: CREDITS_AWARDED_ABI }),
        getLogs(client, { address: tokenAddress, event: DEBT_RECORDED_ABI }),
        getLogs(client, { address: tokenAddress, event: DEBT_CLEARED_ABI }),
        getLogs(client, { address: tokenAddress, event: BALANCE_UPDATED_ABI }),
    ])

    const normalise = (logs, type) =>
        logs.map(l => ({
            type,
            blockNumber: l.blockNumber,
            txHash: l.transactionHash,
            entity: l.args.entity ?? l.args.seller,
            amount: l.args.amount,
            reason: l.args.reason ?? null,
        }))

    return [
        ...normalise(awards, 'CREDIT_AWARDED'),
        ...normalise(debts, 'DEBT_RECORDED'),
        ...normalise(clears, 'DEBT_CLEARED'),
        ...normalise(trades, 'TRADE'),
    ]
        .sort((a, b) => Number(b.blockNumber - a.blockNumber))
        .slice(0, limit)
}

/**
 * Computes global stats from on-chain events + current balances.
 *
 * @param {import('viem').PublicClient} client
 * @param {`0x${string}`} tokenAddress
 * @param {string[]} addresses  — pre-fetched from getAllParticipatingAddresses
 * @param {{ credits: bigint, debt: bigint }[]} balances — pre-fetched balances
 * @returns {object}
 */
export function computeGlobalStats(addresses, balances, recentEvents) {
    const totalCreditsIssued = recentEvents
        .filter(e => e.type === 'CREDIT_AWARDED')
        .reduce((s, e) => s + e.amount, 0n)

    const totalDebtIssued = recentEvents
        .filter(e => e.type === 'DEBT_RECORDED')
        .reduce((s, e) => s + e.amount, 0n)

    const activeCredits = balances.reduce((s, b) => s + b.credits, 0n)
    const activeDebt = balances.reduce((s, b) => s + b.debt, 0n)

    const totalEvents = recentEvents.length
    const firmCount = addresses.length
    const netPositive = balances.filter(b => b.net > 0n).length
    const netNegative = balances.filter(b => b.net < 0n).length

    return {
        totalCreditsIssued,
        totalDebtIssued,
        activeCredits,
        activeDebt,
        totalEvents,
        firmCount,
        netPositive,
        netNegative,
    }
}
