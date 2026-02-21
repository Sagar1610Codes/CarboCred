// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CarbonCreditToken
 * @notice ERC-1155 multi-token registry for carbon credits and emission debt.
 *
 * Token IDs:
 *   ID 0 (CREDIT_TOKEN) → Positive credits: earned by green energy generation
 *                          or verified carbon offsets. Freely tradeable.
 *   ID 1 (DEBT_TOKEN)   → Emission liabilities: assigned by the backend when
 *                          an entity emits carbon. Not tradeable (soulbound).
 *
 * Net position of an entity:
 *   int256(balanceOf(addr, CREDIT_TOKEN)) - int256(balanceOf(addr, DEBT_TOKEN))
 *   Positive → net carbon offset holder
 *   Negative → net carbon emitter
 *
 * Extensibility:
 *   Future token IDs can represent vintage-specific credits (e.g., ID 2 = 2024
 *   Solar Credits, ID 3 = 2025 Reforestation Credits) allowing granular markets.
 *
 * Access roles:
 *   DEFAULT_ADMIN_ROLE  – can grant/revoke all other roles
 *   BACKEND_ROLE        – trusted backend; can mint/burn either token type
 *   MARKETPLACE_ROLE    – CarbonMarketplace contract; calls settleTransfer()
 */
contract CarbonCreditToken is ERC1155, AccessControl, ReentrancyGuard {

    // ─── Token ID Constants ───────────────────────────────────────────────────

    /// @notice Fungible credit token — represents green energy / offset credits.
    uint256 public constant CREDIT_TOKEN = 0;

    /// @notice Emission debt token — soulbound, represents carbon liabilities.
    uint256 public constant DEBT_TOKEN   = 1;

    // ─── Roles ────────────────────────────────────────────────────────────────

    bytes32 public constant BACKEND_ROLE     = keccak256("BACKEND_ROLE");
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    /// @notice Only the Government Authority may mint carbon credits.
    bytes32 public constant GOVERNMENT_ROLE  = keccak256("GOVERNMENT_ROLE");

    // ─── Metadata ─────────────────────────────────────────────────────────────

    string public name   = "Carbon Credit Token";
    string public symbol = "CCRED";

    // ─── Events ────────────────────────────────────────────────────────────────

    /// @dev Emitted when backend awards positive credits to an entity.
    event CreditsAwarded(
        address indexed entity,
        uint256 amount,
        string  reason    // e.g. "Solar 2024 Q1", "Reforestation Batch #7"
    );

    /// @dev Emitted when backend records emission debt against an entity.
    event DebtRecorded(
        address indexed entity,
        uint256 amount,
        string  reason    // e.g. "Factory emissions Jan 2025"
    );

    /// @dev Emitted when backend burns/clears emission debt (entity retires credits).
    event DebtCleared(address indexed entity, uint256 amount);

    /// @dev Emitted when the marketplace settles a trade.
    event BalanceUpdated(
        address indexed seller,
        address indexed buyer,
        uint256 amount,
        uint256 sellerCreditBalance,
        uint256 buyerCreditBalance
    );

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param admin  Address that receives DEFAULT_ADMIN_ROLE.
     * @param metaURI  Base URI for token metadata (ERC-1155 metadata JSON).
     *                 E.g. "https://carbocred.io/meta/{id}.json"
     */
    constructor(address admin, string memory metaURI)
        ERC1155(metaURI)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    // ─── Backend Functions ────────────────────────────────────────────────────

    /**
     * @notice Award positive CREDIT_TOKEN to an entity for green energy / offsets.
     * @param entity  Recipient address.
     * @param amount  Number of credits to mint.
     * @param reason  Human-readable reason string stored in the event log.
     */
    function awardCredits(
        address entity,
        uint256 amount,
        string calldata reason
    ) external onlyRole(GOVERNMENT_ROLE) {
        require(entity != address(0), "CCT: zero address");
        require(amount > 0,           "CCT: zero amount");
        _mint(entity, CREDIT_TOKEN, amount, "");
        emit CreditsAwarded(entity, amount, reason);
    }

    /**
     * @notice Record emission DEBT_TOKEN against an entity (carbon emitter).
     *         Debt tokens are minted to the entity's address but are intended
     *         to be soulbound — the marketplace will not allow trading them.
     * @param entity  The emitting entity.
     * @param amount  Emission liability in credit units.
     * @param reason  Human-readable description of the emission event.
     */
    function recordDebt(
        address entity,
        uint256 amount,
        string calldata reason
    ) external onlyRole(BACKEND_ROLE) {
        require(entity != address(0), "CCT: zero address");
        require(amount > 0,           "CCT: zero amount");
        _mint(entity, DEBT_TOKEN, amount, "");
        emit DebtRecorded(entity, amount, reason);
    }

    /**
     * @notice Clear (burn) emission debt — called when an entity retires
     *         purchased credits to offset their recorded liabilities.
     * @param entity  The entity retiring credits.
     * @param amount  Amount of debt to clear.
     */
    function clearDebt(address entity, uint256 amount)
        external
        onlyRole(BACKEND_ROLE)
    {
        require(balanceOf(entity, DEBT_TOKEN) >= amount, "CCT: insufficient debt to clear");
        _burn(entity, DEBT_TOKEN, amount);
        emit DebtCleared(entity, amount);
    }

    /**
     * @notice Burn credits from an entity — used when credits are consumed/retired.
     * @param entity  Entity whose credits are burned.
     * @param amount  Number of credits to retire.
     */
    function retireCredits(address entity, uint256 amount)
        external
        onlyRole(BACKEND_ROLE)
    {
        require(balanceOf(entity, CREDIT_TOKEN) >= amount, "CCT: insufficient credits");
        _burn(entity, CREDIT_TOKEN, amount);
    }

    // ─── Marketplace Function ─────────────────────────────────────────────────

    /**
     * @notice Transfer CREDIT_TOKEN from seller to buyer after a verified trade.
     *         Called exclusively by the CarbonMarketplace contract.
     *
     * NOTE: This uses the internal _safeTransferFrom (no ERC-1155 approval needed
     * since the marketplace holds MARKETPLACE_ROLE). This is safer than relying on
     * setApprovalForAll as it limits the marketplace's on-chain power to only
     * verified role-gated calls.
     *
     * @param seller  Credit seller.
     * @param buyer   Credit buyer.
     * @param amount  Amount of CREDIT_TOKEN to transfer.
     */
    function settleTransfer(
        address seller,
        address buyer,
        uint256 amount
    ) external nonReentrant onlyRole(MARKETPLACE_ROLE) {
        require(seller != address(0), "CCT: zero seller");
        require(buyer  != address(0), "CCT: zero buyer");
        require(amount > 0,           "CCT: zero amount");
        require(
            balanceOf(seller, CREDIT_TOKEN) >= amount,
            "CCT: seller insufficient credits"
        );

        // Internal transfer — bypasses approval check, gated by MARKETPLACE_ROLE
        _safeTransferFrom(seller, buyer, CREDIT_TOKEN, amount, "");

        emit BalanceUpdated(
            seller,
            buyer,
            amount,
            balanceOf(seller, CREDIT_TOKEN),
            balanceOf(buyer, CREDIT_TOKEN)
        );
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    /**
     * @notice Returns the signed net carbon position of an entity.
     *         Positive → net offset holder; Negative → net emitter.
     */
    function netCredits(address entity) external view returns (int256) {
        return int256(balanceOf(entity, CREDIT_TOKEN))
             - int256(balanceOf(entity, DEBT_TOKEN));
    }

    /**
     * @notice Returns both raw balances as a convenience helper.
     * @return credits  CREDIT_TOKEN balance (green energy / offsets).
     * @return debt     DEBT_TOKEN balance (emission liabilities).
     */
    function getPosition(address entity)
        external
        view
        returns (uint256 credits, uint256 debt)
    {
        credits = balanceOf(entity, CREDIT_TOKEN);
        debt    = balanceOf(entity, DEBT_TOKEN);
    }

    // ─── ERC-1155 Overrides ───────────────────────────────────────────────────

    /**
     * @dev Block transfers of DEBT_TOKEN — emission liabilities are soulbound.
     *      Only minting (from == 0) and burning (to == 0) are allowed for ID 1.
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == DEBT_TOKEN) {
                // Allow minting (from == 0) and burning (to == 0), block transfers
                require(
                    from == address(0) || to == address(0),
                    "CCT: DEBT_TOKEN is soulbound and non-transferable"
                );
            }
        }
        super._update(from, to, ids, values);
    }

    /// @dev Required override — AccessControl + ERC1155 both implement supportsInterface
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
