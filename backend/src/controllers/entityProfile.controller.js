/**
 * backend/src/controllers/entityProfile.controller.js
 *
 * Controller for business identity profile operations.
 */

const EntityProfile = require('../models/EntityProfile');

/**
 * Get profile by accountId.
 * GET /entity/profile/:accountId
 */
exports.getProfile = async (req, res) => {
    try {
        const { accountId } = req.params;
        if (!accountId) {
            return res.status(400).json({ error: 'accountId required' });
        }

        const profile = await EntityProfile.findOne({ accountId });

        if (profile) {
            return res.json({
                exists: true,
                businessName: profile.businessName,
                walletAddress: profile.walletAddress || null,
            });
        } else {
            return res.json({ exists: false });
        }
    } catch (err) {
        console.error('[API] /entity/profile/:accountId error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * List all registered entity profiles (for Government Authority selector).
 * GET /entity/profiles
 */
exports.listProfiles = async (req, res) => {
    try {
        const profiles = await EntityProfile.find(
            {},  // return all profiles regardless of walletAddress
            'accountId businessName walletAddress -_id'
        ).sort({ businessName: 1 });

        res.json({ profiles });
    } catch (err) {
        console.error('[API] GET /entity/profiles error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Upsert profile.
 * POST /entity/profile
 */
exports.upsertProfile = async (req, res) => {
    try {
        const { accountId, businessName, walletAddress } = req.body;

        if (!accountId || !businessName) {
            return res.status(400).json({ error: 'accountId and businessName required' });
        }

        // Basic format validation for SHA-256 hex string (64 chars)
        if (!/^[a-f0-9]{64}$/i.test(accountId)) {
            return res.status(400).json({ error: 'Invalid accountId format' });
        }

        const updateFields = { businessName };
        if (walletAddress) {
            updateFields.walletAddress = walletAddress.toLowerCase();
        }

        const profile = await EntityProfile.findOneAndUpdate(
            { accountId },
            updateFields,
            { new: true, upsert: true, runValidators: true }
        );

        res.json({ success: true, profile });
    } catch (err) {
        console.error('[API] POST /entity/profile error:', err.message);
        res.status(500).json({ error: err.message });
    }
};
