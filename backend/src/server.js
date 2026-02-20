/**
 * server.js — Application entry point.
 * Connects to DB, starts blockchain event listener, then binds HTTP server.
 * RULES: No business logic. Graceful shutdown required.
 */

import 'dotenv/config';

import http from 'http';

import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';
import { startBlockchainListener } from './listeners/blockchain.listener.js';

const PORT = env.PORT;

const startServer = async () => {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Start blockchain event indexer (auto-starts on boot)
    // Non-blocking: don't await so the API server can start even if RPC/blockchain is down
    startBlockchainListener().catch((err) => {
        logger.error(`[Indexer] Failed to start blockchain listener: ${err.message}`);
    });

    // 3. Create HTTP server and listen
    const server = http.createServer(app);

    server.listen(PORT, () => {
        logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
    });

    // ── Graceful shutdown ──────────────────────────────────────────────────────
    const gracefulShutdown = (signal) => {
        logger.info(`${signal} received. Shutting down gracefully...`);
        server.close(() => {
            logger.info('HTTP server closed.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // ── Unhandled rejection guard ──────────────────────────────────────────────
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled Promise Rejection:', reason);
        server.close(() => process.exit(1));
    });
};

startServer();
