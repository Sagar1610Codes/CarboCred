# CarboCred — Architecture & Developer Guide

A complete, step-by-step explanation of how every part of the system works,
from a user clicking a button to a transaction being confirmed on-chain.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Layer 1 — Smart Contracts (Ethereum)](#2-layer-1--smart-contracts-ethereum)
3. [Layer 2 — Backend (Node.js)](#3-layer-2--backend-nodejs)
4. [Layer 3 — Frontend (Next.js + wagmi)](#4-layer-3--frontend-nextjs--wagmi)
5. [Full Workflow Walkthroughs](#5-full-workflow-walkthroughs)
   - [A. Awarding Credits (Backend → Contract)](#a-awarding-credits-backend--contract)
   - [B. Listing Credits for Sale (User → Frontend → Contract)](#b-listing-credits-for-sale-user--frontend--contract)
   - [C. Buying Credits (User → Frontend → Contract)](#c-buying-credits-user--frontend--contract)
   - [D. Live Feed (Contract → Backend → WebSocket → Frontend)](#d-live-feed-contract--backend--websocket--frontend)
6. [How to Make Your Own Changes](#6-how-to-make-your-own-changes)

---

## 1. System Overview

```
 ┌─────────────────────────────────────────────────────────────────┐
 │                      Hardhat / Ethereum                          │
 │                                                                   │
 │  CarbonCreditToken.sol  ◄────────────►  CarbonMarketplace.sol   │
 │   (ERC-1155 balances)        calls        (listing/trading)      │
 └──────────────┬────────────────────────────────┬─────────────────┘
                │ events (WebSocket)              │ reads + writes (HTTP RPC)
                ▼                                 ▼
 ┌──────────────────────────┐     ┌──────────────────────────────┐
 │   Backend (Node.js)       │     │   Frontend (Next.js)          │
 │   port 4000               │     │   port 3000                   │
 │                           │     │                               │
 │  listener.js              │     │  wagmi + viem                 │
 │   └─ event listeners      │─WS─►│   └─ useReadContracts()       │
 │  index.js                 │     │   └─ useWriteContract()       │
 │   └─ REST API             │◄────│   └─ useLiveFeed() (WS)      │
 │  signer.js                │     │                               │
 │   └─ BACKEND_ROLE wallet  │     │  hooks/useEntityPosition.ts   │
 └──────────────────────────┘     │  hooks/useMarketplace.ts      │
                                   │  hooks/useLiveFeed.ts         │
                                   └──────────────────────────────┘
```

There are **three layers** and they interact in specific ways:

| Layer | Technology | Role |
|---|---|---|
| Smart Contracts | Solidity / Hardhat | Single source of truth for all balances |
| Backend | Node.js, Express, ethers.js | Event relay + privileged write operations |
| Frontend | Next.js, wagmi, viem | User interface + wallet-signed transactions |

---

## 2. Layer 1 — Smart Contracts (Ethereum)

### Files
- `contracts/CarbonCreditToken.sol` — ERC-1155 token registry
- `contracts/CarbonMarketplace.sol` — P2P trading logic

### CarbonCreditToken.sol

This is the **heart** of the system. It stores all balances on-chain via the ERC-1155 standard.

```
Token ID 0 (CREDIT_TOKEN) → earned by green energy generators — tradeable
Token ID 1 (DEBT_TOKEN)   → assigned to carbon emitters — soulbound (non-transferable)
```

#### Key Functions

| Function | Who Can Call | What It Does |
|---|---|---|
| `awardCredits(entity, amount, reason)` | `BACKEND_ROLE` only | Mints CREDIT_TOKEN to an address |
| `recordDebt(entity, amount, reason)` | `BACKEND_ROLE` only | Mints DEBT_TOKEN to an address |
| `clearDebt(entity, amount)` | `BACKEND_ROLE` only | Burns DEBT_TOKEN from an address |
| `settleTransfer(seller, buyer, amount)` | `MARKETPLACE_ROLE` only | Moves CREDIT_TOKEN between accounts |
| `netCredits(entity)` | Anyone (view) | Returns `credits - debt` (can be negative) |
| `getPosition(entity)` | Anyone (view) | Returns `(credits, debt)` tuple |
| `balanceOf(entity, id)` | Anyone (view) | Standard ERC-1155 balance read |

#### Access Control (Roles)

```
DEFAULT_ADMIN_ROLE  → the deployer wallet (can grant/revoke roles)
BACKEND_ROLE        → the backend Node.js wallet (can mint/burn)
MARKETPLACE_ROLE    → the CarbonMarketplace contract address (can call settleTransfer)
```

**Why roles?** Rather than letting anyone mint tokens, we restrict minting to the
trusted backend. This prevents fraud — a user cannot award themselves credits.

#### Soulbound DEBT_TOKEN

The `_update()` internal function is overridden to block any peer-to-peer transfer
of Token ID 1:

```solidity
// In CarbonCreditToken.sol
function _update(address from, address to, uint256[] memory ids, ...) {
    for (uint256 i = 0; i < ids.length; i++) {
        if (ids[i] == DEBT_TOKEN) {
            require(from == address(0) || to == address(0), "soulbound");
        }
    }
    super._update(from, to, ids, values);
}
```

`from == address(0)` means minting. `to == address(0)` means burning. Any other
combination (a real transfer) is reverted.

---

### CarbonMarketplace.sol

Handles the **listing, purchasing, and cancellation** of credits.

#### Listing State Machine

```
listCredits() ──► Open ──► purchaseListing() ──► Fulfilled
                     └──► cancelListing()   ──► Cancelled
```

#### Key Design — No ERC-1155 Approval Needed

Normally, to transfer someone else's ERC-1155 tokens you'd call `setApprovalForAll()`.
Here we avoid that by giving the Marketplace `MARKETPLACE_ROLE`, which lets it call
`creditToken.settleTransfer(seller, buyer, amount)` directly. This is safer because:
- The seller doesn't need to sign an open-ended approval.
- The marketplace can only move credits after its own internal validation passes.

#### Net Position Gate (Listing Rule)

```solidity
int256 netPos = creditToken.netCredits(msg.sender);
require(netPos >= int256(amount), "net credit position too low to list");
```

You can only list credits up to your **net** position, not your raw credit balance.
So if you have 1000 credits and 800 debt (net = 200), you can only list up to 200.

---

## 3. Layer 2 — Backend (Node.js)

### Files
- `backend/index.js` — Express HTTP server + WebSocket server
- `backend/listener.js` — Contract event listeners
- `backend/signer.js` — Backend wallet for privileged operations
- `backend/.env` — Private key + contract addresses

### signer.js — The Privileged Wallet

```javascript
// backend/signer.js
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet   = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider);
const creditToken = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet);
```

This wallet holds `BACKEND_ROLE`. When you call `/award` or `/debt` via the REST API,
the backend **signs and broadcasts the transaction** using this wallet.
The private key **never leaves the backend server**.

### listener.js — Watching the Chain

```javascript
// backend/listener.js
const provider = new ethers.WebSocketProvider(process.env.RPC_URL); // ws://
tokenContract.on("CreditsAwarded", (entity, amount, reason, event) => {
    onEvent({ type: "CreditsAwarded", entity, amount: amount.toString(), ... });
});
```

`ethers.WebSocketProvider` keeps an open WebSocket connection to the Hardhat node.
When a matching event is emitted by the contract, the callback fires immediately.
The `onEvent` callback is `broadcast()` from `index.js`, which sends the event
to all connected frontend clients.

### index.js — REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/position/:address` | Read on-chain credits + debt for any address |
| `POST` | `/award` | Award CREDIT_TOKEN (requires `{entity, amount, reason}`) |
| `POST` | `/debt` | Record DEBT_TOKEN (requires `{entity, amount, reason}`) |
| `POST` | `/clear-debt` | Burn DEBT_TOKEN (requires `{entity, amount}`) |
| `GET` | `/health` | Health check — returns `{status: "ok"}` |

#### Request → Response Flow for `/award`

```
1. Frontend or curl sends:
   POST http://localhost:4000/award
   Body: { "entity": "0x...", "amount": 500, "reason": "Solar Q1" }

2. index.js receives → calls signer.awardCredits(entity, 500n, "Solar Q1")

3. signer.js builds the tx:
   creditToken.awardCredits("0x...", 500n, "Solar Q1")
   wallet.sendTransaction(tx) → returns receipt

4. Hardhat mines the tx, emits CreditsAwarded event

5. listener.js catches the event → calls broadcast()

6. broadcast() sends JSON to all WebSocket clients (frontend)

7. The frontend useLiveFeed() hook receives it and adds it to the events array
```

---

## 4. Layer 3 — Frontend (Next.js + wagmi)

### File Map

```
frontend/src/
├── app/
│   ├── layout.tsx        ← Root layout (HTML, fonts, Providers wrapper)
│   ├── page.tsx          ← Main dashboard page (all UI lives here)
│   ├── providers.tsx     ← WagmiProvider + QueryClientProvider wrapper
│   └── globals.css       ← Global Tailwind CSS styles
├── hooks/
│   ├── useEntityPosition.ts  ← Reads credits/debt from contract
│   ├── useMarketplace.ts     ← Reads listings, writes list/buy/cancel txns
│   └── useLiveFeed.ts        ← WebSocket listener for live events
└── lib/
    ├── contracts.ts      ← Contract addresses + ABIs as JSON
    └── wagmiConfig.ts    ← wagmi chain + connector config
```

### Routing

Next.js uses **file-based routing**. Every file in `app/` is a route.

| File | Route |
|---|---|
| `app/page.tsx` | `http://localhost:3000/` |
| `app/dashboard/page.tsx` (if you create it) | `http://localhost:3000/dashboard` |

`layout.tsx` wraps **every** page. That's where `<Providers>` lives,
so wagmi context is available everywhere.

### wagmi — How Wallet Reads Work

wagmi is a React library that wraps `viem` RPC calls in React hooks.

#### Reading balances (useEntityPosition.ts)

```typescript
// hooks/useEntityPosition.ts
const { data } = useReadContracts({
    contracts: [
        {
            address: CONTRACT_ADDRESSES.carbonCreditToken,
            abi: CARBON_CREDIT_TOKEN_ABI,
            functionName: "balanceOf",
            args: [address, 0n],   // 0n = CREDIT_TOKEN
        },
        {
            address: CONTRACT_ADDRESSES.carbonCreditToken,
            abi: CARBON_CREDIT_TOKEN_ABI,
            functionName: "balanceOf",
            args: [address, 1n],   // 1n = DEBT_TOKEN
        },
    ],
    query: { enabled: !!address }, // only run if wallet connected
});
```

**What happens under the hood:**
1. wagmi sends an `eth_call` RPC request to Hardhat (no gas used — view function).
2. The call encodes `balanceOf(address, id)` using the ABI.
3. Hardhat returns the raw bytes, wagmi decodes them using the ABI output type.
4. The decoded `bigint` lands in `data[0].result`.

#### Writing transactions (useListCredits in useMarketplace.ts)

```typescript
// hooks/useMarketplace.ts
const { writeContract } = useWriteContract();

function listCredits(amount: bigint, pricePerCreditEth: string) {
    writeContract({
        address: CONTRACT_ADDRESSES.marketplace,
        abi: CARBON_MARKETPLACE_ABI,
        functionName: "listCredits",
        args: [amount, parseEther(pricePerCreditEth)],
    });
}
```

**What happens under the hood:**
1. wagmi encodes the function call using the ABI.
2. MetaMask pops up showing the transaction details (function, args, estimated gas).
3. User clicks "Confirm" — MetaMask signs the tx with the user's private key.
4. The signed tx is broadcast to the Hardhat node via `eth_sendRawTransaction`.
5. Hardhat mines the tx. `CarbonMarketplace.listCredits()` runs on-chain.
6. The `ListingCreated` event is emitted.
7. `useWaitForTransactionReceipt({ hash })` resolves when the block is mined.

### lib/contracts.ts — The ABI Registry

This file is the **glue** between the frontend and the contracts. It contains:
- The JSON ABI (function signatures + event signatures)
- Contract addresses (read from `.env` at build time)
- Enum mirrors (e.g. `ListingStatus` must match the Solidity enum exactly)

```typescript
// lib/contracts.ts
export const CONTRACT_ADDRESSES = {
    carbonCreditToken: process.env.NEXT_PUBLIC_CARBON_CREDIT_TOKEN_ADDRESS as `0x${string}`,
    marketplace:       process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS as `0x${string}`,
};
```

> **Important:** `NEXT_PUBLIC_` prefix is required by Next.js for env vars to be
> available in browser code. Without this prefix, the value is `undefined` in the browser.

### useLiveFeed.ts — WebSocket Connection

```typescript
// hooks/useLiveFeed.ts
useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000");

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        setEvents(prev => [data, ...prev].slice(0, 50));
    };

    return () => ws.close(); // cleanup on unmount
}, []);
```

**Flow:**
1. When the page loads, a WebSocket connection opens to `localhost:4000`.
2. The backend `wss` server accepts it and stores the socket in `clients`.
3. When any contract emits an event, `broadcast()` sends JSON to all `clients`.
4. The hook's `onmessage` handler adds the event to state.
5. React re-renders the `<ul>` in the live feed panel.

---

## 5. Full Workflow Walkthroughs

### A. Awarding Credits (Backend → Contract)

```
curl/Postman                Backend (index.js)           Hardhat Node
─────────────────────────────────────────────────────────────────────
POST /award ─────────────► app.post("/award", ...)
 {entity, amount, reason}    └─ signer.awardCredits()
                                   └─ creditToken.awardCredits()
                                        └─ tx signed by BACKEND wallet
                                             └─ eth_sendRawTransaction ──►
                                                  Hardhat mines block
                                                  CreditsAwarded event emitted
                                              ◄── receipt returned
                              ◄── { success: true, txHash }
◄──────────────────────── response
```

### B. Listing Credits for Sale (User → Frontend → Contract)

```
User (MetaMask)    page.tsx          useListCredits()       Hardhat
──────────────────────────────────────────────────────────────────────
 [types amount]   handleList()
 [clicks List]    → listCredits(    writeContract({
                      100n,             address: marketplace,
                      "0.01"            fn: "listCredits",
                   )                    args: [100n, 0.01eth]
                                    })
                                         MetaMask popup ◄──────────
 [confirms tx] ──────────────────────────────────────────────────►
                                                          Hardhat mines
                                                          ListingCreated
                                                          event emitted
                  setTimeout(refetch, 3000)
                  useActiveListings refetches ──────────► eth_call
                  ◄── new listing appears in UI      getListings(0, total)
```

### C. Buying Credits (User → Frontend → Contract)

```
User            page.tsx          usePurchaseListing()    CarbonMarketplace.sol
─────────────────────────────────────────────────────────────────────────────────
[clicks Buy]   handleBuy(         purchase(
                 listingId,         listingId,
                 amount,            amount * pricePerCredit  ← computed locally
                 pricePerCredit     as value (ETH)
               )                )
                                        writeContract({
                                            fn: "purchaseListing",
                                            args: [listingId],
                                            value: totalWei     ← ETH sent!
                                        })
                                             MetaMask popup showing ETH cost
[confirms] ──────────────────────────────────────────────────────────────────►
                                                                purchaseListing():
                                                                  1. Validates listing
                                                                  2. listing.status = Fulfilled
                                                                  3. ETH → seller (call{value})
                                                                  4. creditToken.settleTransfer()
                                                                     (moves CREDIT_TOKEN)
                                                                  5. emits TradeExecuted
```

### D. Live Feed (Contract → Backend → WebSocket → Frontend)

```
Hardhat Node     listener.js (backend)     WebSocket         useLiveFeed.ts
─────────────────────────────────────────────────────────────────────────────
Event emitted
"CreditsAwarded" ──► tokenContract.on(
                       "CreditsAwarded",
                       callback
                     )
                     callback fires:
                     onEvent({
                       type: "CreditsAwarded",
                       entity, amount, reason
                     })
                     = broadcast() in index.js
                          ──────────────────► ws.send(JSON.stringify(event))
                                                        ───────────────────►
                                                          ws.onmessage fires
                                                          setEvents(prev => [data, ...prev])
                                                          React re-renders live feed
```

---

## 6. How to Make Your Own Changes

### Add a new REST API endpoint

1. Open `backend/index.js`
2. Add a new route:

```javascript
app.post("/retire-credits", async (req, res) => {
    const { entity, amount } = req.body;
    const receipt = await retireCredits(entity, BigInt(amount));
    res.json({ success: true, txHash: receipt.hash });
});
```

3. Add a corresponding function in `backend/signer.js`:

```javascript
async function retireCredits(entity, amount) {
    const tx = await creditToken.retireCredits(entity, amount);
    return await tx.wait();
}
module.exports = { ..., retireCredits };
```

---

### Add a new contract function

1. Add the Solidity function to `contracts/CarbonCreditToken.sol` or `CarbonMarketplace.sol`:

```solidity
function myNewFunction(address entity) external onlyRole(BACKEND_ROLE) {
    // your logic
}
```

2. Recompile: `npx hardhat compile`
3. Add it to the ABI in `frontend/src/lib/contracts.ts`:

```typescript
{ type: "function", name: "myNewFunction", stateMutability: "nonpayable",
  inputs: [{ name: "entity", type: "address" }], outputs: [] },
```

4. Redeploy: `.\start.ps1`

---

### Add a new page/route in the frontend

1. Create `frontend/src/app/history/page.tsx`:

```tsx
"use client";
export default function HistoryPage() {
    return <main>Trade History</main>;
}
```

2. It's now accessible at `http://localhost:3000/history`.

---

### Listen to a new contract event

1. Add the event to the ABI in `backend/listener.js`:

```javascript
const CARBON_CREDIT_TOKEN_ABI = [
    ...,
    "event MyNewEvent(address indexed entity, uint256 amount)",
];
```

2. Add the listener in `startListeners()`:

```javascript
tokenContract.on("MyNewEvent", (entity, amount, event) => {
    onEvent({ type: "MyNewEvent", entity, amount: amount.toString() });
});
```

---

### Add a new wagmi hook for a contract read

1. Create `frontend/src/hooks/useMyData.ts`:

```typescript
"use client";
import { useReadContract } from "wagmi";
import { CONTRACT_ADDRESSES, CARBON_CREDIT_TOKEN_ABI } from "@/lib/contracts";

export function useMyData(address: `0x${string}`) {
    return useReadContract({
        address: CONTRACT_ADDRESSES.carbonCreditToken,
        abi: CARBON_CREDIT_TOKEN_ABI,
        functionName: "netCredits",
        args: [address],
        query: { enabled: !!address },
    });
}
```

2. Import and use it in `page.tsx`:

```tsx
const { data: myData } = useMyData(address!);
```

---

### Environment Variables Reference

| File | Variable | Used By |
|---|---|---|
| `backend/.env` | `RPC_URL` | WebSocket connection to blockchain |
| `backend/.env` | `BACKEND_PRIVATE_KEY` | Signs BACKEND_ROLE transactions |
| `backend/.env` | `CARBON_CREDIT_TOKEN_ADDRESS` | Contract address for signer + listener |
| `backend/.env` | `MARKETPLACE_ADDRESS` | Contract address for listener |
| `frontend/.env` | `NEXT_PUBLIC_CARBON_CREDIT_TOKEN_ADDRESS` | Contract reads from browser |
| `frontend/.env` | `NEXT_PUBLIC_MARKETPLACE_ADDRESS` | Contract reads + writes from browser |
| `frontend/.env` | `NEXT_PUBLIC_BACKEND_WS_URL` | WebSocket URL for live feed |

> After editing any `.env` file, restart the affected service. Run `.\start.ps1`
> to regenerate everything from scratch after a Hardhat reset.
