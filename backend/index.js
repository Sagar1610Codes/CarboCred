/**
 * index.js — CarboCred Backend Server
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────┐
 *   │  Ethereum RPC (Alchemy/Infura WSS)              │
 *   │         ↓  contract events                      │
 *   │  listener.js  ──→  broadcast()                  │
 *   │                        ↓                        │
 *   │  WebSocket Server  (ws://:4000)                 │
 *   │    → all connected frontend clients             │
 *   │                                                 │
 *   │  HTTP REST API  (http://:4000)                  │
 *   │    GET /position/:address   → on-chain read     │
 *   │    POST /award              → BACKEND_ROLE tx   │
 *   │    POST /debt               → BACKEND_ROLE tx   │
 *   │    POST /clear-debt         → BACKEND_ROLE tx   │
 *   └─────────────────────────────────────────────────┘
 *
 * No mutable state is stored locally for balances.
 * All reads go directly to the blockchain.
 */

require("dotenv").config();
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const { startListeners, stopListeners } = require("./listener");
const { awardCredits, recordDebt, clearDebt, getNetCredits } = require("./signer");
const { ethers } = require("ethers");

const PORT = process.env.PORT || 4000;

// ── Express HTTP server ───────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
app.use(express.json());

// Allow frontend dev server (localhost:3000) during development
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    next();
});

// ── WebSocket server ──────────────────────────────────────────────────────
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on("connection", (ws, req) => {
    clients.add(ws);
    console.log(`[WS] Client connected. Total: ${clients.size}`);

    ws.send(JSON.stringify({ type: "connected", message: "CarboCred live feed active" }));

    ws.on("close", () => {
        clients.delete(ws);
        console.log(`[WS] Client disconnected. Total: ${clients.size}`);
    });
});

/**
 * Broadcast a parsed blockchain event to all connected WebSocket clients.
 * @param {object} eventData  Structured event object from listener.js.
 */
function broadcast(eventData) {
    const payload = JSON.stringify(eventData);
    for (const client of clients) {
        if (client.readyState === 1 /* OPEN */) {
            client.send(payload);
        }
    }
}

// ── REST API ──────────────────────────────────────────────────────────────

/**
 * GET /position/:address
 * Read the on-chain credit/debt position of an entity.
 * Returns: { credits, debt, netCredits }
 * No local database — reads directly from CarbonCreditToken.
 */
app.get("/position/:address", async (req, res) => {
    try {
        const { address } = req.params;
        if (!ethers.isAddress(address)) {
            return res.status(400).json({ error: "Invalid Ethereum address" });
        }

        const { ethers: eth } = require("ethers");
        const CREDIT_TOKEN_ABI = [
            "function getPosition(address) view returns (uint256 credits, uint256 debt)",
            "function netCredits(address) view returns (int256)",
        ];
        const { provider } = require("./signer");
        const contract = new eth.Contract(
            process.env.CARBON_CREDIT_TOKEN_ADDRESS,
            CREDIT_TOKEN_ABI,
            provider
        );

        const [credits, debt] = await contract.getPosition(address);
        const net = await contract.netCredits(address);

        res.json({
            address,
            credits: credits.toString(),
            debt: debt.toString(),
            netCredits: net.toString(),
        });
    } catch (err) {
        console.error("[API] /position error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /award
 * Award green energy credits to an entity (BACKEND_ROLE required).
 * Body: { entity: string, amount: number, reason: string }
 */
app.post("/award", async (req, res) => {
    try {
        const { entity, amount, reason } = req.body;
        if (!entity || !amount || !reason) {
            return res.status(400).json({ error: "entity, amount, reason required" });
        }
        const receipt = await awardCredits(entity, BigInt(amount), reason);
        res.json({ success: true, txHash: receipt.hash });
    } catch (err) {
        console.error("[API] /award error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /debt
 * Record emission debt against an entity (BACKEND_ROLE required).
 * Body: { entity: string, amount: number, reason: string }
 */
app.post("/debt", async (req, res) => {
    try {
        const { entity, amount, reason } = req.body;
        if (!entity || !amount || !reason) {
            return res.status(400).json({ error: "entity, amount, reason required" });
        }
        const receipt = await recordDebt(entity, BigInt(amount), reason);
        res.json({ success: true, txHash: receipt.hash });
    } catch (err) {
        console.error("[API] /debt error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /clear-debt
 * Clear emission debt after an entity retires purchased credits.
 * Body: { entity: string, amount: number }
 */
app.post("/clear-debt", async (req, res) => {
    try {
        const { entity, amount } = req.body;
        if (!entity || !amount) {
            return res.status(400).json({ error: "entity, amount required" });
        }
        const receipt = await clearDebt(entity, BigInt(amount));
        res.json({ success: true, txHash: receipt.hash });
    } catch (err) {
        console.error("[API] /clear-debt error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ── Health check ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Start ─────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log(`\n🌿 CarboCred backend running`);
    console.log(`   HTTP  → http://localhost:${PORT}`);
    console.log(`   WS    → ws://localhost:${PORT}\n`);
    startListeners(broadcast);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
    console.log("[Server] Shutting down...");
    await stopListeners();
    server.close();
});
