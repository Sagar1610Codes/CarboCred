const { ethers } = require("hardhat");
require("dotenv").config();

/**
 * Deployment script for the CarboCred ecosystem (ERC-1155 edition).
 *
 * Execution order:
 *   1. Deploy CarbonCreditToken   (ERC-1155 — the single source of truth)
 *   2. Deploy CarbonMarketplace   (pass CarbonCreditToken address)
 *   3. Grant MARKETPLACE_ROLE     to CarbonMarketplace in CarbonCreditToken
 *   4. Grant BACKEND_ROLE         to the trusted backend wallet
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 *   npx hardhat run scripts/deploy.js --network sepolia
 */
async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);
    console.log(
        "Deployer balance:",
        ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
        "ETH\n"
    );

    // Metadata URI for ERC-1155 token JSON
    // Token 0 → https://carbocred.io/meta/0.json  (CREDIT_TOKEN)
    // Token 1 → https://carbocred.io/meta/1.json  (DEBT_TOKEN)
    const metaURI = process.env.TOKEN_META_URI || "https://carbocred.io/meta/{id}.json";

    // ── Step 1: Deploy CarbonCreditToken (ERC-1155) ───────────────────────────
    console.log("[1/4] Deploying CarbonCreditToken (ERC-1155)...");
    const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
    const creditToken = await CarbonCreditToken.deploy(deployer.address, metaURI);
    await creditToken.waitForDeployment();
    const tokenAddress = await creditToken.getAddress();
    console.log("      CarbonCreditToken deployed to:", tokenAddress);

    // ── Step 2: Deploy CarbonMarketplace ──────────────────────────────────────
    console.log("\n[2/4] Deploying CarbonMarketplace...");
    const CarbonMarketplace = await ethers.getContractFactory("CarbonMarketplace");
    const marketplace = await CarbonMarketplace.deploy(tokenAddress, deployer.address);
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("      CarbonMarketplace deployed to:", marketplaceAddress);

    // ── Step 3: Grant MARKETPLACE_ROLE ────────────────────────────────────────
    console.log("\n[3/4] Granting MARKETPLACE_ROLE to CarbonMarketplace...");
    const MARKETPLACE_ROLE = await creditToken.MARKETPLACE_ROLE();
    const tx1 = await creditToken.grantRole(MARKETPLACE_ROLE, marketplaceAddress);
    await tx1.wait();
    console.log("      MARKETPLACE_ROLE granted.");

    // ── Step 4: Grant BACKEND_ROLE ────────────────────────────────────────────
    const backendWallet = process.env.BACKEND_WALLET_ADDRESS || deployer.address;
    console.log("\n[4/4] Granting BACKEND_ROLE to:", backendWallet);
    const BACKEND_ROLE = await creditToken.BACKEND_ROLE();
    const tx2 = await creditToken.grantRole(BACKEND_ROLE, backendWallet);
    await tx2.wait();
    console.log("      BACKEND_ROLE granted.");

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log("\n=========================================");
    console.log("  Deployment complete!");
    console.log("=========================================");
    console.log("  CarbonCreditToken  :", tokenAddress);
    console.log("  CarbonMarketplace  :", marketplaceAddress);
    console.log("  Backend wallet     :", backendWallet);
    console.log("\nAdd these to your .env files:");
    console.log(`  CARBON_CREDIT_TOKEN_ADDRESS=${tokenAddress}`);
    console.log(`  MARKETPLACE_ADDRESS=${marketplaceAddress}`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
