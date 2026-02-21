/**
 * hooks/useEntityProfile.js
 *
 * Manages the connection between the wallet address and the anonymous
 * business identity stored in the backend.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { hashAccountId } from '../utils/hashAccountId';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export function useEntityProfile() {
    const { address, isConnected } = useAccount();

    const [accountId, setAccountId] = useState(null);
    const [businessName, setBusinessName] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [exists, setExists] = useState(false);

    /**
     * Fetch profile from backend using hashed accountId.
     */
    const checkProfile = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND_URL}/entity/profile/${id}`);
            const data = await res.json();

            if (data.exists) {
                setBusinessName(data.businessName);
                setExists(true);
            } else {
                setBusinessName(null);
                setExists(false);
            }
        } catch (err) {
            console.error('[useEntityProfile] checkProfile error:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Create or update profile.
     */
    const createProfile = async (name) => {
        if (!accountId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${BACKEND_URL}/entity/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, businessName: name }),
            });

            const data = await res.json();
            if (data.success) {
                setBusinessName(name);
                setExists(true);
                return true;
            } else {
                throw new Error(data.error || 'Failed to save profile');
            }
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    // When address changes, re-hash and check profile
    useEffect(() => {
        if (isConnected && address) {
            hashAccountId(address).then(id => {
                setAccountId(id);
                checkProfile(id);
            });
        } else {
            setAccountId(null);
            setBusinessName(null);
            setExists(false);
        }
    }, [address, isConnected, checkProfile]);

    return {
        accountId,
        businessName,
        exists,
        needsOnboarding: isConnected && !loading && !exists && accountId,
        loading,
        error,
        createProfile,
        refreshKey: accountId // useful for triggering re-renders
    };
}
