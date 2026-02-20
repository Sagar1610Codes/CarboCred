/**
 * middleware/auth.middleware.js — JWT verification middleware.
 * RULES: Verifies JWT, attaches decoded user to req.user. Required on all protected routes.
 */

import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/User.model.js';

/**
 * Extracts and verifies the Bearer JWT from Authorization header.
 * Attaches the full user document to req.user.
 */
const authenticate = async (req, _res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('No valid token provided');
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, env.JWT_SECRET);

        const user = await User.findById(decoded.id).select('-password').lean();
        if (!user) {
            throw ApiError.unauthorized('User not found or token invalid');
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else if (error.name === 'JsonWebTokenError') {
            next(ApiError.unauthorized('Invalid token signature'));
        } else if (error.name === 'TokenExpiredError') {
            next(ApiError.unauthorized('Token has expired'));
        } else {
            next(error);
        }
    }
};

export default authenticate;
