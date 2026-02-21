/**
 * pages/SignupPage.jsx
 * Full-screen Obsidian-styled signup form.
 * Supports an optional Admin Seed Key for creating admin accounts.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function SignupPage({ onSwitchToLogin }) {
    const { signup } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [seedKey, setSeedKey] = useState('')
    const [showSeed, setShowSeed] = useState(false)
    const [error, setError] = useState(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError(null)
        if (password !== confirm) { setError('Passwords do not match.'); return }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
        setLoading(true)
        try {
            await signup(email, password, seedKey || undefined)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={s.overlay}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                style={s.card}
            >
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={s.logoRow}
                >
                    <img src="/logo.jpeg" alt="CarboCred" style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', boxShadow: '0 0 20px rgba(16, 185, 129, 0.25)' }} />
                    <span style={s.logoText}>CarboCred</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    style={s.title}
                >
                    Create account
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    style={s.sub}
                >
                    Join the carbon credit marketplace
                </motion.p>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>Email address</label>
                        <input
                            style={s.input} type="email" required autoFocus
                            placeholder="you@example.com"
                            value={email} onChange={e => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Password</label>
                        <input
                            style={s.input} type="password" required
                            placeholder="At least 6 characters"
                            value={password} onChange={e => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Confirm Password</label>
                        <input
                            style={s.input} type="password" required
                            placeholder="Repeat password"
                            value={confirm} onChange={e => setConfirm(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {/* Admin seed key — hidden by default */}
                    <button
                        type="button"
                        onClick={() => setShowSeed(v => !v)}
                        style={s.seedToggle}
                    >
                        {showSeed ? '▾ Hide' : '▸ Registering as admin?'}
                    </button>
                    <AnimatePresence>
                        {showSeed && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={s.field}
                            >
                                <label style={s.label}>Admin Seed Key</label>
                                <input
                                    style={s.input} type="password"
                                    placeholder="Contact your system administrator"
                                    value={seedKey} onChange={e => setSeedKey(e.target.value)}
                                    disabled={loading}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={s.error}
                            >
                                {error}
                            </motion.p>
                        )}
                    </AnimatePresence>

                    <motion.button
                        whileHover={!loading ? { scale: 1.02, translateY: -2 } : {}}
                        whileTap={!loading ? { scale: 0.98 } : {}}
                        type="submit"
                        style={loading ? s.btnDisabled : s.btn}
                        disabled={loading}
                    >
                        {loading ? 'Creating account…' : 'Create Account →'}
                    </motion.button>
                </form>

                <p style={s.switchText}>
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} style={s.link}>Sign in</button>
                </p>

                <div style={s.divider} />
                <p style={s.disclaimer}>
                    You'll connect your Web3 wallet after signing in for on-chain transactions.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                style={s.glowBL}
            />
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                style={s.glowTR}
            />
        </div>
    )
}

const s = {
    overlay: {
        position: 'fixed', inset: 0, background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', overflow: 'hidden',
    },
    glowBL: {
        position: 'fixed', bottom: '-80px', left: '-80px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    glowTR: {
        position: 'fixed', top: '-80px', right: '-80px',
        width: '350px', height: '350px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    card: {
        position: 'relative', zIndex: 10,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        width: '100%', maxWidth: '420px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 40px 100px rgba(0,0,0,0.6)',
        backdropFilter: 'blur(20px)',
    },
    logoRow: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '1.75rem', justifyContent: 'center',
    },
    logoIcon: { fontSize: '1.6rem' },
    logoText: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 800, fontSize: '1.3rem',
        background: 'linear-gradient(135deg, #f8fafc 40%, #10b981 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
    },
    title: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em',
        color: '#f8fafc', margin: '0 0 0.3rem', textAlign: 'center',
    },
    sub: {
        color: '#64748b', fontSize: '0.85rem', textAlign: 'center',
        margin: '0 0 1.75rem',
    },
    form: { display: 'flex', flexDirection: 'column', gap: '0.85rem' },
    field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
    label: {
        fontSize: '0.72rem', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b',
    },
    input: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.6rem', padding: '0.65rem 0.85rem',
        color: '#f8fafc', fontSize: '0.9rem', fontFamily: 'inherit',
        outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    seedToggle: {
        background: 'none', border: 'none', color: '#475569',
        fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left',
        fontFamily: 'inherit', padding: '0.1rem 0',
        transition: 'color 0.15s',
    },
    error: {
        color: '#f87171', fontSize: '0.8rem',
        background: 'rgba(248,113,113,0.08)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: '0.5rem', padding: '0.5rem 0.75rem', margin: 0,
    },
    btn: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff', border: 'none', borderRadius: '0.65rem',
        padding: '0.75rem', fontSize: '0.9rem', fontWeight: 700,
        fontFamily: 'inherit', cursor: 'pointer', marginTop: '0.25rem',
        boxShadow: '0 0 0 1px rgba(16,185,129,0.3), 0 4px 20px rgba(16,185,129,0.25)',
        transition: 'all 0.15s',
    },
    btnDisabled: {
        background: 'rgba(255,255,255,0.06)', color: '#475569',
        border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.65rem',
        padding: '0.75rem', fontSize: '0.9rem', fontWeight: 700,
        fontFamily: 'inherit', cursor: 'not-allowed', marginTop: '0.25rem',
    },
    switchText: {
        textAlign: 'center', color: '#475569', fontSize: '0.82rem',
        marginTop: '1.25rem',
    },
    link: {
        background: 'none', border: 'none', color: '#10b981',
        fontWeight: 700, cursor: 'pointer', fontSize: 'inherit',
        fontFamily: 'inherit', padding: 0,
        textDecoration: 'underline', textDecorationColor: 'rgba(16,185,129,0.3)',
    },
    divider: {
        height: '1px', background: 'rgba(255,255,255,0.06)',
        margin: '1.25rem 0 1rem',
    },
    disclaimer: {
        color: '#334155', fontSize: '0.72rem', textAlign: 'center', margin: 0, lineHeight: 1.5,
    },
}
