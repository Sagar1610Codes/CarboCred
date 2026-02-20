/**
 * controllers/analytics.controller.js — Analytics endpoints controller.
 * RULES: No business logic. asyncHandler. Delegates to analytics service.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as analyticsService from '../services/analytics.service.js';

export const getPlatformSummary = asyncHandler(async (_req, res) => {
    const summary = await analyticsService.getPlatformSummary();
    res.status(200).json(new ApiResponse(200, summary, 'Platform summary retrieved'));
});

export const getCreditIssuanceTrend = asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months || '12', 10);
    const trend = await analyticsService.getCreditIssuanceTrend(months);
    res.status(200).json(new ApiResponse(200, trend, 'Issuance trend retrieved'));
});

export const getTopProjects = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit || '10', 10);
    const results = await analyticsService.getTopProjectsByCredits(limit);
    res.status(200).json(new ApiResponse(200, results, 'Top projects retrieved'));
});

export const getRetirementAnalytics = asyncHandler(async (_req, res) => {
    const results = await analyticsService.getRetirementAnalytics();
    res.status(200).json(new ApiResponse(200, results, 'Retirement analytics retrieved'));
});
