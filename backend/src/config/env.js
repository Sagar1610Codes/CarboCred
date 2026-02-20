/**
 * config/env.js — Centralised environment variable access.
 * RULES: All env vars accessed through this module. Never use process.env.X inline.
 */

const required = (name) => {
    const value = process.env[name];
    if (!value) {
        console.error(`FATAL: Missing required environment variable: ${name}`);
        process.exit(1);
    }
    return value;
};

export const env = {
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',

    MONGO_URI: required('MONGO_URI'),

    JWT_SECRET: required('JWT_SECRET'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

    RPC_URL: required('RPC_URL'),
    PRIVATE_KEY: required('PRIVATE_KEY'),
    CONTRACT_ADDRESS: required('CONTRACT_ADDRESS'),

    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10', 10),

    BLOCK_CONFIRMATIONS: parseInt(process.env.BLOCK_CONFIRMATIONS || '2', 10),
    EVENT_POLL_INTERVAL_MS: parseInt(process.env.EVENT_POLL_INTERVAL_MS || '15000', 10),
    START_BLOCK: parseInt(process.env.START_BLOCK || '0', 10),
};
