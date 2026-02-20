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
 * No ERC-1155 approval needed from the seller — the marketplace contract
 * holds MARKETPLACE_ROLE in CarbonCreditToken and calls settleTransfer()
 * directly. This avoids the open-ended risk of setApprovalForAll().
 *
 * Security:
 *   - CEI (Checks-Effects-Interactions) pattern throughout.
 *   - ReentrancyGuard on all state-mutating external calls.
 *   - ETH forwarded directly to seller; never custodied by this contract.
 *   - Seller balance re-validated at purchase time (prevents stale listings).
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
     *   - Seller must own >= amount in CREDIT_TOKEN (ID 0).
     *   - An entity with only DEBT_TOKEN (net emitter) cannot list credits.
     */
    function listCredits(uint256 amount, uint256 pricePerCredit)
        external
        nonReentrant
    {
        require(amount > 0,         "Marketplace: zero amount");
        require(pricePerCredit > 0, "Marketplace: zero price");

        uint256 sellerCredits = creditToken.balanceOf(msg.sender, creditToken.CREDIT_TOKEN());
        require(
            sellerCredits >= amount,
            "Marketplace: insufficient CREDIT_TOKEN balance"
        );

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
     */
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];

        require(listing.seller != address(0),         "Marketplace: listing not found");
        require(listing.status == ListingStatus.Open,  "Marketplace: listing not open");
        require(listing.seller == msg.sender,          "Marketplace: not the seller");

        listing.status = ListingStatus.Cancelled;
        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @notice Purchase an open listing by sending exact ETH.
     *
     * Execution flow (CEI):
     *   1. Validate listing state, exact ETH value, seller identity constraints.
     *   2. Re-validate seller's current CREDIT_TOKEN balance (handles stale listings).
     *   3. Mark listing as Fulfilled (state change before external calls).
     *   4. Forward ETH directly to the seller.
     *   5. Call CarbonCreditToken.settleTransfer() to move credits on-chain.
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

        // Re-validate seller balance at purchase time (prevents stale-listing exploit)
        uint256 sellerCredits = creditToken.balanceOf(
            listing.seller,
            creditToken.CREDIT_TOKEN()
        );
        require(
            sellerCredits >= listing.amount,
            "Marketplace: seller balance insufficient at purchase time"
        );

        // Cache values before state mutation
        address seller = listing.seller;
        address buyer  = msg.sender;
        uint256 amount = listing.amount;

        // ── 3. State change first (CEI) ──────────────────────────────────────
        listing.status = ListingStatus.Fulfilled;

        // ── 4. ETH transfer to seller ────────────────────────────────────────
        (bool sent, ) = payable(seller).call{value: totalPrice}("");
        require(sent, "Marketplace: ETH transfer failed");

        // ── 5. ERC-1155 credit transfer via CarbonCreditToken ────────────────
        creditToken.settleTransfer(seller, buyer, amount);

        emit TradeExecuted(listingId, seller, buyer, amount, totalPrice);
    }

    // ─── View Helpers ─────────────────────────────────────────────────────────

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
