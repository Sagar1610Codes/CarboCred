"use client";

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useConnectors } from "wagmi";
import { injected } from "wagmi/connectors";
import { hardhat } from "wagmi/chains";
import { useEntityPosition } from "@/hooks/useEntityPosition";
import { useActiveListings, useListCredits, usePurchaseListing, useCancelListing } from "@/hooks/useMarketplace";
import { useLiveFeed } from "@/hooks/useLiveFeed";
import { formatEther } from "viem";
import { useState, useEffect } from "react";
import { ListingStatus } from "@/lib/contracts";

// ── Helpers ───────────────────────────────────────────────────────────────

function shortenAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function NetBadge({ net }: { net: bigint }) {
  const isPositive = net >= 0n;
  return (
    <span className={`font-bold text-xl ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
      {isPositive ? "+" : ""}{net.toString()} credits
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function Page() {
  // ── Hydration guard: only render wallet-dependent UI on the client ──────
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { address, isConnected } = useAccount();
  const { connect, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const connectors = useConnectors();
  const isWrongChain = isConnected && chainId !== hardhat.id;

  const { credits, debt, netCredits, isLoading: posLoading, refetch: refetchPos } = useEntityPosition();
  const { listings, isLoading: listLoading, refetch: refetchListings } = useActiveListings();
  const { listCredits, isPending: isListing, error: listError } = useListCredits();
  const { purchase, isPending: isPurchasing, error: purchaseError } = usePurchaseListing();
  const { cancel, isPending: isCancelling } = useCancelListing();
  const { events, connected: wsConnected } = useLiveFeed();

  // Form state
  const [listAmount, setListAmount] = useState("");
  const [listPriceEth, setListPriceEth] = useState("");

  // Return a neutral shell until client-side hydration is complete
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 font-sans">
        <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
          <span className="text-2xl">🌿</span>
          <h1 className="text-xl font-bold tracking-tight">CarboCred</h1>
        </header>
      </main>
    );
  }

  function handleConnect() {
    // Try each available connector (MetaMask, injected, etc.)
    const connector = connectors[0] ?? injected();
    connect({ connector, chainId: hardhat.id });
  }

  async function handleList(e: React.FormEvent) {
    e.preventDefault();
    try {
      await listCredits(BigInt(listAmount), listPriceEth);
      setListAmount("");
      setListPriceEth("");
      setTimeout(() => { refetchListings(); refetchPos(); }, 3000);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleBuy(listingId: bigint, amount: bigint, pricePerCredit: bigint) {
    try {
      await purchase(listingId, amount * pricePerCredit);
      setTimeout(() => { refetchListings(); refetchPos(); }, 3000);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCancel(listingId: bigint) {
    try {
      await cancel(listingId);
      setTimeout(() => refetchListings(), 3000);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌿</span>
          <h1 className="text-xl font-bold tracking-tight">CarboCred</h1>
          <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full">
            ERC-1155 Marketplace
          </span>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-3">
            {isWrongChain && (
              <button
                onClick={() => switchChain({ chainId: hardhat.id })}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition"
              >
                ⚠ Switch to Hardhat
              </button>
            )}
            <span className="text-sm text-gray-400 font-mono">{shortenAddr(address!)}</span>
            <button
              onClick={() => disconnect()}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold text-sm transition"
            >
              Connect Wallet
            </button>
            {connectError && (
              <span className="text-xs text-red-400">{connectError.message}</span>
            )}
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Position + List Form ──────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">

          {/* My Position */}
          <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              My Carbon Position
            </h2>
            {!isConnected ? (
              <p className="text-gray-500 text-sm">Connect wallet to view</p>
            ) : posLoading ? (
              <p className="text-gray-500 text-sm">Loading…</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">🟢 Credits (offsets)</span>
                  <span className="font-mono text-emerald-400">{credits.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">🔴 Debt (emissions)</span>
                  <span className="font-mono text-red-400">{debt.toString()}</span>
                </div>
                <div className="border-t border-gray-700 pt-3 flex justify-between">
                  <span className="text-gray-300 text-sm font-medium">Net Position</span>
                  <NetBadge net={netCredits} />
                </div>
              </div>
            )}
          </section>

          {/* List Credits Form */}
          <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              List Credits for Sale
            </h2>
            {!isConnected ? (
              <p className="text-gray-500 text-sm">Connect wallet to list</p>
            ) : (
              <form onSubmit={handleList} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Amount (credits)</label>
                  <input
                    type="number" min="1" required
                    value={listAmount}
                    onChange={(e) => setListAmount(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Price per credit (ETH)</label>
                  <input
                    type="text" required
                    value={listPriceEth}
                    onChange={(e) => setListPriceEth(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 0.01"
                  />
                </div>
                {listError && (
                  <p className="text-xs text-red-400">{(listError as Error).message.slice(0, 120)}</p>
                )}
                <button
                  type="submit"
                  disabled={isListing}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-semibold transition"
                >
                  {isListing ? "Waiting for wallet…" : "List Credits"}
                </button>
              </form>
            )}
          </section>
        </div>

        {/* ── Right: Listings + Live Feed ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Listings */}
          <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Active Listings
              </h2>
              <button onClick={() => refetchListings()} className="text-xs text-gray-500 hover:text-gray-300 transition">
                ↻ Refresh
              </button>
            </div>

            {listLoading ? (
              <p className="text-gray-500 text-sm">Loading listings…</p>
            ) : listings.length === 0 ? (
              <p className="text-gray-500 text-sm">No open listings yet.</p>
            ) : (
              <div className="space-y-3">
                {listings.map((listing) => {
                  const totalEth = formatEther(listing.amount * listing.pricePerCredit);
                  const isOwn = address?.toLowerCase() === listing.seller.toLowerCase();
                  return (
                    <div key={listing.id.toString()}
                      className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          <span className="text-emerald-400">{listing.amount.toString()}</span>
                          <span className="text-gray-400"> credits @ </span>
                          <span className="font-mono">{formatEther(listing.pricePerCredit)} ETH</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Seller: {isOwn ? "You" : shortenAddr(listing.seller)}
                          {" · "}Total: {totalEth} ETH
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {!isOwn && isConnected && (
                          <button
                            onClick={() => handleBuy(listing.id, listing.amount, listing.pricePerCredit)}
                            disabled={isPurchasing}
                            className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition"
                          >
                            {isPurchasing ? "Buying…" : `Buy · ${totalEth} ETH`}
                          </button>
                        )}
                        {isOwn && listing.status === ListingStatus.Open && (
                          <button
                            onClick={() => handleCancel(listing.id)}
                            disabled={isCancelling}
                            className="text-xs px-3 py-1.5 border border-gray-600 hover:border-red-500 hover:text-red-400 disabled:opacity-50 rounded-lg transition"
                          >
                            {isCancelling ? "Cancelling…" : "Cancel"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {purchaseError && (
              <p className="mt-3 text-xs text-red-400">{(purchaseError as Error).message.slice(0, 160)}</p>
            )}
          </section>

          {/* Live Event Feed */}
          <section className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Live On-Chain Feed
              </h2>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400 animate-pulse" : "bg-gray-600"}`} />
              <span className="text-xs text-gray-500">{wsConnected ? "Connected" : "Offline"}</span>
            </div>
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">Waiting for events…</p>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {events.map((ev, i) => (
                  <li key={i} className="text-xs bg-gray-800 rounded-lg px-3 py-2 font-mono">
                    <span className="text-emerald-400 font-bold">{ev.type}</span>
                    {" · "}
                    <span className="text-gray-400">{JSON.stringify(ev, null, 0).slice(0, 120)}…</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
