# CarboCred — Architecture & Developer Guide

> **Stack:** Solidity (Hardhat) · Node.js (Express + WS) · React + Vite (plain JS)

---

## Table of Contents

1. [Big Picture Overview](#1-big-picture-overview)
2. [Layer 1 — Smart Contracts](#2-layer-1--smart-contracts)
3. [Layer 2 — Backend (Node.js)](#3-layer-2--backend-nodejs)
4. [Layer 3 — Frontend (React + Vite)](#4-layer-3--frontend-react--vite)
5. [Workflow Walkthroughs](#5-workflow-walkthroughs)
6. [How to Make Your Own Changes](#6-how-to-make-your-own-changes)
7. [Environment Variables Reference](#7-environment-variables-reference)

---

## 1. Big Picture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Hardhat / Ethereum                         │
│                                                               │
│   CarbonCreditToken.sol ◄──────► CarbonMarketplace.sol       │
│    ERC-1155 balances                listing / trading         │
└──────────────┬───────────────────────────┬────────────────────┘
               │ events (WebSocket RPC)    │ reads + writes (HTTP RPC)
               ▼                           ▼
┌──────────────────────────┐  ┌──────────────────────────────────┐
│  Backend  (Node.js :4000) │  │  Frontend  (React+Vite :3000)    │
│                            │  │                                   │
│  signer.js                 │  │  main.jsx   — entry + providers   │
│   └─ BACKEND_ROLE wallet   │  │  App.jsx    — full dashboard      │
│  listener.js               │  │                                   │
│   └─ contract event subs   │──WS──►  hooks/useLiveFeed.js        │
│  index.js                  │  │  hooks/useEntityPosition.js       │
│   └─ REST /award /debt … ◄─│──│  hooks/useMarketplace.js         │
└──────────────────────────┘  │  lib/contracts.js  — ABIs + addrs  │
                               │  lib/wagmiConfig.js — chain config  │
                               └──────────────────────────────────────┘
```

### Three layers, one rule

| Layer | Tech | Responsibility |
|---|---|---|
| Smart Contracts | Solidity 0.8.24 + Hardhat | **Single source of truth** for all balances |
| Backend | Node.js, Express, ethers.js v6 | Event relay + privileged write ops |
| Frontend | React 19 + Vite, wagmi v2, viem | Wallet UI + direct contract reads |

> **No off-chain database.** All balance data is read directly from the contract.
> The backend only writes (mints/burns) using its privileged `BACKEND_ROLE` wallet.

---

## 2. Layer 1 — Smart Contracts

### Files
```
contracts/
├── CarbonCreditToken.sol    ← ERC-1155 token registry
└── CarbonMarketplace.sol    ← P2P listing / trading
```

---

### 2a. CarbonCreditToken.sol

**Inherits:** `ERC1155`, `AccessControl`, `ReentrancyGuard`

#### Token IDs

| ID | Name | Description | Transferable? |
|---|---|---|---|
| `0` | `CREDIT_TOKEN` | Green energy / carbon offsets | ✅ Free to trade |
| `1` | `DEBT_TOKEN` | Emission liabilities (soulbound) | ❌ Mint/burn only |

#### Roles

| Role constant | keccak256 of | Who holds it |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `(bytes32(0))` | Deployer wallet |
| `BACKEND_ROLE` | `"BACKEND_ROLE"` | Backend Node.js wallet |
| `MARKETPLACE_ROLE` | `"MARKETPLACE_ROLE"` | `CarbonMarketplace` contract address |

#### Public/External Functions

| Function | Caller | Action |
|---|---|---|
| `awardCredits(entity, amount, reason)` | `BACKEND_ROLE` | Mints `CREDIT_TOKEN` to entity, emits `CreditsAwarded` |
| `recordDebt(entity, amount, reason)` | `BACKEND_ROLE` | Mints `DEBT_TOKEN` to entity, emits `DebtRecorded` |
| `clearDebt(entity, amount)` | `BACKEND_ROLE` | Burns `DEBT_TOKEN` from entity, emits `DebtCleared` |
| `retireCredits(entity, amount)` | `BACKEND_ROLE` | Burns `CREDIT_TOKEN` when credits are consumed |
| `settleTransfer(seller, buyer, amount)` | `MARKETPLACE_ROLE` | Moves `CREDIT_TOKEN` between accounts, emits `BalanceUpdated` |
| `netCredits(entity)` | Anyone (view) | Returns `int256(credits) - int256(debt)` — can be negative |
| `getPosition(entity)` | Anyone (view) | Returns `(uint256 credits, uint256 debt)` tuple |
| `balanceOf(entity, id)` | Anyone (view) | Standard ERC-1155 balance read |

#### Soulbound Debt — How It Works

```solidity
// CarbonCreditToken.sol — _update() override
function _update(address from, address to, uint256[] memory ids, ...) internal override {
    for (uint256 i = 0; i < ids.length; i++) {
        if (ids[i] == DEBT_TOKEN) {
            // Only minting (from == 0) and burning (to == 0) allowed
            require(from == address(0) || to == address(0), "CCT: DEBT_TOKEN is soulbound");
        }
    }
    super._update(from, to, ids, values);
}
```

- `from == address(0)` → mint → ✅ allowed
- `to == address(0)` → burn → ✅ allowed
- Any real transfer → ❌ reverted

#### Events Emitted

| Event | When |
|---|---|
| `CreditsAwarded(entity, amount, reason)` | `awardCredits()` called |
| `DebtRecorded(entity, amount, reason)` | `recordDebt()` called |
| `DebtCleared(entity, amount)` | `clearDebt()` called |
| `BalanceUpdated(seller, buyer, amount, sBal, bBal)` | `settleTransfer()` called |

---

### 2b. CarbonMarketplace.sol

**Inherits:** `Ownable`, `ReentrancyGuard`

#### Listing State Machine

```
listCredits() ──► status: Open
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
 purchaseListing()          cancelListing()
  status: Fulfilled          status: Cancelled
```

#### Listing Struct

```solidity
struct Listing {
    uint256       id;
    address       seller;
    uint256       amount;          // CREDIT_TOKEN units
    uint256       pricePerCredit;  // price in wei per 1 credit
    ListingStatus status;          // Open | Fulfilled | Cancelled
}
```

#### Why There Is No ERC-1155 `setApprovalForAll()`

Normally to move someone's tokens you'd call `setApprovalForAll()`. Instead, the Marketplace holds `MARKETPLACE_ROLE` and calls `creditToken.settleTransfer(seller, buyer, amount)` directly. This:
- Eliminates the open-ended approval risk
- Ensures credits can only move after the Marketplace's own checks pass

#### Net Position Gate (Listing Rule)

```solidity
// CarbonMarketplace.sol — listCredits()
int256 netPos = creditToken.netCredits(msg.sender);
require(netPos >= int256(amount), "Marketplace: net credit position too low to list");
```

**Example:**

| Credits | Debt | Net | Can list 100? |
|---|---|---|---|
| 1000 | 0 | +1000 | ✅ |
| 1000 | 500 | +500 | ✅ |
| 1000 | 1000 | 0 | ❌ |
| 1000 | 2000 | -1000 | ❌ |

#### purchaseListing() — CEI Pattern

```
1. Checks:   listing is Open, msg.value == amount × price, not self-buy
2. Re-check: seller still has enough CREDIT_TOKEN (prevents stale listings)
3. Effects:  listing.status = Fulfilled
4. Interactions:
   a. ETH → seller via low-level call
   b. creditToken.settleTransfer(seller, buyer, amount)
   c. emit TradeExecuted
```

The state change happens **before** external calls — this is the CEI (Checks-Effects-Interactions) pattern, preventing reentrancy.

---

### 2c. Contract Deployment

**Script:** `scripts/getAddresses.js` (used by `start.ps1`) and `scripts/deploy.js` (manual use).

Deployment order (critical — the Marketplace needs the Token address):

```
1. Deploy CarbonCreditToken(admin, metaURI)
2. Deploy CarbonMarketplace(tokenAddress, admin)
3. creditToken.grantRole(MARKETPLACE_ROLE, marketplace.address)
4. creditToken.grantRole(BACKEND_ROLE, backendWalletAddress)
```

Addresses are written to `addresses.json` and then synced into `.env` files by `start.ps1`.

---

## 3. Layer 2 — Backend (Node.js)

### Files
```
backend/
├── index.js      ← Express HTTP server + WebSocket broadcaster
├── listener.js   ← Contract event subscriptions
├── signer.js     ← BACKEND_ROLE wallet + write functions
├── .env          ← Private key + contract addresses (never committed)
└── .env.example  ← Template showing required keys
```

---

### 3a. signer.js — The Privileged Wallet

```javascript
// backend/signer.js
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const wallet   = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, provider)
const creditToken = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet)
```

This wallet is the only one with `BACKEND_ROLE`. It signs and broadcasts transactions for:

| Exported function | Contract call | Used by |
|---|---|---|
| `awardCredits(entity, amount, reason)` | `creditToken.awardCredits()` | `POST /award` |
| `recordDebt(entity, amount, reason)` | `creditToken.recordDebt()` | `POST /debt` |
| `clearDebt(entity, amount)` | `creditToken.clearDebt()` | `POST /clear-debt` |

The private key never leaves the backend server. The frontend never has access to it.

---

### 3b. listener.js — Watching the Chain

```javascript
// backend/listener.js
const provider = new ethers.WebSocketProvider(process.env.RPC_URL) // ws://
tokenContract.on("CreditsAwarded", (entity, amount, reason, event) => {
    onEvent({ type: "CreditsAwarded", entity, amount: amount.toString(), ... })
})
```

`ethers.WebSocketProvider` opens a persistent WebSocket to the Hardhat/Ethereum node. When the node mines a block containing a matching event log, ethers.js decodes it and fires the callback instantly. The `onEvent` function is `broadcast()` from `index.js`.

**All events listened to:**

| Contract | Event |
|---|---|
| CarbonCreditToken | `CreditsAwarded`, `DebtRecorded`, `DebtCleared`, `BalanceUpdated` |
| CarbonMarketplace | `ListingCreated`, `ListingCancelled`, `TradeExecuted` |

---

### 3c. index.js — HTTP + WebSocket Server

Both the REST API and the WebSocket server share a single `http.Server` on port 4000.

```javascript
const app    = express()
const server = http.createServer(app)
const wss    = new WebSocketServer({ server })   // ws:// shares same port as http://
server.listen(4000)
```

#### REST API Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| `GET` | `/health` | — | `{ status: "ok" }` |
| `GET` | `/position/:address` | — | `{ credits, debt, netCredits }` |
| `POST` | `/award` | `{ entity, amount, reason }` | `{ success, txHash }` |
| `POST` | `/debt` | `{ entity, amount, reason }` | `{ success, txHash }` |
| `POST` | `/clear-debt` | `{ entity, amount }` | `{ success, txHash }` |

#### WebSocket Broadcast

```javascript
function broadcast(eventData) {
    const payload = JSON.stringify(eventData)
    for (const client of clients) {
        if (client.readyState === 1 /* OPEN */) client.send(payload)
    }
}
```

Every time a contract event fires in `listener.js`, `broadcast()` pushes the JSON object to every connected browser client.

---

## 4. Layer 3 — Frontend (React + Vite)

### Files
```
frontend/src/
├── main.jsx                   ← App entry: renders <App> with Wagmi + QueryClient providers
├── App.jsx                    ← Full dashboard component
├── App.css                    ← Dark theme, vanilla CSS
├── hooks/
│   ├── useEntityPosition.js   ← Reads credits + debt from chain
│   ├── useMarketplace.js      ← Reads listings, writes list/buy/cancel txns
│   └── useLiveFeed.js         ← WebSocket connection for live events
└── lib/
    ├── contracts.js           ← ABIs + contract addresses (from VITE_ env vars)
    └── wagmiConfig.js         ← Chain + connector configuration
```

---

### 4a. Application Bootstrap (main.jsx)

```jsx
// src/main.jsx
createRoot(document.getElementById('root')).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </WagmiProvider>
)
```

- `WagmiProvider` — injects the wagmi React context (chain state, wallet state, contract reads/writes)
- `QueryClientProvider` — `@tanstack/react-query` handles caching + refetching of on-chain data

Because this is a plain Vite SPA (no SSR), there are **no hydration issues** and **no `"use client"` directives** needed.

---

### 4b. wagmiConfig.js — Chain + Connector Setup

```javascript
// src/lib/wagmiConfig.js
export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia],
  connectors: [injected()],    // MetaMask, Rabby, Coinbase Wallet
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),  // local Hardhat
    [sepolia.id]: http(),                          // public RPC
  },
})
```

`injected()` detects any browser extension wallet (MetaMask is the most common). `hardhat.id` is `31337`.

---

### 4c. contracts.js — ABIs and Addresses

```javascript
// src/lib/contracts.js
export const CONTRACT_ADDRESSES = {
  carbonCreditToken: import.meta.env.VITE_CARBON_CREDIT_TOKEN_ADDRESS ?? '0x0',
  marketplace:       import.meta.env.VITE_MARKETPLACE_ADDRESS ?? '0x0',
}
```

`import.meta.env.VITE_*` is the Vite equivalent of `process.env.NEXT_PUBLIC_*`. Vite injects these at **build time** from `frontend/.env`. The values are baked into the JS bundle.

The ABIs are JSON ABI arrays (not Solidity-style string notation) because they support named tuple return components, which the old TypeScript `parseAbi()` didn't handle well for `getListings()`.

---

### 4d. useEntityPosition.js — Reading Balances

```javascript
// src/hooks/useEntityPosition.js
const { data } = useReadContracts({
  contracts: [
    { address, abi, functionName: 'balanceOf', args: [userAddress, 0n] },  // CREDIT_TOKEN
    { address, abi, functionName: 'balanceOf', args: [userAddress, 1n] },  // DEBT_TOKEN
  ],
  query: { enabled: !!userAddress },
})

const credits    = data?.[0]?.result ?? 0n
const debt       = data?.[1]?.result ?? 0n
const netCredits = BigInt(credits) - BigInt(debt)
```

**What happens under the hood:**
1. wagmi batches both calls into a single `eth_call` (multicall under the hood)
2. The node executes both `balanceOf()` calls — view functions, zero gas
3. Raw bytes returned are decoded by viem using the ABI `uint256` output type
4. Result lands as a `bigint` — no floating point precision issues

---

### 4e. useMarketplace.js — Reading Listings

```javascript
// src/hooks/useMarketplace.js
export function useActiveListings() {
  const { data: nextId } = useReadContract({ functionName: 'nextListingId' })
  const total = Number(nextId ?? 0n)

  const { data: listings } = useReadContract({
    functionName: 'getListings',
    args: [0n, BigInt(total)],
    query: { enabled: total > 0 },
  })

  const open = (listings ?? []).filter(l => Number(l.status) === ListingStatus.Open)
  return { listings: open }
}
```

Two reads are chained: first get `nextListingId` (scalar), then fetch `getListings(0, total)` (array of tuples). The `enabled: total > 0` guard prevents calling `getListings(0, 0)` which would revert with `"invalid range"`.

---

### 4f. useMarketplace.js — Writing Transactions

```javascript
// src/hooks/useMarketplace.js
export function useListCredits() {
  const { writeContract, isPending } = useWriteContract()

  function listCredits(amount, pricePerCreditEth) {
    writeContract({
      address: CONTRACT_ADDRESSES.marketplace,
      abi: CARBON_MARKETPLACE_ABI,
      functionName: 'listCredits',
      args: [amount, parseEther(pricePerCreditEth)],
    })
  }
  return { listCredits, isPending }
}
```

**Exact sequence when `listCredits()` is called:**
1. wagmi encodes the call data: `listCredits(uint256,uint256)` selector + ABI-encoded args
2. MetaMask popup opens showing: function called, args, estimated gas fee
3. User clicks **Confirm** — MetaMask signs the tx with the user's private key locally
4. Signed tx is broadcast via `eth_sendRawTransaction` to the Hardhat node
5. Hardhat mines the block, `CarbonMarketplace.listCredits()` executes on-chain
6. `ListingCreated` event emitted — picked up by backend listener → broadcast to frontend WS
7. `useWaitForTransactionReceipt({ hash })` resolves → `isSuccess` becomes `true`
8. `setTimeout(() => refetchListings(), 3000)` triggers a re-read of listings

---

### 4g. useLiveFeed.js — Real-Time Events

```javascript
// src/hooks/useLiveFeed.js
useEffect(() => {
  const ws = new WebSocket(import.meta.env.VITE_BACKEND_WS_URL ?? 'ws://localhost:4000')
  ws.onopen    = () => setConnected(true)
  ws.onclose   = () => setConnected(false)
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data)
    if (data.type === 'connected') return   // skip handshake ping
    setEvents(prev => [data, ...prev].slice(0, 50))
  }
  return () => ws.close()   // cleanup when component unmounts
}, [])
```

The WebSocket connection is opened once when `App.jsx` mounts and stays open for the entire session. Each event pushed from the backend is prepended to the list (`[data, ...prev]`), keeping the feed newest-first.

---

## 5. Workflow Walkthroughs

### A. Awarding Credits via REST API

```
curl/PowerShell                  index.js (backend)               Hardhat node
─────────────────────────────────────────────────────────────────────────────────
POST /award
{ entity, amount, reason }
         │
         ▼
  app.post("/award")
    validates body
         │
         ▼
  signer.awardCredits(entity, amount, reason)
    creditToken.awardCredits()   ← ethers.js encodes + signs
         │
         ▼
  eth_sendRawTransaction ──────────────────────────────────────────►
                                                            mines block
                                                            CreditsAwarded event
                                                                    │
                                 listener.js catches "CreditsAwarded"
                                 calls broadcast({ type, entity, amount })
                                                                    │
                                 WebSocket sends JSON to all clients │
                                                                    │
                                 useLiveFeed receives → setEvents() │
                                                            UI updates live feed
  ◄── { success: true, txHash }
```

---

### B. Listing Credits for Sale

```
User (MetaMask)      App.jsx          useListCredits()       CarbonMarketplace.sol
──────────────────────────────────────────────────────────────────────────────────
[types 100 credits]
[types 0.01 ETH]
[clicks "List Credits"]
         │
         ▼
  handleList(e)
    e.preventDefault()
    listCredits(100n, "0.01")
         │
         ▼
                           writeContract({
                             fn: "listCredits",
                             args: [100n, parseEther("0.01")]
                           })
                                  │
                                  ▼
                           MetaMask popup:
                           "Confirm listCredits(100, 10000000000000000)"
         │
[confirms tx]──────────────────────────────────────────────────────────────►
                                                              Checks:
                                                              - amount > 0 ✓
                                                              - netPos >= 100 ✓
                                                              Creates listing:
                                                              listings[0] = {
                                                                id: 0,
                                                                seller: user,
                                                                amount: 100,
                                                                price: 0.01 ETH,
                                                                status: Open
                                                              }
                                                              emit ListingCreated
         │
  setTimeout(refetchListings, 3000)
  App re-reads listings → "100 credits @ 0.01 ETH" appears in UI
```

---

### C. Buying Credits

```
Buyer (MetaMask)    App.jsx         usePurchaseListing()    CarbonMarketplace.sol
──────────────────────────────────────────────────────────────────────────────────
[clicks "Buy · 1 ETH"]
         │
  handleBuy(listingId=0, amount=100n, price=10000000000000000n)
         │
         ▼
                       purchase(0n, 100n * 10000000000000000n)
                              │   = 1000000000000000000 wei = 1 ETH
                              ▼
                       writeContract({
                         fn: "purchaseListing",
                         args: [0n],
                         value: 1_000_000_000_000_000_000n  ← ETH sent
                       })
                                    │
                             MetaMask shows:
                             "Send 1 ETH to Marketplace"
         │
[confirms]──────────────────────────────────────────────────────────────────►
                                                             Checks:
                                                             - listing[0] is Open ✓
                                                             - buyer != seller ✓
                                                             - msg.value == 1 ETH ✓
                                                             - seller still has 100 credits ✓
                                                             CEI:
                                                             listing.status = Fulfilled
                                                             seller.call{value: 1 ETH}()
                                                             creditToken.settleTransfer(
                                                               seller, buyer, 100)
                                                             emit TradeExecuted
         │
  credit balances updated on-chain
  useLiveFeed receives "TradeExecuted" event → appears in live feed
  setTimeout(refetchListings + refetchPos, 3000) → UI updates
```

---

### D. Event Propagation (Live Feed)

```
Hardhat node         listener.js             WebSocket            useLiveFeed.js
─────────────────────────────────────────────────────────────────────────────────
Block mined
event log present
"DebtRecorded"
  entity: 0x709...
  amount: 2000
         │
         ▼
tokenContract.on("DebtRecorded",
  callback(entity, amount, reason, event) {
    onEvent({
      type: "DebtRecorded",
      entity: "0x709...",
      amount: "2000",
      reason: "Industrial Pollution",
      txHash: event.log.transactionHash
    })
  }
)
         │
         ▼
broadcast({ type: "DebtRecorded", ... })
  iterates clients Set
  client.send(JSON.stringify(payload))
         │
         ► ws.onmessage fires in browser
           const data = JSON.parse(msg.data)
           setEvents(prev => [data, ...prev].slice(0, 50))
           React re-renders live feed panel
           "<DebtRecorded · {type, entity, amount...}>"  appears at top
```

---

## 6. How to Make Your Own Changes

### Add a new REST API endpoint

**Step 1** — Add the business logic in `backend/signer.js`:
```javascript
async function retireCredits(entity, amount) {
  const tx = await creditToken.retireCredits(entity, amount)
  return await tx.wait()
}
module.exports = { ..., retireCredits }
```

**Step 2** — Add the route in `backend/index.js`:
```javascript
app.post('/retire-credits', async (req, res) => {
  const { entity, amount } = req.body
  const receipt = await retireCredits(entity, BigInt(amount))
  res.json({ success: true, txHash: receipt.hash })
})
```

**Step 3** — Call it:
```powershell
Invoke-WebRequest -Uri http://localhost:4000/retire-credits -Method POST `
  -ContentType "application/json" `
  -Body '{"entity":"0xYOUR_ADDRESS","amount":100}' -UseBasicParsing
```

---

### Add a new Solidity function

**Step 1** — Add the function in the relevant `.sol` file with appropriate role guard:
```solidity
function myNewFunction(address entity, uint256 amount)
    external onlyRole(BACKEND_ROLE)
{
    // your logic
    emit MyNewEvent(entity, amount);
}
```

**Step 2** — Recompile: `npx hardhat compile`

**Step 3** — Add it to `frontend/src/lib/contracts.js`:
```javascript
export const CARBON_CREDIT_TOKEN_ABI = [
  ...existing entries,
  { type: 'function', name: 'myNewFunction', stateMutability: 'nonpayable',
    inputs: [{ name: 'entity', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [] },
]
```

**Step 4** — Redeploy locally: `.\start.ps1`

---

### Add a new frontend hook

**Step 1** — Create `frontend/src/hooks/useMyData.js`:
```javascript
import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESSES, CARBON_CREDIT_TOKEN_ABI } from '../lib/contracts'

export function useMyData(address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.carbonCreditToken,
    abi: CARBON_CREDIT_TOKEN_ABI,
    functionName: 'netCredits',
    args: [address],
    query: { enabled: !!address },
  })
}
```

**Step 2** — Use it in `App.jsx`:
```jsx
import { useMyData } from './hooks/useMyData'

const { data: myData } = useMyData(address)
```

---

### Add a new contract event listener

**Step 1** — Add the event signature to `backend/listener.js` ABI:
```javascript
const CARBON_CREDIT_TOKEN_ABI = [
  ...existing,
  "event MyNewEvent(address indexed entity, uint256 amount)",
]
```

**Step 2** — Subscribe inside `startListeners()`:
```javascript
tokenContract.on("MyNewEvent", (entity, amount, event) => {
  onEvent({
    type: "MyNewEvent",
    entity,
    amount: amount.toString(),
    txHash: event.log.transactionHash,
  })
})
```

The event will automatically appear in the Live Feed on the frontend.

---

### Add a new page / route

Vite uses plain React — there's no file-based routing. To add a second page, install React Router:

```powershell
npm install react-router-dom
```

Then in `main.jsx`:
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import History from './pages/History'

<BrowserRouter>
  <Routes>
    <Route path="/"        element={<App />} />
    <Route path="/history" element={<History />} />
  </Routes>
</BrowserRouter>
```

---

## 7. Environment Variables Reference

### `backend/.env`

| Variable | Example | Purpose |
|---|---|---|
| `RPC_URL` | `ws://127.0.0.1:8545` | WebSocket connection to the node (for event listening) |
| `BACKEND_PRIVATE_KEY` | `0xac09...` | Signs `BACKEND_ROLE` transactions (Hardhat Account #0) |
| `CARBON_CREDIT_TOKEN_ADDRESS` | `0x5FbDB...` | Contract address for signer + listener |
| `MARKETPLACE_ADDRESS` | `0xe7f17...` | Contract address for listener |
| `PORT` | `4000` | HTTP + WS server port |

### `frontend/.env`

| Variable | Example | Purpose |
|---|---|---|
| `VITE_CARBON_CREDIT_TOKEN_ADDRESS` | `0x5FbDB...` | Read by `contracts.js` for all contract reads |
| `VITE_MARKETPLACE_ADDRESS` | `0xe7f17...` | Read by `contracts.js` for marketplace interactions |
| `VITE_BACKEND_WS_URL` | `ws://localhost:4000` | WebSocket URL used in `useLiveFeed.js` |
| `VITE_CHAIN_ID` | `31337` | Hardhat local chain ID (informational) |

> ⚠ **After every `.\start.ps1` run**, the addresses in both `.env` files are
> automatically updated because Hardhat redeploys to fresh addresses on restart.
> You should also **reset MetaMask's activity data** after every Hardhat restart
> (Settings → Advanced → Clear activity tab data).
