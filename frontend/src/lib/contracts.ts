/**
 * lib/contracts.ts
 *
 * Contract ABIs in JSON ABI format (canonical Solidity output).
 * JSON ABI avoids all abitype/parseAbi limitations with named
 * tuple components in return types.
 */

// ── CarbonCreditToken (ERC-1155) ABI ─────────────────────────────────────
export const CARBON_CREDIT_TOKEN_ABI = [
    { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "account", type: "address" }, { name: "id", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
    { type: "function", name: "balanceOfBatch", stateMutability: "view", inputs: [{ name: "accounts", type: "address[]" }, { name: "ids", type: "uint256[]" }], outputs: [{ name: "", type: "uint256[]" }] },
    { type: "function", name: "isApprovedForAll", stateMutability: "view", inputs: [{ name: "account", type: "address" }, { name: "operator", type: "address" }], outputs: [{ name: "", type: "bool" }] },
    { type: "function", name: "setApprovalForAll", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }], outputs: [] },
    { type: "function", name: "netCredits", stateMutability: "view", inputs: [{ name: "entity", type: "address" }], outputs: [{ name: "", type: "int256" }] },
    { type: "function", name: "getPosition", stateMutability: "view", inputs: [{ name: "entity", type: "address" }], outputs: [{ name: "credits", type: "uint256" }, { name: "debt", type: "uint256" }] },
    { type: "function", name: "CREDIT_TOKEN", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    { type: "function", name: "DEBT_TOKEN", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    { type: "event", name: "CreditsAwarded", inputs: [{ name: "entity", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "reason", type: "string", indexed: false }] },
    { type: "event", name: "DebtRecorded", inputs: [{ name: "entity", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "reason", type: "string", indexed: false }] },
    { type: "event", name: "DebtCleared", inputs: [{ name: "entity", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
    { type: "event", name: "BalanceUpdated", inputs: [{ name: "seller", type: "address", indexed: true }, { name: "buyer", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "sellerCreditBalance", type: "uint256", indexed: false }, { name: "buyerCreditBalance", type: "uint256", indexed: false }] },
] as const;

// ── Listing tuple components ───────────────────────────────────────────────
const LISTING_COMPONENTS = [
    { name: "id", type: "uint256" },
    { name: "seller", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "pricePerCredit", type: "uint256" },
    { name: "status", type: "uint8" },
] as const;

// ── CarbonMarketplace ABI ─────────────────────────────────────────────────
export const CARBON_MARKETPLACE_ABI = [
    { type: "function", name: "nextListingId", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
    { type: "function", name: "getListing", stateMutability: "view", inputs: [{ name: "listingId", type: "uint256" }], outputs: [{ name: "listing", type: "tuple", components: LISTING_COMPONENTS }] },
    { type: "function", name: "getListings", stateMutability: "view", inputs: [{ name: "from", type: "uint256" }, { name: "to", type: "uint256" }], outputs: [{ name: "listings", type: "tuple[]", components: LISTING_COMPONENTS }] },
    { type: "function", name: "listCredits", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }, { name: "pricePerCredit", type: "uint256" }], outputs: [] },
    { type: "function", name: "cancelListing", stateMutability: "nonpayable", inputs: [{ name: "listingId", type: "uint256" }], outputs: [] },
    { type: "function", name: "purchaseListing", stateMutability: "payable", inputs: [{ name: "listingId", type: "uint256" }], outputs: [] },
    { type: "event", name: "ListingCreated", inputs: [{ name: "id", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "pricePerCredit", type: "uint256", indexed: false }] },
    { type: "event", name: "ListingCancelled", inputs: [{ name: "id", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }] },
    { type: "event", name: "TradeExecuted", inputs: [{ name: "id", type: "uint256", indexed: true }, { name: "seller", type: "address", indexed: true }, { name: "buyer", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }, { name: "totalPrice", type: "uint256", indexed: false }] },
] as const;

// ── Deployed Addresses ────────────────────────────────────────────────────
export const CONTRACT_ADDRESSES = {
    carbonCreditToken: (process.env.NEXT_PUBLIC_CARBON_CREDIT_TOKEN_ADDRESS ?? "0x0") as `0x${string}`,
    marketplace: (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ?? "0x0") as `0x${string}`,
} as const;

// ── Token ID constants ────────────────────────────────────────────────────
export const CREDIT_TOKEN_ID = BigInt(0);
export const DEBT_TOKEN_ID = BigInt(1);

// ── Listing status enum ───────────────────────────────────────────────────
export enum ListingStatus {
    Open = 0,
    Fulfilled = 1,
    Cancelled = 2,
}
