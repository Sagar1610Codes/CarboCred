/**
 * utils/pagination.js — Reusable pagination helper.
 * RULES: All list endpoints must paginate. Never return unbounded arrays.
 */

/**
 * Parse pagination params from query string.
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const parsePagination = (query) => {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

/**
 * Build paginated response metadata.
 * @param {number} total - Total document count
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {object} Pagination metadata
 */
export const buildPaginationMeta = (total, page, limit) => ({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
});

/**
 * Combined helper used by services.
 * @param {object} query - Express req.query
 * @param {Function} queryFn - Async fn(skip, limit) => documents[]
 * @param {Function} countFn - Async fn() => number
 */
export const paginate = async (query, queryFn, countFn) => {
    const { page, limit, skip } = parsePagination(query);
    const [data, total] = await Promise.all([queryFn(skip, limit), countFn()]);
    return { data, meta: buildPaginationMeta(total, page, limit) };
};
