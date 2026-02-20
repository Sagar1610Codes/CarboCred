/**
 * routes/auth.routes.js — Authentication routes.
 * RULES: Thin routes. Validation before controller. Rate limiting on auth.
 */

import { Router } from 'express';

import * as authController from '../controllers/auth.controller.js';
import authenticate from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { authRateLimiter } from '../middleware/rateLimit.middleware.js';
import {
    registerSchema,
    loginSchema,
    walletNonceSchema,
    walletLoginSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/wallet/nonce', authRateLimiter, validate(walletNonceSchema), authController.getWalletNonce);
router.post('/wallet/login', authRateLimiter, validate(walletLoginSchema), authController.walletLogin);

// Protected routes
router.get('/me', authenticate, authController.getMe);

export default router;
