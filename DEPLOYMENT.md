# CarboCred — Deployment & Linkage Guide

## Prerequisites
- Node.js 18+, npm 9+
- MetaMask browser extension
- (Testnet) Alchemy or Infura account for Sepolia

---

## Step 1 — Compile Contracts

```bash
cd d:/Projects/CarboCred
npx hardhat compile
```

You should see: `Compiled X Solidity files successfully`.

---

## Step 2 — Local Development (Hardhat Node)

### 2a. Start the local blockchain

```bash
npx hardhat node
```

Keep this terminal open. Note the private keys printed — use them in MetaMask.

### 2b. Deploy contracts (new terminal)

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Output example:
```
[1/4] Deploying CarbonCreditToken...  →  0xABCD...1234
[2/4] Deploying CarbonMarketplace...  →  0xEF01...5678
[3/4] MARKETPLACE_ROLE granted.
[4/4] BACKEND_ROLE granted.

  CARBON_CREDIT_TOKEN_ADDRESS=0xABCD...1234
  MARKETPLACE_ADDRESS=0xEF01...5678
```

### 2c. Configure backend environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```
RPC_URL=ws://127.0.0.1:8545
BACKEND_PRIVATE_KEY=<account-0 private key from hardhat node output>
CARBON_CREDIT_TOKEN_ADDRESS=<from deploy output>
MARKETPLACE_ADDRESS=<from deploy output>
```

### 2d. Configure frontend environment

```bash
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local`:
```
NEXT_PUBLIC_CARBON_CREDIT_TOKEN_ADDRESS=<from deploy output>
NEXT_PUBLIC_MARKETPLACE_ADDRESS=<from deploy output>
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:4000
NEXT_PUBLIC_CHAIN_ID=31337
```

### 2e. Install backend dependencies & start

```bash
cd backend
npm install
node index.js
```

### 2f. Start frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2g. Connect MetaMask to Hardhat localhost

- Network name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Import an account using a private key from the Hardhat node output.

---

## Step 3 — Award Credits via Backend (Testing)

Once the backend is running, call the REST API:

```bash
# Award green energy credits to an address
curl -X POST http://localhost:4000/award \
  -H "Content-Type: application/json" \
  -d '{"entity":"0xYOUR_ADDRESS","amount":500,"reason":"Solar Q1 2025"}'

# Record emission debt
curl -X POST http://localhost:4000/debt \
  -H "Content-Type: application/json" \
  -d '{"entity":"0xANOTHER_ADDRESS","amount":200,"reason":"Factory Jan 2025"}'

# Check net position
curl http://localhost:4000/position/0xYOUR_ADDRESS
```

The frontend dashboard will update live via WebSocket.

---

## Step 4 — Sepolia Testnet Deployment

### 4a. Get test ETH
[https://sepoliafaucet.com](https://sepoliafaucet.com)

### 4b. Configure root `.env`

```bash
cp .env.example .env
```

```
DEPLOYER_PRIVATE_KEY=0x<your_deployer_private_key>
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<YOUR_ALCHEMY_KEY>
ETHERSCAN_API_KEY=<YOUR_ETHERSCAN_KEY>
```

### 4c. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 4d. Verify contracts (optional)

```bash
npx hardhat verify --network sepolia <CARBON_CREDIT_TOKEN_ADDRESS> <admin_address> "https://carbocred.io/meta/{id}.json"
npx hardhat verify --network sepolia <MARKETPLACE_ADDRESS> <token_address> <admin_address>
```

### 4e. Update environment files
Replace all contract addresses in `backend/.env` and `frontend/.env.local` with Sepolia addresses. Update `NEXT_PUBLIC_CHAIN_ID=11155111`.

---

## Architecture Summary

```
                    ┌──────────────────────┐
                    │   Ethereum / Sepolia  │
                    │                      │
                    │  CarbonCreditToken   │  ← ERC-1155 (ID 0 = credits, ID 1 = debt)
                    │  CarbonMarketplace   │  ← ETH-based P2P trading
                    └──────────┬───────────┘
                               │ events / calls
               ┌───────────────┴──────────────┐
               │         Backend (Node.js)      │
               │  ethers.js event listeners     │
               │  WebSocket broadcaster         │
               │  BACKEND_ROLE signer           │
               │  REST API (/award /debt /pos)  │
               └───────────────┬──────────────┘
                               │ ws:// + http://
               ┌───────────────┴──────────────┐
               │       Frontend (Next.js)       │
               │  wagmi + viem                  │
               │  ERC-1155 balance reads        │
               │  List / Buy / Cancel txns      │
               │  Real-time WebSocket feed      │
               └──────────────────────────────┘
```

---

## Token ID Reference

| Token ID | Name | Description | Transferable |
|---|---|---|---|
| 0 | `CREDIT_TOKEN` | Carbon offsets / green energy | ✅ Tradeable |
| 1 | `DEBT_TOKEN` | Emission liabilities (soulbound) | ❌ Locked |

**Net position** = `balanceOf(addr, 0) - balanceOf(addr, 1)` — can be negative.
