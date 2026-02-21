import { useState, useMemo } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useConnectors } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { formatEther } from 'viem'
import { useEntityPosition } from './hooks/useEntityPosition'
import { useActiveListings, useListCredits, usePurchaseListing, useCancelListing } from './hooks/useMarketplace'
import { useLiveFeed } from './hooks/useLiveFeed'
import { useCarbonAward } from './hooks/useCarbonAward'
import { calculateCredits } from './lib/carbonCalculator'
import { ListingStatus } from './lib/contracts'
import Navbar from './components/Navbar'

// ── Helpers ────────────────────────────────────────────────────────────────

function shortenAddr(addr) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function NetBadge({ net }) {
  const isPositive = net >= 0n
  return (
    <span className={`net-badge ${isPositive ? 'positive' : 'negative'}`}>
      {isPositive ? '+' : ''}{net.toString()} credits
    </span>
  )
}

// ── Main App ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { address, isConnected } = useAccount()
  const { connect, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const connectors = useConnectors()
  const isWrongChain = isConnected && chainId !== hardhat.id

  const { credits, debt, netCredits, isLoading: posLoading, refetch: refetchPos } = useEntityPosition()
  const { listings, isLoading: listLoading, refetch: refetchListings } = useActiveListings()
  const { listCredits, isPending: isListing, error: listError } = useListCredits()
  const { purchase, isPending: isPurchasing, error: purchaseError } = usePurchaseListing()
  const { cancel, isPending: isCancelling } = useCancelListing()
  const { events, connected: wsConnected } = useLiveFeed()
  const { isSubmitting, result, error: awardError, submitActivity, reset: resetAward } = useCarbonAward()

  const [listAmount, setListAmount] = useState('')
  const [listPriceEth, setListPriceEth] = useState('')
  const [localListError, setLocalListError] = useState(null)

  // ── Carbon calculator inputs ───────────────────────────────────────────────
  const [calcInputs, setCalcInputs] = useState({
    energyKwh: '', carbonEmittedKg: '', vehicleKm: '',
    recycleKg: '', treesPlanted: '', cleanEnergyKwh: '',
  })
  const calcResult = useMemo(() => calculateCredits({
    energyKwh: parseFloat(calcInputs.energyKwh) || 0,
    carbonEmittedKg: parseFloat(calcInputs.carbonEmittedKg) || 0,
    vehicleKm: parseFloat(calcInputs.vehicleKm) || 0,
    recycleKg: parseFloat(calcInputs.recycleKg) || 0,
    treesPlanted: parseFloat(calcInputs.treesPlanted) || 0,
    cleanEnergyKwh: parseFloat(calcInputs.cleanEnergyKwh) || 0,
  }), [calcInputs])

  function setCalc(field, val) {
    resetAward()
    setLocalListError(null)
    setCalcInputs(prev => ({ ...prev, [field]: val }))
  }

  function handleConnect() {
    const connector = connectors[0]
    if (connector) connect({ connector, chainId: hardhat.id })
  }

  function handleList(e) {
    e.preventDefault()
    setLocalListError(null)
    if (netCredits < 0n) {
      setLocalListError("You are currently a net emitter. You must offset your debt before you can sell credits.")
      return
    }
    const amountBig = BigInt(listAmount)
    if (netCredits < amountBig) {
      setLocalListError(`Insufficient net credits. You only have ${netCredits.toString()} available to sell.`)
      return
    }

    listCredits(amountBig, listPriceEth)
    setListAmount('')
    setListPriceEth('')
    setTimeout(() => { refetchListings(); refetchPos() }, 3000)
  }

  function handleBuy(listingId, amount, pricePerCredit) {
    purchase(listingId, amount * pricePerCredit)
    setTimeout(() => { refetchListings(); refetchPos() }, 3000)
  }

  function handleCancel(listingId) {
    cancel(listingId)
    setTimeout(() => refetchListings(), 3000)
  }

  async function handleAwardSubmit(e) {
    e.preventDefault()
    await submitActivity(address, calcResult.emissions, calcResult.reductions)
    setTimeout(() => refetchPos(), 3000)
  }

  return (
    <main className="app">
      <Navbar />

      {/* ── Wallet Bar ───────────────────────────────────────────── */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1>Dashboard</h1>
          <span className="badge">ERC-1155 Marketplace</span>
          <a href="/public-dashboard.html" className="nav-link">
            Public Dashboard
          </a>
        </div>
        {isConnected ? (
          <div className="dash-header-right">
            {isWrongChain && (
              <button className="btn btn-warn" onClick={() => switchChain({ chainId: hardhat.id })}>
                ⚠ Switch to Hardhat
              </button>
            )}
            <span className="addr">{shortenAddr(address)}</span>
            <button className="btn btn-outline" onClick={() => disconnect()}>Disconnect</button>
          </div>
        ) : (
          <div className="dash-header-right">
            <button className="btn btn-primary" onClick={handleConnect}>Connect Wallet</button>
            {connectError && <span className="error-text">{connectError.message}</span>}
          </div>
        )}
      </div>

      <div className="grid">
        {/* ── Left Panel ──────────────────────────────────────────── */}
        <div className="left-panel">

          {/* My Position */}
          <section className="card">
            <h2 className="section-title">My Carbon Position</h2>
            {!isConnected ? (
              <p className="muted">Connect wallet to view</p>
            ) : posLoading ? (
              <p className="muted">Loading…</p>
            ) : (
              <div className="position">
                <div className="position-row">
                  <span>🟢 Credits (offsets)</span>
                  <span className="credit-val">{credits.toString()}</span>
                </div>
                <div className="position-row">
                  <span>🔴 Debt (emissions)</span>
                  <span className="debt-val">{debt.toString()}</span>
                </div>
                <div className="position-row net-row">
                  <span>Net Position</span>
                  <NetBadge net={netCredits} />
                </div>
              </div>
            )}
          </section>

          {/* Carbon Calculator */}
          <section className="card">
            <h2 className="section-title">🌱 Calculate &amp; Earn Credits</h2>
            {!isConnected ? (
              <p className="muted">Connect wallet to submit your activity</p>
            ) : (
              <form className="form" onSubmit={handleAwardSubmit}>

                <p className="calc-group-label">📤 Emissions (your carbon footprint)</p>
                <div className="calc-grid">
                  <div className="form-field">
                    <label>Energy consumed (kWh)</label>
                    <input type="number" min="0" step="any" placeholder="e.g. 250"
                      value={calcInputs.energyKwh}
                      onChange={e => setCalc('energyKwh', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Direct CO₂ emitted (kg)</label>
                    <input type="number" min="0" step="any" placeholder="e.g. 80"
                      value={calcInputs.carbonEmittedKg}
                      onChange={e => setCalc('carbonEmittedKg', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Vehicle distance (km)</label>
                    <input type="number" min="0" step="any" placeholder="e.g. 400"
                      value={calcInputs.vehicleKm}
                      onChange={e => setCalc('vehicleKm', e.target.value)} />
                  </div>
                </div>

                <p className="calc-group-label">📥 Reductions (your offsets)</p>
                <div className="calc-grid">
                  <div className="form-field">
                    <label>Waste recycled (kg)</label>
                    <input type="number" min="0" step="any" placeholder="e.g. 30"
                      value={calcInputs.recycleKg}
                      onChange={e => setCalc('recycleKg', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Trees planted</label>
                    <input type="number" min="0" step="1" placeholder="e.g. 5"
                      value={calcInputs.treesPlanted}
                      onChange={e => setCalc('treesPlanted', e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label>Clean energy generated (kWh)</label>
                    <input type="number" min="0" step="any" placeholder="e.g. 150"
                      value={calcInputs.cleanEnergyKwh}
                      onChange={e => setCalc('cleanEnergyKwh', e.target.value)} />
                  </div>
                </div>

                {/* Live result preview */}
                <div className="calc-result">
                  <div className="calc-result-row">
                    <span className="muted">📤 Emissions</span>
                    <span className="debt-val">−{calcResult.emissions.toFixed(2)} pts</span>
                  </div>
                  <div className="calc-result-row">
                    <span className="muted">📥 Reductions</span>
                    <span className="credit-val">+{calcResult.reductions.toFixed(2)} pts</span>
                  </div>
                  <div className="calc-result-row net-row">
                    <span>Net impact</span>
                    <span className={`calc-credits ${calcResult.net >= 0 ? 'positive' : 'negative'}`}>
                      {calcResult.net >= 0 ? '+' : ''}{Math.floor(calcResult.net)}
                    </span>
                  </div>
                  <div className="calc-submit-summary">
                    {Math.floor(calcResult.reductions) > 0 && (
                      <span className="credit-val">✦ Mint {Math.floor(calcResult.reductions)} credit tokens</span>
                    )}
                    {Math.floor(calcResult.emissions) > 0 && (
                      <span className="debt-val">✦ Record {Math.floor(calcResult.emissions)} debt tokens</span>
                    )}
                  </div>
                </div>


                {/* Feedback */}
                {awardError && <p className="error-text">{awardError}</p>}
                {result && (
                  <div className="calc-success">
                    <span>✅ Submitted!</span>
                    {result.awardTx && (
                      <span>
                        <span className="credit-val" style={{ fontSize: '0.7rem' }}>+Credits tx: </span>
                        <span className="mono" style={{ fontSize: '0.65rem', wordBreak: 'break-all' }}>{result.awardTx}</span>
                      </span>
                    )}
                    {result.debtTx && (
                      <span>
                        <span className="debt-val" style={{ fontSize: '0.7rem' }}>+Debt tx: </span>
                        <span className="mono" style={{ fontSize: '0.65rem', wordBreak: 'break-all' }}>{result.debtTx}</span>
                      </span>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isSubmitting || (calcResult.emissions === 0 && calcResult.reductions === 0)}
                  title={(calcResult.emissions === 0 && calcResult.reductions === 0) ? 'Enter at least one value' : undefined}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Activity'}
                </button>
              </form>
            )}
          </section>

          {/* List Credits Form */}
          <section className="card">
            <h2 className="section-title">List Credits for Sale</h2>
            {!isConnected ? (
              <p className="muted">Connect wallet to list</p>
            ) : (
              <form onSubmit={handleList} className="form">
                <div className="form-field">
                  <label>Amount (credits)</label>
                  <input
                    type="number" min="1" required
                    value={listAmount}
                    onChange={e => setListAmount(e.target.value)}
                    placeholder="e.g. 100"
                  />
                </div>
                <div className="form-field">
                  <label>Price per credit (ETH)</label>
                  <input
                    type="text" required
                    value={listPriceEth}
                    onChange={e => setListPriceEth(e.target.value)}
                    placeholder="e.g. 0.01"
                  />
                </div>
                {localListError && <p className="error-text">{localListError}</p>}
                {listError && <p className="error-text">{listError.message?.slice(0, 120)}</p>}
                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={isListing || netCredits < 0n}
                >
                  {isListing ? 'Waiting for wallet…' : (netCredits < 0n ? 'Cannot Sell (Net Emitter)' : 'List Credits')}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ── Right Panel ─────────────────────────────────────────── */}
        <div className="right-panel">

          {/* Active Listings */}
          <section className="card">
            <div className="section-header">
              <h2 className="section-title">Active Listings</h2>
              <button className="btn-ghost" onClick={() => refetchListings()}>↻ Refresh</button>
            </div>

            {listLoading ? (
              <p className="muted">Loading listings…</p>
            ) : listings.length === 0 ? (
              <p className="muted">No open listings yet.</p>
            ) : (
              <div className="listings">
                {listings.map(listing => {
                  const totalEth = formatEther(listing.amount * listing.pricePerCredit)
                  const isOwn = address?.toLowerCase() === listing.seller.toLowerCase()
                  return (
                    <div key={listing.id.toString()} className="listing-row">
                      <div>
                        <p className="listing-main">
                          <span className="credit-val">{listing.amount.toString()}</span>
                          <span className="muted"> credits @ </span>
                          <span className="mono">{formatEther(listing.pricePerCredit)} ETH</span>
                        </p>
                        <p className="listing-sub">
                          Seller: {isOwn ? 'You' : shortenAddr(listing.seller)} · Total: {totalEth} ETH
                        </p>
                      </div>
                      <div className="listing-actions">
                        {!isOwn && isConnected && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleBuy(listing.id, listing.amount, listing.pricePerCredit)}
                            disabled={isPurchasing}
                          >
                            {isPurchasing ? 'Buying…' : `Buy · ${totalEth} ETH`}
                          </button>
                        )}
                        {isOwn && Number(listing.status) === ListingStatus.Open && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleCancel(listing.id)}
                            disabled={isCancelling}
                          >
                            {isCancelling ? 'Cancelling…' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {purchaseError && <p className="error-text">{purchaseError.message?.slice(0, 160)}</p>}
          </section>

          {/* Live Feed */}
          <section className="card">
            <div className="section-header">
              <h2 className="section-title">Live On-Chain Feed</h2>
              <div className="ws-status">
                <span className={`ws-dot ${wsConnected ? 'ws-on' : 'ws-off'}`} />
                <span className="muted">{wsConnected ? 'Connected' : 'Offline'}</span>
              </div>
            </div>
            {events.length === 0 ? (
              <p className="muted">Waiting for events…</p>
            ) : (
              <ul className="feed">
                {events.map((ev, i) => (
                  <li key={i} className="feed-item">
                    <span className="feed-type">{ev.type}</span>
                    {' · '}
                    <span className="muted">{JSON.stringify(ev).slice(0, 120)}…</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
