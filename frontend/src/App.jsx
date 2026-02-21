import { useState, useMemo, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useConnectors, useSignMessage } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { formatEther } from 'viem'
import { useEntityPosition } from './hooks/useEntityPosition'
import { useActiveListings, useListCredits, usePurchaseListing, useCancelListing } from './hooks/useMarketplace'
import { useLiveFeed } from './hooks/useLiveFeed'
import { useCarbonAward } from './hooks/useCarbonAward'
import { useEntityProfile } from './hooks/useEntityProfile'
import { calculateCredits } from './lib/carbonCalculator'
import { ListingStatus } from './lib/contracts'
import { BusinessOnboardingModal } from './components/BusinessOnboardingModal'
import UserTransactions from './pages/UserTransactions'
import BusinessAnalytics from './pages/BusinessAnalytics'
import PurchaseSuccess from './pages/PurchaseSuccess'
import VerifyTransaction from './pages/VerifyTransaction'
import './App.css'

// ── Government Authority ───────────────────────────────────────────────────
// Layer 3: Frontend access gate. Smart contract + backend enforce independently.
const GOVERNMENT_WALLET = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' // lowercase

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

export default function App() {
  const { address, isConnected } = useAccount()
  const { connect, error: connectError } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const connectors = useConnectors()
  const { signMessageAsync } = useSignMessage()
  const isWrongChain = isConnected && chainId !== hardhat.id

  // True only when GOVERNMENT_WALLET is connected (case-insensitive)
  const isGovernment = isConnected && address?.toLowerCase() === GOVERNMENT_WALLET

  const { credits, debt, netCredits, isLoading: posLoading, refetch: refetchPos } = useEntityPosition()
  const { listings, isLoading: listLoading, refetch: refetchListings } = useActiveListings()
  const { listCredits, isPending: isListing, error: listError } = useListCredits()
  const { purchase, isPending: isPurchasing, error: purchaseError } = usePurchaseListing()
  const { cancel, isPending: isCancelling } = useCancelListing()
  const { events, connected: wsConnected } = useLiveFeed()
  const { isSubmitting, result, error: awardError, submitActivity, reset: resetAward } = useCarbonAward(signMessageAsync)
  const { accountId, businessName, needsOnboarding, createProfile, loading: profileLoading, error: profileError } = useEntityProfile()

  const [listAmount, setListAmount] = useState('')
  const [listPriceEth, setListPriceEth] = useState('')
  const [localListError, setLocalListError] = useState(null)

  // ── Government: registered entity list for award target picker ────────────
  const [entityList, setEntityList] = useState([])         // [{ businessName, walletAddress, accountId }]
  const [targetEntity, setTargetEntity] = useState(null)  // currently selected award recipient

  useEffect(() => {
    if (!isGovernment) { setEntityList([]); setTargetEntity(null); return; }
    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000'
    fetch(`${BACKEND}/entity/profiles`)
      .then(r => r.ok ? r.json() : { profiles: [] })
      .then(({ profiles }) => {
        setEntityList(profiles || [])
        if (profiles?.length) setTargetEntity(profiles[0])
      })
      .catch(() => setEntityList([]))
  }, [isGovernment])

  // ── View State ─────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState('marketplace') // 'marketplace' | 'history' | 'analytics' | 'purchase-success' | 'verify'
  const [lastTxHash, setLastTxHash] = useState(null)

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

  async function handleBuy(listingId, amount, pricePerCredit) {
    try {
      const txHash = await purchase(listingId, amount * pricePerCredit)

      // If purchase yields a hash, route to the success page to generate the verification QR
      if (txHash) {
        setLastTxHash(txHash)
        setCurrentView('purchase-success')
      }

      setTimeout(() => { refetchListings(); refetchPos() }, 3000)
    } catch (e) {
      console.error("Purchase failed", e);
    }
  }

  function handleCancel(listingId) {
    cancel(listingId)
    setTimeout(() => refetchListings(), 3000)
  }

  async function handleAwardSubmit(e) {
    e.preventDefault()
    // Layer 3 guard: block non-government wallets at UI level
    if (!isGovernment) {
      alert('Access Restricted: Only the Government Authority wallet may award credits.')
      return
    }
    // Use the selected target entity's wallet, not the government's own wallet
    const recipientAddress = targetEntity?.walletAddress || targetEntity?._manualWallet || address
    await submitActivity(recipientAddress, calcResult.emissions, calcResult.reductions)
    setTimeout(() => refetchPos(), 3000)
  }

  return (
    <main className="app">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <span className="logo">🌿</span>
          <div className="brand">
            <h1>CarboCred</h1>
          </div>
          <span className="badge">ERC-1155 Marketplace</span>

          {!isGovernment && (
            <div className="header-tabs" style={{ display: 'flex', gap: '1rem', marginLeft: '1rem' }}>
              <button
                className={`nav-link ${currentView === 'marketplace' ? 'active-tab' : ''}`}
                onClick={() => setCurrentView('marketplace')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Marketplace
              </button>
              <button
                className={`nav-link ${currentView === 'history' ? 'active-tab' : ''}`}
                onClick={() => setCurrentView('history')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                My History
              </button>
              <button
                className={`nav-link ${currentView === 'verify' ? 'active-tab' : ''}`}
                onClick={() => setCurrentView('verify')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Verify QR
              </button>
              <a
                href="/public-dashboard.html"
                style={{
                  color: '#94a3b8',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseOver={e => e.target.style.color = '#fff'}
                onMouseOut={e => e.target.style.color = '#94a3b8'}
              >
                Public Dashboard
              </a>
            </div>
          )}
        </div>

        {isConnected ? (
          <div className="header-right">
            {businessName && (
              <div className="profile-btn">
                <span className="profile-icon">👤</span>
                <span className="entity-name">{businessName}</span>
              </div>
            )}
            {isWrongChain && (
              <button className="btn btn-warn" onClick={() => switchChain({ chainId: hardhat.id })}>
                ⚠ Switch to Hardhat
              </button>
            )}
            {/* <span className="addr">{shortenAddr(address)}</span> */}
            <button className="btn btn-outline" onClick={() => disconnect()}>Disconnect</button>
          </div>
        ) : (
          <div className="header-right">
            <button className="btn btn-primary" onClick={handleConnect}>Connect Wallet</button>
            {connectError && <span className="error-text">{connectError.message}</span>}
          </div>
        )}
      </header>

      <BusinessOnboardingModal
        isOpen={needsOnboarding}
        onSubmit={createProfile}
        loading={profileLoading}
        error={profileError}
        accountId={accountId}
      />

      {currentView === 'analytics' ? (
        <BusinessAnalytics />
      ) : currentView === 'history' ? (
        <UserTransactions />
      ) : currentView === 'verify' ? (
        <VerifyTransaction onReturnHome={() => setCurrentView('marketplace')} />
      ) : currentView === 'purchase-success' ? (
        <PurchaseSuccess
          txHash={lastTxHash}
          onBackToMarket={() => {
            setLastTxHash(null);
            setCurrentView('marketplace');
          }}
        />
      ) : (
        <div className="grid">
          {/* ── Left Panel ──────────────────────────────────────────── */}
          <div className="left-panel">

            {/* My Position */}
            {/* My Position */}
            {!isGovernment && (
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
            )}

            {/* Carbon Calculator */}
            <section className="card">
              <h2 className="section-title">🌱 Calculate Carbon Footprint</h2>

              {/* ── Security Layer 3: Government-only gate ── */}
              {isGovernment && (
                <div style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '0.5rem',
                  padding: '0.6rem 1rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.8rem',
                  color: '#4ade80',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  🏛️ <strong>Government Authority</strong> — You may issue carbon credits.
                </div>
              )}
              {/* ── End Security Gate ── */}

              {!isConnected ? (
                <p className="muted">Connect wallet to submit your activity</p>
              ) : (
                <form className="form" onSubmit={handleAwardSubmit}>

                  {/* ── Government: Target Entity Selector ── */}
                  {isGovernment && (
                    <div className="form-field" style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        🏢 Award Credits To
                      </label>
                      <input
                        type="text"
                        placeholder="Recipient Wallet Address (0x...)"
                        style={{
                          width: '100%',
                          background: '#1e293b',
                          color: '#e2e8f0',
                          border: '1px solid #334155',
                          borderRadius: '0.5rem',
                          padding: '0.6rem 0.75rem',
                          fontSize: '0.9rem',
                          marginTop: '0.3rem',
                          fontFamily: 'monospace',
                        }}
                        value={targetEntity?._manualWallet || ''}
                        onChange={e => setTargetEntity({ _manualWallet: e.target.value.trim() })}
                      />
                    </div>
                  )}

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

                  {isGovernment && (
                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={isSubmitting || (calcResult.emissions === 0 && calcResult.reductions === 0)}
                      title={(calcResult.emissions === 0 && calcResult.reductions === 0) ? 'Enter at least one value' : undefined}
                    >
                      {isSubmitting ? 'Submitting…' : 'Submit Activity'}
                    </button>
                  )}
                </form>
              )}
            </section>

            {/* List Credits Form */}
            {/* List Credits Form */}
            {!isGovernment && (
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
            )}
          </div>

          {/* ── Right Panel ─────────────────────────────────────────── */}
          {/* ── Right Panel ─────────────────────────────────────────── */}
          {!isGovernment && (
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
          )}
        </div>
      )}
    </main>
  )
}
