/**
 * models/Project.model.js — Carbon reduction project submitted by users.
 * RULES: timestamps, indexes, lean() for reads. Status drives workflow.
 */

import mongoose from 'mongoose';

import { PROJECT_STATUS } from '../constants/events.js';

const projectSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Project owner is required'],
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Project name is required'],
            trim: true,
            maxlength: [200, 'Project name cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Project description is required'],
            maxlength: [5000, 'Description cannot exceed 5000 characters'],
        },
        location: {
            country: { type: String, required: true, trim: true },
            region: { type: String, trim: true },
            coordinates: {
                lat: { type: Number },
                lng: { type: Number },
            },
        },
        methodology: {
            type: String,
            required: [true, 'Carbon reduction methodology is required'],
            trim: true,
        },
        estimatedAnnualCredits: {
            type: Number,
            required: [true, 'Estimated annual credits are required'],
            min: [1, 'Credits must be at least 1'],
        },
        status: {
            type: String,
            enum: Object.values(PROJECT_STATUS),
            default: PROJECT_STATUS.PENDING,
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
            maxlength: [1000, 'Rejection reason cannot exceed 1000 characters'],
        },
        // On-chain reference (set when project is registered on blockchain)
        onChainProjectId: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ 'location.country': 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
