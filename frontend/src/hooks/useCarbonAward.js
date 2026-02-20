/**
 * hooks/useCarbonAward.js
 *
 * Submits both sides of the carbon activity form:
 *   reductions → POST /award  (mints credit tokens)
 *   emissions  → POST /debt   (records debt tokens)
 *
 * Each fires only when its amount > 0.
 * The entity address MUST come from MetaMask — never a manual field.
 */

import { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

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

export function useCarbonAward() {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState(null)   // { awardTx?, debtTx? }
    const [error, setError] = useState(null)

    /**
     * @param {string} walletAddress  from useAccount().address
     * @param {number} rawEmissions   raw float kg CO₂ from calculator
     * @param {number} rawReductions  raw float offset points from calculator
     */
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
            const [awardRes, debtRes] = await Promise.allSettled([
                creditAmount > 0
                    ? postJSON('/award', { entity: walletAddress, amount: creditAmount, reason: 'Auto-calculated carbon offset' })
                    : Promise.resolve(null),
                debtAmount > 0
                    ? postJSON('/debt', { entity: walletAddress, amount: debtAmount, reason: 'Auto-calculated carbon emissions' })
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
