/**
 * validators/auth.validator.js — Joi schemas for authentication routes.
 * RULES: All inputs validated before reaching controllers.
 */

import Joi from 'joi';

export const registerSchema = Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
        'string.min': 'Name must be at least 2 characters',
        'any.required': 'Name is required',
    }),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().min(8).max(128).required().messages({
        'string.min': 'Password must be at least 8 characters',
    }),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string().required(),
});

export const walletNonceSchema = Joi.object({
    walletAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required()
        .messages({ 'string.pattern.base': 'Invalid Ethereum wallet address' }),
});

export const walletLoginSchema = Joi.object({
    walletAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required(),
    signature: Joi.string().required(),
});
