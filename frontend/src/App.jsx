import { useState, useMemo } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useConnectors } from 'wagmi'
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
import { SpotlightCard } from './components/SpotlightCard'
import UserTransactions from './pages/UserTransactions'
import BusinessAnalytics from './pages/BusinessAnalytics'
import AdminDashboard from './pages/AdminDashboard'
import MarketplacePage from './pages/MarketplacePage'
import PurchaseSuccess from './pages/PurchaseSuccess'
import VerifyTransaction from './pages/VerifyTransaction'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import { useAuth } from './context/AuthContext'
import ThemeToggle from './components/ThemeToggle'
import './App.css'

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
  const { user, token, loading: authLoading, logout } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // Auth view toggle (login ↔ signup)
  const [authView, setAuthView] = useState('login')

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
  const { isSubmitting, result, error: awardError, submitActivity, reset: resetAward } = useCarbonAward(token)
  const { accountId, businessName, needsOnboarding, createProfile, loading: profileLoading, error: profileError } = useEntityProfile()

  const [listAmount, setListAmount] = useState('')
  const [listPriceEth, setListPriceEth] = useState('')
  const [localListError, setLocalListError] = useState(null)

  // ── View State ─────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState('marketplace')
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

  // Disconnect wallet AND clear JWT together
  function handleLogout() {
    if (isConnected) disconnect()
    logout()
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
      if (txHash) {
        setLastTxHash(txHash)
        setCurrentView('purchase-success')
      }
      setTimeout(() => { refetchListings(); refetchPos() }, 3000)
    } catch (e) {
      console.error("Purchase failed", e)
    }
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

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontFamily: 'inherit', fontSize: '0.9rem' }}>
        Loading…
      </div>
    )
  }
  if (!user) {
    return authView === 'login'
      ? <LoginPage onSwitchToSignup={() => setAuthView('signup')} />
      : <SignupPage onSwitchToLogin={() => setAuthView('login')} />
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

          <div className="header-tabs">
            <button className={`nav-link ${currentView === 'marketplace' ? 'active-tab' : ''}`} onClick={() => setCurrentView('marketplace')}>
              Marketplace
            </button>
            <button className={`nav-link ${currentView === 'history' ? 'active-tab' : ''}`} onClick={() => setCurrentView('history')}>
              My History
            </button>
            <button className={`nav-link ${currentView === 'analytics' ? 'active-tab' : ''}`} onClick={() => setCurrentView('analytics')}>
              Analytics
            </button>
            <button className={`nav-link ${currentView === 'verify' ? 'active-tab' : ''}`} onClick={() => setCurrentView('verify')}>
              Verify QR
            </button>
            {isAdmin && (
              <button
                className={`nav-link ${currentView === 'admin' ? 'active-tab' : ''}`}
                onClick={() => setCurrentView('admin')}
                style={{ color: currentView !== 'admin' ? '#10b981' : undefined }}
              >
                🏛 Admin
              </button>
            )}
            <a href="/public-dashboard.html" className="nav-link">Public Dashboard</a>
          </div>
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
            <button className="btn btn-outline" onClick={() => disconnect()}>Disconnect</button>
            <ThemeToggle />
            <button className="btn btn-outline" onClick={handleLogout} style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--obs-red)' }}>Log Out</button>
          </div>
        ) : (
          <div className="header-right">
            <span style={{ color: 'var(--obs-text-3)', fontSize: '0.8rem' }}>👤 {user.email}</span>
            <button className="btn btn-primary" onClick={handleConnect}>Connect Wallet</button>
            {connectError && <span className="error-text">{connectError.message}</span>}
            <ThemeToggle />
            <button className="btn btn-outline" onClick={handleLogout} style={{ borderColor: 'rgba(248,113,113,0.3)', color: 'var(--obs-red)' }}>Log Out</button>
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

      {currentView === 'admin' ? (
        <AdminDashboard token={token} />
      ) : currentView === 'analytics' ? (
        <BusinessAnalytics />
      ) : currentView === 'history' ? (
        <UserTransactions />
      ) : currentView === 'verify' ? (
        <VerifyTransaction onReturnHome={() => setCurrentView('marketplace')} />
      ) : currentView === 'purchase-success' ? (
        <PurchaseSuccess
          txHash={lastTxHash}
          onBackToMarket={() => {
            setLastTxHash(null)
            setCurrentView('marketplace')
          }}
        />
      ) : (
        <MarketplacePage
          isConnected={isConnected}
          credits={credits}
          debt={debt}
          netCredits={netCredits}
          posLoading={posLoading}
          listings={listings}
          listLoading={listLoading}
          refetchListings={refetchListings}
          onBuy={handleBuy}
          isPurchasing={isPurchasing}
          purchaseError={purchaseError}
          onCancel={handleCancel}
          isCancelling={isCancelling}
          listAmount={listAmount}
          setListAmount={setListAmount}
          listPriceEth={listPriceEth}
          setListPriceEth={setListPriceEth}
          onList={handleList}
          isListing={isListing}
          listError={listError}
          localListError={localListError}
          calcInputs={calcInputs}
          setCalc={setCalc}
          calcResult={calcResult}
          onAwardSubmit={handleAwardSubmit}
          isSubmitting={isSubmitting}
          awardError={awardError}
          awardResult={result}
          events={events}
          wsConnected={wsConnected}
          address={address}
        />
      )}
    </main>
  )
}
