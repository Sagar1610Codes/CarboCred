# CarboCred — Complete System Architecture

> A decentralised carbon-credit marketplace built on Ethereum (ERC-1155).  
> This document covers every layer of the system so the project can be rebuilt from scratch.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [System Architecture Diagram](#2-system-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Layer 1 — Smart Contracts](#4-layer-1--smart-contracts)
   - 4.1 CarbonCreditToken (ERC-1155)
   - 4.2 CarbonMarketplace
   - 4.3 Access Control & Roles
   - 4.4 Key Design Decisions
5. [Layer 2 — Backend Server](#5-layer-2--backend-server)
   - 5.1 index.js – HTTP + WebSocket Server
   - 5.2 signer.js – Backend Wallet
   - 5.3 listener.js – Blockchain Event Relay
   - 5.4 MongoDB / EntityProfile
   - 5.5 REST API Reference
6. [Layer 3 — Frontend](#6-layer-3--frontend)
   - 6.1 App Entry Point & Routing
   - 6.2 Wallet Connection (wagmi + viem)
   - 6.3 Contract Addresses & ABIs
   - 6.4 React Hooks
   - 6.5 Pages
   - 6.6 Components
   - 6.7 Utility Libraries
   - 6.8 Carbon Calculator
7. [Data Flow Walkthroughs](#7-data-flow-walkthroughs)
   - 7.1 Earning Credits (Activity Submission)
   - 7.2 Listing Credits for Sale
   - 7.3 Buying Credits from the Marketplace
   - 7.4 Real-Time Event Feed
   - 7.5 Business Onboarding
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Directory Structure](#9-directory-structure)
10. [Local Development Setup](#10-local-development-setup)
11. [Deployment (Sepolia Testnet)](#11-deployment-sepolia-testnet)
12. [Security Design](#12-security-design)

---

## 1. High-Level Overview

CarboCred is a three-tier, blockchain-anchored application:

| Tier | Technology | Role |
|------|-----------|------|
| **Smart Contracts** | Solidity 0.8.24 / Hardhat | Source of truth for all token balances and trades |
| **Backend** | Node.js / Express / Ethers.js v6 | Privileged signer, WebSocket relay, business identity |
| **Frontend** | React / Vite / wagmi / viem | User wallet interface, marketplace UI, analytics |

**Core concept:**  
Every entity (person or company) has an on-chain _carbon position_:

```
net = CREDIT_TOKEN balance − DEBT_TOKEN balance
```

- **Positive net** → the entity has offset more than it emitted (net offset holder).
- **Negative net** → the entity owes carbon credits to cover its emissions (net emitter).

Credits are ERC-1155 tokens (ID 0). Debt tokens are also ERC-1155 (ID 1) but are **soulbound** — they cannot be transferred, only minted by the backend and burned when debt is retired.

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                               │
│                                                                     │
│  React + Vite App (port 3000)                                       │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  wagmi/viem   │  │  WebSocket   │  │  REST API calls          │ │
│  │  (direct RPC) │  │  client      │  │  (award, debt, position) │ │
│  └───────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘ │
└──────────┼─────────────────┼──────────────────────-─┼───────────────┘
           │ JSON-RPC        │ ws://                  │ HTTP
           │ (MetaMask)      │                        │
           ▼                 ▼                        ▼
┌──────────────┐   ┌──────────────────────────────────────────────────┐
│  Hardhat /   │   │          Backend Node.js (port 4000)             │
│  Sepolia RPC │   │                                                  │
│  port 8545   │   │  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
└──────┬───────┘   │  │ listener.js│  │  signer.js │  │ MongoDB   │  │
       │           │  │ (WSS RPC)  │  │ (BACKEND_  │  │ (entity   │  │
       │           │  │ event relay│  │  ROLE key) │  │ profiles) │  │
       │           │  └─────┬──────┘  └──────┬─────┘  └───────────┘  │
       │           │        │                │                        │
       │           └────────┼────────────────┼────────────────────────┘
       │                    │                │
       │ eth_call /         │ contract       │ eth_sendRawTransaction
       │ eth_sendTx         │ events         │ (awardCredits, recordDebt)
       ▼                    ▼                ▼
┌────────────────────────────────────────────────────────────────────┐
│                      ETHEREUM CHAIN                                │
│                                                                    │
│   ┌──────────────────────────────┐  ┌─────────────────────────┐   │
│   │   CarbonCreditToken (ERC-1155)│  │   CarbonMarketplace     │   │
│   │   Token ID 0: CREDIT_TOKEN   │  │   (Ownable +            │   │
│   │   Token ID 1: DEBT_TOKEN     │  │    ReentrancyGuard)      │   │
│   │   (soulbound)                │  │                         │   │
│   └──────────────────────────────┘  └─────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### Smart Contracts
| Package | Version | Purpose |
|---------|---------|---------|
| `hardhat` | ^2.28.6 | Compile, test, deploy |
| `@nomicfoundation/hardhat-toolbox` | ^5.0.0 | All hardhat plugins (ethers, waffle, coverage, etc.) |
| `@openzeppelin/contracts` | ^5.4.0 | ERC1155, AccessControl, Ownable, ReentrancyGuard |
| `dotenv` | ^17.3.1 | Load `.env` into hardhat config |

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.19.2 | HTTP REST API |
| `ws` | ^8.18.0 | WebSocket server |
| `ethers` | ^6.13.4 | Blockchain interaction (signer + listener) |
| `mongoose` | ^9.2.1 | MongoDB ODM for business profiles |
| `dotenv` | ^16.4.5 | Environment variable loading |

### Frontend
| Package | Purpose |
|---------|---------|
| `vite` + `react` | Build tool + UI framework |
| `wagmi` | React hooks for wallet connection + contract calls |
| `viem` | Low-level Ethereum client (wagmi dependency + used directly) |
| `recharts` | Analytics charts (CarbonTrendChart, EmissionBreakdownChart) |
| `qrcode` | QR code generation for transaction verification |
| `html5-qrcode` | QR code scanning in the browser |

---

## 4. Layer 1 — Smart Contracts

### 4.1 CarbonCreditToken (ERC-1155)

**File:** `contracts/CarbonCreditToken.sol`  
**Inherits:** `ERC1155`, `AccessControl`, `ReentrancyGuard`

#### Token IDs

| ID | Constant | Description | Transferable? |
|----|----------|-------------|---------------|
| `0` | `CREDIT_TOKEN` | Carbon offset credits (green energy, reforestation, etc.) | ✅ Yes |
| `1` | `DEBT_TOKEN` | Emission liabilities assigned by backend | ❌ No (soulbound) |

#### Key Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `awardCredits(entity, amount, reason)` | `BACKEND_ROLE` | Mints CREDIT_TOKEN (ID 0) to an entity. Emits `CreditsAwarded`. |
| `recordDebt(entity, amount, reason)` | `BACKEND_ROLE` | Mints DEBT_TOKEN (ID 1) to an entity. Emits `DebtRecorded`. |
| `clearDebt(entity, amount)` | `BACKEND_ROLE` | Burns DEBT_TOKEN. Used when an entity retires credits to offset debt. Emits `DebtCleared`. |
| `retireCredits(entity, amount)` | `BACKEND_ROLE` | Burns CREDIT_TOKEN (consumption/retirement). |
| `settleTransfer(seller, buyer, amount)` | `MARKETPLACE_ROLE` | Internal transfer of CREDIT_TOKEN from seller to buyer. Called exclusively by CarbonMarketplace. |
| `netCredits(entity)` → `int256` | Anyone (view) | Returns `credits − debt`. Positive = offset holder; Negative = emitter. |
| `getPosition(entity)` → `(credits, debt)` | Anyone (view) | Returns both raw balances as a tuple. |

#### Events

| Event | Emitted by |
|-------|-----------|
| `CreditsAwarded(entity, amount, reason)` | `awardCredits` |
| `DebtRecorded(entity, amount, reason)` | `recordDebt` |
| `DebtCleared(entity, amount)` | `clearDebt` |
| `BalanceUpdated(seller, buyer, amount, sellerBal, buyerBal)` | `settleTransfer` |

#### Soulbound Enforcement

The `_update()` hook is overridden. For any transfer involving `DEBT_TOKEN` (ID 1), it **reverts** unless either `from == address(0)` (mint) or `to == address(0)` (burn). This makes debt tokens non-transferable at the protocol level.

---

### 4.2 CarbonMarketplace

**File:** `contracts/CarbonMarketplace.sol`  
**Inherits:** `Ownable`, `ReentrancyGuard`

#### Listing Lifecycle

```
listCredits() → status: Open
     │
     ├── purchaseListing() → status: Fulfilled   (buyer pays ETH, gets credits)
     └── cancelListing()   → status: Cancelled   (seller pulls listing)
```

#### Listing Struct

```solidity
struct Listing {
    uint256       id;
    address       seller;
    uint256       amount;           // CREDIT_TOKEN units
    uint256       pricePerCredit;   // wei per single credit
    ListingStatus status;           // Open | Fulfilled | Cancelled
}
```

#### Key Functions

| Function | Description |
|----------|-------------|
| `listCredits(amount, pricePerCredit)` | Creates a listing. Validates that seller's **net position** (credits − debt) ≥ amount. This prevents a net emitter from selling credits they haven't offset yet. |
| `cancelListing(listingId)` | Only the original seller can cancel. |
| `purchaseListing(listingId)` | Payable. Buyer sends exact ETH = `amount × pricePerCredit`. Uses CEI pattern: marks fulfilled → forwards ETH to seller → calls `settleTransfer`. |
| `getListing(id)` | View: single listing by ID. |
| `getListings(from, to)` | View: paginated listing array. |

#### Security Properties

- **No ETH custody**: ETH is forwarded immediately to the seller via `call{value}`. The contract never holds ETH.
- **CEI pattern**: State change (`status = Fulfilled`) happens before any external call (ETH transfer, `settleTransfer`).
- **Stale listing protection**: Seller's credit balance is re-validated at purchase time, not just at listing time.
- **No `setApprovalForAll`**: The marketplace holds `MARKETPLACE_ROLE` and calls `settleTransfer` directly — much safer than an open ERC-1155 approval.
- **ReentrancyGuard**: All state-mutating functions are protected.

---

### 4.3 Access Control & Roles

```
DEFAULT_ADMIN_ROLE   ← deployer address (can grant/revoke all roles)
    │
    ├── BACKEND_ROLE ← backend server wallet (Account #0 on Hardhat local)
    │                   can: awardCredits, recordDebt, clearDebt, retireCredits
    │
    └── MARKETPLACE_ROLE ← CarbonMarketplace contract address
                            can: settleTransfer
```

These roles are granted during deployment in `scripts/getAddresses.js`:
1. Deploy `CarbonCreditToken` (deployer = admin).
2. Deploy `CarbonMarketplace`.
3. Grant `MARKETPLACE_ROLE` to the marketplace contract address.
4. Grant `BACKEND_ROLE` to the deployer address (which is also the backend signer key on local).

---

### 4.4 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **ERC-1155** instead of two separate ERC-20s | One contract handles both credit and debt tokens. Future token IDs can represent vintage-specific credits (e.g., ID 2 = 2024 Solar). |
| **Debt tokens are soulbound** | An entity cannot transfer its emission liability — it must offset it. |
| **Net-position gate on listings** | Prevents market manipulation: a heavy emitter cannot dump credits while still owing debt. |
| **Backend is trusted off-chain oracle** | Credit emission calculations are complex (physical world data). The backend processes activity inputs and calls `awardCredits`/`recordDebt` on-chain using its `BACKEND_ROLE` key. |

---

## 5. Layer 2 — Backend Server

### 5.1 `index.js` — HTTP + WebSocket Server

**Port:** 4000  
**Framework:** Express + Node.js `http` + `ws`

The server does three things concurrently:

1. **HTTP REST API** — Receives minting requests (award, debt, clear-debt) and serves read endpoints.
2. **WebSocket server** — Maintains an in-memory `Set` of connected browser clients and broadcasts blockchain events to all of them.
3. **Blockchain listener** — Delegates to `listener.js` to subscribe to contract events via a persistent WebSocket RPC connection.

**CORS:** Wildcard (`*`) is applied for local development.

**MongoDB:** Connected via `mongoose` for entity profiles (business name ↔ wallet address mapping). Connection string from `MONGO_URI` env var.

---

### 5.2 `signer.js` — Backend Wallet

The privileged backend wallet that holds `BACKEND_ROLE`. It constructs:

```js
const provider = new ethers.JsonRpcProvider(RPC_URL)  // HTTP JSON-RPC
const wallet   = new ethers.Wallet(BACKEND_PRIVATE_KEY, provider)
const creditToken = new ethers.Contract(TOKEN_ADDRESS, ABI, wallet)
```

Exported functions (called by REST API handlers in `index.js`):

| Function | On-chain call |
|----------|--------------|
| `awardCredits(entity, amount, reason)` | `creditToken.awardCredits(...)` |
| `recordDebt(entity, amount, reason)` | `creditToken.recordDebt(...)` |
| `clearDebt(entity, amount)` | `creditToken.clearDebt(...)` |

On local Hardhat, `BACKEND_PRIVATE_KEY` is Account #0's key:  
`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

### 5.3 `listener.js` — Blockchain Event Relay

Uses **ethers.js `WebSocketProvider`** (not HTTP) for persistent real-time subscriptions.

Subscribes to events from both contracts:

**CarbonCreditToken events:**
- `CreditsAwarded` → `{ type, entity, amount, reason, txHash }`
- `DebtRecorded` → `{ type, entity, amount, reason, txHash }`
- `DebtCleared` → `{ type, entity, amount, txHash }`
- `BalanceUpdated` → `{ type, seller, buyer, amount, sellerBalance, buyerBalance, txHash }`

**CarbonMarketplace events:**
- `ListingCreated` → `{ type, id, seller, amount, pricePerCredit, txHash }`
- `ListingCancelled` → `{ type, id, seller, txHash }`
- `TradeExecuted` → `{ type, id, seller, buyer, amount, totalPrice, txHash }`

When any event fires, the raw WebSocket error handler is patched to prevent Node.js crashing on unexpected websocket disconnects. Each event is forwarded via the `broadcast()` callback to all connected frontend WebSocket clients.

---

### 5.4 MongoDB / EntityProfile

**Model:** `backend/src/models/EntityProfile.js`

```js
{
  accountId:    String,  // hashed wallet address (unique, indexed)
  businessName: String,  // 2–100 chars
  createdAt:    Date,
  updatedAt:    Date,
}
```

The `accountId` is a **hash of the wallet address** (not the raw address), stored via `utils/hashAccountId.js` in the frontend. This means the backend never stores raw wallet addresses, preserving privacy.

**Routes:** `backend/src/routes/entityProfile.routes.js`  
Mounted at `/entity` in `index.js`.

| Method | Endpoint | Action |
|--------|----------|--------|
| `GET` | `/entity/profile/:accountId` | Fetch business name for a hashed account ID |
| `POST` | `/entity/profile` | Create or update a business profile |

---

### 5.5 REST API Reference

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| `GET` | `/health` | — | `{ status: "ok" }` |
| `GET` | `/position/:address` | — | `{ address, credits, debt, netCredits }` |
| `POST` | `/award` | `{ entity, amount, reason, signature? }` | `{ success, txHash }` |
| `POST` | `/debt` | `{ entity, amount, reason }` | `{ success, txHash }` |
| `POST` | `/clear-debt` | `{ entity, amount }` | `{ success, txHash }` |
| `GET` | `/entity/profile/:accountId` | — | `{ accountId, businessName }` |
| `POST` | `/entity/profile` | `{ accountId, businessName }` | Profile object |

**Optional signature on `/award`:**  
If `signature` is provided, the backend verifies it with `ethers.verifyMessage` over message string `"award:<amount>:<reason>"`. The recovered address must match `entity`. This prevents arbitrary award calls without entity consent (backward-compatible — omitting `signature` still works).

---

## 6. Layer 3 — Frontend

**Build tool:** Vite  
**Port:** 3000  
**Entry point:** `src/main.jsx` → wraps app in `WagmiProvider` + `QueryClientProvider`

### 6.1 App Entry Point & Routing

`App.jsx` is a **single-page app with view-state routing** (no React Router). Navigation is handled by a `currentView` state that renders one of:

| View | Component |
|------|-----------|
| `'marketplace'` | Inline JSX in App.jsx — main marketplace grid |
| `'history'` | `<UserTransactions />` |
| `'analytics'` | `<BusinessAnalytics />` |
| `'verify'` | `<VerifyTransaction />` |
| `'purchase-success'` | `<PurchaseSuccess txHash />` |

There is also a separate static page at `/public-dashboard.html` (no wallet required) for public carbon data.

---

### 6.2 Wallet Connection (wagmi + viem)

**Config file:** `src/lib/wagmiConfig.js`

Supported chains:
- `hardhat` (chainId 31337) — `http://127.0.0.1:8545`
- `sepolia` (chainId 11155111) — public RPC

Connector: `injected()` — supports MetaMask, Rabby, Coinbase Wallet, or any browser wallet.

The app detects if the connected chain is wrong (not Hardhat during local dev) and shows a "Switch to Hardhat" button.

---

### 6.3 Contract Addresses & ABIs

**File:** `src/lib/contracts.js`

- Addresses are loaded from Vite env vars:
  - `VITE_CARBON_CREDIT_TOKEN_ADDRESS`
  - `VITE_MARKETPLACE_ADDRESS`
- ABIs are inlined as JSON arrays (no JSON file imports needed).
- Exports `CREDIT_TOKEN_ID = 0n`, `DEBT_TOKEN_ID = 1n`, and `ListingStatus` enum mirror.

---

### 6.4 React Hooks

All contract interactions are wrapped in custom hooks in `src/hooks/`:

| Hook | Description |
|------|-------------|
| `useEntityPosition()` | Reads `getPosition(address)` from CarbonCreditToken via wagmi `useReadContract`. Returns `{ credits, debt, netCredits, isLoading, refetch }`. |
| `useActiveListings()` | Reads `nextListingId` then `getListings(0, n)`, filters to `Open` status only. Returns `{ listings, isLoading, refetch }`. |
| `useListCredits()` | Wraps `writeContract` for `listCredits(amount, pricePerCredit)`. Converts ETH string → wei via `parseEther`. |
| `usePurchaseListing()` | Wraps `writeContractAsync` for `purchaseListing(listingId)` with `value: totalWei`. Returns the tx hash on success. |
| `useCancelListing()` | Wraps `writeContract` for `cancelListing(listingId)`. |
| `useLiveFeed()` | Opens a WebSocket to `VITE_BACKEND_WS_URL`. Appends incoming events to a state array. Returns `{ events, connected }`. |
| `useCarbonAward()` | Called after carbon calculator form submission. Sends `POST /award` (for reductions → mint credits) and `POST /debt` (for emissions → mint debt). Returns `{ isSubmitting, result, error, submitActivity, reset }`. |
| `useEntityProfile()` | Hashes the wallet address (`hashAccountId`), fetches profile from `GET /entity/profile/:accountId`. Detects if onboarding is needed (no businessName). Exposes `createProfile()` for `POST /entity/profile`. |
| `usePublicCarbonData()` | Used by the public dashboard. Reads all blockchain events via `blockchainReader.js` (no wallet needed). |
| `useUserTransactions()` | Reads all on-chain history for the connected wallet from event logs. |
| `useTxVerification()` | Verifies a transaction by hash — decodes which contract function was called and validates the event logs. |
| `useCarbonAnalytics()` | Aggregates credit/debt events for the business analytics dashboard. |

---

### 6.5 Pages

| Page | File | Description |
|------|------|-------------|
| **UserTransactions** | `pages/UserTransactions.jsx` | Shows all historical transactions for the connected wallet. Uses `useUserTransactions`. Displays a `UserTransactionTable` with sorting. |
| **BusinessAnalytics** | `pages/BusinessAnalytics.jsx` | CarbonTrendChart + EmissionBreakdownChart + NetZeroGauge for the connected entity's historical performance. |
| **PurchaseSuccess** | `pages/PurchaseSuccess.jsx` | Displayed after a successful credit purchase. Shows the tx hash and generates a QR code (`TransactionQR`) that can be scanned to verify offset retirement. |
| **VerifyTransaction** | `pages/VerifyTransaction.jsx` | Accepts a tx hash (typed or QR scanned via `QRScanner`) and performs trustless on-chain verification via `useTxVerification`. |
| **PublicDashboard** | `pages/PublicDashboard.jsx` | No-wallet dashboard. Shows `GlobalStats`, `FirmTable`, and `CarbonImpactDashboard` for all registered firms. Loaded at `/public-dashboard.html`. |

---

### 6.6 Components

| Component | Description |
|-----------|-------------|
| `BusinessOnboardingModal` | Modal shown when a wallet connects for the first time (no profile found). Prompts for a business name, calls `createProfile()`. |
| `CarbonImpactDashboard` | Aggregated credit/debt view for a single firm. |
| `CarbonTrendChart` | Recharts line chart showing credit vs. debt trend over time. |
| `EmissionBreakdownChart` | Recharts pie/bar chart showing breakdown of emission sources. |
| `FirmTable` | Table of all participating firms with their net positions. Fetched trustlessly from on-chain event logs. |
| `GlobalStats` | Summary cards: total credits issued, total debt issued, active credits, active debt, firm count, etc. |
| `NetZeroGauge` | Visual gauge showing how close an entity is to net-zero. |
| `QRScanner` | Wraps `html5-qrcode` library for camera-based QR scanning in the Verify page. |
| `TransactionQR` | Generates a QR code (`qrcode` lib) embedding a tx hash, for offline/physical verification proof. |
| `UserTransactionTable` | Richly formatted table for the UserTransactions page. |

---

### 6.7 Utility Libraries

| File | Description |
|------|-------------|
| `utils/blockchainReader.js` | **Read-only, trustless chain reader** using `viem`. Functions: `getAllParticipatingAddresses`, `getFirmBalance`, `getRecentTransfers`, `computeGlobalStats`. Fetches event logs in 2000-block chunks with exponential-backoff retry. No signer, no writes, no backend needed. |
| `utils/transactionParser.js` | Decodes raw transaction data (input calldata + logs) into human-readable descriptions for the Verify page. |
| `utils/carbonAnalyticsEngine.js` | Processes raw event logs into time-series analytics (credit earned per week, debt per week, etc.) for the analytics charts. |
| `utils/hashAccountId.js` | Hashes a wallet address to a `accountId` string, preserving privacy when storing business names in MongoDB. |
| `utils/qrGenerator.js` | Thin wrapper around the `qrcode` npm package to generate a base64 data URL from a string. |

---

### 6.8 Carbon Calculator

**File:** `src/lib/carbonCalculator.js`

Converts real-world activity inputs into credit/debt amounts before submitting to the backend.

#### Emission Factors

| Input | Factor |
|-------|--------|
| Grid energy consumed (kWh) | × 0.82 kg CO₂/kWh |
| Direct CO₂ emitted (kg) | × 1.00 |
| Vehicle distance (km) | × 0.21 kg CO₂/km |

#### Reduction Factors

| Input | Factor |
|-------|--------|
| Waste recycled (kg) | × 0.5 credits/kg |
| Trees planted | × 20 credits/tree |
| Clean energy generated (kWh) | × 0.82 credits/kWh |

#### Formula

```
emissions  = energyKwh×0.82 + carbonEmittedKg×1 + vehicleKm×0.21
reductions = recycleKg×0.5  + treesPlanted×20  + cleanEnergyKwh×0.82
net        = reductions − emissions

→ Credits minted  = Math.floor(reductions)   (always ≥ 0)
→ Debt minted     = Math.floor(emissions)    (always ≥ 0)
```

Both credits and debt are submitted independently — an activity report results in up to **two blockchain transactions**: one mint of CREDIT_TOKEN and one mint of DEBT_TOKEN.

---

## 7. Data Flow Walkthroughs

### 7.1 Earning Credits (Activity Submission)

```
1. User fills carbon calculator form in App.jsx
2. calcResult = calculateCredits(inputs)         ← pure JS, no blockchain
3. User clicks "Submit Activity"
4. useCarbonAward.submitActivity(address, emissions, reductions):
   a. POST /award  { entity: address, amount: Math.floor(reductions), reason }
      → backend signer calls creditToken.awardCredits(entity, amount, reason)
      → CarbonCreditToken mints CREDIT_TOKEN (ID 0) to entity
      → emits CreditsAwarded event
   b. POST /debt   { entity: address, amount: Math.floor(emissions), reason }
      → backend signer calls creditToken.recordDebt(entity, amount, reason)
      → CarbonCreditToken mints DEBT_TOKEN (ID 1) to entity
      → emits DebtRecorded event
5. listener.js picks up both events via WebSocket subscription
6. broadcast() pushes { type: "CreditsAwarded", ... } and { type: "DebtRecorded", ... }
   to all connected frontend WebSocket clients
7. useLiveFeed() receives events and appends to `events` array → Live Feed panel updates
8. App.jsx calls refetchPos() after 3 seconds → reads updated on-chain balance
```

---

### 7.2 Listing Credits for Sale

```
1. Seller inputs amount + pricePerCredit (ETH) in "List Credits for Sale" panel
2. Frontend validates: netCredits >= amount (prevents net emitters from selling)
3. useListCredits.listCredits(amountBig, priceEthString)
   → writeContract({ functionName: 'listCredits', args: [amount, parseEther(price)] })
   → MetaMask prompts user to sign
   → CarbonMarketplace.listCredits() executes on-chain:
     a. Validates seller's net position >= amount (on-chain re-check)
     b. Creates Listing struct with status: Open
     c. Emits ListingCreated event
4. listener.js picks up ListingCreated → broadcast → Live Feed updates
5. refetchListings() called after 3 seconds → Active Listings panel refreshes
```

---

### 7.3 Buying Credits from the Marketplace

```
1. Buyer clicks "Buy" on a listing in the Active Listings panel
2. handleBuy(listingId, amount, pricePerCredit)
3. usePurchaseListing.purchase(listingId, amount * pricePerCredit)
   → writeContractAsync({ functionName: 'purchaseListing', value: totalWei })
   → MetaMask prompts user to send ETH + sign
   → CarbonMarketplace.purchaseListing() executes:
     a. Validates listing is Open
     b. Validates msg.value == amount × pricePerCredit (exact ETH)
     c. Re-validates seller's CREDIT_TOKEN balance (anti-stale check)
     d. Marks listing as Fulfilled (CEI pattern)
     e. Transfers ETH to seller via call{value}
     f. Calls creditToken.settleTransfer(seller, buyer, amount)
        → CarbonCreditToken moves CREDIT_TOKEN from seller to buyer
        → Emits BalanceUpdated
     g. Emits TradeExecuted
4. writeContractAsync returns txHash
5. App.jsx sets lastTxHash = txHash and currentView = 'purchase-success'
6. PurchaseSuccess page renders TransactionQR(txHash) → QR code for offline proof
7. listener.js picks up TradeExecuted + BalanceUpdated → broadcast → Live Feed
8. Both parties' positions update on-chain
```

---

### 7.4 Real-Time Event Feed

```
Backend startup:
  server.listen() → startListeners(broadcast)
  listener.js creates WebSocketProvider (wss://RPC_URL)
  Attaches ethers contract event listeners for all 7 event types

Browser connection:
  useLiveFeed() creates WebSocket to ws://localhost:4000
  Sends initial { type: "connected" } message on open

On any on-chain event:
  ethers event fires in listener.js
  → formatted event object constructed
  → broadcast(eventData)
  → JSON.stringify(eventData) sent to all `clients` Set
  → useLiveFeed receives via ws.onmessage
  → events state updated → Live Feed panel re-renders
```

---

### 7.5 Business Onboarding

```
1. Wallet connects (wagmi useAccount)
2. useEntityProfile() runs:
   a. hashAccountId(address) → deterministic hash (e.g. SHA-256 truncated)
   b. GET /entity/profile/:hashedId
   c. If 404 → needsOnboarding = true
3. BusinessOnboardingModal renders (isOpen={needsOnboarding})
4. User types business name → clicks submit
5. createProfile(businessName) calls POST /entity/profile { accountId, businessName }
6. EntityProfile saved in MongoDB
7. Modal closes, header now shows business name
```

---

## 8. Environment Variables Reference

### Root `.env` (Hardhat config)

| Variable | Required for | Description |
|----------|-------------|-------------|
| `DEPLOYER_PRIVATE_KEY` | Sepolia deploy only | 64-char hex private key (with or without `0x`). Leave empty for local. |
| `SEPOLIA_RPC_URL` | Sepolia deploy only | e.g. `https://sepolia.infura.io/v3/YOUR_KEY` |
| `ETHERSCAN_API_KEY` | Contract verification only | From etherscan.io |

### `backend/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `RPC_URL` | `ws://127.0.0.1:8545` | WebSocket RPC for event listener (use `wss://` for hosted nodes) |
| `BACKEND_PRIVATE_KEY` | `0xac0974...` | Wallet with BACKEND_ROLE. On local = Hardhat Account #0. |
| `CARBON_CREDIT_TOKEN_ADDRESS` | `0x5FbDB...` | Deployed CarbonCreditToken address |
| `MARKETPLACE_ADDRESS` | `0xe7f1...` | Deployed CarbonMarketplace address |
| `PORT` | `4000` | Backend HTTP/WS port |
| `MONGO_URI` | `mongodb://localhost:27017/carbocred` | MongoDB connection string |

### `frontend/.env`

| Variable | Example | Description |
|----------|---------|-------------|
| `VITE_CARBON_CREDIT_TOKEN_ADDRESS` | `0x5FbDB...` | Must match backend |
| `VITE_MARKETPLACE_ADDRESS` | `0xe7f1...` | Must match backend |
| `VITE_BACKEND_WS_URL` | `ws://localhost:4000` | WebSocket URL for live feed |
| `VITE_CHAIN_ID` | `31337` | Chain ID (31337 = Hardhat local, 11155111 = Sepolia) |

> **Important:** All three `.env` files must use the **same contract addresses** after every deployment.  
> The `start.ps1` script auto-syncs `backend/.env` and `frontend/.env` after deployment.

---

## 9. Directory Structure

```
CarboCred/
│
├── contracts/                  # Solidity smart contracts
│   ├── CarbonCreditToken.sol   # ERC-1155 token (credits + debt)
│   └── CarbonMarketplace.sol   # P2P listing marketplace
│
├── scripts/                    # Hardhat deployment scripts
│   ├── deploy.js               # Manual deploy (verbose output)
│   └── getAddresses.js         # Deploy + write addresses.json
│
├── test/                       # Hardhat test files
│   └── *.js
│
├── artifacts/                  # Compiled contract artifacts (auto-generated)
├── cache/                      # Hardhat compilation cache
│
├── backend/                    # Node.js backend server
│   ├── index.js                # Express + WebSocket server entry point
│   ├── listener.js             # Contract event subscription + relay
│   ├── signer.js               # BACKEND_ROLE wallet + contract calls
│   ├── package.json
│   ├── .env                    # Backend environment variables
│   └── src/
│       ├── models/
│       │   └── EntityProfile.js  # Mongoose schema
│       ├── controllers/
│       │   └── entityProfile.controller.js
│       ├── routes/
│       │   └── entityProfile.routes.js
│       └── utils/
│           └── (shared backend utils)
│
├── frontend/                   # Vite + React frontend
│   ├── src/
│   │   ├── main.jsx            # App root, WagmiProvider
│   │   ├── App.jsx             # Main component, view-state routing
│   │   ├── App.css             # Global styles
│   │   │
│   │   ├── lib/                # Shared config & constants
│   │   │   ├── contracts.js    # ABIs + CONTRACT_ADDRESSES + enums
│   │   │   ├── wagmiConfig.js  # Chain config + connectors
│   │   │   └── carbonCalculator.js # Emission/reduction calculation
│   │   │
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useEntityPosition.js
│   │   │   ├── useMarketplace.js
│   │   │   ├── useLiveFeed.js
│   │   │   ├── useCarbonAward.js
│   │   │   ├── useEntityProfile.js
│   │   │   ├── usePublicCarbonData.js
│   │   │   ├── useUserTransactions.js
│   │   │   ├── useTxVerification.js
│   │   │   └── useCarbonAnalytics.js
│   │   │
│   │   ├── pages/              # Full-page views
│   │   │   ├── UserTransactions.jsx
│   │   │   ├── BusinessAnalytics.jsx
│   │   │   ├── PurchaseSuccess.jsx
│   │   │   ├── VerifyTransaction.jsx
│   │   │   └── PublicDashboard.jsx
│   │   │
│   │   ├── components/         # Reusable UI components
│   │   │   ├── BusinessOnboardingModal.jsx
│   │   │   ├── CarbonImpactDashboard.jsx
│   │   │   ├── CarbonTrendChart.jsx
│   │   │   ├── EmissionBreakdownChart.jsx
│   │   │   ├── FirmTable.jsx
│   │   │   ├── GlobalStats.jsx
│   │   │   ├── NetZeroGauge.jsx
│   │   │   ├── QRScanner.jsx
│   │   │   ├── TransactionQR.jsx
│   │   │   └── UserTransactionTable.jsx
│   │   │
│   │   └── utils/              # Pure utility functions
│   │       ├── blockchainReader.js    # viem-based read-only chain queries
│   │       ├── transactionParser.js   # Decode tx calldata for Verify page
│   │       ├── carbonAnalyticsEngine.js # Time-series analytics from events
│   │       ├── hashAccountId.js       # Privacy-preserving address hashing
│   │       └── qrGenerator.js         # QR code base64 generator
│   │
│   ├── .env                    # Frontend environment variables
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── hardhat.config.js           # Hardhat network + compiler config
├── package.json                # Root package (Hardhat dependencies)
├── .env                        # Root env (Sepolia keys — optional for local)
├── .env.example                # Template for .env
├── start.ps1                   # ONE-CLICK local dev startup script
└── ARCHITECTURE.md             # This file
```

---

## 10. Local Development Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- MongoDB running locally (default port 27017)
- MetaMask browser extension

### Step-by-Step

#### 1. Install dependencies

```powershell
# Root (Hardhat)
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

#### 2. Start everything with one command

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

This script automatically:
1. Kills any stale processes on ports 4000, 3000, 8545
2. Starts `npx hardhat node` in a new terminal window (port 8545)
3. Waits 5 seconds for the node to be ready
4. Runs `getAddresses.js` to deploy contracts → writes `addresses.json`
5. Syncs `backend/.env` and `frontend/.env` with the new contract addresses
6. Starts `node index.js` in a new terminal (backend, port 4000)
7. Awards 1000 test credits to Hardhat Account #0 via `POST /award`
8. Starts `npm run dev` in a new terminal (frontend, port 3000)

#### 3. Configure MetaMask

1. Add network: **Hardhat Local**
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency: ETH
2. Import Hardhat Account #0:
   - Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
   - This account has 10,000 ETH and 1000 pre-awarded credits

> ⚠️ **Always reset MetaMask account** (Settings → Advanced → Clear activity tab data) after restarting the Hardhat node, because the node resets nonces.

#### Manual startup (if start.ps1 fails)

```powershell
# Terminal 1 — Hardhat node
npx hardhat node

# Terminal 2 — Deploy contracts
npx hardhat run scripts/getAddresses.js --network localhost
# Copy addresses from output into backend/.env and frontend/.env

# Terminal 3 — Backend
cd backend && node index.js

# Terminal 4 — Frontend
cd frontend && npm run dev
```

---

## 11. Deployment (Sepolia Testnet)

#### 1. Fill root `.env`

```env
DEPLOYER_PRIVATE_KEY=0x<your-64-char-key>
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<your-project-id>
ETHERSCAN_API_KEY=<optional>
```

#### 2. Deploy contracts

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Note the deployed addresses from the output.

#### 3. Update env files

`backend/.env`:
```env
RPC_URL=wss://sepolia.infura.io/ws/v3/<your-project-id>
BACKEND_PRIVATE_KEY=0x<backend-wallet-key>
CARBON_CREDIT_TOKEN_ADDRESS=<deployed-token-address>
MARKETPLACE_ADDRESS=<deployed-marketplace-address>
MONGO_URI=mongodb+srv://...
PORT=4000
```

`frontend/.env`:
```env
VITE_CARBON_CREDIT_TOKEN_ADDRESS=<deployed-token-address>
VITE_MARKETPLACE_ADDRESS=<deployed-marketplace-address>
VITE_BACKEND_WS_URL=wss://your-backend.com
VITE_CHAIN_ID=11155111
```

#### 4. Grant BACKEND_ROLE

After deploying, the backend wallet must hold `BACKEND_ROLE`. The deploy script (`getAddresses.js`) grants it to the deployer — if the backend uses a different wallet, grant it manually:

```js
await creditToken.grantRole(BACKEND_ROLE, backendWalletAddress)
```

#### 5. Build and serve frontend

```bash
cd frontend && npm run build
# Serve the dist/ folder with any static host (Netlify, Vercel, Nginx, etc.)
```

---

## 12. Security Design

| Threat | Mitigation |
|--------|-----------|
| Reentrancy attacks | `ReentrancyGuard` on all state-mutating marketplace functions |
| Front-running on purchase | CEI pattern: state change before ETH transfer before token transfer |
| Stale listing exploit | Seller balance re-validated at purchase time (not just listing time) |
| Net emitter selling unpaid credits | `listCredits` checks `netCredits >= amount` on-chain |
| Debt token transfer (soulbound bypass) | `_update` hook reverts on any DEBT_TOKEN transfer between non-zero addresses |
| Unauthorized credit minting | `awardCredits`/`recordDebt` gated by `BACKEND_ROLE` (role-based access control) |
| Unauthorized marketplace settlement | `settleTransfer` gated by `MARKETPLACE_ROLE`, only held by the marketplace contract |
| Raw wallet address exposure | Business profiles store hashed account IDs, not raw wallet addresses |
| Invalid backend private key crash | `hardhat.config.js` validates key length before including in Sepolia accounts |
| WebSocket RPC disconnect crashes Node | `listener.js` attaches a raw `error` event handler to the underlying websocket to prevent unhandled process exit |
| Arbitrary award without consent | `/award` endpoint accepts optional `signature`. If provided, verified against the entity address |
