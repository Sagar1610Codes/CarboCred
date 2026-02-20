/**
 * utils/logger.js — Winston structured logger.
 * RULES: Use this logger throughout. Never use console.log in production code.
 */

import { createLogger, format, transports } from 'winston';

import { env } from '../config/env.js';

const { combine, timestamp, errors, json, colorize, printf } = format;

const devFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp: ts, stack }) => {
        return stack
            ? `${ts} [${level}]: ${message}\n${stack}`
            : `${ts} [${level}]: ${message}`;
    }),
);

const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json(),
);

const logger = createLogger({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
    transports: [
        new transports.Console(),
        new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: prodFormat,
        }),
        new transports.File({
            filename: 'logs/combined.log',
            format: prodFormat,
        }),
    ],
    exceptionHandlers: [new transports.File({ filename: 'logs/exceptions.log' })],
    rejectionHandlers: [new transports.File({ filename: 'logs/rejections.log' })],
});

export default logger;
