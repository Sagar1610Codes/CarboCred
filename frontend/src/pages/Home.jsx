import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const FEATURES = [
    {
        icon: '🪙',
        title: 'ERC-1155 Carbon Credits',
        desc: 'Every verified offset is minted as a CREDIT_TOKEN on-chain. Immutable, auditable, and instantly verifiable by anyone.',
    },
    {
        icon: '🏭',
        title: 'Soulbound Emission Debt',
        desc: 'Carbon liabilities are recorded as non-transferable DEBT_TOKENs — permanently tied to the emitting entity until cleared.',
    },
    {
        icon: '⚖️',
        title: 'Net Position Enforcement',
        desc: 'Sellers can only list credits up to their net position (credits minus debt), preventing greenwashing at the protocol level.',
    },
    {
        icon: '⚡',
        title: 'Real-Time Trade Feed',
        desc: 'Every credit award, debt recording, and trade is broadcast over WebSocket the moment the block is mined.',
    },
    {
        icon: '🔒',
        title: 'Role-Based Access',
        desc: 'Credit issuance is locked to the BACKEND_ROLE wallet. No user can award themselves credits. The contract enforces it.',
    },
    {
        icon: '🌐',
        title: 'Self-Custody Payments',
        desc: 'ETH goes directly from buyer to seller on-chain. The marketplace never holds funds — zero custody risk.',
    },
]

const STATS = [
    { value: '1,000', suffix: '+', label: 'Test Credits Issued' },
    { value: '31337', suffix: '', label: 'Hardhat Chain ID' },
    { value: '100', suffix: '%', label: 'On-Chain Transparency' },
]

const STEPS = [
    { num: '01', title: 'Connect Wallet', desc: 'Link MetaMask to the Hardhat local network or Sepolia testnet.' },
    { num: '02', title: 'Get Credits', desc: 'The backend issues carbon credits to green energy generators via the REST API.' },
    { num: '03', title: 'List on Market', desc: 'List your credits at any ETH price. The net position gate prevents over-selling.' },
    { num: '04', title: 'Trade & Settle', desc: 'Buyers pay ETH directly to sellers. Tokens settle atomically in the same transaction.' },
]

export default function Home() {
    return (
        <div className="app">
            <Navbar />

            {/* ── Hero ──────────────────────────────────────────────────────── */}
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-eyebrow">
                        <span>🌿</span> Blockchain Carbon Credit Marketplace
                    </div>

                    <h1>
                        Trade Carbon Credits<br />
                        <span className="highlight">with On-Chain Truth</span>
                    </h1>

                    <p className="hero-sub">
                        CarboCred is a decentralised marketplace where verified carbon offsets are
                        minted as ERC-1155 tokens and emission liabilities are baked into the protocol
                        as soulbound debt — transparent, trustless, and tamper-proof.
                    </p>

                    <div className="hero-actions">
                        <Link to="/dashboard" className="btn btn-primary btn-lg">
                            Launch Dashboard →
                        </Link>
                        <a
                            href="https://github.com/Sagar1610Codes/CarboCred"
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-lg"
                        >
                            View Source ↗
                        </a>
                    </div>
                </div>
            </section>

            {/* ── Stats Bar ─────────────────────────────────────────────────── */}
            <div className="stats-bar">
                {STATS.map(s => (
                    <div key={s.label} className="stat-item">
                        <div className="stat-value">{s.value}<span>{s.suffix}</span></div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Features ──────────────────────────────────────────────────── */}
            <section className="features">
                <div className="features-header">
                    <h2>Everything you need for carbon trading</h2>
                    <p>From issuance to settlement, every step is enforced by smart contracts — not intermediaries.</p>
                </div>

                <div className="features-grid">
                    {FEATURES.map(f => (
                        <div key={f.title} className="feature-card">
                            <div className="feature-icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ──────────────────────────────────────────────── */}
            <section className="how-it-works">
                <div className="hiw-inner">
                    <div className="hiw-header">
                        <h2>How it works</h2>
                        <p>Four steps from wallet to trade</p>
                    </div>

                    <div className="steps">
                        {STEPS.map(s => (
                            <div key={s.num} className="step">
                                <div className="step-num">{s.num}</div>
                                <h4>{s.title}</h4>
                                <p>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ────────────────────────────────────────────────── */}
            <div className="cta-banner">
                <div className="cta-inner">
                    <h2>Ready to trade carbon credits on-chain?</h2>
                    <p>
                        Connect MetaMask to the Hardhat local network and start issuing,
                        listing, and buying tokenised carbon offsets in minutes.
                    </p>
                    <Link to="/dashboard" className="btn btn-primary btn-lg">
                        Open Dashboard →
                    </Link>
                </div>
            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <footer className="footer">
                <div className="footer-brand">
                    <span>🌿</span> CarboCred
                </div>
                <p>Built on Ethereum · ERC-1155 · Open Source</p>
                <p>Hardhat · Node.js · React + Vite · wagmi</p>
            </footer>
        </div>
    )
}
