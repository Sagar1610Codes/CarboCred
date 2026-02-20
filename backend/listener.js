/**
 * backend/listener.js
 *
 * Attaches event listeners to the deployed contracts and relays them via callback.
 */

const { ethers } = require("ethers");
require("dotenv").config();

const CARBON_CREDIT_TOKEN_ABI = [
    "event CreditsAwarded(address indexed entity, uint256 amount, string reason)",
    "event DebtRecorded(address indexed entity, uint256 amount, string reason)",
    "event DebtCleared(address indexed entity, uint256 amount)",
    "event BalanceUpdated(address indexed seller, address indexed buyer, uint256 amount, uint256 sellerCreditBalance, uint256 buyerCreditBalance)",
];

const CARBON_MARKETPLACE_ABI = [
    "event ListingCreated(uint256 indexed id, address indexed seller, uint256 amount, uint256 pricePerCredit)",
    "event ListingCancelled(uint256 indexed id, address indexed seller)",
    "event TradeExecuted(uint256 indexed id, address indexed seller, address indexed buyer, uint256 amount, uint256 totalPrice)",
];

let provider;
let tokenContract;
let marketplaceContract;

function startListeners(onEvent) {
    console.log("[Listener] Attaching event listeners...");

    provider = new ethers.WebSocketProvider(process.env.RPC_URL);

    // Ethers-level error handler
    provider.on("error", (error) => {
        console.error("[Listener] Provider error:", error);
    });

    // The underlying ws library emits a raw Node.js 'error' event BEFORE
    // ethers can handle it. Without a listener, Node kills the process.
    // Attach directly to the raw socket — immediately and again on 'open'.
    const silenceRawWsError = () => {
        const rawWs = provider._websocket ?? provider.websocket;
        if (rawWs && rawWs.listenerCount("error") === 0) {
            rawWs.on("error", (err) => {
                console.error("[Listener] WebSocket error (kept alive):", err.message);
            });
        }
    };
    silenceRawWsError();
    try {
        (provider._websocket ?? provider.websocket)?.once?.("open", silenceRawWsError);
    } catch (_) { }

    tokenContract = new ethers.Contract(
        process.env.CARBON_CREDIT_TOKEN_ADDRESS,
        CARBON_CREDIT_TOKEN_ABI,
        provider
    );

    marketplaceContract = new ethers.Contract(
        process.env.MARKETPLACE_ADDRESS,
        CARBON_MARKETPLACE_ABI,
        provider
    );

    // ── CarbonCreditToken Events ─────────────────────────────────────────────

    tokenContract.on("CreditsAwarded", (entity, amount, reason, event) => {
        onEvent({
            type: "CreditsAwarded",
            entity,
            amount: amount.toString(),
            reason,
            txHash: event.log.transactionHash,
        });
    });

    tokenContract.on("DebtRecorded", (entity, amount, reason, event) => {
        onEvent({
            type: "DebtRecorded",
            entity,
            amount: amount.toString(),
            reason,
            txHash: event.log.transactionHash,
        });
    });

    tokenContract.on("DebtCleared", (entity, amount, event) => {
        onEvent({
            type: "DebtCleared",
            entity,
            amount: amount.toString(),
            txHash: event.log.transactionHash,
        });
    });

    tokenContract.on("BalanceUpdated", (seller, buyer, amount, sBal, bBal, event) => {
        onEvent({
            type: "BalanceUpdated",
            seller,
            buyer,
            amount: amount.toString(),
            sellerBalance: sBal.toString(),
            buyerBalance: bBal.toString(),
            txHash: event.log.transactionHash,
        });
    });

    // ── Marketplace Events ───────────────────────────────────────────────────

    marketplaceContract.on("ListingCreated", (id, seller, amount, price, event) => {
        onEvent({
            type: "ListingCreated",
            id: id.toString(),
            seller,
            amount: amount.toString(),
            pricePerCredit: price.toString(),
            txHash: event.log.transactionHash,
        });
    });

    marketplaceContract.on("ListingCancelled", (id, seller, event) => {
        onEvent({
            type: "ListingCancelled",
            id: id.toString(),
            seller,
            txHash: event.log.transactionHash,
        });
    });

    marketplaceContract.on("TradeExecuted", (id, seller, buyer, amount, total, event) => {
        onEvent({
            type: "TradeExecuted",
            id: id.toString(),
            seller,
            buyer,
            amount: amount.toString(),
            totalPrice: total.toString(),
            txHash: event.log.transactionHash,
        });
    });

    console.log("[Listener] All listeners active ✓");
}

async function stopListeners() {
    console.log("[Listener] Removing listeners...");
    if (tokenContract) tokenContract.removeAllListeners();
    if (marketplaceContract) marketplaceContract.removeAllListeners();
    if (provider) await provider.destroy();
}

module.exports = { startListeners, stopListeners };
