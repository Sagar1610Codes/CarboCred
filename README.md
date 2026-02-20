# CarboCred

Decentralised carbon credit marketplace built on Ethereum (ERC-1155).  
Track green energy generation, carbon emission debt, and trade offset credits peer-to-peer.

---

## How credits work

| State | Meaning |
|---|---|
| `+N credits` | Net carbon offset holder (generated more green energy than emitted) |
| `0 credits` | Carbon-neutral |
| `-N credits` | Net carbon emitter (emission debt exceeds offsets) |

Balances are stored as two **ERC-1155** token types:
- **Token ID 0** — `CREDIT_TOKEN` — green energy / offset credits (tradeable)
- **Token ID 1** — `DEBT_TOKEN` — emission liabilities (soulbound, non-transferable)

**Net position** = `CREDIT_TOKEN balance − DEBT_TOKEN balance`

---

## Project structure

```
CarboCred/
├── contracts/
│   ├── CarbonCreditToken.sol   # ERC-1155 multi-token registry
│   └── CarbonMarketplace.sol   # P2P credit marketplace (ETH payment)
├── scripts/
│   └── deploy.js               # Two-step deploy + role setup
├── test/
│   └── CarboCred.test.js       # 25 Hardhat tests
├── backend/
│   ├── index.js                # Express + WebSocket server
│   ├── listener.js             # ethers.js event listeners
│   └── signer.js               # BACKEND_ROLE wallet functions
└── frontend/
    └── src/
        ├── app/page.tsx            # Dashboard UI
        ├── hooks/useEntityPosition.ts
        ├── hooks/useMarketplace.ts
        ├── hooks/useLiveFeed.ts
        └── lib/contracts.ts
```

## Quick start

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full setup guide.

```bash
# 1. Compile contracts
npx hardhat compile

# 2. Run tests
npx hardhat test

# 3. Local dev
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost

# 4. Backend
cd backend && npm install && node index.js

# 5. Frontend
cd frontend && npm run dev
```

## Tech stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.24, OpenZeppelin ERC-1155, AccessControl, ReentrancyGuard |
| Dev / Test | Hardhat 2.x, Chai, ethers.js v6 |
| Backend | Node.js, Express, ws (WebSocket), ethers.js v6 |
| Frontend | Next.js 15, wagmi v2, viem, TanStack Query |