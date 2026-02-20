const { ethers } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
    const [deployer] = await ethers.getSigners();
    const metaURI = "https://carbocred.io/meta/{id}.json";

    const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
    const creditToken = await CarbonCreditToken.deploy(deployer.address, metaURI);
    await creditToken.waitForDeployment();
    const tokenAddress = await creditToken.getAddress();

    const CarbonMarketplace = await ethers.getContractFactory("CarbonMarketplace");
    const marketplace = await CarbonMarketplace.deploy(tokenAddress, deployer.address);
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();

    const MARKETPLACE_ROLE = await creditToken.MARKETPLACE_ROLE();
    await (await creditToken.grantRole(MARKETPLACE_ROLE, marketplaceAddress)).wait();

    const BACKEND_ROLE = await creditToken.BACKEND_ROLE();
    await (await creditToken.grantRole(BACKEND_ROLE, deployer.address)).wait();

    const result = {
        deployer: deployer.address,
        tokenAddress,
        marketplaceAddress,
    };

    fs.writeFileSync("addresses.json", JSON.stringify(result, null, 2));
    process.stdout.write(JSON.stringify(result) + "\n");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
