/**
 * hooks/useCarbonAward.js
 *
 * Posts carbon activity to the admin validation queue via POST /api/requests.
 * Attaches the JWT Authorization header so the protected route accepts the request.
 */

import { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

async function postJSON(path, body, token) {
    const res = await fetch(`${BACKEND_URL}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error ?? `Server error ${res.status}`)
    return json
}

export function useCarbonAward(token) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    /**
     * @param {string} walletAddress  from useAccount().address
     * @param {number} rawEmissions   raw float kg CO₂ from calculator
     * @param {number} rawReductions  raw float offset points from calculator
     */
    async function submitActivity(walletAddress, rawEmissions, rawReductions) {
        if (!walletAddress) { setError('Wallet not connected.'); return }
        if (!token) { setError('Not authenticated. Please log in.'); return }

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
            const submissions = await Promise.allSettled([
                creditAmount > 0
                    ? postJSON('/api/requests', {
                        entityAddress: walletAddress,
                        type: 'CREDIT',
                        amount: creditAmount,
                        reason: 'Auto-calculated carbon offset',
                    }, token)
                    : Promise.resolve(null),

                debtAmount > 0
                    ? postJSON('/api/requests', {
                        entityAddress: walletAddress,
                        type: 'DEBT',
                        amount: debtAmount,
                        reason: 'Auto-calculated carbon emissions',
                    }, token)
                    : Promise.resolve(null),
            ])

            const errors = []
            const requestIds = []

            submissions.forEach(s => {
                if (s.status === 'fulfilled' && s.value) requestIds.push(s.value.requestId)
                else if (s.status === 'rejected') errors.push(s.reason.message)
            })

            if (errors.length) setError(errors.join(' · '))
            if (requestIds.length) setResult({ requestIds })
        } catch (err) {
            setError(err.message ?? 'Network error — please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    function reset() { setResult(null); setError(null) }

    return { isSubmitting, result, error, submitActivity, reset }
}
