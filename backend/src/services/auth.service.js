/**
 * services/auth.service.js — Authentication business logic.
 * RULES: All business logic in services. Try/catch required. Throw ApiError.
 */

import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import User from '../models/User.model.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Generate a signed JWT for a user document.
 */
const signToken = (userId) =>
    jwt.sign({ id: userId.toString() }, env.JWT_SECRET, {
        expiresIn: env.JWT_EXPIRES_IN,
    });

/**
 * Register a new user with email/password.
 */
export const register = async ({ name, email, password }) => {
    try {
        const existing = await User.findOne({ email }).lean();
        if (existing) {
            throw ApiError.conflict('An account with this email already exists');
        }

        const user = await User.create({ name, email, password });
        const token = signToken(user._id);

        logger.info(`New user registered: ${email}`);
        return { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Registration failed: ${error.message}`);
    }
};

/**
 * Login with email/password.
 */
export const login = async ({ email, password }) => {
    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            throw ApiError.unauthorized('Invalid email or password');
        }
        if (!user.isActive) {
            throw ApiError.forbidden('Account is deactivated. Contact support.');
        }

        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const token = signToken(user._id);
        logger.info(`User logged in: ${email}`);
        return { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Login failed: ${error.message}`);
    }
};

/**
 * Get the sign-in nonce for wallet-signature authentication.
 * Creates a new user record if wallet not registered.
 */
export const getWalletNonce = async (walletAddress) => {
    try {
        const address = walletAddress.toLowerCase();
        let user = await User.findOne({ walletAddress: address });

        if (!user) {
            user = await User.create({
                name: `Wallet User ${address.slice(0, 8)}`,
                email: `${address}@wallet.local`,
                walletAddress: address,
            });
        }

        return { nonce: user.nonce, walletAddress: address };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Nonce retrieval failed: ${error.message}`);
    }
};

/**
 * Verify wallet signature and issue a JWT.
 * RULES: Recover signer address from signature, compare to walletAddress.
 */
export const walletLogin = async ({ walletAddress, signature }) => {
    try {
        const address = walletAddress.toLowerCase();
        const user = await User.findOne({ walletAddress: address });
        if (!user) {
            throw ApiError.unauthorized('Wallet not registered. Call /nonce first.');
        }

        const message = `Sign this message to authenticate. Nonce: ${user.nonce}`;
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== address) {
            throw ApiError.unauthorized('Signature verification failed');
        }

        // Rotate nonce after successful login (prevents replay attacks)
        user.rotateNonce();
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        const token = signToken(user._id);
        logger.info(`Wallet login: ${address}`);
        return { token, user: { id: user._id, name: user.name, walletAddress: address, role: user.role } };
    } catch (error) {
        if (error instanceof ApiError) { throw error; }
        throw ApiError.internal(`Wallet login failed: ${error.message}`);
    }
};
