// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CarbonCreditToken.sol";

/**
 * @title CarbonMarketplace
 * @notice Peer-to-peer marketplace for buying and selling ERC-1155 carbon credits.
 *
 * Payment  : Native ETH
 * Credits  : CarbonCreditToken (ERC-1155), Token ID 0 (CREDIT_TOKEN)
 *
 * Lifecycle:
 *   1. Seller calls listCredits()     → Listing status: Open
 *   2a. Buyer calls purchaseListing() → status: Fulfilled  (happy path)
 *   2b. Seller calls cancelListing()  → status: Cancelled
 *
 * Security (v2 upgrades):
 *   ① Balance Lock     — lockedCredits[seller] tracks how many credits are
 *                        committed to open listings. A seller cannot list more
 *                        than (netCredits - lockedCredits), preventing double-listing.
 *                        The lock is released on fulfillment or cancellation.
 *
 *   ② Net Re-check     — At purchaseListing() time the seller's LIVE net position
 *                        is re-validated. If the seller acquired debt after listing
 *                        the purchase is rejected, preventing stale-listing exploits.
 *                        The re-check accounts for the locked amount itself so the
 *                        seller is not penalised for their own open listing.
 *
 *   ③ Auto-offset      — After a successful purchase, the buyer's DEBT_TOKEN balance
 *                        is automatically burned up to the amount of credits purchased.
 *                        This incentivises credit buyers who are also emitters and
 *                        keeps the registry accurate without a separate call.
 *
 * Other security properties:
 *   - CEI (Checks-Effects-Interactions) pattern throughout.
 *   - ReentrancyGuard on all state-mutating external calls.
 *   - ETH forwarded directly to seller; never custodied by this contract.
 *   - No ERC-1155 setApprovalForAll needed — marketplace holds MARKETPLACE_ROLE.
 */
contract CarbonMarketplace is Ownable, ReentrancyGuard {

    // ─── Types ────────────────────────────────────────────────────────────────

    enum ListingStatus { Open, Fulfilled, Cancelled }

    struct Listing {
        uint256       id;
        address       seller;
        uint256       amount;           // CREDIT_TOKEN units
        uint256       pricePerCredit;   // Price in wei per single credit unit
        ListingStatus status;
    }

    // ─── State ─────────────────────────────────────────────────────────────────

    /// @notice The ERC-1155 CarbonCreditToken contract.
    CarbonCreditToken public immutable creditToken;

    /// @notice Auto-incrementing listing counter.
    uint256 public nextListingId;

    /// @notice All listings indexed by listing ID.
    mapping(uint256 => Listing) public listings;

    /**
     * @notice Credits committed to open listings per seller.
     *
     * Invariant: lockedCredits[seller] == sum of listing.amount for all Open
     * listings where listing.seller == seller.
     *
     * This prevents a seller from listing the same credits multiple times
     * (double-listing exploit).
     */
    mapping(address => uint256) public lockedCredits;

    // ─── Events ────────────────────────────────────────────────────────────────

    event ListingCreated(
        uint256 indexed id,
        address indexed seller,
        uint256 amount,
        uint256 pricePerCredit
    );

    event ListingCancelled(
        uint256 indexed id,
        address indexed seller
    );

    event TradeExecuted(
        uint256 indexed id,
        address indexed seller,
        address indexed buyer,
        uint256 amount,
        uint256 totalPrice
    );

    /// @notice Emitted when the buyer's debt is automatically offset on purchase.
    event AutoOffsetApplied(
        address indexed buyer,
        uint256 debtBurned
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param _creditToken Address of the deployed CarbonCreditToken (ERC-1155).
     * @param _admin       Ownable admin address.
     */
    constructor(address _creditToken, address _admin) Ownable(_admin) {
        require(_creditToken != address(0), "Marketplace: zero token address");
        creditToken = CarbonCreditToken(_creditToken);
    }

    // ─── Listing Management ───────────────────────────────────────────────────

    /**
     * @notice List CREDIT_TOKEN units for sale.
     *
     * @param amount         Number of CREDIT_TOKEN units to list (> 0).
     * @param pricePerCredit Price in wei per individual credit unit.
     *
     * Requirements:
     *   - Seller's net position (credits - debt) must be >= (lockedCredits + amount).
     *     This means you cannot list credits that are already committed to another
     *     open listing.  The "available" net position is:
     *       netCredits(seller) - lockedCredits[seller]
     *
     * Example — double-listing prevention:
     *   Seller has 100 credits, 0 debt → netCredits = 100
     *   Lists 100 → lockedCredits = 100, available = 0
     *   Lists 100 again → 0 < 100 → REVERTS ✓
     */
    function listCredits(uint256 amount, uint256 pricePerCredit)
        external
        nonReentrant
    {
        require(amount > 0,         "Marketplace: zero amount");
        require(pricePerCredit > 0, "Marketplace: zero price");

        // ── Net position gate (v2: deducts already-locked credits) ────────────
        // availableNet = netCredits(seller) - lockedCredits[seller]
        // This prevents:
        //   a) Net emitters from selling (available goes negative)
        //   b) Double-listing (each listing reduces availableNet by its amount)
        int256  netPos    = creditToken.netCredits(msg.sender);
        uint256 locked    = lockedCredits[msg.sender];

        // netPos - int256(locked) >= int256(amount)
        // Safe cast: locked is always <= credits so locked <= uint max of credits
        require(
            netPos - int256(locked) >= int256(amount),
            "Marketplace: insufficient available net credits (check locked listings)"
        );

        // ── Lock the credits ─────────────────────────────────────────────────
        lockedCredits[msg.sender] = locked + amount;

        uint256 id = nextListingId++;
        listings[id] = Listing({
            id:             id,
            seller:         msg.sender,
            amount:         amount,
            pricePerCredit: pricePerCredit,
            status:         ListingStatus.Open
        });

        emit ListingCreated(id, msg.sender, amount, pricePerCredit);
    }

    /**
     * @notice Cancel an open listing. Only the original seller may cancel.
     *         Releases the locked credit amount back to the seller's available pool.
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];

        require(listing.seller != address(0),        "Marketplace: listing not found");
        require(listing.status == ListingStatus.Open, "Marketplace: listing not open");
        require(listing.seller == msg.sender,         "Marketplace: not the seller");

        // ── Release the lock ─────────────────────────────────────────────────
        lockedCredits[msg.sender] -= listing.amount;

        listing.status = ListingStatus.Cancelled;
        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @notice Purchase an open listing by sending exact ETH.
     *
     * Execution flow (CEI):
     *   1. Validate listing state, exact ETH value, seller identity constraints.
     *   2. Re-validate seller's LIVE net position accounting for their other locked
     *      listings. This catches sellers who gained debt AFTER listing.
     *   3. Release the seller's lock for this listing, mark as Fulfilled.
     *   4. Forward ETH directly to the seller.
     *   5. Call CarbonCreditToken.settleTransferWithAutoOffset():
     *        a. Transfer CREDIT_TOKEN from seller → buyer.
     *        b. Burn buyer's DEBT_TOKEN up to the amount purchased (auto-offset).
     *
     * @param listingId The ID of the listing to purchase.
     */
    function purchaseListing(uint256 listingId)
        external
        payable
        nonReentrant
    {
        Listing storage listing = listings[listingId];

        require(listing.seller != address(0),          "Marketplace: listing not found");
        require(listing.status == ListingStatus.Open,   "Marketplace: listing not open");
        require(listing.seller != msg.sender,           "Marketplace: seller cannot be buyer");

        uint256 totalPrice = listing.amount * listing.pricePerCredit;
        require(msg.value == totalPrice, "Marketplace: incorrect ETH amount");

        // ── ② Net position re-check at purchase time ─────────────────────────
        // The seller's net has the listing amount "in it" (they haven't transferred yet),
        // so we only deduct other locked credits (lockedCredits - this listing's amount).
        // This is the seller's ACTUAL available net after we account for THIS listing:
        //   otherLocked = lockedCredits[seller] - listing.amount
        //   availableNet = netCredits(seller) - otherLocked
        //   require availableNet >= listing.amount
        //
        // In other words: netCredits(seller) >= lockedCredits[seller]
        // If ANY debt was gained after listing, this will revert.
        int256  sellerNet    = creditToken.netCredits(listing.seller);
        uint256 sellerLocked = lockedCredits[listing.seller];
        require(
            sellerNet >= int256(sellerLocked),
            "Marketplace: seller net position degraded since listing (debt gained)"
        );

        // Cache before state mutation
        address seller = listing.seller;
        address buyer  = msg.sender;
        uint256 amount = listing.amount;

        // ── ① Release seller lock + mark Fulfilled (CEI — state before interactions) ─
        lockedCredits[seller] -= amount;
        listing.status = ListingStatus.Fulfilled;

        // ── ETH transfer to seller ────────────────────────────────────────────
        (bool sent, ) = payable(seller).call{value: totalPrice}("");
        require(sent, "Marketplace: ETH transfer failed");

        // ── ③ Settle trade + auto-offset buyer's debt ─────────────────────────
        uint256 debtBurned = creditToken.settleTransferWithAutoOffset(seller, buyer, amount);
        if (debtBurned > 0) {
            emit AutoOffsetApplied(buyer, debtBurned);
        }

        emit TradeExecuted(listingId, seller, buyer, amount, totalPrice);
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

    /**
     * @notice Returns how many credits are currently locked in open listings
     *         for a given seller.
     */
    function getLockedCredits(address seller) external view returns (uint256) {
        return lockedCredits[seller];
    }

    /**
     * @notice Returns the seller's AVAILABLE net credits (can be listed/sold).
     *         availableNet = netCredits(seller) - lockedCredits[seller]
     *         Can return a negative int256 if the seller has gained debt since locking.
     */
    function availableNetCredits(address seller) external view returns (int256) {
        return creditToken.netCredits(seller) - int256(lockedCredits[seller]);
    }

    /**
     * @notice Returns a single listing's full struct.
     */
    function getListing(uint256 listingId)
        external
        view
        returns (Listing memory)
    {
        return listings[listingId];
    }

    /**
     * @notice Paginated listing reader. Returns listings in range [from, to).
     */
    function getListings(uint256 from, uint256 to)
        external
        view
        returns (Listing[] memory)
    {
        require(to <= nextListingId, "Marketplace: out of range");
        require(from <= to,          "Marketplace: invalid range");

        Listing[] memory result = new Listing[](to - from);
        for (uint256 i = from; i < to; i++) {
            result[i - from] = listings[i];
        }
        return result;
    }
}
