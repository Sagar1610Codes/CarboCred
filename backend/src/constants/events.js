/**
 * constants/events.js — Blockchain event type classifications.
 * RULES: Event types used by the indexer to classify on-chain activity.
 */

export const CREDIT_EVENT_TYPES = Object.freeze({
    ISSUE: 'ISSUE',
    TRANSFER: 'TRANSFER',
    RETIRE: 'RETIRE',
});

export const PROJECT_STATUS = Object.freeze({
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
    COMPLETED: 'COMPLETED',
});

export const REPORT_STATUS = Object.freeze({
    SUBMITTED: 'SUBMITTED',
    UNDER_REVIEW: 'UNDER_REVIEW',
    VERIFIED: 'VERIFIED',
    REJECTED: 'REJECTED',
});
