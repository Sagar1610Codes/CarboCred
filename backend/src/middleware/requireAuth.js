/**
 * middleware/requireAuth.js
 * Verifies JWT from Authorization header and attaches req.user.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized — no token provided.' });
    }

    const token = header.slice(7);
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // Fetch fresh user (so revoked accounts are rejected)
        const user = await User.findById(payload.id);
        if (!user) return res.status(401).json({ success: false, error: 'User not found.' });
        req.user = user;
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Invalid or expired token.' });
    }
};
