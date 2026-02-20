/**
 * app.js — Express application factory.
 * Applies all global middleware; mounts route handlers.
 * RULES: Helmet + CORS + rate limiting required. No business logic here.
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { globalRateLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { env } from './config/env.js';
import router from './routes/index.js';
import logger from './utils/logger.js';

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — allowlist only ────────────────────────────────────────────────────
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
};
app.use(cors(corsOptions));

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Global rate limiter ──────────────────────────────────────────────────────
app.use(globalRateLimiter);

// ── Health check (public) ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ── 404 + Error handlers (must be last) ─────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
