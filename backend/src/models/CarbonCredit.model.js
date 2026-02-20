/**
 * models/CarbonCredit.model.js — Indexed cache of issued carbon credits.
 * RULES: This is a CACHE only. Live balance must be fetched from blockchain.
 * Created by the event indexer when CreditIssued events are observed.
 */

import mongoose from 'mongoose';

const carbonCreditSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true,
            index: true,
        },
        report: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'EmissionReport',
        },
        // On-chain project ID (maps to smart contract's projectId)
        onChainProjectId: {
            type: String,
            required: true,
            index: true,
        },
        issuedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        walletAddress: {
            type: String,
            required: true,
            lowercase: true,
        },
        amount: {
            type: Number,
            required: true,
            min: [1, 'Amount must be at least 1'],
        },
        vintage: {
            type: Number, // Year of carbon credit vintage
            required: true,
        },
        // Blockchain provenance
        txHash: {
            type: String,
            required: true,
            unique: true,
        },
        blockNumber: {
            type: Number,
            required: true,
        },
        isRetired: {
            type: Boolean,
            default: false,
            index: true,
        },
        retiredAt: {
            type: Date,
        },
        retirementTxHash: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────
carbonCreditSchema.index({ onChainProjectId: 1, issuedTo: 1 });
carbonCreditSchema.index({ walletAddress: 1, isRetired: 1 });
carbonCreditSchema.index({ txHash: 1 }, { unique: true });

const CarbonCredit = mongoose.model('CarbonCredit', carbonCreditSchema);
export default CarbonCredit;
