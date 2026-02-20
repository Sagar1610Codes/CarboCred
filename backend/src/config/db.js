/**
 * config/db.js — MongoDB connection with retry logic.
 * RULES: Use logger, not console. Connection is established once at boot.
 */

import mongoose from 'mongoose';

import { env } from './env.js';
import logger from '../utils/logger.js';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

export const connectDB = async () => {
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            await mongoose.connect(env.MONGO_URI, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
            logger.info('✅ MongoDB connected successfully');
            return;
        } catch (error) {
            attempt += 1;
            logger.error(`MongoDB connection attempt ${attempt} failed: ${error.message}`);
            if (attempt < MAX_RETRIES) {
                logger.info(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
                await sleep(RETRY_DELAY_MS);
            }
        }
    }

    logger.error('FATAL: Could not connect to MongoDB after max retries. Exiting.');
    process.exit(1);
};

// ── Handle post-connection events ──────────────────────────────────────────
mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err.message}`);
});
