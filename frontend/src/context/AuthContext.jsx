/**
 * context/AuthContext.jsx
 *
 * Provides: user, token, login(), signup(), logout()
 * JWT is persisted to localStorage so sessions survive page refreshes.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'
const STORAGE_KEY = 'carbocred_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY))
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(!!localStorage.getItem(STORAGE_KEY))

    // On mount, validate stored token and hydrate user
    useEffect(() => {
        if (!token) { setLoading(false); return }
        fetch(`${BACKEND_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(json => {
                if (json.success) setUser(json.user)
                else _clear()
            })
            .catch(() => _clear())
            .finally(() => setLoading(false))
    }, []) // run once on mount

    function _save(tk, usr) {
        localStorage.setItem(STORAGE_KEY, tk)
        setToken(tk)
        setUser(usr)
    }

    function _clear() {
        localStorage.removeItem(STORAGE_KEY)
        setToken(null)
        setUser(null)
    }

    async function login(email, password) {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        _save(json.token, json.user)
        return json.user
    }

    async function signup(email, password, adminSeedKey) {
        const res = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, adminSeedKey: adminSeedKey || undefined }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        _save(json.token, json.user)
        return json.user
    }

    function logout() { _clear() }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}
