/**
 * lib/contracts.js
 * Contract ABIs (JSON format) + deployed addresses + enums.
 */

// ── CarbonCreditToken (ERC-1155) ABI ─────────────────────────────────────
export const CARBON_CREDIT_TOKEN_ABI = [
    { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }, { name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'netCredits', stateMutability: 'view', inputs: [{ name: 'entity', type: 'address' }], outputs: [{ name: '', type: 'int256' }] },
    { type: 'function', name: 'getPosition', stateMutability: 'view', inputs: [{ name: 'entity', type: 'address' }], outputs: [{ name: 'credits', type: 'uint256' }, { name: 'debt', type: 'uint256' }] },
    { type: 'function', name: 'CREDIT_TOKEN', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'DEBT_TOKEN', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'event', name: 'CreditsAwarded', inputs: [{ name: 'entity', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'reason', type: 'string', indexed: false }] },
    { type: 'event', name: 'DebtRecorded', inputs: [{ name: 'entity', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'reason', type: 'string', indexed: false }] },
    { type: 'event', name: 'DebtCleared', inputs: [{ name: 'entity', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }] },
    { type: 'event', name: 'BalanceUpdated', inputs: [{ name: 'seller', type: 'address', indexed: true }, { name: 'buyer', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'sellerCreditBalance', type: 'uint256', indexed: false }, { name: 'buyerCreditBalance', type: 'uint256', indexed: false }] },
]

// ── Listing tuple components ───────────────────────────────────────────────
const LISTING_COMPONENTS = [
    { name: 'id', type: 'uint256' },
    { name: 'seller', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'pricePerCredit', type: 'uint256' },
    { name: 'status', type: 'uint8' },
]

// ── CarbonMarketplace ABI ─────────────────────────────────────────────────
export const CARBON_MARKETPLACE_ABI = [
    { type: 'function', name: 'nextListingId', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
    { type: 'function', name: 'getListing', stateMutability: 'view', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [{ name: 'listing', type: 'tuple', components: LISTING_COMPONENTS }] },
    { type: 'function', name: 'getListings', stateMutability: 'view', inputs: [{ name: 'from', type: 'uint256' }, { name: 'to', type: 'uint256' }], outputs: [{ name: 'listings', type: 'tuple[]', components: LISTING_COMPONENTS }] },
    { type: 'function', name: 'listCredits', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }, { name: 'pricePerCredit', type: 'uint256' }], outputs: [] },
    { type: 'function', name: 'cancelListing', stateMutability: 'nonpayable', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [] },
    { type: 'function', name: 'purchaseListing', stateMutability: 'payable', inputs: [{ name: 'listingId', type: 'uint256' }], outputs: [] },
    { type: 'event', name: 'ListingCreated', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'seller', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'pricePerCredit', type: 'uint256', indexed: false }] },
    { type: 'event', name: 'ListingCancelled', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'seller', type: 'address', indexed: true }] },
    { type: 'event', name: 'TradeExecuted', inputs: [{ name: 'id', type: 'uint256', indexed: true }, { name: 'seller', type: 'address', indexed: true }, { name: 'buyer', type: 'address', indexed: true }, { name: 'amount', type: 'uint256', indexed: false }, { name: 'totalPrice', type: 'uint256', indexed: false }] },
]

// ── Deployed Addresses (from .env) ────────────────────────────────────────
export const CONTRACT_ADDRESSES = {
    carbonCreditToken: import.meta.env.VITE_CARBON_CREDIT_TOKEN_ADDRESS ?? '0x0',
    marketplace: import.meta.env.VITE_MARKETPLACE_ADDRESS ?? '0x0',
}

// ── Token ID constants ────────────────────────────────────────────────────
export const CREDIT_TOKEN_ID = 0n
export const DEBT_TOKEN_ID = 1n

// ── Listing status (mirrors Solidity enum) ────────────────────────────────
export const ListingStatus = {
    Open: 0,
    Fulfilled: 1,
    Cancelled: 2,
}
