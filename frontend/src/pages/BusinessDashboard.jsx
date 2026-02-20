import React, { useState } from 'react';
import {
    Wallet, TrendingDown, TrendingUp, ShoppingCart, AlertCircle,
    CheckCircle, Zap, ArrowRight, Activity, ExternalLink, RefreshCw, X
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

/* ── Mock data ───────────────────────────────────── */
const chartData = [
    { month: 'Sep', emissions: 420, credits: 180 },
    { month: 'Oct', emissions: 410, credits: 240 },
    { month: 'Nov', emissions: 430, credits: 310 },
    { month: 'Dec', emissions: 390, credits: 390 },
    { month: 'Jan', emissions: 400, credits: 480 },
    { month: 'Feb', emissions: 375, credits: 560 },
];

const listings = [
    { id: 1, seller: '0x1e8…b52', name: 'GreenRoots NGO', amount: 500, priceEth: '0.021', totalEth: '10.5', certified: 'Gold Standard', available: true },
    { id: 2, seller: '0x3d9…a80', name: 'SolarPath Ltd.', amount: 200, priceEth: '0.019', totalEth: '3.8', certified: 'VCS', available: true },
    { id: 3, seller: '0x5f2…c11', name: 'WindGen Corp.', amount: 1200, priceEth: '0.018', totalEth: '21.6', certified: 'Gold Standard', available: true },
    { id: 4, seller: '0x8a7…d44', name: 'OceanBlue Fund', amount: 80, priceEth: '0.025', totalEth: '2.0', certified: 'Plan Vivo', available: false },
];

const myTrades = [
    { id: '0xabc…', date: '2026-02-18', amount: 150, price: '3.15 ETH', status: 'Confirmed' },
    { id: '0xdef…', date: '2026-02-10', amount: 80, price: '1.52 ETH', status: 'Confirmed' },
    { id: '0xghi…', date: '2026-01-28', amount: 200, price: '3.8 ETH', status: 'Confirmed' },
];

/* ── Helper Components ────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem' }}>
            <p style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {p.value}</p>
            ))}
        </div>
    );
}

function Modal({ open, onClose, listing, onBuy }) {
    const [qty, setQty] = useState(listing?.amount || 1);
    if (!open || !listing) return null;
    const total = (qty * parseFloat(listing.priceEth)).toFixed(4);
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
            <div style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Purchase Credits</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}><X size={18} /></button>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '4px' }}>Seller</p>
                    <p style={{ fontWeight: 600, color: '#f1f5f9' }}>{listing.name} <span style={{ fontFamily: 'monospace', color: '#8b5cf6', fontSize: '0.8rem' }}>({listing.seller})</span></p>
                    <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '10px', marginBottom: '4px' }}>Price per ton</p>
                    <p style={{ fontWeight: 700, color: '#f59e0b', fontSize: '1.1rem' }}>{listing.priceEth} ETH</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '8px' }}>Certification: <span className="badge badge-green" style={{ marginLeft: '6px' }}>{listing.certified}</span></p>
                </div>
                <div style={{ marginBottom: '18px' }}>
                    <label className="field-label">Quantity (tons)</label>
                    <input
                        type="number"
                        min={1}
                        max={listing.amount}
                        value={qty}
                        onChange={e => setQty(Number(e.target.value))}
                        className="input-field"
                    />
                </div>
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#94a3b8' }}>
                        <span>Subtotal</span><span style={{ color: '#f1f5f9', fontWeight: 700 }}>{total} ETH</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', marginTop: '6px' }}>
                        <span>Gas (est.)</span><span>~0.003 ETH</span>
                    </div>
                </div>
                <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { onBuy(listing, qty); onClose(); }}>
                    <Zap size={16} /> Confirm Purchase via MetaMask
                </button>
            </div>
        </div>
    );
}

/* ── Main Component ──────────────────────────────── */
export default function BusinessDashboard() {
    const [walletConnected, setWalletConnected] = useState(false);
    const [wallet, setWallet] = useState('');
    const [txStatus, setTxStatus] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedListing, setSelectedListing] = useState(null);

    const connectWallet = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setWallet(accounts[0]);
                setWalletConnected(true);
            } catch (err) {
                setTxStatus({ type: 'error', msg: 'Wallet connection rejected.' });
            }
        } else {
            setTxStatus({ type: 'error', msg: 'MetaMask not detected. Please install it.' });
        }
    };

    const handleBuy = (listing, qty) => {
        setTxStatus({ type: 'pending', msg: `Purchasing ${qty} tons from ${listing.name}… Confirm in MetaMask.` });
        setTimeout(() => setTxStatus({ type: 'success', msg: `✅ Trade executed! ${qty} tons credited to your wallet.` }), 3000);
    };

    const openModal = (listing) => { setSelectedListing(listing); setModalOpen(true); };

    const deficit = 470;
    const balance = 1120;
    const emissions = 1590;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* ── Header ────────────────────────────────── */}
            <div className="slide-up" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        Business <span className="gradient-text">Buyer Portal</span>
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '0.88rem' }}>
                        Track emissions, manage your carbon credit balance, and purchase offsets.
                    </p>
                </div>
                {!walletConnected
                    ? <button className="btn-wallet" onClick={connectWallet}><Wallet size={16} /> Connect MetaMask</button>
                    : <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px' }}>
                        <CheckCircle size={16} color="#10b981" />
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.06em' }}>CONNECTED</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>{wallet.slice(0, 6)}…{wallet.slice(-4)}</div>
                        </div>
                    </div>
                }
            </div>

            {/* ── TX Status Toast ────────────────────────── */}
            {txStatus && (
                <div className="slide-up" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: txStatus.type === 'error' ? 'rgba(239,68,68,0.1)' : txStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${txStatus.type === 'error' ? 'rgba(239,68,68,0.3)' : txStatus.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '12px' }}>
                    {txStatus.type === 'pending' ? <RefreshCw size={16} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} /> : txStatus.type === 'success' ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                    <span style={{ fontSize: '0.875rem', color: '#f1f5f9' }}>{txStatus.msg}</span>
                    <button onClick={() => setTxStatus(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>
                </div>
            )}

            {/* ── Carbon Status Cards ────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {[
                    { label: 'Carbon Produced', value: `${emissions.toLocaleString()} T`, icon: TrendingUp, color: '#ef4444', cls: 'stat-red' },
                    { label: 'Credits Owned', value: `${balance.toLocaleString()} T`, icon: CheckCircle, color: '#10b981', cls: 'stat-green' },
                    { label: 'Net Deficit', value: `${deficit} T`, icon: AlertCircle, color: '#f59e0b', cls: 'stat-gold' },
                    { label: 'Credits Purchased', value: '430 T', icon: ShoppingCart, color: '#3b82f6', cls: 'stat-blue' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`glass-card ${s.cls} slide-up-${i + 1}`} style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <p style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                                <div style={{ width: 36, height: 36, borderRadius: '10px', background: `${s.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon size={18} color={s.color} />
                                </div>
                            </div>
                            <p style={{ fontSize: '1.7rem', fontWeight: 800, color: s.color }}>{s.value}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── Deficit Progress ───────────────────────── */}
            <div className="glass-card-static slide-up" style={{ padding: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '4px' }}>Carbon Neutrality Progress</h3>
                        <p style={{ color: '#475569', fontSize: '0.78rem' }}>You need {deficit} more tons to reach net-zero status.</p>
                    </div>
                    <button className="btn-primary" onClick={() => listings[0] && openModal(listings[0])}>
                        <ShoppingCart size={15} /> Buy Credits
                    </button>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(balance / emissions) * 100}%`, background: 'linear-gradient(90deg,#10b981,#3b82f6)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: '#475569' }}>
                    <span>Credits: {balance}T</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{Math.round((balance / emissions) * 100)}% offset</span>
                    <span>Target: {emissions}T</span>
                </div>
            </div>

            {/* ── Chart ────────────────────────────────── */}
            <div className="glass-card-static slide-up" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Emissions vs Credits Over Time</h3>
                        <p style={{ color: '#475569', fontSize: '0.78rem' }}>Monthly trend showing your path to carbon neutrality</p>
                    </div>
                    <span className="badge badge-blue"><Activity size={11} /> Monthly</span>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#94a3b8' }} />
                        <Line type="monotone" dataKey="emissions" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Emissions (T)" />
                        <Line type="monotone" dataKey="credits" stroke="#10b981" strokeWidth={2.5} dot={false} name="Credits (T)" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* ── Marketplace Listings ───────────────────── */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Available Market Listings</h3>
                    <span className="badge badge-green">{listings.filter(l => l.available).length} Active</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {listings.map((l, i) => (
                        <div key={l.id} className={`glass-card slide-up-${(i % 4) + 1}`} style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                <div>
                                    <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem' }}>{l.name}</p>
                                    <p style={{ fontFamily: 'monospace', color: '#8b5cf6', fontSize: '0.75rem', marginTop: '2px' }}>{l.seller}</p>
                                </div>
                                <span className={`badge ${l.available ? 'badge-green' : 'badge-red'}`}>{l.available ? 'Available' : 'Sold'}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                                    <p style={{ color: '#475569', fontSize: '0.7rem', marginBottom: '3px' }}>AMOUNT</p>
                                    <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1rem' }}>{l.amount} T</p>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                                    <p style={{ color: '#475569', fontSize: '0.7rem', marginBottom: '3px' }}>PRICE/TON</p>
                                    <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1rem' }}>{l.priceEth} ETH</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <span className="badge badge-purple">{l.certified}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Total: <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{l.totalEth} ETH</span></span>
                            </div>
                            <button
                                className="btn-primary"
                                disabled={!l.available}
                                style={{ width: '100%', justifyContent: 'center', opacity: l.available ? 1 : 0.4 }}
                                onClick={() => l.available && openModal(l)}
                            >
                                <ShoppingCart size={15} /> {l.available ? 'Purchase Credits' : 'Listing Closed'}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── My Trade History ────────────────────────── */}
            <div className="glass-card-static slide-up" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '22px 22px 0' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>My Trade History</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>TX Hash</th><th>Date</th><th>Amount</th><th>Price</th><th>Status</th><th>Explorer</th></tr>
                        </thead>
                        <tbody>
                            {myTrades.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontFamily: 'monospace', color: '#8b5cf6', fontSize: '0.8rem' }}>{t.id}</td>
                                    <td>{t.date}</td>
                                    <td style={{ color: '#10b981', fontWeight: 600 }}>{t.amount} T</td>
                                    <td style={{ color: '#f59e0b', fontWeight: 600 }}>{t.price}</td>
                                    <td><span className="badge badge-green"><CheckCircle size={10} /> {t.status}</span></td>
                                    <td><a href="#" style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', textDecoration: 'none' }}><ExternalLink size={12} /></a></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} listing={selectedListing} onBuy={handleBuy} />

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
