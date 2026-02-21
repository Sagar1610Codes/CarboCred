/**
 * pages/MarketplacePage.jsx
 *
 * Premium marketplace view extracted from App.jsx.
 * Replaces the bare grid layout with animated card sections,
 * a hero stats strip, rich listing cards, and framer-motion springs.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatEther } from 'viem'
import { ListingStatus } from '../lib/contracts'

// ── Animation presets ──────────────────────────────────────────────────────
const fadeUp = {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { type: 'spring', stiffness: 120, damping: 20 },
}

const stagger = (i) => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { type: 'spring', stiffness: 100, damping: 18, delay: i * 0.07 },
})

function shortenAddr(addr) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatChip({ icon, label, value, color }) {
    return (
        <motion.div
            style={{ ...s.statChip, borderColor: color + '33' }}
            whileHover={{ scale: 1.03, borderColor: color + '88' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <span style={{ fontSize: '1.2rem' }}>{icon}</span>
            <div>
                <p style={s.statChipLabel}>{label}</p>
                <p style={{ ...s.statChipValue, color }}>{value}</p>
            </div>
        </motion.div>
    )
}

function ListingCard({ listing, address, onBuy, onCancel, isPurchasing, isCancelling, index }) {
    const totalEth = formatEther(listing.amount * listing.pricePerCredit)
    const priceEth = formatEther(listing.pricePerCredit)
    const isOwn = address?.toLowerCase() === listing.seller.toLowerCase()

    return (
        <motion.div
            {...stagger(index)}
            whileHover={{ y: -3, boxShadow: '0 12px 40px rgba(16,185,129,0.15)' }}
            style={s.listingCard}
        >
            {/* Top: amount + badge */}
            <div style={s.listingTop}>
                <div>
                    <p style={s.listingAmount}>
                        <span style={{ color: 'var(--obs-green)', fontSize: '1.5rem', fontWeight: 800 }}>
                            {listing.amount.toString()}
                        </span>
                        <span style={{ color: 'var(--obs-text-3)', fontSize: '0.8rem', marginLeft: '0.35rem' }}>
                            credits
                        </span>
                    </p>
                    <p style={s.listingSeller}>
                        {isOwn
                            ? <span style={{ color: 'var(--obs-green)', fontWeight: 600 }}>🟢 Your listing</span>
                            : <><span style={s.muted}>Seller:</span> <code style={s.code}>{shortenAddr(listing.seller)}</code></>
                        }
                    </p>
                </div>
                <div style={s.priceBlock}>
                    <p style={s.priceEth}>{priceEth}</p>
                    <p style={s.perCredit}>ETH / credit</p>
                </div>
            </div>

            {/* Divider */}
            <div style={s.divider} />

            {/* Bottom: total + actions */}
            <div style={s.listingBottom}>
                <span style={s.totalRow}>
                    Total: <strong style={{ color: 'var(--obs-text-1)' }}>{totalEth} ETH</strong>
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!isOwn && address && (
                        <motion.button
                            style={s.btnBuy}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            onClick={() => onBuy(listing.id, listing.amount, listing.pricePerCredit)}
                            disabled={isPurchasing}
                        >
                            {isPurchasing ? '⟳ Buying…' : `Buy · ${totalEth} ETH`}
                        </motion.button>
                    )}
                    {isOwn && Number(listing.status) === ListingStatus.Open && (
                        <motion.button
                            style={s.btnCancel}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            onClick={() => onCancel(listing.id)}
                            disabled={isCancelling}
                        >
                            {isCancelling ? '⟳…' : 'Cancel'}
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

function FeedItem({ ev, index }) {
    const isCredit = ev?.type?.includes('Credit') || ev?.type?.includes('CREDIT') || ev?.type === 'Transfer'
    const isListing = ev?.type?.includes('List') || ev?.type?.includes('Purchase')
    const icon = isListing ? '💱' : isCredit ? '🌱' : '🏭'
    const color = isListing ? 'var(--obs-blue)' : isCredit ? 'var(--obs-green)' : 'var(--obs-red)'

    return (
        <motion.li
            {...stagger(index)}
            style={s.feedItem}
        >
            <span style={{ ...s.feedBadge, color, background: color + '15', borderColor: color + '30' }}>
                {icon} {ev.type ?? 'Event'}
            </span>
            <span style={s.feedDetail}>
                {ev.entity ? shortenAddr(ev.entity) : ''}
                {ev.amount ? ` · ${ev.amount?.toString()} credits` : ''}
                {ev.blockNumber ? <span style={s.feedBlock}> #{ev.blockNumber?.toString()}</span> : ''}
            </span>
        </motion.li>
    )
}

// ── Main MarketplacePage ────────────────────────────────────────────────────
export default function MarketplacePage({
    // position
    isConnected, credits, debt, netCredits, posLoading,
    // listings
    listings, listLoading, refetchListings,
    // actions
    onBuy, isPurchasing, purchaseError,
    onCancel, isCancelling,
    // list form
    listAmount, setListAmount, listPriceEth, setListPriceEth,
    onList, isListing, listError, localListError,
    // calculator
    calcInputs, setCalc, calcResult,
    onAwardSubmit, isSubmitting, awardError, awardResult,
    // feed
    events, wsConnected,
    // wallet
    address,
}) {
    const [activePanel, setActivePanel] = useState('calculator') // 'calculator' | 'list'

    return (
        <motion.div style={s.page} {...fadeUp}>

            {/* ── Hero Stats Strip ────────────────────────────────────────── */}
            <motion.div style={s.heroStrip} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 18 }}>
                <div>
                    <h1 style={s.heroTitle}>Carbon Credit Marketplace</h1>
                    <p style={s.heroSub}>
                        Buy, sell, and retire verified carbon credits — all on-chain, all trustless.
                    </p>
                </div>
                {isConnected && !posLoading && (
                    <div style={s.statsStrip}>
                        <StatChip icon="🟢" label="Credits" value={credits.toString()} color="#10b981" />
                        <StatChip icon="🔴" label="Debt" value={debt.toString()} color="#f87171" />
                        <StatChip
                            icon="⚖️"
                            label="Net Position"
                            value={(netCredits >= 0n ? '+' : '') + netCredits.toString()}
                            color={netCredits <= 0n ? '#10b981' : '#f87171'}
                        />
                        <StatChip icon="📋" label="Open Listings" value={listings.length.toString()} color="#3b82f6" />
                    </div>
                )}
            </motion.div>

            {/* ── Main Grid ───────────────────────────────────────────────── */}
            <div style={s.mainGrid}>

                {/* ── Left Column: Actions ─────────────────────────────────── */}
                <div style={s.leftCol}>

                    {/* Panel switcher */}
                    <div style={s.panelTabs}>
                        {[
                            { id: 'calculator', label: '🌱 Calculate & Earn', disabled: !isConnected },
                            { id: 'list', label: '📤 List Credits', disabled: !isConnected },
                        ].map(tab => (
                            <motion.button
                                key={tab.id}
                                style={activePanel === tab.id ? s.panelTabActive : s.panelTab}
                                onClick={() => !tab.disabled && setActivePanel(tab.id)}
                                whileHover={!tab.disabled ? { scale: 1.02 } : {}}
                                whileTap={!tab.disabled ? { scale: 0.98 } : {}}
                                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            >
                                {tab.label}
                            </motion.button>
                        ))}
                    </div>

                    {/* Carbon Position Mini Card */}
                    <motion.div style={s.posCard} whileHover={{ borderColor: 'var(--obs-border-hover)' }} transition={{ duration: 0.2 }}>
                        <h2 style={s.cardTitle}>My Carbon Position</h2>
                        {!isConnected ? (
                            <p style={s.muted}>Connect wallet to view your position</p>
                        ) : posLoading ? (
                            <p style={s.muted}>Loading…</p>
                        ) : (
                            <div style={s.posRows}>
                                {[
                                    { icon: '🟢', label: 'Credits (offsets)', value: credits.toString(), color: 'var(--obs-green)' },
                                    { icon: '🔴', label: 'Debt (emissions)', value: debt.toString(), color: 'var(--obs-red)' },
                                    { icon: '⚖️', label: 'Net Position', value: (netCredits >= 0n ? '+' : '') + netCredits.toString(), color: netCredits <= 0n ? 'var(--obs-green)' : 'var(--obs-red)', bold: true },
                                ].map(row => (
                                    <div key={row.label} style={s.posRow}>
                                        <span style={s.posLabel}><span>{row.icon}</span> {row.label}</span>
                                        <span style={{ color: row.color, fontWeight: row.bold ? 800 : 600, fontFamily: 'monospace', fontSize: '0.95rem' }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Panel content */}
                    <AnimatePresence mode="wait">
                        {activePanel === 'calculator' ? (
                            <motion.div key="calc" style={s.panelCard} {...fadeUp}>
                                <h2 style={s.cardTitle}>🌱 Calculate &amp; Earn Credits</h2>
                                {!isConnected ? (
                                    <p style={s.muted}>Connect your wallet to submit activity</p>
                                ) : (
                                    <form onSubmit={onAwardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <p style={s.groupLabel}>📤 Emissions (carbon footprint)</p>
                                        <div style={s.calcGrid}>
                                            {[
                                                { field: 'energyKwh', label: 'Energy consumed (kWh)', placeholder: 'e.g. 250' },
                                                { field: 'carbonEmittedKg', label: 'Direct CO₂ emitted (kg)', placeholder: 'e.g. 80' },
                                                { field: 'vehicleKm', label: 'Vehicle distance (km)', placeholder: 'e.g. 400' },
                                            ].map(({ field, label, placeholder }) => (
                                                <div key={field} style={s.formField}>
                                                    <label style={s.label}>{label}</label>
                                                    <input style={s.input} type="number" min="0" step="any" placeholder={placeholder}
                                                        value={calcInputs[field]} onChange={e => setCalc(field, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>

                                        <p style={s.groupLabel}>📥 Reductions (offsets)</p>
                                        <div style={s.calcGrid}>
                                            {[
                                                { field: 'recycleKg', label: 'Waste recycled (kg)', placeholder: 'e.g. 30' },
                                                { field: 'treesPlanted', label: 'Trees planted', placeholder: 'e.g. 5' },
                                                { field: 'cleanEnergyKwh', label: 'Clean energy gen. (kWh)', placeholder: 'e.g. 150' },
                                            ].map(({ field, label, placeholder }) => (
                                                <div key={field} style={s.formField}>
                                                    <label style={s.label}>{label}</label>
                                                    <input style={s.input} type="number" min="0" step="any" placeholder={placeholder}
                                                        value={calcInputs[field]} onChange={e => setCalc(field, e.target.value)} />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Live result */}
                                        <motion.div style={s.resultBox} layout>
                                            <div style={s.resultRow}>
                                                <span style={s.muted}>📤 Emissions score</span>
                                                <span style={{ color: 'var(--obs-red)', fontWeight: 700, fontFamily: 'monospace' }}>−{calcResult.emissions.toFixed(2)}</span>
                                            </div>
                                            <div style={s.resultRow}>
                                                <span style={s.muted}>📥 Reduction score</span>
                                                <span style={{ color: 'var(--obs-green)', fontWeight: 700, fontFamily: 'monospace' }}>+{calcResult.reductions.toFixed(2)}</span>
                                            </div>
                                            <div style={{ ...s.resultRow, borderTop: '1px solid var(--obs-border)', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                                                <span style={{ fontWeight: 700, color: 'var(--obs-text-1)' }}>Net impact</span>
                                                <span style={{ color: calcResult.net >= 0 ? 'var(--obs-green)' : 'var(--obs-red)', fontWeight: 800, fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                                    {calcResult.net >= 0 ? '+' : ''}{Math.floor(calcResult.net)} pts
                                                </span>
                                            </div>
                                            {(Math.floor(calcResult.reductions) > 0 || Math.floor(calcResult.emissions) > 0) && (
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                    {Math.floor(calcResult.reductions) > 0 && <span style={s.mintChip}>✦ Mint {Math.floor(calcResult.reductions)} credit tokens</span>}
                                                    {Math.floor(calcResult.emissions) > 0 && <span style={s.debtChip}>✦ Record {Math.floor(calcResult.emissions)} debt tokens</span>}
                                                </div>
                                            )}
                                        </motion.div>

                                        {awardError && <p style={s.errorText}>{awardError}</p>}
                                        {awardResult && (
                                            <motion.div style={s.successBox} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
                                                <span>🏛 Request Submitted — Pending Government Audit</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--obs-text-3)', marginTop: '0.2rem', display: 'block' }}>
                                                    {awardResult.requestIds?.length === 2
                                                        ? 'Credit & Debt requests queued for admin review.'
                                                        : 'Your request has been queued for admin review.'}
                                                </span>
                                            </motion.div>
                                        )}

                                        <motion.button
                                            type="submit"
                                            style={calcResult.emissions === 0 && calcResult.reductions === 0 ? s.btnPrimaryDisabled : s.btnPrimary}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.97 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                            disabled={isSubmitting || (calcResult.emissions === 0 && calcResult.reductions === 0)}
                                        >
                                            {isSubmitting ? '⟳ Submitting…' : 'Submit Activity'}
                                        </motion.button>
                                    </form>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div key="list" style={s.panelCard} {...fadeUp}>
                                <h2 style={s.cardTitle}>📤 List Credits for Sale</h2>
                                {!isConnected ? (
                                    <p style={s.muted}>Connect wallet to list credits</p>
                                ) : (
                                    <form onSubmit={onList} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={s.formField}>
                                            <label style={s.label}>Amount (credits)</label>
                                            <input style={s.input} type="number" min="1" required
                                                value={listAmount} onChange={e => setListAmount(e.target.value)} placeholder="e.g. 100" />
                                        </div>
                                        <div style={s.formField}>
                                            <label style={s.label}>Price per credit (ETH)</label>
                                            <input style={s.input} type="text" required
                                                value={listPriceEth} onChange={e => setListPriceEth(e.target.value)} placeholder="e.g. 0.01" />
                                        </div>
                                        {localListError && <p style={s.errorText}>{localListError}</p>}
                                        {listError && <p style={s.errorText}>{listError.message?.slice(0, 120)}</p>}
                                        <motion.button type="submit" style={netCredits < 0n ? s.btnPrimaryDisabled : s.btnPrimary}
                                            whileHover={netCredits >= 0n ? { scale: 1.02 } : {}}
                                            whileTap={netCredits >= 0n ? { scale: 0.97 } : {}}
                                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                            disabled={isListing || netCredits < 0n}
                                        >
                                            {isListing ? '⟳ Waiting for wallet…' : netCredits < 0n ? 'Cannot Sell (Net Emitter)' : 'List Credits'}
                                        </motion.button>
                                        {netCredits < 0n && (
                                            <p style={{ color: 'var(--obs-red)', fontSize: '0.8rem' }}>
                                                ⚠ You're a net emitter. Offset your debt before selling.
                                            </p>
                                        )}
                                    </form>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── Right Column: Listings + Feed ──────────────────────── */}
                <div style={s.rightCol}>

                    {/* Active Listings */}
                    <motion.div style={s.panelCard} {...fadeUp}>
                        <div style={s.cardHeader}>
                            <h2 style={s.cardTitle}>Active Listings</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span style={s.countPill}>{listings.length} open</span>
                                <motion.button style={s.btnGhost} onClick={refetchListings}
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>↻</motion.button>
                            </div>
                        </div>

                        {listLoading ? (
                            <p style={s.muted}>Loading listings…</p>
                        ) : listings.length === 0 ? (
                            <div style={s.emptyState}>
                                <span style={{ fontSize: '2rem' }}>📋</span>
                                <p>No open listings yet. Be the first to list!</p>
                            </div>
                        ) : (
                            <motion.div style={s.listingsGrid} layout>
                                <AnimatePresence>
                                    {listings.map((listing, i) => (
                                        <ListingCard
                                            key={listing.id.toString()}
                                            listing={listing}
                                            address={address}
                                            onBuy={onBuy}
                                            onCancel={onCancel}
                                            isPurchasing={isPurchasing}
                                            isCancelling={isCancelling}
                                            index={i}
                                        />
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        )}
                        {purchaseError && <p style={s.errorText}>{purchaseError.message?.slice(0, 160)}</p>}
                    </motion.div>

                    {/* Live On-Chain Feed */}
                    <motion.div style={s.panelCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 18 }}>
                        <div style={s.cardHeader}>
                            <h2 style={s.cardTitle}>Live On-Chain Feed</h2>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: wsConnected ? 'var(--obs-green)' : '#64748b', display: 'inline-block', boxShadow: wsConnected ? '0 0 6px var(--obs-green)' : 'none' }} />
                                <span style={s.muted}>{wsConnected ? 'Live' : 'Offline'}</span>
                            </span>
                        </div>

                        {events.length === 0 ? (
                            <p style={s.muted}>Waiting for on-chain events…</p>
                        ) : (
                            <motion.ul style={s.feedList} layout>
                                <AnimatePresence>
                                    {events.slice(0, 12).map((ev, i) => (
                                        <FeedItem key={i} ev={ev} index={i} />
                                    ))}
                                </AnimatePresence>
                            </motion.ul>
                        )}
                    </motion.div>
                </div>
            </div>
        </motion.div>
    )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
    page: {
        maxWidth: '1320px',
        margin: '0 auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    heroStrip: {
        background: 'linear-gradient(135deg, var(--obs-green-dim) 0%, var(--obs-blue-dim) 100%)',
        border: '1px solid var(--obs-border)',
        borderRadius: '1.25rem',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
        flexWrap: 'wrap',
        transition: 'background 0.25s',
    },
    heroTitle: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.75rem',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        background: 'linear-gradient(135deg, var(--obs-text-1) 30%, var(--obs-green) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        margin: '0 0 0.3rem',
    },
    heroSub: {
        color: 'var(--obs-text-2)',
        fontSize: '0.9rem',
        margin: 0,
        lineHeight: 1.5,
    },
    statsStrip: {
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
    },
    statChip: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        background: 'var(--obs-surface)',
        border: '1px solid',
        borderRadius: '0.75rem',
        padding: '0.5rem 0.85rem',
        backdropFilter: 'blur(20px)',
        cursor: 'default',
        transition: 'background 0.25s',
    },
    statChipLabel: {
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--obs-text-3)',
        margin: 0,
    },
    statChipValue: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.1rem',
        fontWeight: 800,
        margin: 0,
    },
    mainGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '1.25rem',
        alignItems: 'start',
    },
    leftCol: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    rightCol: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
    panelTabs: {
        display: 'flex',
        gap: '0.5rem',
        background: 'var(--obs-surface)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.75rem',
        padding: '0.35rem',
        transition: 'background 0.25s',
    },
    panelTab: {
        flex: 1,
        background: 'transparent',
        border: 'none',
        borderRadius: '0.5rem',
        padding: '0.45rem 0.6rem',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: 'var(--obs-text-3)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
        textAlign: 'center',
    },
    panelTabActive: {
        flex: 1,
        background: 'var(--obs-surface-2)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.5rem',
        padding: '0.45rem 0.6rem',
        fontSize: '0.78rem',
        fontWeight: 700,
        color: 'var(--obs-green)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.15s',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(16,185,129,0.1)',
    },
    panelCard: {
        background: 'var(--obs-surface)',
        border: '1px solid var(--obs-border)',
        borderRadius: '1rem',
        padding: '1.25rem',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        transition: 'background 0.25s',
    },
    posCard: {
        background: 'var(--obs-surface)',
        border: '1px solid var(--obs-border)',
        borderRadius: '1rem',
        padding: '1rem 1.25rem',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        transition: 'background 0.25s, border-color 0.2s',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
    },
    cardTitle: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--obs-text-1)',
        margin: '0 0 1rem',
        letterSpacing: '-0.02em',
    },
    posRows: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
    posRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.4rem 0',
        borderBottom: '1px solid var(--obs-border)',
    },
    posLabel: { fontSize: '0.85rem', color: 'var(--obs-text-2)', display: 'flex', alignItems: 'center', gap: '0.4rem' },
    // Calculator
    groupLabel: {
        fontSize: '0.72rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--obs-text-3)',
        margin: 0,
    },
    calcGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.75rem',
    },
    formField: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
    label: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--obs-text-2)' },
    input: {
        background: 'var(--obs-surface-2)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.5rem',
        padding: '0.45rem 0.7rem',
        color: 'var(--obs-text-1)',
        fontSize: '0.875rem',
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 0.2s, background 0.25s',
        width: '100%',
    },
    resultBox: {
        background: 'var(--obs-surface-2)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.75rem',
        padding: '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        transition: 'background 0.25s',
    },
    resultRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.875rem',
    },
    mintChip: {
        background: 'var(--obs-green-dim)',
        color: 'var(--obs-green)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '9999px',
        padding: '0.15rem 0.6rem',
        fontSize: '0.72rem',
        fontWeight: 700,
    },
    debtChip: {
        background: 'var(--obs-red-dim)',
        color: 'var(--obs-red)',
        border: '1px solid rgba(248,113,113,0.2)',
        borderRadius: '9999px',
        padding: '0.15rem 0.6rem',
        fontSize: '0.72rem',
        fontWeight: 700,
    },
    successBox: {
        background: 'var(--obs-green-dim)',
        border: '1px solid rgba(16,185,129,0.2)',
        borderRadius: '0.65rem',
        padding: '0.75rem 1rem',
        color: 'var(--obs-green)',
        fontSize: '0.85rem',
        fontWeight: 600,
    },
    errorText: { color: 'var(--obs-red)', fontSize: '0.8rem' },
    // Buttons
    btnPrimary: {
        background: 'linear-gradient(135deg, var(--obs-green) 0%, #059669 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '0.55rem',
        padding: '0.6rem 1.2rem',
        fontSize: '0.875rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
        transition: 'opacity 0.15s',
    },
    btnPrimaryDisabled: {
        background: 'var(--obs-surface-2)',
        color: 'var(--obs-text-3)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.55rem',
        padding: '0.6rem 1.2rem',
        fontSize: '0.875rem',
        fontWeight: 700,
        cursor: 'not-allowed',
        fontFamily: 'inherit',
        width: '100%',
    },
    btnGhost: {
        background: 'transparent',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.45rem',
        padding: '0.3rem 0.65rem',
        color: 'var(--obs-text-2)',
        fontSize: '1rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s',
    },
    // Listings grid
    listingsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '0.85rem',
    },
    listingCard: {
        background: 'var(--obs-surface-2)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.85rem',
        overflow: 'hidden',
        transition: 'background 0.25s, border-color 0.2s',
        cursor: 'default',
    },
    listingTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '0.85rem 1rem 0.5rem',
    },
    listingAmount: { margin: 0, lineHeight: 1.2 },
    listingSeller: { margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--obs-text-3)' },
    priceBlock: { textAlign: 'right' },
    priceEth: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.1rem',
        fontWeight: 800,
        color: 'var(--obs-blue)',
        margin: 0,
    },
    perCredit: { fontSize: '0.65rem', color: 'var(--obs-text-3)', margin: 0 },
    divider: { height: '1px', background: 'var(--obs-border)', margin: '0 1rem' },
    listingBottom: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem 0.85rem',
        gap: '0.5rem',
        flexWrap: 'wrap',
    },
    totalRow: { fontSize: '0.78rem', color: 'var(--obs-text-3)' },
    btnBuy: {
        background: 'linear-gradient(135deg, var(--obs-green) 0%, #059669 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '0.4rem',
        padding: '0.35rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
    },
    btnCancel: {
        background: 'var(--obs-surface)',
        color: 'var(--obs-text-2)',
        border: '1px solid var(--obs-border)',
        borderRadius: '0.4rem',
        padding: '0.35rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
    },
    countPill: {
        fontSize: '0.7rem',
        fontWeight: 700,
        background: 'var(--obs-blue-dim)',
        color: 'var(--obs-blue)',
        border: '1px solid rgba(59,130,246,0.2)',
        borderRadius: '9999px',
        padding: '0.15rem 0.6rem',
    },
    emptyState: {
        textAlign: 'center',
        color: 'var(--obs-text-3)',
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.875rem',
    },
    // Feed
    feedList: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    feedItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid var(--obs-border)',
        flexWrap: 'wrap',
    },
    feedBadge: {
        fontSize: '0.7rem',
        fontWeight: 700,
        padding: '0.15rem 0.55rem',
        borderRadius: '9999px',
        border: '1px solid',
        whiteSpace: 'nowrap',
        flexShrink: 0,
    },
    feedDetail: {
        fontSize: '0.78rem',
        color: 'var(--obs-text-2)',
        wordBreak: 'break-all',
    },
    feedBlock: { color: 'var(--obs-text-3)', fontSize: '0.7rem' },
    // Shared
    muted: { color: 'var(--obs-text-3)', fontSize: '0.875rem', margin: 0 },
    code: {
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        color: 'var(--obs-text-2)',
        background: 'var(--obs-surface-2)',
        padding: '0.1rem 0.3rem',
        borderRadius: '0.25rem',
    },
}
