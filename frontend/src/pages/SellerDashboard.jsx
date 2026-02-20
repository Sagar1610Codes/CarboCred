import React, { useState } from 'react';
import {
    Wallet, Leaf, DollarSign, CheckCircle, AlertCircle,
    PlusCircle, List, BarChart2, X, ArrowUpRight,
    Activity, RefreshCw, ExternalLink, Zap, TrendingUp
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';

/* ── Mock data ───────────────────────────────────── */
const earningsData = [
    { month: 'Aug', revenue: 1.2 },
    { month: 'Sep', revenue: 2.4 },
    { month: 'Oct', revenue: 1.8 },
    { month: 'Nov', revenue: 3.6 },
    { month: 'Dec', revenue: 4.2 },
    { month: 'Jan', revenue: 5.8 },
];

const myListings = [
    { id: 1, amount: 500, priceEth: '0.021', status: 'Active', sold: 200, created: '2026-01-15' },
    { id: 2, amount: 200, priceEth: '0.023', status: 'Sold Out', sold: 200, created: '2026-01-02' },
    { id: 3, amount: 800, priceEth: '0.019', status: 'Active', sold: 350, created: '2026-02-10' },
];

const tradeHistory = [
    { id: '0xa12…f', buyer: '0x9f1…0d7', amount: 200, price: '4.2 ETH', date: '2026-02-18' },
    { id: '0xb83…c', buyer: '0x7c4…f19', amount: 100, price: '1.9 ETH', date: '2026-02-12' },
    { id: '0xc59…e', buyer: '0x9f1…0d7', amount: 350, price: '7.35 ETH', date: '2026-01-28' },
];

/* ── Custom Tooltip ──────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: '0.8rem' }}>
            <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
            <p style={{ color: '#10b981', fontWeight: 700 }}>{payload[0].value} ETH</p>
        </div>
    );
}

/* ── Listing Form Modal ───────────────────────────── */
function ListingModal({ open, onClose, onList }) {
    const [form, setForm] = useState({ amount: '', price: '' });
    if (!open) return null;
    const total = form.amount && form.price ? (parseFloat(form.amount) * parseFloat(form.price)).toFixed(4) : '—';
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
            <div style={{ background: '#0d1525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Create New Listing</h3>
                        <p style={{ color: '#475569', fontSize: '0.78rem', marginTop: '4px' }}>List your carbon credits on the marketplace smart contract</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}><X size={18} /></button>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label className="field-label">Amount of Credits (tons)</label>
                    <input className="input-field" type="number" placeholder="e.g. 500" value={form.amount}
                        onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label className="field-label">Price per Ton (ETH)</label>
                    <input className="input-field" type="number" placeholder="e.g. 0.021" step="0.001" value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>

                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span style={{ color: '#94a3b8' }}>Total Value</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>{total} ETH</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '6px', color: '#475569' }}>
                        <span>Platform fee (2%)</span>
                        <span>{form.amount && form.price ? (parseFloat(total) * 0.02).toFixed(5) : '—'} ETH</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={onClose}>Cancel</button>
                    <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }}
                        onClick={() => { onList(form); onClose(); }}>
                        <Zap size={15} /> Publish to Blockchain
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── Main Component ──────────────────────────────── */
export default function SellerDashboard() {
    const [walletConnected, setWalletConnected] = useState(false);
    const [wallet, setWallet] = useState('');
    const [txStatus, setTxStatus] = useState(null);
    const [listingOpen, setListingOpen] = useState(false);
    const [listings, setListings] = useState(myListings);

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
            setTxStatus({ type: 'error', msg: 'MetaMask not found. Please install it.' });
        }
    };

    const handleList = (form) => {
        setTxStatus({ type: 'pending', msg: `Submitting listing of ${form.amount} tons @ ${form.price} ETH/T to contract…` });
        const newEntry = { id: listings.length + 1, amount: parseInt(form.amount), priceEth: form.price, status: 'Active', sold: 0, created: new Date().toISOString().slice(0, 10) };
        setTimeout(() => {
            setListings(prev => [newEntry, ...prev]);
            setTxStatus({ type: 'success', msg: `✅ Listing created! ${form.amount} tons listed on the marketplace.` });
        }, 2500);
    };

    const totalRevenue = '12.5';
    const availableCredits = 490;
    const treesPlanted = 50000;
    const creditsMinted = 2450;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* ── Header ────────────────────────────────── */}
            <div className="slide-up" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                        Project <span className="gradient-text">Seller Portal</span>
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '0.88rem' }}>
                        Manage your carbon credits, create listings, and track earnings from the marketplace.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {walletConnected
                        ? <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '12px' }}>
                            <CheckCircle size={16} color="#10b981" />
                            <div>
                                <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, letterSpacing: '0.06em' }}>CONNECTED</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#94a3b8' }}>{wallet.slice(0, 6)}…{wallet.slice(-4)}</div>
                            </div>
                        </div>
                        : <button className="btn-wallet" onClick={connectWallet}><Wallet size={16} /> Connect MetaMask</button>
                    }
                    <button className="btn-primary" onClick={() => setListingOpen(true)}>
                        <PlusCircle size={15} /> New Listing
                    </button>
                </div>
            </div>

            {/* ── TX Status ─────────────────────────────── */}
            {txStatus && (
                <div className="slide-up" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: txStatus.type === 'error' ? 'rgba(239,68,68,0.1)' : txStatus.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${txStatus.type === 'error' ? 'rgba(239,68,68,0.3)' : txStatus.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '12px' }}>
                    {txStatus.type === 'pending' ? <RefreshCw size={16} color="#f59e0b" style={{ animation: 'spin 1s linear infinite' }} /> : txStatus.type === 'success' ? <CheckCircle size={16} color="#10b981" /> : <AlertCircle size={16} color="#ef4444" />}
                    <span style={{ fontSize: '0.875rem', color: '#f1f5f9' }}>{txStatus.msg}</span>
                    <button onClick={() => setTxStatus(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={14} /></button>
                </div>
            )}

            {/* ── Stats Grid ────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px' }}>
                {[
                    { label: 'Trees Planted', value: treesPlanted.toLocaleString(), icon: Leaf, color: '#10b981', cls: 'stat-green' },
                    { label: 'Credits Minted', value: `${creditsMinted.toLocaleString()} T`, icon: BarChart2, color: '#14b8a6', cls: 'stat-teal' },
                    { label: 'Available Credits', value: `${availableCredits} T`, icon: List, color: '#3b82f6', cls: 'stat-blue' },
                    { label: 'Revenue Generated', value: `${totalRevenue} ETH`, icon: DollarSign, color: '#f59e0b', cls: 'stat-gold' },
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
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '0.72rem' }}>
                                <TrendingUp size={12} />
                                <span>+8.2% this month</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Revenue Chart + Credit Breakdown ──────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px' }}>

                {/* Revenue Chart */}
                <div className="glass-card-static" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>Monthly Revenue (ETH)</h3>
                            <p style={{ color: '#475569', fontSize: '0.78rem' }}>Earnings from credit sales over time</p>
                        </div>
                        <span className="badge badge-gold"><Activity size={11} /> Trending Up</span>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={earningsData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="revenue" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="Revenue (ETH)" />
                            <defs>
                                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Credit Breakdown */}
                <div className="glass-card-static" style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '18px' }}>Credit Breakdown</h3>
                    {[
                        { label: 'Total Minted', value: creditsMinted, color: '#10b981', pct: 100 },
                        { label: 'Sold', value: creditsMinted - availableCredits, color: '#3b82f6', pct: Math.round(((creditsMinted - availableCredits) / creditsMinted) * 100) },
                        { label: 'Available', value: availableCredits, color: '#f59e0b', pct: Math.round((availableCredits / creditsMinted) * 100) },
                    ].map(item => (
                        <div key={item.label} style={{ marginBottom: '18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem' }}>
                                <span style={{ color: '#94a3b8' }}>{item.label}</span>
                                <span style={{ fontWeight: 700, color: item.color }}>{item.value.toLocaleString()} T ({item.pct}%)</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${item.pct}%`, background: item.color }} />
                            </div>
                        </div>
                    ))}

                    <div className="divider" style={{ margin: '18px 0' }} />
                    <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setListingOpen(true)}>
                        <PlusCircle size={15} /> Create New Listing
                    </button>
                </div>
            </div>

            {/* ── My Listings Table ─────────────────────── */}
            <div className="glass-card-static" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '22px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>My Active Listings</h3>
                        <p style={{ color: '#475569', fontSize: '0.78rem' }}>Listings created via CarbonMarketplace smart contract</p>
                    </div>
                    <span className="badge badge-green">{listings.filter(l => l.status === 'Active').length} Active</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>Listing ID</th><th>Amount (T)</th><th>Price/T (ETH)</th><th>Sold</th><th>Remaining</th><th>Created</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                            {listings.map(l => (
                                <tr key={l.id}>
                                    <td style={{ fontFamily: 'monospace', color: '#8b5cf6', fontSize: '0.8rem' }}>#{l.id.toString().padStart(4, '0')}</td>
                                    <td style={{ color: '#f1f5f9', fontWeight: 600 }}>{l.amount}</td>
                                    <td style={{ color: '#f59e0b', fontWeight: 600 }}>{l.priceEth}</td>
                                    <td style={{ color: '#3b82f6', fontWeight: 600 }}>{l.sold}</td>
                                    <td style={{ color: '#10b981', fontWeight: 600 }}>{l.amount - l.sold}</td>
                                    <td style={{ color: '#94a3b8' }}>{l.created}</td>
                                    <td><span className={`badge ${l.status === 'Active' ? 'badge-green' : 'badge-red'}`}>{l.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Trade History ─────────────────────────── */}
            <div className="glass-card-static" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '22px 22px 0' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Completed Sales</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr><th>TX Hash</th><th>Buyer</th><th>Amount (T)</th><th>Revenue</th><th>Date</th><th>Explorer</th></tr>
                        </thead>
                        <tbody>
                            {tradeHistory.map(t => (
                                <tr key={t.id}>
                                    <td style={{ fontFamily: 'monospace', color: '#8b5cf6', fontSize: '0.8rem' }}>{t.id}</td>
                                    <td style={{ fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.8rem' }}>{t.buyer}</td>
                                    <td style={{ color: '#10b981', fontWeight: 600 }}>{t.amount}</td>
                                    <td style={{ color: '#f59e0b', fontWeight: 700 }}>{t.price}</td>
                                    <td style={{ color: '#94a3b8' }}>{t.date}</td>
                                    <td><a href="#" style={{ color: '#3b82f6', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', textDecoration: 'none' }}><ExternalLink size={12} /></a></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ListingModal open={listingOpen} onClose={() => setListingOpen(false)} onList={handleList} />

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
