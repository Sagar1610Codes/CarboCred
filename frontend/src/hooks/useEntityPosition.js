/**
 * hooks/useEntityPosition.js
 * Reads credits and debt balances directly from the ERC-1155 contract.
 */
import { useAccount, useReadContracts } from 'wagmi'
import { CONTRACT_ADDRESSES, CARBON_CREDIT_TOKEN_ABI, CREDIT_TOKEN_ID, DEBT_TOKEN_ID } from '../lib/contracts'

export function useEntityPosition() {
    const { address } = useAccount()

    const { data, isLoading, refetch } = useReadContracts({
        contracts: [
            {
                address: CONTRACT_ADDRESSES.carbonCreditToken,
                abi: CARBON_CREDIT_TOKEN_ABI,
                functionName: 'balanceOf',
                args: [address, CREDIT_TOKEN_ID],
            },
            {
                address: CONTRACT_ADDRESSES.carbonCreditToken,
                abi: CARBON_CREDIT_TOKEN_ABI,
                functionName: 'balanceOf',
                args: [address, DEBT_TOKEN_ID],
            },
        ],
        query: { enabled: !!address },
    })

    const credits = data?.[0]?.result ?? 0n
    const debt = data?.[1]?.result ?? 0n
    const netCredits = BigInt(credits) - BigInt(debt)

    return { credits, debt, netCredits, isLoading, refetch }
}
