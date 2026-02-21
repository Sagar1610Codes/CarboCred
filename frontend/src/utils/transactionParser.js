/**
 * src/utils/transactionParser.js
 *
 * Utility to parse and normalize raw blockchain event logs into unified history records.
 * Handles ERC-1155 standard events and custom CarbonCreditToken events.
 */

import { formatUnits } from 'viem';

export const TX_TYPES = {
    RECEIVED: 'RECEIVED',
    SENT: 'SENT',
    MINT: 'MINT',
    RETIRE: 'RETIRE',
    TRADE: 'TRADE'
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Normalizes an array of raw event logs involving a specific user.
 *
 * @param {Array} rawLogs - Raw logs fetched from the RPC.
 * @param {string} userAddress - The connected wallet address (lowercase).
 * @returns {Array} - Normalized transaction records.
 */
export function normalizeTransactions(rawLogs, userAddress) {
    const normalized = [];
    const userLower = userAddress.toLowerCase();

    for (const log of rawLogs) {
        // Event data is in log.eventName and log.args
        const { eventName, args, transactionHash, blockNumber } = log;
        if (!args || !eventName) continue;

        let type = '';
        let amount = 0n;
        let counterparty = null;
        let isRelevant = false;

        switch (eventName) {
            case 'TransferSingle': {
                const { from, to, value } = args;
                if (!from || !to || value === undefined) continue;

                const fromLower = from.toLowerCase();
                const toLower = to.toLowerCase();
                amount = BigInt(value);

                if (fromLower === ZERO_ADDRESS && toLower === userLower) {
                    type = TX_TYPES.MINT;
                    isRelevant = true;
                } else if (fromLower === userLower && toLower === ZERO_ADDRESS) {
                    type = TX_TYPES.RETIRE;
                    isRelevant = true;
                } else if (fromLower === userLower) {
                    type = TX_TYPES.SENT;
                    counterparty = to;
                    isRelevant = true;
                } else if (toLower === userLower) {
                    type = TX_TYPES.RECEIVED;
                    counterparty = from;
                    isRelevant = true;
                }
                break;
            }

            case 'TransferBatch': {
                // For simplicity, we process the first item in the batch or map them out.
                // Assuming standard usage where values[0] is main transfer.
                const { from, to, values } = args;
                if (!from || !to || !values || values.length === 0) continue;

                const fromLower = from.toLowerCase();
                const toLower = to.toLowerCase();
                amount = BigInt(values[0]);

                if (fromLower === ZERO_ADDRESS && toLower === userLower) {
                    type = TX_TYPES.MINT;
                    isRelevant = true;
                } else if (fromLower === userLower && toLower === ZERO_ADDRESS) {
                    type = TX_TYPES.RETIRE;
                    isRelevant = true;
                } else if (fromLower === userLower) {
                    type = TX_TYPES.SENT;
                    counterparty = to;
                    isRelevant = true;
                } else if (toLower === userLower) {
                    type = TX_TYPES.RECEIVED;
                    counterparty = from;
                    isRelevant = true;
                }
                break;
            }

            case 'CreditsAwarded': {
                const { entity, amount: awardAmount } = args;
                if (entity?.toLowerCase() === userLower) {
                    type = TX_TYPES.MINT;
                    amount = BigInt(awardAmount);
                    isRelevant = true;
                }
                break;
            }

            case 'CreditIssued': {
                const { entity, amount: issueAmount } = args;
                if (entity?.toLowerCase() === userLower) {
                    type = TX_TYPES.MINT;
                    amount = BigInt(issueAmount);
                    isRelevant = true;
                }
                break;
            }

            case 'DebtRecorded': {
                // Debt increases aren't exactly "Minting Credits" but they are part of history
                const { entity, amount: debtAmount } = args;
                if (entity?.toLowerCase() === userLower) {
                    type = TX_TYPES.RECEIVED; // Receiving debt/emission
                    amount = BigInt(debtAmount);
                    counterparty = "Emissions";
                    isRelevant = true;
                }
                break;
            }

            case 'DebtCleared': {
                const { entity, amount: clearAmount } = args;
                if (entity?.toLowerCase() === userLower) {
                    type = TX_TYPES.RETIRE; // Retiring debt
                    amount = BigInt(clearAmount);
                    counterparty = "Offset";
                    isRelevant = true;
                }
                break;
            }

            case 'BalanceUpdated':
            case 'TradeExecuted': {
                // Marketplace trade
                const { seller, buyer, amount: tradeAmount } = args;
                if (!seller || !buyer) continue;

                const sellerLower = seller.toLowerCase();
                const buyerLower = buyer.toLowerCase();
                amount = BigInt(tradeAmount);

                if (sellerLower === userLower) {
                    type = TX_TYPES.TRADE;
                    counterparty = buyer; // Sold to
                    isRelevant = true;
                } else if (buyerLower === userLower) {
                    type = TX_TYPES.TRADE;
                    counterparty = seller; // Bought from
                    isRelevant = true;
                }
                break;
            }
        }

        if (isRelevant && amount > 0n) {
            normalized.push({
                id: `${transactionHash}-${log.logIndex}`,
                txHash: transactionHash,
                blockNumber: blockNumber,
                type,
                amount,
                counterparty,
                eventName,
                timestamp: null, // Will be hydrated later if needed
            });
        }
    }

    return normalized;
}
