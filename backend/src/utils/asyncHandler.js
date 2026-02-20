/**
 * utils/asyncHandler.js — Wraps async route handlers to eliminate try/catch boilerplate.
 * RULES: All async controllers must use this wrapper.
 */

/**
 * @param {Function} fn - Async express route handler
 * @returns {Function} Express middleware that catches async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
