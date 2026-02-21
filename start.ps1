# ============================================================
# CarboCred Startup Script
# ============================================================

Write-Host ""
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "   CarboCred Local Dev Startup"           -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

#  1. Kill stale processes 
Write-Host "[1/6] Clearing stale processes..." -ForegroundColor Yellow
@(4000, 3000, 8545) | ForEach-Object {
    $port = $_
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conns) {
        $conns | ForEach-Object {
            if ($_.OwningProcess -gt 4) {
                Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "   Killed PID $($_.OwningProcess) on port $port"
            }
        }
    }
}
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
if (Test-Path "$ROOT\addresses.json") { Remove-Item "$ROOT\addresses.json" -Force }
Start-Sleep -Seconds 2

#  2. Start Hardhat node 
Write-Host "[2/6] Starting Hardhat node..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$ROOT'; npx hardhat node" -WindowStyle Normal
Write-Host "   Waiting for port 8545..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Get-NetTCPConnection -LocalPort 8545 -State Listen -ErrorAction SilentlyContinue) {
        $ready = $true
        Write-Host "   Hardhat ready! (${i}s)" -ForegroundColor Green
        break
    }
}
if (-not $ready) {
    Write-Host "ERROR: Hardhat did not start in 30s." -ForegroundColor Red
    exit 1
}
Start-Sleep -Seconds 2

#  3. Deploy contracts 
Write-Host "[3/6] Deploying contracts..." -ForegroundColor Yellow
npx hardhat run scripts/getAddresses.js --network localhost
if (-not (Test-Path "$ROOT\addresses.json")) {
    Write-Host "ERROR: Deployment failed." -ForegroundColor Red
    exit 1
}
$addr = Get-Content "$ROOT\addresses.json" | ConvertFrom-Json
$tok = $addr.tokenAddress
$mkt = $addr.marketplaceAddress
Write-Host "   Token:       $tok"  -ForegroundColor Green
Write-Host "   Marketplace: $mkt" -ForegroundColor Green

#  4. Sync .env files 
Write-Host "[4/6] Syncing .env files..." -ForegroundColor Yellow
$bEnv  = "RPC_URL=ws://127.0.0.1:8545`n"
$bEnv += "BACKEND_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`n"
$bEnv += "CARBON_CREDIT_TOKEN_ADDRESS=$tok`n"
$bEnv += "MARKETPLACE_ADDRESS=$mkt`n"
$bEnv += "PORT=4000`n"
$bEnv += "MONGO_URI=mongodb+srv://kasshan:Kasshan%402006@cluster0.vpcmj3u.mongodb.net/carbocred"
Set-Content -Path "$ROOT\backend\.env" -Value $bEnv
$fEnv  = "VITE_CARBON_CREDIT_TOKEN_ADDRESS=$tok`n"
$fEnv += "VITE_MARKETPLACE_ADDRESS=$mkt`n"
$fEnv += "VITE_BACKEND_WS_URL=ws://localhost:4000`n"
$fEnv += "VITE_CHAIN_ID=31337"
Set-Content -Path "$ROOT\frontend\.env" -Value $fEnv
Write-Host "   backend/.env  updated"
Write-Host "   frontend/.env updated"

#  5. Start Backend 
Write-Host "[5/6] Starting Backend server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$ROOT\backend'; node index.js" -WindowStyle Normal
Write-Host "   Waiting for port 4000..."
$bReady = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 1
    if (Get-NetTCPConnection -LocalPort 4000 -State Listen -ErrorAction SilentlyContinue) {
        $bReady = $true
        Write-Host "   Backend ready! (${i}s)" -ForegroundColor Green
        break
    }
}
try {
    Invoke-WebRequest -Uri http://localhost:4000/award -Method POST -ContentType "application/json" `
        -Body '{"entity":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266","amount":1000,"reason":"Test credits"}' `
        -UseBasicParsing | Out-Null
    Write-Host "   1000 credits awarded to Account #0!" -ForegroundColor Green
} catch {
    Write-Host "   Credits: Award failed, do it via API later." -ForegroundColor DarkYellow
}

#  6. Start Frontend 
Write-Host "[6/6] Starting Frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit","-Command","cd '$ROOT\frontend'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

#  Done 
Write-Host ""
Write-Host "========================================"  -ForegroundColor Green
Write-Host "   CarboCred is running!"                 -ForegroundColor Green
Write-Host "========================================"  -ForegroundColor Green
Write-Host ""
Write-Host "   Frontend:  http://localhost:3000"  -ForegroundColor Cyan
Write-Host "   Backend:   http://localhost:4000"  -ForegroundColor Cyan
Write-Host "   Hardhat:   http://127.0.0.1:8545" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Account #0: 1000 credits, 10000 ETH"                                    -ForegroundColor Green
Write-Host "   PK: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" -ForegroundColor DarkGray
Write-Host ""
Write-Host "   IMPORTANT: Always use THIS script to start the app." -ForegroundColor Yellow
Write-Host "   IMPORTANT: Reset MetaMask account after each restart." -ForegroundColor Yellow
Write-Host ""
