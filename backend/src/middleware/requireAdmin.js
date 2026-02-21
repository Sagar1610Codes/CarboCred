/**
 * middleware/requireAdmin.js
 * Must run AFTER requireAuth. Rejects non-admin users with 403.
 */

module.exports = function requireAdmin(req, res, next) {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Forbidden — admin access required.' });
    }
    next();
};
