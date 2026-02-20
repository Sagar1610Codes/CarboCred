import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, User, Wallet, Eye, EyeOff, ArrowRight, CheckCircle, Zap } from 'lucide-react';

const ROLES = ['Buyer (Business)', 'Seller (Project)'];

export default function Auth({ onLogin }) {
    const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
    const [form, setForm] = useState({ email: '', password: '', role: ROLES[0] });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!form.email || !form.password) {
            setError('Please fill in all required fields.');
            return;
        }
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        // Mock: simulate network delay then log in
        setTimeout(() => {
            setLoading(false);
            onLogin({ email: form.email, role: form.role, method: 'email' });
            navigate(form.role.startsWith('Seller') ? '/seller' : '/business');
        }, 1200);
    };

    const handleMetaMask = async () => {
        setError('');
        if (!window.ethereum) {
            setError('MetaMask not detected. Please install the MetaMask extension.');
            return;
        }
        try {
            setLoading(true);
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            setLoading(false);
            onLogin({ email: accounts[0], role: form.role, method: 'metamask', wallet: accounts[0] });
            navigate(form.role.startsWith('Seller') ? '/seller' : '/business');
        } catch (err) {
            setLoading(false);
            setError('MetaMask connection was rejected.');
        }
    };

    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div style={{ width: '100%', maxWidth: '440px' }}>

                {/* ── Logo ──────────────────────────────────── */}
                <div className="slide-up" style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: '16px',
                        background: 'linear-gradient(135deg,#10b981,#059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 14px',
                        boxShadow: '0 0 30px rgba(16,185,129,0.4)',
                    }}>
                        <Leaf size={26} color="#fff" />
                    </div>
                    <h1 style={{
                        fontFamily: "'Space Grotesk',sans-serif",
                        fontSize: '1.7rem', fontWeight: 800,
                        letterSpacing: '-0.02em', color: '#f1f5f9',
                        marginBottom: '6px',
                    }}>
                        {mode === 'signin' ? 'Welcome back' : 'Join CarboCred'}
                    </h1>
                    <p style={{ color: '#475569', fontSize: '0.875rem' }}>
                        {mode === 'signin'
                            ? 'Sign in to access your carbon credit dashboard.'
                            : 'Create an account to start trading carbon credits.'}
                    </p>
                </div>

                {/* ── Card ──────────────────────────────────── */}
                <div className="glass-card slide-up-1" style={{ padding: '32px' }}>

                    {/* Mode Toggle */}
                    <div style={{
                        display: 'flex', gap: '4px',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: '12px', padding: '4px',
                        marginBottom: '28px',
                    }}>
                        {[['signin', 'Sign In'], ['signup', 'Create Account']].map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => { setMode(key); setError(''); }}
                                style={{
                                    flex: 1, padding: '9px 12px', borderRadius: '9px', border: 'none',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
                                    transition: 'all 0.2s ease',
                                    background: mode === key ? 'linear-gradient(135deg,#10b981,#059669)' : 'transparent',
                                    color: mode === key ? '#fff' : '#94a3b8',
                                    boxShadow: mode === key ? '0 0 16px rgba(16,185,129,0.35)' : 'none',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '12px 14px', marginBottom: '18px',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '10px', fontSize: '0.83rem', color: '#fca5a5',
                        }}>
                            ⚠ {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Email */}
                        <div>
                            <label className="field-label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                <input
                                    className="input-field"
                                    type="email"
                                    placeholder="you@company.com"
                                    value={form.email}
                                    onChange={set('email')}
                                    style={{ paddingLeft: '36px' }}
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="field-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                                <input
                                    className="input-field"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                                    value={form.password}
                                    onChange={set('password')}
                                    style={{ paddingLeft: '36px', paddingRight: '40px' }}
                                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass((v) => !v)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: '2px',
                                    }}
                                >
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Role — always visible so user can pick before logging in */}
                        <div>
                            <label className="field-label">I am a&hellip;</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {ROLES.map((r) => (
                                    <button
                                        type="button"
                                        key={r}
                                        onClick={() => setForm((p) => ({ ...p, role: r }))}
                                        style={{
                                            flex: 1, padding: '9px 10px', borderRadius: '10px', cursor: 'pointer',
                                            fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                                            border: form.role === r ? '1px solid rgba(16,185,129,0.5)' : '1px solid rgba(255,255,255,0.07)',
                                            background: form.role === r ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                                            color: form.role === r ? '#10b981' : '#94a3b8',
                                        }}
                                    >
                                        {r.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading
                                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                                : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>
                            }
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '22px 0' }}>
                        <div className="divider" style={{ flex: 1 }} />
                        <span style={{ color: '#475569', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>or continue with</span>
                        <div className="divider" style={{ flex: 1 }} />
                    </div>

                    {/* MetaMask */}
                    <button
                        className="btn-wallet"
                        onClick={handleMetaMask}
                        disabled={loading}
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.875rem' }}
                    >
                        <Wallet size={16} /> Connect with MetaMask
                    </button>

                    {/* Footer hint */}
                    <p style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.78rem', color: '#475569' }}>
                        {mode === 'signin'
                            ? <>Don&apos;t have an account?{' '}<button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>Create one</button></>
                            : <>Already have an account?{' '}<button onClick={() => setMode('signin')} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}>Sign in</button></>
                        }
                    </p>

                </div>

                {/* Trust indicators */}
                <div className="slide-up-2" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                    {['End-to-end encrypted', 'Non-custodial', 'On-chain verified'].map((t) => (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#475569' }}>
                            <CheckCircle size={11} color="#10b981" /> {t}
                        </div>
                    ))}
                </div>
            </div>

            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
