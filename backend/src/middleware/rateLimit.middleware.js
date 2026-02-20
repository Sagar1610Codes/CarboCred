/**
 * middleware/rateLimit.middleware.js — Rate limiters for API and auth routes.
 * RULES: Rate limiting required on all routes. Stricter limits on auth endpoints.
 */

import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';
import logger from '../utils/logger.js';

const rateLimitHandler = (req, res, next, options) => {
    logger.warn(`Rate limit exceeded: ${req.ip} on ${req.originalUrl}`);
    res.status(options?.statusCode || 429).json({
        success: false,
        message: options?.message || 'Too many requests, please try again later.',
    });
};

/**
 * Global rate limiter applied to all routes.
 */
export const globalRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.',
    handler: rateLimitHandler,
});

/**
 * Stricter rate limiter for authentication endpoints.
 */
export const authRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many authentication attempts, please try again later.',
    handler: rateLimitHandler,
});
