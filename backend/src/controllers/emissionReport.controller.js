/**
 * controllers/emissionReport.controller.js — Thin controller for emission report routes.
 * RULES: No business logic. asyncHandler. ApiResponse only.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as reportService from '../services/emissionReport.service.js';

export const submitReport = asyncHandler(async (req, res) => {
    const report = await reportService.submitReport(req.user._id, req.body);
    res.status(201).json(new ApiResponse(201, report, 'Emission report submitted'));
});

export const listReports = asyncHandler(async (req, res) => {
    const result = await reportService.listReports(req.query);
    res.status(200).json(new ApiResponse(200, result, 'Reports retrieved'));
});

export const verifyReport = asyncHandler(async (req, res) => {
    const report = await reportService.verifyReport(req.params.id, req.user._id, req.body);
    res.status(200).json(new ApiResponse(200, report, 'Report verification processed'));
});
