import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    BarChart3, Leaf, Users, Wind, TrendingUp, Activity, Shield,
    ShieldCheck, Sprout, ArrowRight, ExternalLink, ChevronLeft, ChevronRight,
    TreePine, Building2,
} from 'lucide-react';
import HowItWorksAnimated from '../components/HowItWorksAnimated';
import {
    AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Static Data ─────────────────────────────────── */
const globalStats = [
    { label: 'Total CO₂ Offset', value: '45,820', unit: 'Tons', icon: Wind, color: '#10b981', cls: 'stat-green' },
    { label: 'Registered Entities', value: '128', unit: 'Orgs', icon: Users, color: '#3b82f6', cls: 'stat-blue' },
    { label: 'Trees Planted', value: '2.4M', unit: '', icon: Leaf, color: '#14b8a6', cls: 'stat-teal' },
    { label: 'Credits Traded', value: '18,340', unit: 'tons', icon: BarChart3, color: '#8b5cf6', cls: 'stat-purple' },
];

const marketData = [
    { month: 'Aug', volume: 2100, price: 12 },
    { month: 'Sep', volume: 3400, price: 14 },
    { month: 'Oct', volume: 2900, price: 13 },
    { month: 'Nov', volume: 4600, price: 17 },
    { month: 'Dec', volume: 5200, price: 18 },
    { month: 'Jan', volume: 7100, price: 22 },
];

const impactImages = [
    {
        url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1600&q=90&fit=crop',
        caption: 'Verified Carbon Sinks',
        sub: 'Certified reforestation & nature conservation projects',
        badge: 'Nature',
        badgeCls: 'badge-green',
        accentColor: '#10b981',
    },
    {
        url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1600&q=90&fit=crop',
        caption: 'Immutable Ledger Record',
        sub: 'Every credit traced & retired on-chain — provably unique',
        badge: 'Blockchain',
        badgeCls: 'badge-blue',
        accentColor: '#3b82f6',
    },
    {
        url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1600&q=90&fit=crop',
        caption: 'Financing Green Tech',
        sub: 'Capital flowing directly to clean energy infrastructure',
        badge: 'Impact',
        badgeCls: 'badge-purple',
        accentColor: '#8b5cf6',
    },
];

const pillars = [
    {
        icon: ShieldCheck,
        color: '#10b981',
        bg: 'rgba(16,185,129,0.1)',
        title: 'Eliminating Double Counting',
        text: 'Once a carbon credit is retired on-chain, the cryptographic record is permanent and publicly auditable — the same ton of CO₂ can never be claimed twice by two different organisations.',
    },
    {
        icon: Sprout,
        color: '#14b8a6',
        bg: 'rgba(20,184,166,0.1)',
        title: 'Direct Climate Finance',
        text: "By removing certification middlemen, proceeds flow straight to verified projects — reforesters, renewable developers, and ocean-conservation teams — maximising every dollar's environmental impact.",
    },
    {
        icon: TrendingUp,
        color: '#8b5cf6',
        bg: 'rgba(139,92,246,0.1)',
        title: 'Incentivising Sustainability',
        text: 'Tokenised carbon credits turn responsible stewardship into a liquid economic asset, aligning profit motives with planetary health and attracting institutional capital into green markets.',
    },
];

const footerCols = [
    { heading: 'Platform', links: ['How it Works', 'Technology', 'Tokenomics', 'Roadmap'] },
    { heading: 'Resources', links: ['Documentation', 'Whitepaper', 'API Reference', 'Audits'] },
    { heading: 'Community', links: ['Discord', 'Twitter / X', 'Blog', 'Governance Forum'] },
    { heading: 'Legal', links: ['Terms of Service', 'Privacy Policy', 'Disclaimer'] },
];

/* ─────────────────────────────────────────────────────
   ImpactCarousel — cinematic 3-image featured carousel
───────────────────────────────────────────────────── */
function ImpactCarousel() {
    const [active, setActive] = useState(0);
    const [animating, setAnimating] = useState(false);
    const total = impactImages.length;

    const goTo = useCallback((idx) => {
        if (animating) return;
        setAnimating(true);
        setActive((idx + total) % total);
        setTimeout(() => setAnimating(false), 600);
    }, [animating, total]);

    useEffect(() => {
        const t = setInterval(() => goTo(active + 1), 5000);
        return () => clearInterval(t);
    }, [active, goTo]);

    const getStyle = (i) => {
        const left = (active - 1 + total) % total;
        const right = (active + 1) % total;
        if (i === active) return {
            transform: 'translateX(-50%) scale(1)', left: '50%',
            zIndex: 10, opacity: 1, width: '80%', filter: 'brightness(1)',
        };
        if (i === left) return {
            transform: 'translateX(-82%) scale(0.72)', left: '50%',
            zIndex: 5, opacity: 0.55, width: '80%', filter: 'brightness(0.55)',
        };
        if (i === right) return {
            transform: 'translateX(-18%) scale(0.72)', left: '50%',
            zIndex: 5, opacity: 0.55, width: '80%', filter: 'brightness(0.55)',
        };
        return {
            transform: 'translateX(-50%) scale(0.5)', left: '50%',
            zIndex: 1, opacity: 0, width: '80%', filter: 'brightness(0.3)',
        };
    };

    const cur = impactImages[active];

    return (
        <div className="slide-up">
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '18px' }}>
                The Real-World Impact Behind Every Credit
            </p>

            <div style={{ position: 'relative', width: '100%', height: '420px', overflow: 'hidden' }}>
                {impactImages.map((img, i) => {
                    const s = getStyle(i);
                    return (
                        <div
                            key={img.caption}
                            onClick={() => i !== active && goTo(i)}
                            style={{
                                position: 'absolute', top: '50%',
                                transform: `${s.transform} translateY(-50%)`,
                                left: s.left, width: s.width, height: '100%',
                                zIndex: s.zIndex, opacity: s.opacity, filter: s.filter,
                                cursor: i !== active ? 'pointer' : 'default',
                                borderRadius: '20px', overflow: 'hidden',
                                border: i === active ? `2px solid ${cur.accentColor}60` : '1px solid rgba(255,255,255,0.08)',
                                boxShadow: i === active
                                    ? `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px ${cur.accentColor}30`
                                    : '0 8px 32px rgba(0,0,0,0.4)',
                                transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                        >
                            <img src={img.url} alt={img.caption} style={{
                                position: 'absolute', inset: 0, width: '100%', height: '100%',
                                objectFit: 'cover', transition: 'transform 8s ease',
                                transform: i === active ? 'scale(1.05)' : 'scale(1)',
                            }} />
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%)',
                            }} />
                            {i === active && (
                                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 2 }}>
                                    <span className={`badge ${img.badgeCls}`} style={{ fontSize: '0.75rem', padding: '5px 14px' }}>
                                        {img.badge}
                                    </span>
                                </div>
                            )}
                            {i === active && (
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '28px 32px', zIndex: 2 }}>
                                    <div style={{
                                        display: 'inline-block',
                                        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)', borderRadius: '14px',
                                        padding: '16px 22px', border: '1px solid rgba(255,255,255,0.12)', maxWidth: '520px',
                                    }}>
                                        <h3 style={{
                                            color: '#ffffff', fontFamily: "'Space Grotesk', sans-serif",
                                            fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-0.01em',
                                            marginBottom: '6px', textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                                        }}>{img.caption}</h3>
                                        <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.875rem', lineHeight: 1.5, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
                                            {img.sub}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Arrows */}
                {[
                    { dir: -1, label: 'Previous', Icon: ChevronLeft, side: { left: '2%' } },
                    { dir: +1, label: 'Next', Icon: ChevronRight, side: { right: '2%' } },
                ].map(({ dir, label, Icon, side }) => (
                    <button
                        key={label}
                        aria-label={label}
                        onClick={() => goTo(active + dir)}
                        style={{
                            position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                            zIndex: 20, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)',
                            borderRadius: '50%', width: 44, height: 44,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#ffffff',
                            transition: 'background 0.2s, transform 0.2s', ...side,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${cur.accentColor}cc`; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                    >
                        <Icon size={20} />
                    </button>
                ))}
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '18px' }}>
                {impactImages.map((img, i) => (
                    <button
                        key={i}
                        onClick={() => goTo(i)}
                        aria-label={`Go to ${img.caption}`}
                        style={{
                            width: i === active ? 28 : 8, height: 8, borderRadius: 999,
                            border: 'none', cursor: 'pointer',
                            transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
                            background: i === active ? cur.accentColor : 'rgba(255,255,255,0.2)',
                            boxShadow: i === active ? `0 0 10px ${cur.accentColor}80` : 'none',
                            padding: 0,
                        }}
                    />
                ))}
            </div>

            {/* Progress bar */}
            <div style={{ width: '80%', margin: '10px auto 0', height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 999 }}>
                <div
                    key={active}
                    style={{
                        height: '100%', borderRadius: 999, background: cur.accentColor,
                        animation: 'carousel-progress 5s linear forwards',
                        boxShadow: `0 0 6px ${cur.accentColor}`,
                    }}
                />
            </div>

            <style>{`
                @keyframes carousel-progress {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
            `}</style>
        </div>
    );
}

/* ── Custom Tooltip ──────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   Home Page
═══════════════════════════════════════════════════ */
export default function Home() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

            {/* ══ 1. HERO HEADER ═══════════════════════════ */}
            <div className="slide-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span className="badge badge-green">
                            <span className="live-dot" style={{ width: 6, height: 6 }} /> Live
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            Block #19,842,201 &bull; Gas: 18 gwei
                        </span>
                    </div>
                    <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                        Carbon Credit <span className="gradient-text">Public Ledger</span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', maxWidth: 520, fontSize: '0.9rem' }}>
                        Transparent, immutable record of all carbon credit activity across the CarboCred network. Powered by Ethereum smart contracts.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
                    <Shield size={18} color="var(--green-primary)" />
                    <div>
                        <div style={{ color: 'var(--green-primary)', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em' }}>VERIFIED ON-CHAIN</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>EntityRegistry &bull; CarbonMarketplace</div>
                    </div>
                </div>
            </div>

            {/* ══ 2. IMPACT IMAGERY CAROUSEL ═══════════════ */}
            <ImpactCarousel />

            {/* ══ 3. GLOBAL STATS ══════════════════════════ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {globalStats.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`glass-card ${s.cls} slide-up-${i + 1}`} style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</p>
                                    <p style={{ fontSize: '2rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                                    {s.unit && <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>{s.unit}</p>}
                                </div>
                                <div style={{ width: 42, height: 42, borderRadius: '12px', background: `${s.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={20} color={s.color} />
                                </div>
                            </div>
                            <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green-primary)', fontSize: '0.75rem' }}>
                                <TrendingUp size={13} />
                                <span>+12.4% this month</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ══ 4. MARKET CHART ══════════════════════════ */}
            <div className="glass-card-static slide-up" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Market Volume &amp; Price Trend</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Monthly credit volume (tons) and average price (ETH)</p>
                    </div>
                    <span className="badge badge-green"><Activity size={11} /> Live</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={marketData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                        <XAxis dataKey="month" tick={{ fill: 'var(--chart-tick)', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--chart-tick)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '0.78rem', color: 'var(--text-muted)' }} />
                        <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={2.5} fill="url(#volGrad)" name="Volume (T)" />
                        <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2.5} fill="url(#priceGrad)" name="Price (ETH)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* ══ 5. WHY CARBOCRED MATTERS ═════════════════ */}
            <div className="slide-up">
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <span className="badge badge-green" style={{ marginBottom: '14px', display: 'inline-flex' }}>
                        <ShieldCheck size={11} /> Our Mission
                    </span>
                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '10px' }}>
                        Why Decentralised Carbon Trading <span className="gradient-text">Matters</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 560, margin: '0 auto' }}>
                        Traditional carbon markets are opaque, fragmented, and rife with double-counting. CarboCred solves this at the infrastructure layer.
                    </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    {pillars.map((p, i) => {
                        const Icon = p.icon;
                        return (
                            <div key={p.title} className={`glass-card slide-up-${i + 1}`} style={{ padding: '28px 24px' }}>
                                <div style={{ width: 56, height: 56, borderRadius: '16px', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', border: `1px solid ${p.color}30`, boxShadow: `0 0 20px ${p.color}18` }}>
                                    <Icon size={26} color={p.color} />
                                </div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>{p.title}</h3>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.65 }}>{p.text}</p>
                                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '6px', color: p.color, fontSize: '0.78rem', fontWeight: 600 }}>
                                    <span>Learn more</span><ArrowRight size={13} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ══ 6. HOW IT WORKS ANIMATED TIMELINE ════════ */}
            <HowItWorksAnimated />

            {/* ══ 7. DUAL CTA ══════════════════════════════ */}
            <div className="slide-up">
                {/* Section heading */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                        Join the <span className="gradient-text">CarboCred Network</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px', maxWidth: 460, margin: '8px auto 0' }}>
                        Whether you create environmental impact or want to offset your footprint, there&rsquo;s a place for you on-chain.
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

                    {/* Card 1 — Project Developer (Seller) */}
                    <div
                        className="glass-card slide-up-1"
                        style={{ padding: '36px 32px', position: 'relative', overflow: 'hidden', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.015)'; e.currentTarget.style.boxShadow = '0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(16,185,129,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                    >
                        {/* Radial green glow */}
                        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

                        <div style={{ width: 60, height: 60, borderRadius: '18px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '22px', boxShadow: '0 0 24px rgba(16,185,129,0.22)' }}>
                            <TreePine size={28} color="#10b981" />
                        </div>

                        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.01em' }}>
                            Tokenize Your Environmental Impact
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '28px' }}>
                            Are you an organisation planting trees, restoring ecosystems, or capturing carbon? Register as a verified project to mint your carbon reductions into tradable on-chain assets. Turn your climate action into revenue.
                        </p>

                        <Link
                            to="/seller"
                            className="btn-primary"
                            style={{ textDecoration: 'none', display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '13px 24px', fontSize: '0.9rem' }}
                        >
                            <TreePine size={16} /> Register as a Project
                        </Link>
                    </div>

                    {/* Card 2 — Business (Buyer) */}
                    <div
                        className="glass-card slide-up-2"
                        style={{ padding: '36px 32px', position: 'relative', overflow: 'hidden', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px) scale(1.015)'; e.currentTarget.style.boxShadow = '0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(59,130,246,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
                    >
                        {/* Radial blue glow */}
                        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

                        <div style={{ width: 60, height: 60, borderRadius: '18px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '22px', boxShadow: '0 0 24px rgba(59,130,246,0.18)' }}>
                            <Building2 size={28} color="#3b82f6" />
                        </div>

                        <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.01em' }}>
                            Achieve Your Net-Zero Goals
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '28px' }}>
                            For businesses committed to sustainability. Offset your corporate carbon footprint by purchasing verified, immutable carbon credits directly from the source &mdash; with zero middleman fees.
                        </p>

                        <Link
                            to="/business"
                            className="btn-blue"
                            style={{ textDecoration: 'none', display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '13px 24px', fontSize: '0.9rem' }}
                        >
                            <Building2 size={16} /> Offset Your Emissions
                        </Link>
                    </div>

                </div>
            </div>

            {/* ══ 7. PRE-FOOTER NAVIGATION ═════════════════ */}
            <div className="slide-up" style={{ borderTop: '1px solid var(--border)', paddingTop: '40px', marginTop: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '32px', marginBottom: '40px' }}>
                    {footerCols.map(col => (
                        <div key={col.heading}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '16px' }}>
                                {col.heading}
                            </p>
                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {col.links.map(link => (
                                    <li key={link}>
                                        <a
                                            href="#"
                                            style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'color 0.2s, gap 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--green-primary)'; e.currentTarget.style.gap = '8px'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.gap = '5px'; }}
                                        >
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom bar */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Leaf size={15} color="#fff" />
                        </div>
                        <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Carbo<span style={{ color: 'var(--green-primary)' }}>Cred</span>
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            &copy; {new Date().getFullYear()} All rights reserved.
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>
                            <span className="live-dot" style={{ width: 5, height: 5 }} /> Mainnet Active
                        </span>
                        {['Etherscan', 'Contract Source'].map(lbl => (
                            <a key={lbl} href="#"
                                style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', transition: 'color 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--blue-accent)'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                {lbl} <ExternalLink size={11} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

        </div>
    );
}
