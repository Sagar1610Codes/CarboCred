/**
 * lib/wagmiConfig.ts
 *
 * Configure wagmi with supported chains and WalletConnect connector.
 * Supports Hardhat localhost (dev) and Sepolia (testnet).
 */

import { createConfig, http } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
    chains: [hardhat, sepolia],
    connectors: [
        injected(), // MetaMask, Rabby, Coinbase Wallet, etc.
    ],
    transports: {
        [hardhat.id]: http("http://127.0.0.1:8545"),
        [sepolia.id]: http(),
    },
});
