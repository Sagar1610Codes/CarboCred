/**
 * models/User.model.js — User account with wallet address, JWT auth, and roles.
 * RULES: timestamps required, required indexes, lean() for reads.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { ROLES } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Never returned in queries by default
        },
        walletAddress: {
            type: String,
            unique: true,
            sparse: true, // Allow null (wallet-less users)
            lowercase: true,
            trim: true,
            match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address'],
        },
        role: {
            type: String,
            enum: Object.values(ROLES),
            default: ROLES.USER,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        nonce: {
            type: String, // Used for wallet signature authentication
            default: () => Math.floor(Math.random() * 1_000_000).toString(),
        },
        lastLogin: {
            type: Date,
        },
    },
    { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });

// ── Pre-save: hash password ────────────────────────────────────────────────
userSchema.pre('save', async function hashPassword(next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 12);
    return next();
});

// ── Instance method: compare password ────────────────────────────────────
userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance method: rotate wallet nonce ─────────────────────────────────
userSchema.methods.rotateNonce = function rotateNonce() {
    this.nonce = Math.floor(Math.random() * 1_000_000).toString();
};

const User = mongoose.model('User', userSchema);
export default User;
