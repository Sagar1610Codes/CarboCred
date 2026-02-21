/**
 * routes/creditRequest.routes.js
 *
 * All routes are now JWT-protected:
 *   POST   /api/requests            — authenticated users only
 *   GET    /api/requests/pending    — admin only
 *   POST   /api/requests/:id/approve — admin only
 *   POST   /api/requests/:id/reject  — admin only
 */

const express = require('express');
const router = express.Router();
const CreditRequest = require('../models/CreditRequest');
const { awardCredits, recordDebt } = require('../../signer');
const { ethers } = require('ethers');
const requireAuth = require('../middleware/requireAuth');
const requireAdmin = require('../middleware/requireAdmin');

// ── POST /api/requests ────────────────────────────────────────────────────
// Authenticated users submit a PENDING request.
router.post('/', requireAuth, async (req, res) => {
    try {
        const { entityAddress, type, amount, reason } = req.body;

        if (!entityAddress || !type || !amount || !reason) {
            return res.status(400).json({
                success: false,
                error: 'entityAddress, type, amount, and reason are required.',
            });
        }
        if (!ethers.isAddress(entityAddress)) {
            return res.status(400).json({ success: false, error: 'Invalid Ethereum address.' });
        }
        if (!['CREDIT', 'DEBT'].includes(type)) {
            return res.status(400).json({ success: false, error: "type must be 'CREDIT' or 'DEBT'." });
        }

        const parsedAmount = Math.floor(Number(amount));
        if (parsedAmount < 1) {
            return res.status(400).json({ success: false, error: 'amount must be at least 1.' });
        }

        const request = await CreditRequest.create({
            entityAddress: entityAddress.toLowerCase(),
            type,
            amount: parsedAmount,
            reason,
        });

        console.log(`[Requests] New ${type} request from ${entityAddress}: ${parsedAmount} → ID ${request._id}`);
        res.status(201).json({ success: true, requestId: request._id });
    } catch (err) {
        console.error('[Requests] POST / error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── GET /api/requests/pending ─────────────────────────────────────────────
// Admin only — list PENDING requests.
router.get('/pending', requireAuth, requireAdmin, async (req, res) => {
    try {
        const requests = await CreditRequest.find({ status: 'PENDING' })
            .sort({ createdAt: -1 })
            .lean();
        res.json({ success: true, requests });
    } catch (err) {
        console.error('[Requests] GET /pending error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/requests/:id/approve ────────────────────────────────────────
// Admin only — approve and mint/record on-chain.
router.post('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
    try {
        const request = await CreditRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, error: 'Request not found.' });
        if (request.status !== 'PENDING') {
            return res.status(409).json({ success: false, error: `Cannot approve — already ${request.status}.` });
        }

        console.log(`[Requests] Approving ${request.type} for ${request.entityAddress}: ${request.amount}`);

        let receipt;
        if (request.type === 'CREDIT') {
            receipt = await awardCredits(request.entityAddress, BigInt(request.amount), request.reason);
        } else {
            receipt = await recordDebt(request.entityAddress, BigInt(request.amount), request.reason);
        }

        request.status = 'APPROVED';
        request.txHash = receipt.hash;
        await request.save();

        console.log(`[Requests] ✅ Approved. txHash: ${receipt.hash}`);
        res.json({ success: true, txHash: receipt.hash, requestId: request._id });
    } catch (err) {
        console.error('[Requests] POST /:id/approve error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/requests/:id/reject ─────────────────────────────────────────
// Admin only — reject without on-chain action.
router.post('/:id/reject', requireAuth, requireAdmin, async (req, res) => {
    try {
        const request = await CreditRequest.findById(req.params.id);
        if (!request) return res.status(404).json({ success: false, error: 'Request not found.' });
        if (request.status !== 'PENDING') {
            return res.status(409).json({ success: false, error: `Cannot reject — already ${request.status}.` });
        }

        request.status = 'REJECTED';
        await request.save();

        console.log(`[Requests] ❌ Rejected ${request._id}`);
        res.json({ success: true, requestId: request._id });
    } catch (err) {
        console.error('[Requests] POST /:id/reject error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
