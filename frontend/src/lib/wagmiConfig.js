/**
 * lib/wagmiConfig.js
 * Configure wagmi with supported chains and connectors.
 */
import { createConfig, http } from 'wagmi'
import { hardhat, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const wagmiConfig = createConfig({
    chains: [hardhat, sepolia],
    connectors: [
        injected(), // MetaMask, Rabby, Coinbase Wallet, etc.
    ],
    transports: {
        [hardhat.id]: http('http://127.0.0.1:8545'),
        [sepolia.id]: http(),
    },
})
