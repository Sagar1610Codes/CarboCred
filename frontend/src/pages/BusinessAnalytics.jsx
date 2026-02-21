/**
 * pages/BusinessAnalytics.jsx
 *
 * Enriched analytics page with CarbonImpactDashboard, explanatory text,
 * contextual imagery, and a CTA section at the bottom.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useAccount } from 'wagmi'
import { CarbonImpactDashboard } from '../components/CarbonImpactDashboard'
import { SpotlightCard } from '../components/SpotlightCard'

export default function BusinessAnalytics() {
    const { isConnected } = useAccount()

    if (!isConnected) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={s.center}
            >
                <div style={s.gateCard}>
                    <span style={{ fontSize: '3.5rem' }}>📊</span>
                    <h1 style={s.gateTitle}>Connect Wallet for Analytics</h1>
                    <p style={s.gateSub}>
                        Connect your MetaMask wallet to view your real-time Carbon Impact Dashboard,
                        historical trends, and emission breakdown charts.
                    </p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            style={s.page}
        >
            {/* ── Page Hero ─────────────────────────────────────────────────── */}
            <div style={s.hero}>
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    style={s.heroText}
                >
                    <h1 style={s.heroTitle}>Your Carbon Impact Dashboard</h1>
                    <p style={s.heroSub}>
                        Track your organisation's real-time carbon credits, debt position, and net environmental impact.
                        Every data point here represents verified, on-chain activity — tamper-proof and transparent.
                    </p>
                </motion.div>
                <motion.img
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 0.85, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=480&auto=format&fit=crop&q=70"
                    alt="Wind turbines"
                    style={s.heroImg}
                    onError={e => { e.target.style.display = 'none' }}
                />
            </div>

            {/* ── Main Dashboard Component ──────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <CarbonImpactDashboard />
            </motion.div>

            {/* ── Explanatory Sections ──────────────────────────────────────── */}
            <motion.div
                style={s.explainGrid}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                    visible: { transition: { staggerChildren: 0.1 } }
                }}
            >
                {[
                    { icon: '🌱', title: 'What are Carbon Credits?', text: 'Each credit represents 1 tonne of CO₂ equivalent that your organisation has demonstrably reduced or removed from the atmosphere — for example through renewable energy use, reforestation, or efficiency upgrades. Credits are minted as ERC-1155 tokens (Token ID 0) after admin verification.' },
                    { icon: '🏭', title: 'What is Carbon Debt?', text: 'Debt units represent verified carbon emissions your entity has reported — industrial processes, transport, energy consumption, etc. Debt is minted as ERC-1155 Token ID 1. To reach net-zero, you must retire enough credits to offset your outstanding debt balance.' },
                    { icon: '⚖️', title: 'Understanding Net Position', text: 'Your Net Position = Credits − Debt. A <strong style="color: var(--obs-green)">negative (green) net</strong> means you\'ve reduced more than you\'ve emitted. A <strong style="color: var(--obs-red)">positive (red) net</strong> means you\'re a net emitter and can purchase credits to offset.' },
                    { icon: '📈', title: 'Reading Your Trend Chart', text: 'The trend chart tracks cumulative credit and debt balances over time, derived from on-chain transfer events. Upward credit movement indicates active reduction submissions; rising debt means ongoing emission submissions pending offset.' }
                ].map((item, idx) => (
                    <motion.div
                        key={idx}
                        variants={{
                            hidden: { opacity: 0, y: 20 },
                            visible: { opacity: 1, y: 0 }
                        }}
                    >
                        <SpotlightCard style={s.explainCard}>
                            <div style={s.explainIconRow}>
                                <span style={s.explainIcon}>{item.icon}</span>
                                <h3 style={s.explainTitle}>{item.title}</h3>
                            </div>
                            <p style={s.explainText} dangerouslySetInnerHTML={{ __html: item.text }} />
                        </SpotlightCard>
                    </motion.div>
                ))}
            </motion.div>

            {/* ── Visual Break: Forest image ─────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                style={s.imageBanner}
            >
                <img
                    src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=60"
                    alt="Forest canopy"
                    style={s.bannerImg}
                    onError={e => { e.target.style.display = 'none' }}
                />
                <div style={s.bannerOverlay}>
                    <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        style={s.bannerQuote}
                    >
                        "The best time to plant a tree was 20 years ago. The second best time is now."
                    </motion.p>
                    <motion.p
                        initial={{ y: 10, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        style={s.bannerSub}
                    >
                        Every credit you retire brings us closer to a net-zero future.
                    </motion.p>
                </div>
            </motion.div>

            {/* ── CTA Section ───────────────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                style={s.cta}
            >
                <div style={s.ctaLeft}>
                    <h2 style={s.ctaTitle}>Ready to offset your carbon footprint?</h2>
                    <p style={s.ctaSub}>
                        Browse verified carbon credits on the marketplace and retire them against your debt position.
                        Every purchase directly funds real-world emission reduction projects.
                    </p>
                </div>
                <div style={s.ctaRight}>
                    <motion.span
                        animate={{ y: [0, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        style={s.ctaIcon}
                    >
                        🌿
                    </motion.span>
                    <p style={{ color: 'var(--obs-text-2)', fontSize: '0.875rem', textAlign: 'center', margin: '0.5rem 0 0' }}>
                        Switch to the <strong>Marketplace</strong> tab to get started
                    </p>
                </div>
            </motion.div>
        </motion.div>
    )
}

const s = {
    page: {
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2.5rem',
        animation: 'caFadeIn 0.5s ease',
    },
    center: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
    },
    gateCard: {
        background: 'var(--obs-surface)',
        border: '1px solid var(--obs-border)',
        borderRadius: '1.5rem',
        padding: '3rem',
        maxWidth: '480px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
    },
    gateTitle: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--obs-text-1)',
    },
    gateSub: {
        color: 'var(--obs-text-2)',
        fontSize: '0.95rem',
        lineHeight: 1.7,
    },
    hero: {
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        flexWrap: 'wrap',
    },
    heroText: { flex: 1, minWidth: '240px' },
    heroTitle: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '2.25rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        color: 'var(--obs-text-1)',
        margin: '0 0 0.75rem',
        background: 'linear-gradient(135deg, var(--obs-text-1) 30%, var(--obs-green) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1.1,
    },
    heroSub: {
        color: 'var(--obs-text-2)',
        fontSize: '1rem',
        lineHeight: 1.7,
        maxWidth: '560px',
    },
    heroImg: {
        width: '260px',
        height: '180px',
        objectFit: 'cover',
        borderRadius: '1rem',
        border: '1px solid var(--obs-border)',
        opacity: 0.85,
        flexShrink: 0,
    },
    explainGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.25rem',
    },
    explainCard: {
        background: 'var(--obs-surface)',
        border: '1px solid var(--obs-border)',
        borderRadius: '1rem',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        transition: 'background 0.25s',
    },
    explainIconRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
    },
    explainIcon: { fontSize: '1.4rem' },
    explainTitle: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--obs-text-1)',
    },
    explainText: {
        color: 'var(--obs-text-2)',
        fontSize: '0.9rem',
        lineHeight: 1.7,
    },
    imageBanner: {
        position: 'relative',
        borderRadius: '1.25rem',
        overflow: 'hidden',
        height: '200px',
        border: '1px solid var(--obs-border)',
    },
    bannerImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        opacity: 0.55,
    },
    bannerOverlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(16,185,129,0.15))',
    },
    bannerQuote: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.15rem',
        fontWeight: 600,
        color: '#f8fafc',
        fontStyle: 'italic',
        marginBottom: '0.4rem',
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
    },
    bannerSub: {
        fontSize: '0.85rem',
        color: 'rgba(248,250,252,0.75)',
        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
    },
    cta: {
        background: 'linear-gradient(135deg, var(--obs-green-dim), var(--obs-blue-dim))',
        border: '1px solid var(--obs-border)',
        borderRadius: '1.25rem',
        padding: '2rem 2.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '2rem',
        flexWrap: 'wrap',
        transition: 'background 0.25s',
    },
    ctaLeft: { flex: 1, minWidth: '240px' },
    ctaTitle: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.4rem',
        fontWeight: 700,
        color: 'var(--obs-text-1)',
        marginBottom: '0.5rem',
        letterSpacing: '-0.02em',
    },
    ctaSub: {
        color: 'var(--obs-text-2)',
        fontSize: '0.95rem',
        lineHeight: 1.7,
    },
    ctaRight: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    ctaIcon: { fontSize: '3rem' },
}
