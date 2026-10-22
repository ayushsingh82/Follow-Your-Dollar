// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DonationTrail
/// @notice Escrowed donation hops with a receipt check for each one.
/// @dev Flow: the NGO records a hop (funds are held in this contract), the receipt
///      amount is read off-chain (AI proposes), and the match rule runs here in plain
///      code (the chain proves). A matching receipt releases the funds. A mismatch
///      holds them until the reviewer approves or rejects, or the NGO reclaims them
///      after a timeout. The chain proves the record is unchanged; it cannot prove a
///      receipt is genuine.
contract DonationTrail {
    enum HopStatus {
        Pending, // funds held, waiting for the receipt check
        Verified, // receipt matched, funds released automatically
        Flagged, // receipt did not match (or payout failed), funds held for review
        Approved, // reviewer approved a flagged hop, funds released
        Rejected // funds returned to the campaign
    }

    struct Campaign {
        string name;
        address ngo;
        uint256 balance; // not yet committed to a hop
        uint256 raised;
        bool exists;
    }

    struct Hop {
        uint256 campaignId;
        address to;
        uint256 amount; // wei held, then released or returned
        uint256 declaredCents; // spend the NGO declares the receipt should show
        uint256 extractedCents; // amount the receipt check reported
        bytes32 receiptHash; // hash of the receipt file stored off-chain
        string label; // e.g. "Field office", "Vendor: Rice supplier"
        HopStatus status;
        uint64 timestamp;
    }

    /// @notice Allowed gap between declared and extracted amount, in basis points.
    uint256 public constant TOLERANCE_BPS = 100;

    /// @notice After this long, the NGO can pull back funds from an unresolved hop.
    uint256 public constant RECLAIM_AFTER = 7 days;

    /// @notice Address allowed to submit receipt checks and review flagged hops.
    address public immutable verifier;

    uint256 public campaignCount;
    uint256 public hopCount;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Hop) public hops;
    mapping(uint256 => uint256[]) private _campaignHops;

    event CampaignCreated(uint256 indexed campaignId, address indexed ngo, string name);
    event Donated(uint256 indexed campaignId, address indexed donor, uint256 amount);
    event HopRecorded(
        uint256 indexed campaignId,
        uint256 indexed hopId,
        address indexed to,
        uint256 amount,
        uint256 declaredCents,
        bytes32 receiptHash,
        string label
    );
    event HopChecked(uint256 indexed hopId, HopStatus status, uint256 declaredCents, uint256 extractedCents);
    event HopReviewed(uint256 indexed hopId, bool approved);
    event HopReclaimed(uint256 indexed hopId);

    error UnknownCampaign();
    error UnknownHop();
    error NotNgo();
    error NotVerifier();
    error ZeroAmount();
    error InsufficientCampaignBalance();
    error AlreadyChecked();
    error NotFlagged();
    error NotReclaimable();
    error TooEarly();
    error TransferFailed();

    constructor(address _verifier) {
        verifier = _verifier;
    }

    /// @notice Create a campaign owned by the caller.
    function createCampaign(string calldata name) external returns (uint256 campaignId) {
        campaignId = ++campaignCount;
        campaigns[campaignId] = Campaign({name: name, ngo: msg.sender, balance: 0, raised: 0, exists: true});
        emit CampaignCreated(campaignId, msg.sender, name);
    }

    /// @notice Donate native test ETH to a campaign.
    function donate(uint256 campaignId) external payable {
        Campaign storage c = campaigns[campaignId];
        if (!c.exists) revert UnknownCampaign();
        if (msg.value == 0) revert ZeroAmount();
        c.balance += msg.value;
        c.raised += msg.value;
        emit Donated(campaignId, msg.sender, msg.value);
    }

    /// @notice Commit campaign funds to a hop. The funds are held until the receipt is checked.
    function recordHop(
        uint256 campaignId,
        address to,
        uint256 amount,
        uint256 declaredCents,
        bytes32 receiptHash,
        string calldata label
    ) external returns (uint256 hopId) {
        Campaign storage c = campaigns[campaignId];
        if (!c.exists) revert UnknownCampaign();
        if (msg.sender != c.ngo) revert NotNgo();
        if (amount == 0) revert ZeroAmount();
        if (amount > c.balance) revert InsufficientCampaignBalance();

        c.balance -= amount;
        hopId = ++hopCount;
        hops[hopId] = Hop({
            campaignId: campaignId,
            to: to,
            amount: amount,
            declaredCents: declaredCents,
            extractedCents: 0,
            receiptHash: receiptHash,
            label: label,
            status: HopStatus.Pending,
            timestamp: uint64(block.timestamp)
        });
        _campaignHops[campaignId].push(hopId);

        emit HopRecorded(campaignId, hopId, to, amount, declaredCents, receiptHash, label);
    }

    /// @notice Submit the amount read from the receipt. The match rule runs here.
    ///         A match releases the funds; a mismatch (or a failed payout) holds them.
    function checkHop(uint256 hopId, uint256 extractedCents) external {
        if (msg.sender != verifier) revert NotVerifier();
        Hop storage h = hops[hopId];
        if (h.campaignId == 0) revert UnknownHop();
        if (h.status != HopStatus.Pending) revert AlreadyChecked();

        h.extractedCents = extractedCents;
        if (_matches(h.declaredCents, extractedCents)) {
            h.status = HopStatus.Verified; // state first, then the external call
            if (!_pay(h.to, h.amount)) h.status = HopStatus.Flagged;
        } else {
            h.status = HopStatus.Flagged;
        }
        emit HopChecked(hopId, h.status, h.declaredCents, extractedCents);
    }

    /// @notice Reviewer decision on a flagged hop: release the funds or return them to the campaign.
    function reviewHop(uint256 hopId, bool approve) external {
        if (msg.sender != verifier) revert NotVerifier();
        Hop storage h = hops[hopId];
        if (h.campaignId == 0) revert UnknownHop();
        if (h.status != HopStatus.Flagged) revert NotFlagged();

        if (approve) {
            h.status = HopStatus.Approved;
            if (!_pay(h.to, h.amount)) revert TransferFailed();
        } else {
            h.status = HopStatus.Rejected;
            campaigns[h.campaignId].balance += h.amount;
        }
        emit HopReviewed(hopId, approve);
    }

    /// @notice NGO pulls funds back from a hop that stayed unresolved for RECLAIM_AFTER.
    function reclaim(uint256 hopId) external {
        Hop storage h = hops[hopId];
        if (h.campaignId == 0) revert UnknownHop();
        Campaign storage c = campaigns[h.campaignId];
        if (msg.sender != c.ngo) revert NotNgo();
        if (h.status != HopStatus.Pending && h.status != HopStatus.Flagged) revert NotReclaimable();
        if (block.timestamp < uint256(h.timestamp) + RECLAIM_AFTER) revert TooEarly();

        h.status = HopStatus.Rejected;
        c.balance += h.amount;
        emit HopReclaimed(hopId);
    }

    /// @notice All hop ids of a campaign, in order.
    function getCampaignHops(uint256 campaignId) external view returns (uint256[] memory) {
        return _campaignHops[campaignId];
    }

    function _pay(address to, uint256 amount) internal returns (bool ok) {
        (ok,) = payable(to).call{value: amount}("");
    }

    function _matches(uint256 declared, uint256 extracted) internal pure returns (bool) {
        uint256 diff = declared > extracted ? declared - extracted : extracted - declared;
        return diff * 10_000 <= declared * TOLERANCE_BPS;
    }
}
