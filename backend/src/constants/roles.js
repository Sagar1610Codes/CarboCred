/**
 * constants/roles.js — User role definitions.
 * RULES: Single source of truth for role strings across codebase.
 */

export const ROLES = Object.freeze({
    USER: 'USER',
    VERIFIER: 'VERIFIER',
    ADMIN: 'ADMIN',
});

export const ALL_ROLES = Object.values(ROLES);
