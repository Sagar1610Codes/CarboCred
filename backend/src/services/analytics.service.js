/**
 * services/analytics.service.js — Platform-wide analytics via MongoDB aggregation.
 * RULES: Use aggregation pipelines. Lean queries. Pagination.
 */

import Transaction from '../models/Transaction.model.js';
import Project from '../models/Project.model.js';
import { CREDIT_EVENT_TYPES } from '../constants/events.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Platform-wide summary statistics.
 */
export const getPlatformSummary = async () => {
    try {
        const [projectStats, creditStats, transactionStats] = await Promise.all([
            Project.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Transaction.aggregate([
                { $match: { type: CREDIT_EVENT_TYPES.ISSUE } },
                { $group: { _id: null, totalIssued: { $sum: '$amount' } } },
            ]),
            Transaction.aggregate([
                { $match: { type: CREDIT_EVENT_TYPES.RETIRE } },
                { $group: { _id: null, totalRetired: { $sum: '$amount' } } },
            ]),
        ]);

        const projectsByStatus = projectStats.reduce((acc, { _id, count }) => {
            acc[_id] = count;
            return acc;
        }, {});

        return {
            projects: projectsByStatus,
            credits: {
                totalIssued: creditStats[0]?.totalIssued || 0,
                totalRetired: transactionStats[0]?.totalRetired || 0,
                netCirculating: (creditStats[0]?.totalIssued || 0) - (transactionStats[0]?.totalRetired || 0),
            },
        };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to get platform summary: ${error.message}`);
    }
};

/**
 * Credits issued over time (monthly trend).
 */
export const getCreditIssuanceTrend = async (months = 12) => {
    try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        const trend = await Transaction.aggregate([
            { $match: { type: CREDIT_EVENT_TYPES.ISSUE, createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
                    totalIssued: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    totalIssued: 1,
                    count: 1,
                },
            },
        ]);

        return { trend, periodMonths: months };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to get issuance trend: ${error.message}`);
    }
};

/**
 * Top projects by credits issued.
 */
export const getTopProjectsByCredits = async (limit = 10) => {
    try {
        const results = await Transaction.aggregate([
            { $match: { type: CREDIT_EVENT_TYPES.ISSUE } },
            { $group: { _id: '$onChainProjectId', totalIssued: { $sum: '$amount' }, txCount: { $sum: 1 } } },
            { $sort: { totalIssued: -1 } },
            { $limit: limit },
        ]);

        logger.info(`Top ${limit} projects by credits fetched`);
        return results;
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to get top projects: ${error.message}`);
    }
};

/**
 * Retirement analytics by project.
 */
export const getRetirementAnalytics = async () => {
    try {
        const results = await Transaction.aggregate([
            { $match: { type: CREDIT_EVENT_TYPES.RETIRE } },
            {
                $group: {
                    _id: '$onChainProjectId',
                    totalRetired: { $sum: '$amount' },
                    retirements: { $sum: 1 },
                    firstRetirement: { $min: '$createdAt' },
                    lastRetirement: { $max: '$createdAt' },
                },
            },
            { $sort: { totalRetired: -1 } },
        ]);

        return results;
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to get retirement analytics: ${error.message}`);
    }
};
