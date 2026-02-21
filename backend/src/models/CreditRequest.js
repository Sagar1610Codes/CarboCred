/**
 * models/CreditRequest.js
 *
 * Represents a user's request to earn carbon credits or record debt.
 * Requests begin as PENDING and are minted on-chain only after
 * an admin explicitly approves them via the dashboard.
 */

const mongoose = require('mongoose');

const CreditRequestSchema = new mongoose.Schema(
    {
        entityAddress: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['CREDIT', 'DEBT'],
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        status: {
            type: String,
            enum: ['PENDING', 'APPROVED', 'REJECTED'],
            default: 'PENDING',
        },
        txHash: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }   // adds createdAt + updatedAt automatically
);

// Index for fast pending queries
CreditRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CreditRequest', CreditRequestSchema);
