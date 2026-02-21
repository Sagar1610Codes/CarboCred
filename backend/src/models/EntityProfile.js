/**
 * backend/src/models/EntityProfile.js
 *
 * Mongoose schema for mapping hashed account IDs to business names.
 */

const mongoose = require('mongoose');

const EntityProfileSchema = new mongoose.Schema({
    accountId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    businessName: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
    },
    walletAddress: {
        type: String,
        trim: true,
        lowercase: true,    // store normalised for lookups
        index: true,
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('EntityProfile', EntityProfileSchema);
