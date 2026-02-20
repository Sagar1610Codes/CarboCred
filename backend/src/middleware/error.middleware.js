/**
 * middleware/error.middleware.js — Global error handler + 404 handler.
 * RULES: Must be the last middleware. Logs all errors. Hides stack in production.
 */

import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Catch-all 404 handler.
 */
export const notFound = (req, _res, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Global error handler — converts all errors to JSON responses.
 * Handles Mongoose validation errors, CastErrors, and duplicate key errors.
 */
export const errorHandler = (err, req, res, _next) => {
    let error = err;

    // ── Mongoose CastError (invalid ObjectId) ───────────────────────────────
    if (err.name === 'CastError') {
        error = ApiError.badRequest(`Invalid ID format: ${err.value}`);
    }

    // ── Mongoose ValidationError ────────────────────────────────────────────
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));
        error = ApiError.badRequest('Validation failed', errors);
    }

    // ── MongoDB duplicate key error ──────────────────────────────────────────
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        error = ApiError.conflict(`Duplicate value for ${field}`);
    }

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    logger.error({
        message,
        statusCode,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?._id,
        stack: env.NODE_ENV !== 'production' ? error.stack : undefined,
    });

    res.status(statusCode).json({
        success: false,
        message,
        errors: error.errors || [],
        ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
    });
};
