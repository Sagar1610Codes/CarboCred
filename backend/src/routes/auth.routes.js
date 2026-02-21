/**
 * routes/auth.routes.js
 *
 * POST /auth/register  — create account (USER role by default)
 *                        pass { adminSeedKey } matching ADMIN_SEED_KEY env var
 *                        to create ADMIN accounts
 * POST /auth/login     — returns JWT
 * GET  /auth/me        — returns current user (requires token)
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// ── Helper: sign a JWT ────────────────────────────────────────────────────
function signToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
}

// ── POST /auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { email, password, adminSeedKey } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'email and password are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, error: 'Password must be at least 6 characters.' });
        }

        // Check if email is already taken
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
        }

        // Determine role: ADMIN only if correct seed key is provided
        let role = 'USER';
        if (adminSeedKey) {
            if (!process.env.ADMIN_SEED_KEY || adminSeedKey !== process.env.ADMIN_SEED_KEY) {
                return res.status(403).json({ success: false, error: 'Invalid admin seed key.' });
            }
            role = 'ADMIN';
        }

        const user = await User.create({ email, password, role });

        const token = signToken(user._id);
        console.log(`[Auth] New ${role} registered: ${email}`);

        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error('[Auth] Register error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'email and password are required.' });
        }

        // .select('+password') overrides the schema's select:false
        const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        const ok = await user.comparePassword(password);
        if (!ok) {
            return res.status(401).json({ success: false, error: 'Invalid email or password.' });
        }

        const token = signToken(user._id);
        console.log(`[Auth] Login: ${email} (${user.role})`);

        res.json({
            success: true,
            token,
            user: { id: user._id, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error('[Auth] Login error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
    const { _id, email, role } = req.user;
    res.json({ success: true, user: { id: _id, email, role } });
});

module.exports = router;
