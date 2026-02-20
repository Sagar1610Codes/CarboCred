/**
 * middleware/role.middleware.js — Role-Based Access Control (RBAC).
 * RULES: Must be used after authenticate middleware. Denies access if role not in allowedRoles.
 */

import ApiError from '../utils/ApiError.js';

/**
 * Factory that returns middleware restricting access to specified roles.
 * @param {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 */
const authorize = (...allowedRoles) =>
    (req, _res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentication required'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(
                ApiError.forbidden(
                    `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
                ),
            );
        }

        return next();
    };

export default authorize;
