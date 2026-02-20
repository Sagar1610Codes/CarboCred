/**
 * controllers/auth.controller.js — Thin controller: calls service, returns response.
 * RULES: No business logic. Use asyncHandler. Use ApiResponse.
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import * as authService from '../services/auth.service.js';

export const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(new ApiResponse(201, result, 'Registration successful'));
});

export const login = asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.status(200).json(new ApiResponse(200, result, 'Login successful'));
});

export const getWalletNonce = asyncHandler(async (req, res) => {
    const { walletAddress } = req.body;
    const result = await authService.getWalletNonce(walletAddress);
    res.status(200).json(new ApiResponse(200, result, 'Nonce retrieved'));
});

export const walletLogin = asyncHandler(async (req, res) => {
    const result = await authService.walletLogin(req.body);
    res.status(200).json(new ApiResponse(200, result, 'Wallet login successful'));
});

export const getMe = asyncHandler(async (req, res) => {
    res.status(200).json(new ApiResponse(200, req.user, 'User profile retrieved'));
});
