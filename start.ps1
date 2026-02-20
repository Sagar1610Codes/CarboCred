# ============================================================
# CarboCred Startup Script
# Run this ONE script to start the entire local dev stack.
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CarboCred Local Dev Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Kill any stale processes on our ports ────────────────────────────
Write-Host "[1/6] Clearing stale processes..." -ForegroundColor Yellow

@(4000, 3000, 8545) | ForEach-Object {
    $conn = Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $procId = $conn.OwningProcess
        if ($procId -gt 0) {
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Write-Host "   Killed process $procId on port $_"
        }
    }
}
Start-Sleep -Seconds 2

# ── Step 2: Start Hardhat node in a new window ────────────────────────────────
Write-Host "[2/6] Starting Hardhat node..." -ForegroundColor Yellow

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir'; npx hardhat node" -WindowStyle Normal
Start-Sleep -Seconds 5

# ── Step 3: Deploy contracts and capture addresses ────────────────────────────
Write-Host "[3/6] Deploying contracts..." -ForegroundColor Yellow

npx hardhat run scripts/getAddresses.js --network localhost 2>&1 | Out-Null

if (-not (Test-Path "addresses.json")) {
    Write-Host "ERROR: Deployment failed! Check if Hardhat node is running." -ForegroundColor Red
    exit 1
}

$addresses = Get-Content addresses.json | ConvertFrom-Json
$token  = $addresses.tokenAddress
$market = $addresses.marketplaceAddress

Write-Host "   Token:       $token" -ForegroundColor Green
Write-Host "   Marketplace: $market" -ForegroundColor Green

# ── Step 4: Sync .env files ───────────────────────────────────────────────────
Write-Host "[4/6] Syncing .env files..." -ForegroundColor Yellow

$backendEnv = @"
RPC_URL=ws://127.0.0.1:8545
BACKEND_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CARBON_CREDIT_TOKEN_ADDRESS=$token
MARKETPLACE_ADDRESS=$market
PORT=4000
"@
Set-Content -Path "backend\.env" -Value $backendEnv

$frontendEnv = @"
NEXT_PUBLIC_CARBON_CREDIT_TOKEN_ADDRESS=$token
NEXT_PUBLIC_MARKETPLACE_ADDRESS=$market
NEXT_PUBLIC_BACKEND_WS_URL=ws://localhost:4000
NEXT_PUBLIC_CHAIN_ID=31337
"@
Set-Content -Path "frontend\.env" -Value $frontendEnv

Write-Host "   backend/.env updated"
Write-Host "   frontend/.env updated"

# ── Step 5: Start Backend in a new window ────────────────────────────────────
Write-Host "[5/6] Starting Backend server..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\backend'; node index.js" -WindowStyle Normal
Start-Sleep -Seconds 3

# Award test credits to Hardhat Account #0
Write-Host "   Awarding 1000 test credits to Account #0..." -ForegroundColor Cyan
try {
    Invoke-WebRequest -Uri http://localhost:4000/award `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"entity":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","amount":1000,"reason":"Test credits"}' `
        -UseBasicParsing | Out-Null
    Write-Host "   Credits awarded!" -ForegroundColor Green
} catch {
    Write-Host "   Warning: Could not award credits. You can do it later via the API." -ForegroundColor DarkYellow
}

# ── Step 6: Start Frontend in a new window ───────────────────────────────────
Write-Host "[6/6] Starting Frontend..." -ForegroundColor Yellow

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\frontend'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   CarboCred is running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend:   http://localhost:4000" -ForegroundColor Cyan
Write-Host "   Hardhat:   http://127.0.0.1:8545" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Account #0 has 1000 test credits and 10,000 ETH" -ForegroundColor Green
Write-Host "   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   IMPORTANT: Always use THIS script to start the app." -ForegroundColor Yellow
Write-Host "   IMPORTANT: Reset MetaMask account after each restart." -ForegroundColor Yellow
Write-Host ""
