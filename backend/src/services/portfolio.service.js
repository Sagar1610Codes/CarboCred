/**
 * services/portfolio.service.js — Live portfolio fetched from blockchain.
 * RULES: NEVER compute balances from DB. Always fetch from chain.
 */

import { getLiveBalance, getTotalSupply } from './blockchain.service.js';
import CarbonCredit from '../models/CarbonCredit.model.js';
import Transaction from '../models/Transaction.model.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Get the live portfolio for a wallet, enriched with DB metadata.
 * 🚨 RULE: Live balances fetched from chain. DB used only for metadata.
 */
export const getPortfolio = async (walletAddress) => {
    try {
        const address = walletAddress.toLowerCase();

        // Get unique project IDs this wallet has credits for (from DB index)
        const creditEntries = await CarbonCredit.find({ walletAddress: address })
            .distinct('onChainProjectId')
            .lean();

        // Fetch live balances from chain for each project
        const liveBalances = await Promise.all(
            creditEntries.map(async (projectId) => {
                const balance = await getLiveBalance(address, projectId);
                return { onChainProjectId: projectId, liveBalance: balance };
            }),
        );

        // Filter out empty balances
        const activeHoldings = liveBalances.filter((h) => h.liveBalance > 0);

        logger.info(`Portfolio fetched from chain for ${address}: ${activeHoldings.length} active projects`);
        return { walletAddress: address, holdings: activeHoldings, fetchedAt: new Date().toISOString() };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to fetch portfolio: ${error.message}`);
    }
};

/**
 * Get transaction history for a wallet from DB (event-indexed cache).
 */
export const getTransactionHistory = async (walletAddress, query) => {
    try {
        const address = walletAddress.toLowerCase();
        const page = Math.max(1, parseInt(query.page || '1', 10));
        const limit = Math.min(50, parseInt(query.limit || '20', 10));
        const skip = (page - 1) * limit;

        const filter = { $or: [{ from: address }, { to: address }] };
        if (query.type) { filter.type = query.type; }

        const [transactions, total] = await Promise.all([
            Transaction.find(filter)
                .sort({ blockNumber: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Transaction.countDocuments(filter),
        ]);

        return {
            data: transactions,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to fetch transaction history: ${error.message}`);
    }
};

/**
 * Get total supply for a specific project from chain.
 */
export const getProjectSupply = async (onChainProjectId) => {
    try {
        const totalSupply = await getTotalSupply(onChainProjectId);
        return { onChainProjectId, totalSupply, fetchedAt: new Date().toISOString() };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Failed to fetch project supply: ${error.message}`);
    }
};
