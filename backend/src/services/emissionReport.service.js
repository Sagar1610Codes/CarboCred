/**
 * services/emissionReport.service.js — Emission report submission and verification.
 * 🚨 CRITICAL: Minting ONLY happens after report status === 'VERIFIED'.
 * RULES: Business logic in service. Blockchain issues credits post-verification.
 */

import EmissionReport from '../models/EmissionReport.model.js';
import Project from '../models/Project.model.js';
import User from '../models/User.model.js';
import { REPORT_STATUS, PROJECT_STATUS } from '../constants/events.js';
import { issueCreditsOnChain } from './blockchain.service.js';
import ApiError from '../utils/ApiError.js';
import { paginate } from '../utils/pagination.js';
import logger from '../utils/logger.js';

/**
 * Submit a new emission reduction report for a project.
 */
export const submitReport = async (submitterId, reportData) => {
    try {
        const project = await Project.findById(reportData.projectId).lean();
        if (!project) { throw ApiError.notFound('Project not found'); }

        if (project.status !== PROJECT_STATUS.ACTIVE && project.status !== PROJECT_STATUS.VERIFIED) {
            throw ApiError.badRequest('Reports can only be submitted for Active or Verified projects');
        }

        const report = await EmissionReport.create({
            project: project._id,
            submittedBy: submitterId,
            ...reportData,
        });

        logger.info(`Emission report submitted: ${report._id} for project ${project._id}`);
        return report;
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to submit report: ${error.message}`);
    }
};

/**
 * List paginated reports with optional status filter.
 */
export const listReports = async (query) => {
    try {
        const filter = {};
        if (query.status) { filter.status = query.status; }
        if (query.projectId) { filter.project = query.projectId; }

        return paginate(
            query,
            (skip, limit) =>
                EmissionReport.find(filter)
                    .populate('project', 'name onChainProjectId')
                    .populate('submittedBy', 'name email')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
            () => EmissionReport.countDocuments(filter),
        );
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to list reports: ${error.message}`);
    }
};

/**
 * Verifier approves or rejects an emission report.
 * 🚨 CRITICAL: If approved (VERIFIED), trigger on-chain minting IMMEDIATELY.
 */
export const verifyReport = async (reportId, verifierId, { status, rejectionReason }) => {
    try {
        const report = await EmissionReport.findById(reportId).populate('project');
        if (!report) { throw ApiError.notFound('Emission report not found'); }

        if (report.status !== REPORT_STATUS.SUBMITTED && report.status !== REPORT_STATUS.UNDER_REVIEW) {
            throw ApiError.badRequest(`Report is already in "${report.status}" state`);
        }

        report.status = status;
        report.verifiedBy = verifierId;
        report.verifiedAt = new Date();

        if (status === REPORT_STATUS.REJECTED) {
            report.rejectionReason = rejectionReason;
            await report.save();
            logger.info(`Report ${reportId} rejected by ${verifierId}`);
            return report;
        }

        // 🚨 CRITICAL: Only mint if status is VERIFIED
        if (status === REPORT_STATUS.VERIFIED) {
            return mintCreditsForReport(report, verifierId);
        }

        await report.save();
        return report;
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to verify report: ${error.message}`);
    }
};

/**
 * Internal — mint credits on-chain after verification.
 * Separated for clarity and testability.
 */
const mintCreditsForReport = async (report, verifierId) => {
    const project = report.project;
    if (!project.onChainProjectId) {
        throw ApiError.badRequest('Project does not have an on-chain ID. Cannot mint credits.');
    }

    const submitter = await User.findById(report.submittedBy).lean();
    if (!submitter?.walletAddress) {
        throw ApiError.badRequest('Submitter does not have a registered wallet address');
    }

    const { txHash, blockNumber } = await issueCreditsOnChain(
        submitter.walletAddress,
        project.onChainProjectId,
        report.creditsRequested,
        report._id.toString(),
    );

    report.mintTxHash = txHash;
    report.creditsIssued = report.creditsRequested;
    report.verifiedBy = verifierId;
    await report.save();

    logger.info(
        `Credits minted for report ${report._id}: ${report.creditsRequested} credits, tx=${txHash}, block=${blockNumber}`,
    );
    return report;
};
