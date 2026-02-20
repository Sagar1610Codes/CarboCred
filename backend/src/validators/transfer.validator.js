/**
 * validators/transfer.validator.js — Joi schemas for credit transfer routes.
 */

import Joi from 'joi';

export const transferCreditsSchema = Joi.object({
    toWalletAddress: Joi.string()
        .pattern(/^0x[a-fA-F0-9]{40}$/)
        .required()
        .messages({ 'string.pattern.base': 'Invalid Ethereum wallet address' }),
    onChainProjectId: Joi.string().trim().required(),
    amount: Joi.number().integer().min(1).required(),
});

export const retireCreditsSchema = Joi.object({
    onChainProjectId: Joi.string().trim().required(),
    amount: Joi.number().integer().min(1).required(),
    reason: Joi.string().trim().min(5).max(500).required(),
});
