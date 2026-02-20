import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useConnectors } from 'wagmi'
import { hardhat } from 'wagmi/chains'
import { formatEther } from 'viem'
import { useEntityPosition } from './hooks/useEntityPosition'
import { useActiveListings, useListCredits, usePurchaseListing, useCancelListing } from './hooks/useMarketplace'
import { useLiveFeed } from './hooks/useLiveFeed'
import { ListingStatus } from './lib/contracts'
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

  const [listAmount, setListAmount] = useState('')
  const [listPriceEth, setListPriceEth] = useState('')

  function handleConnect() {
    const connector = connectors[0]
    if (connector) connect({ connector, chainId: hardhat.id })
  }

  function handleList(e) {
    e.preventDefault()
    listCredits(BigInt(listAmount), listPriceEth)
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

  return (
    <main className="app">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <span className="logo">🌿</span>
          <h1>CarboCred</h1>
          <span className="badge">ERC-1155 Marketplace</span>
        </div>

        {isConnected ? (
          <div className="header-right">
            {isWrongChain && (
              <button className="btn btn-warn" onClick={() => switchChain({ chainId: hardhat.id })}>
                ⚠ Switch to Hardhat
              </button>
            )}
            <span className="addr">{shortenAddr(address)}</span>
            <button className="btn btn-outline" onClick={() => disconnect()}>Disconnect</button>
          </div>
        ) : (
          <div className="header-right">
            <button className="btn btn-primary" onClick={handleConnect}>Connect Wallet</button>
            {connectError && <span className="error-text">{connectError.message}</span>}
          </div>
        )}
      </header>

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
                {listError && <p className="error-text">{listError.message?.slice(0, 120)}</p>}
                <button type="submit" className="btn btn-primary btn-full" disabled={isListing}>
                  {isListing ? 'Waiting for wallet…' : 'List Credits'}
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
