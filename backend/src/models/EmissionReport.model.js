/**
 * models/EmissionReport.model.js — Emission reduction report for a project.
 * 🚨 CRITICAL RULE: Minting carbon credits ONLY happens when status === 'VERIFIED'.
 * RULES: timestamps, indexes. verifiedBy and txHash tracked.
 */

import mongoose from 'mongoose';

import { REPORT_STATUS } from '../constants/events.js';

const emissionReportSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: [true, 'Project reference is required'],
            index: true,
        },
        submittedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Submitter reference is required'],
            index: true,
        },
        reportingPeriod: {
            startDate: { type: Date, required: true },
            endDate: { type: Date, required: true },
        },
        emissionsReduced: {
            type: Number,
            required: [true, 'Emissions reduced (tCO2e) is required'],
            min: [0.001, 'Must be a positive value'],
        },
        creditsRequested: {
            type: Number,
            required: [true, 'Credits requested is required'],
            min: [1, 'Must request at least 1 credit'],
        },
        methodology: {
            type: String,
            required: true,
            maxlength: [2000, 'Methodology description too long'],
        },
        documentation: [
            {
                fileName: String,
                fileUrl: String,
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
        status: {
            type: String,
            enum: Object.values(REPORT_STATUS),
            default: REPORT_STATUS.SUBMITTED,
            index: true,
        },
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        verifiedAt: {
            type: Date,
        },
        rejectionReason: {
            type: String,
            maxlength: [1000, 'Rejection reason too long'],
        },
        // Set after successful minting on blockchain
        mintTxHash: {
            type: String,
            unique: true,
            sparse: true,
        },
        creditsIssued: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true },
);

// ── Indexes ──────────────────────────────────────────────────────────────
emissionReportSchema.index({ project: 1, status: 1 });
emissionReportSchema.index({ submittedBy: 1, createdAt: -1 });
emissionReportSchema.index({ mintTxHash: 1 }, { unique: true, sparse: true });

const EmissionReport = mongoose.model('EmissionReport', emissionReportSchema);
export default EmissionReport;
