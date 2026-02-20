/**
 * models/Transaction.model.js — Indexed log of all on-chain credit movements.
 * RULES: Created ONLY by the event indexer from confirmed blockchain events.
 * Unique txHash prevents duplicate inserts. Never manually insert.
 */

import mongoose from 'mongoose';

import { CREDIT_EVENT_TYPES } from '../constants/events.js';

const transactionSchema = new mongoose.Schema(
    {
        // Event classification
        type: {
            type: String,
            enum: Object.values(CREDIT_EVENT_TYPES),
            required: true,
            index: true,
        },
        // On-chain identifiers
        txHash: {
            type: String,
            required: true,
            unique: true, // 🚨 Prevents duplicate inserts
        },
        blockNumber: {
            type: Number,
            required: true,
            index: true,
        },
        logIndex: {
            type: Number,
            required: true,
        },
        // Parties
        from: {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
        },
        to: {
            type: String,
            lowercase: true,
            trim: true,
            index: true,
        },
        // Credit details
        onChainProjectId: {
            type: String,
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [1, 'Amount must be positive'],
        },
        // Cross-references
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            index: true,
        },
        // For RETIRE events
        retirementReason: {
            type: String,
            maxlength: [500, 'Reason too long'],
        },
    },
    { timestamps: true },
);

// ── Compound indexes for common query patterns ───────────────────────────
transactionSchema.index({ txHash: 1 }, { unique: true });
transactionSchema.index({ to: 1, type: 1, createdAt: -1 });
transactionSchema.index({ from: 1, type: 1, createdAt: -1 });
transactionSchema.index({ onChainProjectId: 1, type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
export default Transaction;
