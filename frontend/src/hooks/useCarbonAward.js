/**
 * hooks/useCarbonAward.js
 *
 * Submits both sides of the carbon activity form:
 *   reductions → POST /award  (mints credit tokens) — GOVERNMENT WALLET ONLY
 *   emissions  → POST /debt   (records debt tokens)
 *
 * Security Layer 3 (Frontend):
 *   Before calling /award the hook requests a MetaMask signature over the
 *   canonical authorization message. The backend verifies this signature
 *   against GOVERNMENT_WALLET before processing the mint.
 */

import { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

/** Must match backend/utils/verifyGovernment.js AUTH_MESSAGE exactly */
export const AUTH_MESSAGE = 'Authorize carbon credit award'

async function postJSON(path, body) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error ?? `Server error ${res.status}`)
    return json
}

/**
 * @param {Function} signMessageAsync  wagmi's signMessageAsync({ message }) — injected by caller
 */
export function useCarbonAward(signMessageAsync) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    async function submitActivity(walletAddress, rawEmissions, rawReductions) {
        if (!walletAddress) { setError('Wallet not connected.'); return }

        const debtAmount = Math.max(0, Math.floor(rawEmissions))
        const creditAmount = Math.max(0, Math.floor(rawReductions))

        if (debtAmount === 0 && creditAmount === 0) {
            setError('Enter at least one non-zero value.')
            return
        }

        setIsSubmitting(true)
        setResult(null)
        setError(null)

        try {
            // ── Security Layer 3: Obtain government wallet signature ───────────
            let signature = null
            if (creditAmount > 0) {
                if (!signMessageAsync) {
                    throw new Error('Wallet signing function not available.')
                }
                try {
                    signature = await signMessageAsync({ message: AUTH_MESSAGE })
                } catch {
                    throw new Error('Signature rejected. You must sign to authorize credit minting.')
                }
            }
            // ── End Security Layer 3 ──────────────────────────────────────────

            const [awardRes, debtRes] = await Promise.allSettled([
                creditAmount > 0
                    ? postJSON('/award', {
                        entity: walletAddress,
                        amount: creditAmount,
                        reason: 'Auto-calculated carbon offset',
                        signature,
                    })
                    : Promise.resolve(null),
                debtAmount > 0
                    ? postJSON('/debt', {
                        entity: walletAddress,
                        amount: debtAmount,
                        reason: 'Auto-calculated carbon emissions',
                    })
                    : Promise.resolve(null),
            ])

            const errors = []
            const out = {}

            if (awardRes.status === 'fulfilled' && awardRes.value) out.awardTx = awardRes.value.txHash
            else if (awardRes.status === 'rejected') errors.push(`Award: ${awardRes.reason.message}`)

            if (debtRes.status === 'fulfilled' && debtRes.value) out.debtTx = debtRes.value.txHash
            else if (debtRes.status === 'rejected') errors.push(`Debt: ${debtRes.reason.message}`)

            if (errors.length) setError(errors.join(' · '))
            if (out.awardTx || out.debtTx) setResult(out)
        } catch (err) {
            setError(err.message ?? 'Network error — please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    function reset() { setResult(null); setError(null) }

    return { isSubmitting, result, error, submitActivity, reset }
}
