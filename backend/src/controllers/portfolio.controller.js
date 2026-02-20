/**
 * controllers/portfolio.controller.js — Live portfolio and transaction history.
 * RULES: No business logic. asyncHandler. Delegates to portfolio service.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as portfolioService from '../services/portfolio.service.js';

/**
 * GET /portfolio — Get the authenticated user's live on-chain portfolio.
 * 🚨 RULE: Balance fetched from blockchain, not DB.
 */
export const getMyPortfolio = asyncHandler(async (req, res) => {
    if (!req.user.walletAddress) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, 'No wallet address associated with your account'));
    }
    const portfolio = await portfolioService.getPortfolio(req.user.walletAddress);
    return res.status(200).json(new ApiResponse(200, portfolio, 'Live portfolio retrieved'));
});

/**
 * GET /portfolio/transactions — Paginated transaction history for the user's wallet.
 */
export const getTransactionHistory = asyncHandler(async (req, res) => {
    if (!req.user.walletAddress) {
        return res
            .status(400)
            .json(new ApiResponse(400, null, 'No wallet address associated with your account'));
    }
    const result = await portfolioService.getTransactionHistory(req.user.walletAddress, req.query);
    return res.status(200).json(new ApiResponse(200, result, 'Transaction history retrieved'));
});

/**
 * GET /portfolio/supply/:projectId — Get total supply for a project from chain.
 */
export const getProjectSupply = asyncHandler(async (req, res) => {
    const result = await portfolioService.getProjectSupply(req.params.projectId);
    return res.status(200).json(new ApiResponse(200, result, 'Project supply retrieved'));
});
